# ============================================================
# VATM ATCC Long Thành — FastAPI Web Portal Dockerfile
# Base: Python 3.11-slim + Ansible Core 2.16 + iperf3
# ============================================================

FROM python:3.11-slim

# ── Metadata ──
LABEL maintainer="VATM ATCC Long Thanh <longthanh.kythuat@vatm.vn>"
LABEL description="VATM ED-137 Monitoring Web Portal"
LABEL version="1.0"

# ── Cài dependencies hệ thống ──
# snmp-mibs-downloader bị xóa: cần repo non-free, không có trong python:slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    # SSH cho Ansible kết nối RCMS workstations
    openssh-client \
    sshpass \
    # Network tools (ping đo latency/jitter ED-137)
    iputils-ping \
    # SNMP CLI (debug, không cần MIB downloader)
    snmp \
    # Tiện ích
    curl \
    wget \
    # Ansible dependencies
    python3-netaddr \
    python3-paramiko \
    && rm -rf /var/lib/apt/lists/*

# ── Tạo cấu trúc thư mục ──
RUN mkdir -p \
    /app \
    /opt/vatm/ansible \
    /opt/vatm/reports \
    /root/.ssh

# ── Cài Python packages ──
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# ── SSH config (tắt strict host check khi Ansible SSH vào RCMS workstations) ──
RUN echo "Host 10.*\n\
    StrictHostKeyChecking no\n\
    UserKnownHostsFile /dev/null\n\
    ConnectTimeout 20\n\
    ServerAliveInterval 30\n\
    RequestTTY yes" > /root/.ssh/config && \
    chmod 600 /root/.ssh/config

# ── Copy source code ──
WORKDIR /app
COPY app/ /app/

# ── Port ──
EXPOSE 8000

# ── Start FastAPI via Uvicorn ──
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--log-level", "info"]
