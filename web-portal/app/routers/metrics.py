"""
Router: Prometheus Metrics Proxy
Query Prometheus API và trả về dữ liệu ED-137 KPI
"""

import httpx
import os
from fastapi import APIRouter, HTTPException
from typing import Optional
import logging

logger = logging.getLogger("vatm.metrics")
router = APIRouter()

PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")


async def _query(promql: str) -> dict:
    """Gọi Prometheus instant query API."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.get(
                f"{PROMETHEUS_URL}/api/v1/query",
                params={"query": promql},
            )
            r.raise_for_status()
            return r.json()
        except httpx.RequestError as e:
            raise HTTPException(503, f"Prometheus không phản hồi: {e}")
        except httpx.HTTPStatusError as e:
            raise HTTPException(502, f"Prometheus lỗi: {e}")


# ─────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────
@router.get("/summary")
async def get_ed137_summary():
    """
    Tổng hợp trạng thái ED-137 KPI của toàn tuyến.
    Dùng cho dashboard tổng quan.
    """
    queries = {
        "t6_radio_up_tx_main":    'count(up{job="snmp_tx_t6tv_main"} == 1)',
        "t6_radio_up_rx_main":    'count(up{job="snmp_rx_t6rv_main"} == 1)',
        "t6_radio_up_ubvhf":      'count(up{job="snmp_ubvhf_t6trv"} == 1)',
        "s4ip_up":                'count(probe_success{job="blackbox_s4ip_tcp5001"} == 1)',
        "critical_alerts":        'count(ALERTS{severity="critical",alertstate="firing"})',
        "warning_alerts":         'count(ALERTS{severity="warning",alertstate="firing"})',
    }
    result = {}
    for key, promql in queries.items():
        try:
            data = await _query(promql)
            if data["status"] == "success" and data["data"]["result"]:
                result[key] = float(data["data"]["result"][0]["value"][1])
            else:
                result[key] = 0
        except Exception:
            result[key] = None
    return result


@router.get("/t6_status")
async def get_t6_status():
    """Trạng thái SNMP up/down của tất cả T6 radios."""
    data = await _query('up{job=~"snmp_(tx|rx|ubvhf).*"}')
    if data["status"] != "success":
        raise HTTPException(502, "Prometheus query lỗi")
    devices = []
    for item in data["data"]["result"]:
        devices.append({
            "instance":   item["metric"].get("instance"),
            "job":        item["metric"].get("job"),
            "site":       item["metric"].get("site"),
            "device":     item["metric"].get("device"),
            "redundancy": item["metric"].get("redundancy"),
            "status":     "up" if item["value"][1] == "1" else "down",
        })
    return {"devices": devices, "total": len(devices)}


@router.get("/s4ip_status")
async def get_s4ip_status():
    """Trạng thái TCP probe của S4-IP Controllers."""
    data = await _query('probe_success{job="blackbox_s4ip_tcp5001"}')
    if data["status"] != "success":
        raise HTTPException(502, "Prometheus query lỗi")
    result = []
    for item in data["data"]["result"]:
        result.append({
            "instance": item["metric"].get("instance"),
            "status":   "up" if item["value"][1] == "1" else "down",
        })
    return {"s4ip_controllers": result}


@router.get("/ping_status")
async def get_ping_status():
    """Trạng thái ICMP ping RCMS/LCMS workstations."""
    data = await _query('probe_success{job="blackbox_ping_workstations"}')
    if data["status"] != "success":
        raise HTTPException(502, "Prometheus query lỗi")
    result = []
    for item in data["data"]["result"]:
        result.append({
            "instance": item["metric"].get("instance"),
            "device":   item["metric"].get("device"),
            "status":   "up" if item["value"][1] == "1" else "down",
        })
    return {"workstations": result}


@router.get("/alerts")
async def get_active_alerts():
    """Danh sách cảnh báo đang kích hoạt."""
    data = await _query('ALERTS{alertstate="firing"}')
    if data["status"] != "success":
        raise HTTPException(502, "Prometheus query lỗi")
    alerts = []
    for item in data["data"]["result"]:
        alerts.append({
            "alertname": item["metric"].get("alertname"),
            "severity":  item["metric"].get("severity"),
            "standard":  item["metric"].get("standard"),
            "kpi":       item["metric"].get("kpi"),
            "instance":  item["metric"].get("instance", ""),
            "site":      item["metric"].get("site", ""),
        })
    return {"alerts": alerts, "count": len(alerts)}


@router.get("/query")
async def raw_query(q: str):
    """
    Raw PromQL query (debug/advanced use).
    Ví dụ: /api/metrics/query?q=up{job="snmp_tx_t6tv_main"}
    """
    return await _query(q)
