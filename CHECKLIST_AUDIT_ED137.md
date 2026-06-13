# CHECKLIST KIỂM TOÁN HỆ THỐNG ED-137
## Dự án: Giám sát Đường truyền Từ xa – ATCC Long Thành

> **Vai trò:** System Auditor – Tiền kiểm tra trước giai đoạn viết mã nguồn  
> **Phạm vi:** Đài KSKL Long Thành ↔ Trạm Phát (TX) ↔ Trạm Thu (RX)  
> **Ngày lập:** 2026-06-12  
> **Phiên bản:** v1.0

---

## NHÓM 1 – KIỂM TRA CHỈ SỐ THEO TIÊU CHUẨN ED-137

### 1.1 Bảng KPI Bắt Buộc – VoIP ATM Applications (EUROCAE ED-137B/C)

| # | Chỉ số (KPI) | Ngưỡng Tối Đa | Đơn vị | Phương pháp đo |
|---|---|---|---|---|
| 1 | **One-way Delay** (Độ trễ một chiều) | < 100 | ms | iPerf3 / TWAMP / Ping RTT ÷ 2 |
| 2 | **Jitter** (Biến động trễ – RFC 3550) | < 20 | ms | iPerf3 UDP / RTP stream analysis |
| 3 | **Packet Loss** (Tỷ lệ mất gói) | < 1 | % | iPerf3 UDP loss / SNMP ifInDiscards |
| 4 | **MOS Score** (Mean Opinion Score) | ≥ 4.0 | – | Tính toán từ Delay + Jitter + Loss |
| 5 | **Codec Delay** (G.711 / G.729) | < 20 | ms | Tham số cấu hình thiết bị |
| 6 | **Link Availability** (Khả dụng tuyến) | ≥ 99.9 | % | Uptime monitor / SNMP |

> **Ghi chú ED-137B Clause 7.2:** Áp dụng cho tất cả luồng thoại PTT (Push-To-Talk) giữa VCCS và các Radio trạm xa. Yêu cầu đo kiểm liên tục mỗi giờ trong ca trực.

---

### 1.2 Bảng Phân Cấp Cảnh Báo (Traffic Light Model)

| Cấp độ | Màu | Ngưỡng Delay | Ngưỡng Jitter | Ngưỡng Loss | Hành động |
|---|---|---|---|---|---|
| **BÌNH THƯỜNG** | 🟢 Xanh | < 80 ms | < 15 ms | < 0.5% | Ghi log, không alert |
| **CẢNH BÁO** | 🟡 Vàng | 80–100 ms | 15–20 ms | 0.5–1% | Alert Telegram (Warning) |
| **SỰ CỐ** | 🔴 Đỏ | > 100 ms | > 20 ms | > 1% | Alert Telegram (Critical) + Email |
| **MẤT KẾT NỐI** | ⚫ Đen | Timeout | Timeout | 100% | Page on-call ngay lập tức |

> **Cấu hình Grafana:** Dùng `Threshold` panel → màu sắc tương ứng theo bảng trên.  
> **Alertmanager:** Route cấp `warning` → Telegram; cấp `critical` → Telegram + Email.

---

### 1.3 Checklist Xác Nhận Tuân Thủ ED-137

- [ ] Xác nhận tài liệu tham chiếu: EUROCAE ED-137B (VoIP) / ED-137C (nếu có phiên bản mới)
- [ ] Xác nhận codec VoIP đang dùng tại VCCS: G.711 / G.729 / Opus [?]
- [ ] Xác nhận giao thức tầng vận chuyển: RTP/UDP over IP
- [ ] Xác nhận dải địa chỉ IP của luồng thoại (VoIP VLAN ID) [?]
- [ ] Xác nhận tần suất đo kiểm bắt buộc: mỗi giờ / đầu ca sáng
- [ ] Xác nhận điểm đo (measurement point): tại Gateway VCCS hay tại router trạm?

---

## NHÓM 2 – KIỂM TRA ĐẦU MỤC CÔNG VIỆC THEO QUY TRÌNH KỸ THUẬT 2999

### 2.1 Bảng Chuyển Đổi QT2999 → Tác Vụ Tự Động Hóa

