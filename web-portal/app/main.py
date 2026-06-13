"""
VATM ATCC Long Thành — Web Portal Backend
Dự án: Giám sát đường truyền VHF theo chuẩn ED-137
Tác giả: Đỗ Thanh Long — ATSEP VATM
"""

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio, httpx, json, logging, re, sys
from datetime import datetime, timezone
from typing import Optional, Set

from routers import ansible, metrics

# ─────────────────────────────────────────────────────────
# App init
# ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("vatm.portal")

app = FastAPI(
    title="VATM ATCC Long Thành — ED-137 Monitoring Portal",
    description="Hệ thống giám sát đường truyền VHF theo chuẩn EUROCAE ED-137",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────────────────
app.include_router(ansible.router, prefix="/api/ansible", tags=["Ansible"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])

# ─────────────────────────────────────────────────────────
# Static files (Portal UI)
# ─────────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve Web Portal main page."""
    with open("static/index.html", encoding="utf-8") as f:
        return f.read()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "vatm-ed137-portal"}


@app.on_event("startup")
async def startup():
    logger.info("VATM ATCC Long Thành — ED-137 Web Portal starting up")


# ─────────────────────────────────────────────────────────
# WebSocket — /ws/topology
# Push trạng thái topology realtime từ Prometheus mỗi 10s
# ─────────────────────────────────────────────────────────
import os
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://prometheus:9090")

_ws_clients: Set[WebSocket] = set()


async def _prom_scalar(promql: str) -> Optional[float]:
    """Query Prometheus instant, trả về scalar đầu tiên hoặc None."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r = await c.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": promql})
            data = r.json()
            if data["status"] == "success" and data["data"]["result"]:
                return float(data["data"]["result"][0]["value"][1])
    except Exception:
        pass
    return None


def _to_status(val: Optional[float]) -> str:
    """Chuyển scalar Prometheus (1=up, 0=down, None=unknown) → status string."""
    if val is None:  return "unknown"
    if val >= 1:     return "ok"
    return "crit"


async def _build_topo_state() -> dict:
    """
    Query Prometheus, map sang trạng thái 6 node + 6 link + KPI.
    Trả về dict khớp với cấu trúc window.topo trong app.js.
    """
    # ── Node statuses ──────────────────────────────────────
    tx_up   = await _prom_scalar('max(up{job=~"snmp_tx.*"})')
    rx_up   = await _prom_scalar('max(up{job=~"snmp_rx.*"})')
    xmg_up  = await _prom_scalar('max(up{job=~"snmp.*xmg.*"})')
    red_up  = await _prom_scalar('max(up{job=~"snmp.*red.*"}) or max(up{instance="10.60.8.204:9116"})')
    blue_up = await _prom_scalar('max(up{job=~"snmp.*blue.*"}) or max(up{instance="10.60.8.203:9116"})')
    fl20_up = await _prom_scalar('max(probe_success{job="blackbox_s4ip_tcp5001"})')

    # ── KPI delay: dùng probe_duration_seconds * 1000 → ms ─
    delay_tx  = await _prom_scalar('avg(probe_duration_seconds{job=~"blackbox.*tx.*"}) * 1000')
    delay_rx  = await _prom_scalar('avg(probe_duration_seconds{job=~"blackbox.*rx.*"}) * 1000')
    # Jitter & loss chưa có exporter riêng → None (hiển thị N/A)

    tx_st   = _to_status(tx_up)
    rx_st   = _to_status(rx_up)
    xmg_st  = _to_status(xmg_up)
    red_st  = _to_status(red_up)
    blue_st = _to_status(blue_up)
    fl20_st = _to_status(fl20_up)

    def _link_st(a: str, b: str) -> str:
        """Link ok nếu cả 2 đầu ok, crit nếu 1 đầu crit."""
        if a == "crit" or b == "crit": return "crit"
        if a == "unknown" or b == "unknown": return "unknown"
        return "ok"

    return {
        # Node statuses
        "tx_status":       tx_st,
        "rx_status":       rx_st,
        "xmg_status":      xmg_st,
        "red_sw_status":   red_st,
        "blue_sw_status":  blue_st,
        "fl20_status":     fl20_st,
        # Link statuses
        "link_tx_xmg":    _link_st(tx_st,   xmg_st),
        "link_rx_xmg":    _link_st(rx_st,   xmg_st),
        "link_xmg_red":   _link_st(xmg_st,  red_st),
        "link_xmg_blue":  _link_st(xmg_st,  blue_st),
        "link_red_fl20":  _link_st(red_st,  fl20_st),
        "link_blue_fl20": _link_st(blue_st, fl20_st),
        # KPI (ms / %) — None = N/A
        "delay_tx_xmg":   round(delay_tx,  2) if delay_tx  else None,
        "delay_rx_xmg":   round(delay_rx,  2) if delay_rx  else None,
        "jitter_tx_xmg":  None,
        "jitter_rx_xmg":  None,
        "loss_tx_xmg":    None,
        "loss_rx_xmg":    None,
        # Timestamp
        "ts": datetime.now(timezone.utc).isoformat(),
    }


_IP_RE = re.compile(r'^(\d{1,3}\.){3}\d{1,3}$')


@app.get("/api/ping/{ip}")
async def ping_ip(ip: str):
    """
    Ping một địa chỉ IP (LAN3 RCMS subnet) — 4 gói, timeout 2s/gói.
    Bảo mật: chỉ chấp nhận địa chỉ IPv4 hợp lệ để tránh command injection.
    """
    if not _IP_RE.match(ip):
        raise HTTPException(status_code=400, detail="IP không hợp lệ")

    # Chọn lệnh ping phù hợp với OS trong container (Linux)
    cmd = ["ping", "-c", "4", "-W", "2", ip]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=12)
        output = stdout.decode(errors="replace")

        # Parse RTT avg từ dòng "rtt min/avg/max/mdev = ..."
        rtt_avg = None
        m = re.search(r'rtt min/avg/max/mdev\s*=\s*[\d.]+/([\d.]+)/', output)
        if m:
            rtt_avg = round(float(m.group(1)), 2)

        # Parse packet loss
        loss_m = re.search(r'(\d+)% packet loss', output)
        loss_pct = int(loss_m.group(1)) if loss_m else 100

        reachable = proc.returncode == 0 and loss_pct < 100
        return {
            "ip":        ip,
            "reachable": reachable,
            "rtt_ms":    rtt_avg,
            "loss_pct":  loss_pct,
            "raw":       output[-500:],   # tail để debug nếu cần
        }
    except asyncio.TimeoutError:
        return {"ip": ip, "reachable": False, "rtt_ms": None, "loss_pct": 100, "raw": "timeout"}
    except Exception as e:
        logger.error(f"Ping error {ip}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/topology")
async def ws_topology(ws: WebSocket):
    await ws.accept()
    _ws_clients.add(ws)
    logger.info(f"WS topology client connected ({len(_ws_clients)} total)")
    try:
        while True:
            state = await _build_topo_state()
            await ws.send_text(json.dumps(state))
            await asyncio.sleep(10)          # push mỗi 10 giây
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"WS topology error: {e}")
    finally:
        _ws_clients.discard(ws)
        logger.info(f"WS topology client disconnected ({len(_ws_clients)} total)")
