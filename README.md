# VATM ATCC Long Thành — ED-137 Monitoring Portal

> Hệ thống giám sát tập trung và tự động hóa đo kiểm đường truyền VHF hàng không  
> Chuẩn: **EUROCAE ED-137** · Quy trình kỹ thuật **VATM 2999**  
> Đơn vị: Trung tâm KSKL Long Thành (ATCC) — Tổng công ty Quản lý bay Việt Nam (VATM)

---

## Kiến trúc hệ thống

```
[Trạm TX — 18× T6-TV]  ←─ Fo1/Fo2 ─→  [ATCC Long Thành]  ←─ Fo1/Fo2 ─→  [Trạm RX — 18× T6-RV]
        LAN3 SNMP                             Web Portal                           LAN3 SNMP
         ↓                                   Prometheus                             ↓
    [SW6360 TX]                             Grafana                           [SW6360 RX]
                                            Alertmanager
                                            FastAPI + Ansible
```

### Các thành phần

| Container           | Port  | Vai trò                                      |
|---------------------|-------|----------------------------------------------|
| `web-portal`        | 8000  | FastAPI — điều khiển Ansible, API metrics    |
| `prometheus`        | 9090  | Thu thập metrics từ SNMP/Blackbox exporter   |
| `grafana`           | 3000  | Dashboard trực quan, nhúng Iframe vào Portal |
| `alertmanager`      | 9093  | Cảnh báo → Telegram / Email                 |
| `snmp-exporter`     | 9116  | Poll SNMP V2c từ T6 radios + ALE switches    |
| `blackbox-exporter` | 9115  | TCP probe S4-IP:5001, ICMP ping workstations |
| `node-exporter`     | 9100  | Metrics VM host                              |

---

## Yêu cầu hệ thống (Lab VMware)

| Thành phần        | Yêu cầu tối thiểu |
|-------------------|-------------------|
| RAM               | 6 GB              |
| CPU               | 4 vCPU            |
| Disk              | 40 GB             |
| OS                | Ubuntu 22.04 LTS  |
| Docker Engine     | ≥ 24.x            |
| Docker Compose    | ≥ 2.x             |
| IP VM Monitor     | 192.168.100.10/24 |

---

## Quick Start

### 1. Clone / sao chép repo

```bash
git clone https://github.com/LongThanhNo1/giam-sat-duong-truyen-vhf.git
cd giam-sat-duong-truyen-vhf
```

### 2. Cấu hình biến môi trường

```bash
cp monitoring/.env.example monitoring/.env
# Chỉnh sửa: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GF_ADMIN_PASSWORD
```

### 3. Khởi động stack monitoring

```bash
cd monitoring
docker compose up -d
```

### 4. Khởi động Web Portal

```bash
cd web-portal
docker compose up -d
```

### 5. Truy cập

| Dịch vụ        | URL                         | Tài khoản mặc định   |
|----------------|-----------------------------|----------------------|
| Web Portal     | http://192.168.100.10:8000  | —                    |
| Grafana        | http://192.168.100.10:3000  | admin / vatm2025     |
| Prometheus     | http://192.168.100.10:9090  | —                    |
| Alertmanager   | http://192.168.100.10:9093  | —                    |

---

## Cấu hình Telegram Alert

1. Tạo bot: `/newbot` trên @BotFather → lấy `TELEGRAM_BOT_TOKEN`
2. Lấy `TELEGRAM_CHAT_ID`: gửi tin nhắn tới bot → gọi `getUpdates` API
3. Điền vào `monitoring/alertmanager/config.yml`:
   ```yaml
   telegram_configs:
     - bot_token: '<TELEGRAM_BOT_TOKEN>'
       chat_id: <TELEGRAM_CHAT_ID>
   ```

---

## ED-137 KPI Thresholds

| KPI            | 🟢 Bình thường | 🟡 Cảnh báo   | 🔴 Vi phạm ED-137 |
|----------------|---------------|---------------|-------------------|
| One-way Delay  | < 50 ms       | 50 – 100 ms   | > 100 ms          |
| Jitter         | < 10 ms       | 10 – 20 ms    | > 20 ms           |
| Packet Loss    | < 0.1 %       | 0.1 – 1 %     | > 1 %             |

---

## Cấu trúc thư mục

```
├── monitoring/
│   ├── docker-compose.yml
│   ├── prometheus/
│   │   ├── prometheus.yml          # 13 scrape jobs — Park Air T6 IPs
│   │   └── rules/
│   │       ├── ed137_alerts.yml    # KPI Delay/Jitter/Loss alerts
│   │       ├── park_air_t6_alerts.yml   # T6 device + S4-IP alerts
│   │       └── switch_alerts.yml   # ALE switch alerts
│   ├── snmp/
│   │   └── snmp.yml               # Modules: park_air_t6, ale_switch, linux_snmp
│   ├── alertmanager/
│   │   └── config.yml             # Telegram + Email routing
│   └── grafana/
│       └── provisioning/
├── web-portal/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                # FastAPI app
│       ├── routers/
│       │   ├── ansible.py         # Playbook trigger API
│       │   └── metrics.py         # Prometheus query proxy
│       └── static/
│           └── index.html         # Dark-theme Web Portal UI
├── ansible/
│   ├── hosts.ini                  # Inventory — IPs thực tế VATM
│   └── playbooks/
│       ├── 01_collect_metrics.yml
│       ├── 02_generate_report.yml
│       └── 03_ping_check.yml (TODO)
└── README.md
```

---

## Ghi chú quan trọng

- **SNMP Poll qua LAN3** (subnet RCMS) — không poll LAN1 (VoIP) để tránh ảnh hưởng luồng thoại
- **S4-IP Controller** không có SNMP — giám sát qua TCP port 5001 (blackbox exporter)
- **Park Air T6 Proprietary MIB**: file `snmp/snmp.yml` dùng standard MIBs; bổ sung OID proprietary khi nhận được MIB file từ Park Air
- Khi deploy production: comment block `lab_simulation` trong `prometheus.yml` và `hosts.ini`

---

**Tác giả:** Đỗ Thanh Long — ATSEP VATM, ATCC Long Thành  
**Tài liệu tham chiếu:** TMTK-VHF&BackupVHF.pdf (HĐ 8225/HĐ-QLB 06/12/2024), EUROCAE ED-137