| # | Hạng mục QT2999 | Chu kỳ | Tác vụ tự động (Ansible/Script) | Giao thức |
|---|---|---|---|---|
| 1 | Kiểm tra trạng thái đường truyền IP | Mỗi giờ | Ping + iPerf3 UDP test đến TX/RX | ICMP / UDP |
| 2 | Đo độ trễ và biến động trễ | Mỗi giờ | `iperf3 -c <IP> -u -b 1M -t 30 --json` | UDP |
| 3 | Đo tỷ lệ mất gói | Mỗi giờ | Parse output iPerf3 → Prometheus metric | UDP |
| 4 | Kiểm tra trạng thái Port IP/E1 | Mỗi giờ | SNMP walk `ifOperStatus`, `ifAdminStatus` | SNMP v2c |
| 5 | Kiểm tra băng thông tuyến | Đầu ca sáng | iPerf3 TCP throughput test | TCP |
| 6 | Kiểm tra CPU / RAM thiết bị | Mỗi giờ | SNMP OID `hrProcessorLoad`, `hrStorageUsed` | SNMP v2c |
| 7 | Kiểm tra nhiệt độ thiết bị | Mỗi giờ | SNMP OID nhiệt độ (vendor-specific) [?] | SNMP v2c |
| 8 | Kiểm tra trạng thái nguồn điện | Đầu ca sáng | SNMP OID power supply status [?] | SNMP v2c |
| 9 | Kiểm tra đồng bộ thời gian NTP | Đầu ca sáng | SSH → `show ntp status` | SSH/CLI |
| 10 | Xuất báo cáo ca trực | Đầu ca / cuối ca | Ansible → tổng hợp → render Markdown/Excel | Python |

---

### 2.2 Checklist Tác Vụ Ansible Playbook Cần Xây Dựng

- [ ] `playbook_ping_test.yml` – Ping sweep tất cả node TX/RX
- [ ] `playbook_iperf3_udp.yml` – Đo Delay/Jitter/Loss theo chuẩn ED-137
- [ ] `playbook_iperf3_tcp.yml` – Đo throughput băng thông đầu ca
- [ ] `playbook_snmp_port_status.yml` – Kiểm tra trạng thái port IP/E1
- [ ] `playbook_snmp_hw_status.yml` – CPU, RAM, nhiệt độ, nguồn
- [ ] `playbook_ntp_check.yml` – Đồng bộ thời gian
- [ ] `playbook_report_gen.yml` – Tổng hợp và xuất báo cáo
- [ ] `cron_hourly.yml` – Orchestrator chạy định kỳ mỗi giờ
- [ ] `cron_morning_shift.yml` – Orchestrator chạy đầu ca sáng

---

### 2.3 Checklist Lệnh/Giao Thức Cần Kích Hoạt

```
# Kiểm tra kết nối cơ bản
ping -c 100 -i 0.2 <IP_TX/RX>           → loss%, avg RTT

# Đo ED-137 metrics
iperf3 -c <IP> -u -b 1M -t 60 --json    → jitter, loss (UDP)
iperf3 -c <IP> -t 30 --json             → bandwidth (TCP)

# SNMP query
snmpwalk -v2c -c <community> <IP> ifOperStatus
snmpwalk -v2c -c <community> <IP> hrProcessorLoad
snmpget  -v2c -c <community> <IP> <thermal_OID>

# SSH CLI (router-specific)
ssh admin@<IP> "show interface status"
ssh admin@<IP> "show ip interface brief"
ssh admin@<IP> "show ntp associations"
```

---

## NHÓM 3 – DANH SÁCH THIẾT BỊ VÀ THÔNG SỐ CẦN THU THẬP

### 3.1 Bảng Quy Hoạch Thiết Bị – Đài KSKL Long Thành (Nút Trung Tâm)

| # | Thiết bị | Vai trò | IP Quản lý | SNMP Community | Giao thức thu thập | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | Router/Switch trung tâm | Cửa ngõ kết nối TX/RX | [?] | [?] | SNMP v2c + SSH | [ ] Xác nhận |
| 2 | VCCS Gateway | Giao tiếp thoại ATM | [?] | [?] | SNMP + REST API | [ ] Xác nhận |
| 3 | Server giám sát (VM Host) | Chạy Docker/K8s stack | [?] | N/A | Local | [ ] Sẵn sàng |
| 4 | iPerf3 Server | Điểm đo tham chiếu | [?] | N/A | TCP/UDP | [ ] Cài đặt |
| 5 | NTP Server | Đồng bộ thời gian toàn tuyến | [?] | [?] | SNMP | [ ] Xác nhận |

---

### 3.2 Bảng Quy Hoạch Thiết Bị – Trạm Phát (TX) và Trạm Thu (RX)

| # | Thiết bị | Vị trí | IP Quản lý | SNMP Community | Giao thức | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | Router/Modem trạm TX | Trạm Phát | [?] | [?] | SNMP v2c + SSH | [ ] Xác nhận |
| 2 | VHF Radio / Transceiver TX | Trạm Phát | [?] | [?] | SNMP hoặc RS-232 [?] | [ ] Xác nhận |
| 3 | Router/Modem trạm RX | Trạm Thu | [?] | [?] | SNMP v2c + SSH | [ ] Xác nhận |
| 4 | VHF Radio / Receiver RX | Trạm Thu | [?] | [?] | SNMP hoặc RS-232 [?] | [ ] Xác nhận |
| 5 | iPerf3 Client (TX/RX) | Cả hai trạm | [?] | N/A | UDP/TCP | [ ] Cài đặt |

