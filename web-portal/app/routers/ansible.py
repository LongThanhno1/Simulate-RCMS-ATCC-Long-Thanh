"""
Router: Ansible Playbook Executor
Trigger Ansible playbooks từ Web Portal UI
"""

import subprocess
import os
import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger("vatm.ansible")
router = APIRouter()

ANSIBLE_DIR = Path(os.getenv("ANSIBLE_DIR", "/app/ansible"))
REPORTS_DIR = Path(os.getenv("REPORTS_DIR", "/app/reports"))
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────
class PlaybookRequest(BaseModel):
    playbook: str                        # tên file playbook (không có .yml)
    target_group: Optional[str] = "all" # Ansible host group
    extra_vars: Optional[dict] = {}     # biến truyền thêm


class JobStatus(BaseModel):
    job_id:    str
    status:    str   # running | completed | failed
    playbook:  str
    started:   str
    finished:  Optional[str] = None
    output:    Optional[str] = None
    report:    Optional[str] = None


# ─────────────────────────────────────────────────────────
# In-memory job store (đủ cho lab — production dùng Redis)
# ─────────────────────────────────────────────────────────
_jobs: dict[str, JobStatus] = {}


def _run_playbook(job_id: str, playbook: str, target: str, extra: dict):
    """Background task chạy ansible-playbook."""
    playbook_file = ANSIBLE_DIR / "playbooks" / f"{playbook}.yml"
    inventory_file = ANSIBLE_DIR / "hosts.ini"
    report_file = REPORTS_DIR / f"{job_id}_{playbook}.md"

    if not playbook_file.exists():
        _jobs[job_id].status = "failed"
        _jobs[job_id].output = f"ERROR: playbook không tồn tại: {playbook_file}"
        _jobs[job_id].finished = datetime.now().isoformat()
        return

    cmd = [
        "ansible-playbook",
        str(playbook_file),
        "-i", str(inventory_file),
        "--limit", target,
        "-v",
    ]
    for k, v in extra.items():
        cmd += ["-e", f"{k}={v}"]
    cmd += ["-e", f"report_file={report_file}"]

    logger.info(f"[{job_id}] Running: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
        )
        _jobs[job_id].status = "completed" if result.returncode == 0 else "failed"
        _jobs[job_id].output = result.stdout[-4000:] + (result.stderr[-1000:] if result.stderr else "")
        _jobs[job_id].report = str(report_file) if report_file.exists() else None
    except subprocess.TimeoutExpired:
        _jobs[job_id].status = "failed"
        _jobs[job_id].output = "ERROR: Timeout 300s"
    except Exception as e:
        _jobs[job_id].status = "failed"
        _jobs[job_id].output = f"ERROR: {e}"
    finally:
        _jobs[job_id].finished = datetime.now().isoformat()
        logger.info(f"[{job_id}] Finished — status: {_jobs[job_id].status}")


# ─────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────
@router.post("/run", response_model=JobStatus)
async def run_playbook(req: PlaybookRequest, background: BackgroundTasks):
    """
    Kích hoạt Ansible playbook.
    Ví dụ body: {"playbook": "01_collect_metrics", "target_group": "rcms_tx"}
    """
    allowed = {"01_collect_metrics", "02_generate_report", "03_ping_check"}
    if req.playbook not in allowed:
        raise HTTPException(400, f"Playbook '{req.playbook}' không được phép. Cho phép: {allowed}")

    job_id = f"{req.playbook}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    _jobs[job_id] = JobStatus(
        job_id=job_id,
        status="running",
        playbook=req.playbook,
        started=datetime.now().isoformat(),
    )
    background.add_task(_run_playbook, job_id, req.playbook, req.target_group, req.extra_vars)
    logger.info(f"Job {job_id} queued")
    return _jobs[job_id]


@router.get("/jobs", response_model=list[JobStatus])
async def list_jobs():
    """Danh sách tất cả jobs."""
    return list(_jobs.values())


@router.get("/jobs/{job_id}", response_model=JobStatus)
async def get_job(job_id: str):
    """Lấy trạng thái job theo ID."""
    if job_id not in _jobs:
        raise HTTPException(404, "Job không tồn tại")
    return _jobs[job_id]


@router.get("/jobs/{job_id}/report")
async def get_report(job_id: str):
    """Tải báo cáo Markdown của job."""
    if job_id not in _jobs:
        raise HTTPException(404, "Job không tồn tại")
    job = _jobs[job_id]
    if not job.report or not Path(job.report).exists():
        raise HTTPException(404, "Báo cáo chưa có")
    with open(job.report, encoding="utf-8") as f:
        content = f.read()
    return {"job_id": job_id, "content": content}


@router.get("/playbooks")
async def list_playbooks():
    """Danh sách playbooks khả dụng."""
    return {
        "playbooks": [
            {"id": "01_collect_metrics", "name": "Thu thập số liệu đo kiểm",    "desc": "SNMP walk + ping + TCP check toàn tuyến"},
            {"id": "02_generate_report", "name": "Xuất báo cáo kỹ thuật",       "desc": "Tổng hợp dữ liệu → file Markdown/Excel"},
            {"id": "03_ping_check",      "name": "Ping check nhanh",            "desc": "ICMP ping tất cả thiết bị trong inventory"},
        ]
    }
