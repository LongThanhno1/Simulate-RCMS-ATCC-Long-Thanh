# Simulate-RCMS-ATCC-Long-Thanh

> **Hệ thống Web Portal giám sát tập trung và tự động hóa đo kiểm đường truyền VHF hàng không**  
> Chuẩn **EUROCAE ED-137** · Trung tâm KSKL Long Thành (ATCC) · VATM SORATS

---

## Tổng quan

Dự án mô phỏng và triển khai hệ thống **RCMS (Radio Control & Monitoring System)** cho tuyến truyền dẫn VHF:

```
[TRẠM PHÁT — TX]  ←──── IP/VPN (VSAT) ────→  [ĐÀI KSKL LONG THÀNH]  ←──── IP/VPN ────→  [TRẠM THU — RX]
 Park Air T6-TV                                  S4-IP + ALE Switch                          Park Air T6-RV
 10.60.7.x (LAN3)                                10.60.10.x / 11.x                           10.60.6.x (LAN3)
```

**Thiết bị thực tế được monitor:**

| Vị trí | Thiết bị | Model | Giao thức giám sát |
|--------|----------|-------|-------------------|
| Trạm TX | 9 máy phát VHF (MAIN + STBY) | Park Air T6-TV | SNMP v2c qua LAN3 |
| Trạm RX | 9 máy thu VHF (MAIN + STBY) | Park Air T6-RV | SNMP v2c qua LAN3 |
| UBVHF TWR | T6-TRV + S4-IP Controller | Park Air | SNMP + TCP:5001 |
| ATCC | ALE Switch OS6860E | Alcatel-Lucent | SNMP v2c |

> ⚠️ **Bảo mật tín hiệu:** SNMP chỉ poll qua **LAN3 (RCMS subnet)** — tuyệt đối không poll LAN1 (VoIP subnet) để tránh ảnh hưởng lưu lượng thoại hàng không.

---

## Tính năng

| Phân hệ | Mô tả |
|---------|-------|
| 🗺 **Web Portal** | Canvas topology tương tác, Grafana iframe, nút bấm kích hoạt Ansible |
| 📊 **Giám sát Real-time** | Prometheus + SNMP Exporter, cập nhật 15s, lưu 30 ngày |
| ⚡ **Đo kiểm tự động** | Ansible SSH → RCMS workstation → đo Latency/Jitter/Loss → push về Pushgateway |
| 🔔 **Cảnh báo chủ động** | Alertmanager → Telegram Bot + Email khi vi phạm ngưỡng ED-137 |
| 🔌 **TCP Probe S4-IP** | Blackbox Exporter kiểm tra TCP:5001 (thiết bị không có SNMP) |
| 📄 **Báo cáo tự động** | Playbook xuất báo cáo Markdown/CSV tập trung trên Web Portal |

---

## Ngưỡng KPI — EUROCAE ED-137

| Chỉ số | 🟢 Bình thường | 🟡 Cảnh báo | 🔴 Vi phạm |
|--------|--------------|------------|----------|
| One-way Delay | < 50 ms | 50 – 100 ms | **> 100 ms** |
| Jitter | < 10 ms | 10 – 20 ms | **> 20 ms** |
| Packet Loss | < 0.1% | 0.1 – 1% | **> 1%** |
| VSWR Anten | ≤ 1.5:1 | 1.5 – 2.0:1 | **> 2.0:1** |
| BER đường truyền | < 10⁻⁶ | 10⁻⁶ – 10⁻⁴ | **> 10⁻⁴** |

---

## Stack kỹ thuật

```
Docker Compose Stack (8 services)
├── vatm_prometheus        :9090  — Thu thập & lưu metrics (TSDB 30d)
├── vatm_grafana           :3000  — Dashboard trực quan (3 dashboards)
├── vatm_alertmanager      :9093  — Cảnh báo Telegram + Email
├── vatm_snmp_exporter     :9116  — Poll Park Air T6 + ALE switch qua SNMP
├── vatm_blackbox_exporter :9115  — TCP probe S4-IP:5001 + ICMP ping
├── vatm_pushgateway       :9091  — Nhận metrics từ Ansible
├── vatm_web_portal        :8080  — FastAPI Backend + Web Portal UI
└── vatm_node_exporter     :9100  — CPU/RAM/Disk VM host
```

