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
RUN apt-get update && apt-get install -y --no-install-recommends \
    # SSH cho Ansible kết nối Nokia SR OS
    openssh-client \
    sshpass \
    # Network tools
    iputils-ping \
    iperf3 \
    # SNMP tools (debug)
    snmp \
    snmp-mibs-downloader \
    # Tiện ích
    curl \
    wget \
    git \
    vim-tiny \
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

# ── SSH config (tắt strict host check khi Ansible SSH vào Nokia) ──
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