---

### 3.3 Bảng SNMP OID Cần Thu Thập

| # | Tham số | OID Chuẩn (MIB-II / HOST-MIB) | Mô tả |
|---|---|---|---|
| 1 | Trạng thái Port | `1.3.6.1.2.1.2.2.1.8` (ifOperStatus) | up(1), down(2), testing(3) |
| 2 | Tốc độ Port | `1.3.6.1.2.1.2.2.1.5` (ifSpeed) | bits/s |
| 3 | Lưu lượng vào | `1.3.6.1.2.1.2.2.1.10` (ifInOctets) | bytes |
| 4 | Lưu lượng ra | `1.3.6.1.2.1.2.2.1.16` (ifOutOctets) | bytes |
| 5 | Gói lỗi vào | `1.3.6.1.2.1.2.2.1.14` (ifInErrors) | count |
| 6 | Gói lỗi ra | `1.3.6.1.2.1.2.2.1.20` (ifOutErrors) | count |
| 7 | Tải CPU | `1.3.6.1.2.1.25.3.3.1.2` (hrProcessorLoad) | % |
| 8 | Bộ nhớ dùng | `1.3.6.1.2.1.25.2.3.1.6` (hrStorageUsed) | allocation units |
| 9 | Uptime thiết bị | `1.3.6.1.2.1.1.3.0` (sysUpTime) | TimeTicks |
| 10 | Nhiệt độ | Vendor-specific [?] | °C – cần xác nhận per-device |
| 11 | Trạng thái nguồn | Vendor-specific [?] | normal/fail – cần xác nhận |

> **Lưu ý:** Các OID nhiệt độ và nguồn điện phụ thuộc vào từng hãng sản xuất (Nokia, Cisco, Juniper...). Cần cung cấp model thiết bị cụ thể để tra cứu enterprise MIB.

---

## NHÓM 4 – CHECK-LIST PHẦN MỀM VÀ MÔI TRƯỜNG LAB (DOCKER/K8S)

### 4.1 Bảng Docker Image & Dịch Vụ Cần Triển Khai

| # | Dịch vụ | Docker Image | Version | Port | Vai trò | Trạng thái |
|---|---|---|---|---|---|---|
| 1 | **Web Backend** | `python:3.11-slim` | 3.11 | 8000 | FastAPI – Điều khiển Ansible | [ ] Build |
| 2 | **Ansible Runner** | `cytopia/ansible` / custom | latest | – | Chạy Playbook tự động | [ ] Build |
| 3 | **Prometheus** | `prom/prometheus` | v2.51+ | 9090 | Thu thập & lưu trữ metrics | [ ] Pull |
| 4 | **SNMP Exporter** | `prom/snmp-exporter` | v0.25+ | 9116 | SNMP → Prometheus | [ ] Pull |
| 5 | **iPerf3 Exporter** | Custom / `networkstatic/iperf3` | latest | 9200 | iPerf3 → Prometheus metrics | [ ] Build |
| 6 | **Grafana** | `grafana/grafana` | v10.4+ | 3000 | Dashboard & Visualization | [ ] Pull |
| 7 | **Alertmanager** | `prom/alertmanager` | v0.27+ | 9093 | Gửi cảnh báo Telegram/Email | [ ] Pull |
| 8 | **Node Exporter** | `prom/node-exporter` | v1.8+ | 9100 | Giám sát host VM server | [ ] Pull |
| 9 | **Redis** | `redis:alpine` | 7.x | 6379 | Cache kết quả đo, session | [ ] Pull |
| 10 | **Nginx** | `nginx:alpine` | latest | 80/443 | Reverse proxy + SSL termination | [ ] Pull |

---

### 4.2 Cấu Hình Tài Nguyên VM Host (VMware Workstation – Tối Giản)

| VM / Container | vCPU | RAM | Disk | OS | Ghi chú |
|---|---|---|---|---|---|
| **VM Chính (Docker Host)** | 4 core | 8 GB | 60 GB SSD | Ubuntu 22.04 LTS | Chạy toàn bộ Docker stack |
| **VM iPerf3 Server** | 1 core | 1 GB | 20 GB | Ubuntu 22.04 LTS | Điểm đo tham chiếu tại trung tâm |
| **VM giả lập TX** | 1 core | 1 GB | 20 GB | Ubuntu 22.04 LTS | Giả lập Trạm Phát cho Lab |
| **VM giả lập RX** | 1 core | 1 GB | 20 GB | Ubuntu 22.04 LTS | Giả lập Trạm Thu cho Lab |
| **Tổng cộng** | **7 core** | **11 GB** | **120 GB** | – | Khuyến nghị host ≥ 16GB RAM |