---

## Cấu trúc thư mục

```
Simulate-RCMS-ATCC-Long-Thanh/
├── monitoring/                     # Docker stack chính
│   ├── docker-compose.yml          # Production stack (8 services)
│   ├── docker-compose.lab.yml      # Override cho Windows Docker Desktop
│   ├── .env.template               # Template biến môi trường (copy → .env)
│   ├── prometheus/
│   │   ├── prometheus.yml          # Scrape config: SNMP + Blackbox + Pushgateway
│   │   └── rules/
│   │       ├── ed137_alerts.yml    # Cảnh báo KPI theo ED-137
│   │       ├── park_air_t6_alerts.yml
│   │       └── switch_alerts.yml
│   ├── grafana/
│   │   └── provisioning/
│   │       └── dashboards/
│   │           ├── ed137_overview.json      # Sơ đồ tuyến + KPI tổng quan
│   │           ├── park_air_t6_detail.json  # Chi tiết từng T6 radio
│   │           └── vm_network_health.json   # Health VM + network
│   ├── alertmanager/
│   │   ├── config.yml              # Route + receiver Telegram/Email
│   │   └── templates/vatm.tmpl    # Message template Telegram
│   ├── snmp/snmp.yml               # SNMP modules: Park Air T6 + ALE switch
│   ├── blackbox/blackbox.yml       # Probe modules: tcp_connect + icmp
│   └── simulate_metrics.py         # ★ Script giả lập metrics ED-137 cho lab
│
├── web-portal/                     # FastAPI Web Portal
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI routes + WebSocket + Ansible runner
│       └── static/
│           └── index.html          # ★ Frontend: Canvas topology + Grafana embed
│
├── ansible/                        # Tự động hóa đo kiểm
│   ├── ansible.cfg
│   ├── hosts.ini                   # Inventory: RCMS workstations + T6 radios
│   ├── group_vars/all.yml          # Variables: IP, ngưỡng ED-137, paths
│   └── playbooks/
│       ├── site.yml                # Master playbook
│       ├── 00_setup_lab.yml        # Setup môi trường lab
│       ├── 01_collect_metrics.yml  # ★ Thu thập BER/Latency/Jitter/Loss
│       ├── 02_generate_report.yml  # Xuất báo cáo Markdown + CSV
│       └── 03_ping_check.yml       # ICMP ping check nhanh toàn tuyến
│
├── BƯỚC1_ThietBi.md                # Bảng thiết bị 3 vị trí (TX/ATCC/RX)
├── BƯỚC3_QuyHoachIP.md             # Quy hoạch IP toàn hệ thống
├── BƯỚC5_AlertManager.md           # Hướng dẫn cấu hình Telegram + deploy
├── CHECKLIST_AUDIT_ED137.md        # Checklist kiểm tra chuẩn ED-137
└── README.md                       # Tài liệu này
```

---

## Triển khai nhanh (Lab / VMware Workstation)

### 1. Chuẩn bị

```powershell
# Clone repo
git clone https://github.com/LongThanhno1/Simulate-RCMS-ATCC-Long-Thanh.git
cd Simulate-RCMS-ATCC-Long-Thanh\monitoring

# Tạo file .env từ template
copy .env.template .env
# → Mở .env và điền: GRAFANA_ADMIN_PASSWORD, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
```

### 2. Khởi động stack

```powershell
# Production (Linux VM)
docker compose up -d

# Lab / Windows Docker Desktop (bỏ volume mount Linux)
docker compose -f docker-compose.yml -f docker-compose.lab.yml up -d
```

### 3. Truy cập

| Dịch vụ | URL | Thông tin đăng nhập |
|---------|-----|-------------------|
| **Web Portal** | http://localhost:8080 | — |
| **Grafana** | http://localhost:3000 | vatm_admin / (xem .env) |
| **Prometheus** | http://localhost:9090 | — |
| **Alertmanager** | http://localhost:9093 | — |
| **Pushgateway** | http://localhost:9091 | — |

### 4. Giả lập metrics ED-137 cho lab

Khi các thiết bị thực (10.60.x.x) không reachable, dùng script này để đẩy dữ liệu giả lập vào Pushgateway:

