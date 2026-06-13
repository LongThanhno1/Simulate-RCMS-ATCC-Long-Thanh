"""
VATM ATCC Long Thành — Web Portal Backend
Dự án: Giám sát đường truyền VHF theo chuẩn ED-137
Tác giả: Đỗ Thanh Long — ATSEP VATM
"""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging

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