---

### 4.3 Checklist Phần Mềm Cần Cài Đặt Trên VM Host

**Hệ thống nền:**
- [ ] Ubuntu 22.04 LTS (đã cài đặt)
- [ ] Docker Engine v24+ (`apt install docker-ce`)
- [ ] Docker Compose v2.x (`docker compose version`)
- [ ] Git (`git --version`)
- [ ] Python 3.11 + pip (`python3 --version`)
- [ ] Ansible Core 2.15+ (`ansible --version`)

**Công cụ đo kiểm mạng (cài trên tất cả VM):**
- [ ] iPerf3 (`apt install iperf3`)
- [ ] nmap (`apt install nmap`)
- [ ] tcpdump (`apt install tcpdump`)
- [ ] snmp / snmp-mibs-downloader (`apt install snmp`)
- [ ] mtr – traceroute nâng cao (`apt install mtr`)

**Thông tin bổ sung cần cấu hình:**
- [ ] Telegram Bot Token & Chat ID [?]
- [ ] Email SMTP credentials cho Alertmanager [?]
- [ ] SSH key pair để Ansible kết nối thiết bị TX/RX [?]
- [ ] SNMP community string các thiết bị [?]
- [ ] Dải subnet / VLAN management của trạm TX và RX [?]

---

### 4.4 Checklist Cấu Trúc File Dự Án (Sẽ Xây Dựng Bước 2–5)

```
ed137-monitor/
├── docker-compose.yml          [ ] Bước 2
├── .env                        [ ] Bước 2
├── prometheus/
│   ├── prometheus.yml          [ ] Bước 2
│   └── alert_rules.yml         [ ] Bước 5
├── alertmanager/
│   └── alertmanager.yml        [ ] Bước 5
├── grafana/
│   ├── provisioning/           [ ] Bước 4
│   └── dashboards/             [ ] Bước 4
├── snmp_exporter/
│   └── snmp.yml                [ ] Bước 2
├── ansible/
│   ├── inventory/
│   │   └── hosts.yml           [ ] Bước 3
│   ├── group_vars/
│   │   └── all.yml             [ ] Bước 3
│   └── playbooks/
│       ├── ping_test.yml       [ ] Bước 3
│       ├── iperf3_test.yml     [ ] Bước 3
│       ├── snmp_check.yml      [ ] Bước 3
│       └── report_gen.yml      [ ] Bước 3
└── web/
    ├── main.py (FastAPI)       [ ] Bước 4
    ├── requirements.txt        [ ] Bước 4
    └── templates/              [ ] Bước 4
```

---

## TÓM TẮT – THÔNG SỐ CẦN NGƯỜI DÙNG BỔ SUNG [?]

> Các mục đánh dấu `[?]` dưới đây cần anh cung cấp trước khi bắt đầu Bước 2:

| # | Thông tin cần bổ sung | Nhóm | Mức độ ưu tiên |
|---|---|---|---|
| 1 | Codec VoIP đang dùng tại VCCS (G.711 / G.729 / Opus) | Nhóm 1 | 🔴 Cao |
| 2 | VLAN ID / dải IP của luồng thoại VoIP | Nhóm 1 | 🔴 Cao |
| 3 | IP Management của Router/Switch trung tâm Long Thành | Nhóm 3 | 🔴 Cao |
| 4 | IP Management của Router trạm TX và RX | Nhóm 3 | 🔴 Cao |
| 5 | SNMP community string (read-only) các thiết bị | Nhóm 3 | 🔴 Cao |
| 6 | Hãng & model thiết bị TX/RX (để tra MIB nhiệt độ/nguồn) | Nhóm 3 | 🟡 Trung bình |
| 7 | Telegram Bot Token + Chat ID nhận cảnh báo | Nhóm 4 | 🟡 Trung bình |
| 8 | Thông tin SMTP cho Alertmanager Email | Nhóm 4 | 🟡 Trung bình |
| 9 | VCCS có hỗ trợ SNMP hay chỉ có REST API? | Nhóm 3 | 🟡 Trung bình |
| 10 | VHF Radio trạm TX/RX có cổng quản lý IP không? | Nhóm 3 | 🟡 Trung bình |
| 11 | Tài liệu enterprise MIB của hãng router TX/RX | Nhóm 3 | 🟢 Thấp |

---

*Tài liệu này là cơ sở kiểm toán đầu vào (Input Audit Baseline) cho toàn bộ dự án.  
Khi anh bổ sung đủ các mục [?] ưu tiên Cao, hệ thống sẽ sẵn sàng bước vào Bước 2: Viết Dockerfile và docker-compose.yml.*