```bash
cd monitoring

# Chạy 1 lần (chế độ bình thường)
python simulate_metrics.py --mode normal

# Chạy liên tục mỗi 15s, xoay vòng trạng thái normal → warn → crit
python simulate_metrics.py --mode cycle --loop --interval 15

# Tùy chọn: --mode [normal | warn | crit | random | cycle]
```

Sau khi chạy, Grafana tự refresh sau ~30s và hiển thị số liệu trên ED-137 Overview dashboard.

### 5. Reset mật khẩu Grafana (nếu cần)

```bash
docker exec vatm_grafana grafana-cli admin reset-admin-password <mật_khẩu_mới>
```

---

## Tần số VHF — Danh sách kênh hệ thống

| # | Tần số (MHz) | Chức năng | TX MAIN | TX STBY | RX MAIN | RX STBY |
|---|-------------|-----------|---------|---------|---------|---------|
| 1 | 118.425 | Clearance Delivery chính | 10.60.7.71 | 10.60.7.81 | 10.60.6.71 | 10.60.6.81 |
| 2 | 121.725 | CLD dự phòng | 10.60.7.72 | 10.60.7.82 | 10.60.6.72 | 10.60.6.82 |
| 3 | 121.775 | Aerodrome Control chính | 10.60.7.73 | 10.60.7.83 | 10.60.6.73 | 10.60.6.83 |
| 4 | 121.850 | AD dự phòng | 10.60.7.74 | 10.60.7.84 | 10.60.6.74 | 10.60.6.84 |
| 5 | 121.925 | NW Ground chính | 10.60.7.75 | 10.60.7.85 | 10.60.6.75 | 10.60.6.85 |
| 6 | 124.325 | NW Ground dự phòng | 10.60.7.76 | 10.60.7.86 | 10.60.6.76 | 10.60.6.86 |
| 7 | 124.625 | NE Ground chính | 10.60.7.77 | 10.60.7.87 | 10.60.6.77 | 10.60.6.87 |
| 8 | 125.275 | NE Ground dự phòng | 10.60.7.78 | 10.60.7.88 | 10.60.6.78 | 10.60.6.88 |
| 9 | **121.500** | ⚠️ EMERGENCY | 10.60.7.79 | 10.60.7.89 | 10.60.6.79 | 10.60.6.89 |

---

## Grafana Dashboards

| Dashboard | UID | Mô tả |
|-----------|-----|-------|
| ED-137 Overview | `vatm-ed137-overview` | Sơ đồ tuyến TX→ATCC→RX, KPI tổng hợp, trạng thái cảnh báo |
| Park Air T6 Detail | `vatm-parkair-t6` | Metrics chi tiết từng radio: SNMP status, ping, TCP probe |
| VM & Network Health | `vatm-vm-health` | CPU/RAM/Disk Node Exporter, container health |

---

## Lưu ý bảo mật

- File `.env` chứa thông tin nhạy cảm — đã được `.gitignore`. **Không commit `.env` lên GitHub.**
- SNMP community string `vatm_ro` — chỉ read-only, chỉ bind trên LAN3 interface
- Grafana anonymous viewer được bật để nhúng iframe vào Web Portal — giới hạn quyền Viewer

---

## Tài liệu tham chiếu

- `BƯỚC1_ThietBi.md` — Bảng thiết bị 3 vị trí, thông số kỹ thuật
- `BƯỚC3_QuyHoachIP.md` — Quy hoạch IP, subnet, VLAN
- `BƯỚC5_AlertManager.md` — Hướng dẫn tạo Telegram Bot, cấu hình cảnh báo
- `CHECKLIST_AUDIT_ED137.md` — Checklist kiểm tra định kỳ theo ED-137
- `HLD_Hệ Thống Đường Truyền.pdf` — Tài liệu HLD gốc từ nhà thầu
- EUROCAE ED-137 — *Interoperability Standards for VoIP ATM Applications*
- VATM QĐ2999 — *Quy trình bảo dưỡng kỹ thuật hệ thống CNS*

---

**Tác giả:** Đỗ Thanh Long — ATSEP, Trung tâm KSKL Long Thành (ATCC), VATM SORATS  
**Phiên bản:** 2.0 — Tháng 6/2026
