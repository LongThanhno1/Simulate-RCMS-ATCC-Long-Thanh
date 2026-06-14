# 🛫 Simulate-RCMS · ATCC Long Thành

> **Hệ thống Web Portal mô phỏng giám sát tập trung và tự động hóa đo kiểm đường truyền thông tin liên lạc hàng không**  
> 📡 Chuẩn **EUROCAE ED-137** · 🏢 Trung tâm KSKL Long Thành (ATCC) · ✈️ VATM SORATS

---

## 📖 Tổng quan

**Simulate-RCMS** là dự án mô phỏng hệ thống **RCMS (Radio Control & Monitoring System)** phục vụ công tác giám sát, đo kiểm và cảnh báo chất lượng đường truyền thông tin liên lạc thoại hàng không (VoIP ATM) tại Trung tâm Kiểm soát Không lưu Long Thành.

Dự án được xây dựng nhằm hỗ trợ kỹ thuật viên ATSEP trong công tác:

- 🔍 **Giám sát trực quan** toàn tuyến đường truyền theo thời gian thực
- 📏 **Tự động hóa đo kiểm** các chỉ số chất lượng dịch vụ theo chuẩn ED-137
- 🔔 **Cảnh báo chủ động** khi đường truyền vi phạm ngưỡng an toàn hàng không
- 📋 **Lập báo cáo kỹ thuật** phục vụ công tác trực ca và bảo dưỡng định kỳ

---

## 🖥️ Thiết bị trong hệ thống

Hệ thống giám sát bao gồm các nhóm thiết bị chuyên dụng hàng không tại các vị trí:

| 📍 Vị trí | 🔧 Loại thiết bị | 🏭 Nhà sản xuất |
|-----------|-----------------|----------------|
| Trạm phát (TX) | Máy phát VHF AM — MAIN & STANDBY | Park Air Systems / UK |
| Trạm thu (RX) | Máy thu VHF AM — MAIN & STANDBY | Park Air Systems / UK |
| CNS Room (ATCC) | Gateway VoIP ED-137 — Primary & Standby | Frequentis / Áo |
| CNS Room (ATCC) | Switch mạch vòng — RED & BLUE Core | ALE (Alcatel-Lucent Enterprise) |
| Tháp kiểm soát | Máy phát/thu VHF tích hợp + Controller | Park Air Systems / UK |

> 💡 Các thiết bị được monitor theo chuẩn quốc tế ED-137 và quy trình kỹ thuật của VATM.

---

## ✨ Tính năng

| # | Phân hệ | Mô tả |
|---|---------|-------|
| 🗺️ | **Sơ đồ NOC tương tác** | Canvas topology 2D hiển thị trạng thái toàn tuyến theo màu sắc ED-137 (🟢 🟡 🔴) |
| 📊 | **Giám sát Real-time** | Thu thập & hiển thị chỉ số KPI liên tục, cập nhật tự động |
| ⚡ | **Ping kiểm tra nhanh** | Kiểm tra kết nối từng thiết bị trực tiếp từ giao diện Web |
| 🤖 | **Đo kiểm tự động** | Tự động hóa quy trình đo kiểm Latency / Jitter / Packet Loss |
| 🔔 | **Cảnh báo chủ động** | Gửi cảnh báo tức thì về Telegram khi vi phạm ngưỡng ED-137 |
| 📄 | **Báo cáo kỹ thuật** | Tự động xuất báo cáo ca trực dạng Markdown / Excel |
| 📂 | **Lịch sử đo kiểm** | Lưu trữ và tra cứu lịch sử kết quả đo kiểm theo thời gian |
| 🗂️ | **Quản lý thiết bị** | Danh sách thiết bị chi tiết kèm tần số, trạng thái và ghi chú kỹ thuật |
| 💾 | **Kế hoạch tần số** | Quản lý và lưu kế hoạch tần số VHF trực tiếp trên giao diện |

---

## 📐 Ngưỡng KPI — EUROCAE ED-137

| Chỉ số chất lượng | 🟢 Bình thường | 🟡 Cảnh báo | 🔴 Vi phạm |
|-------------------|---------------|------------|-----------|
| One-way Delay | < 50 ms | 50 – 100 ms | **> 100 ms** |
| Jitter | < 10 ms | 10 – 20 ms | **> 20 ms** |
| Packet Loss | < 0.1% | 0.1 – 1% | **> 1%** |
| VSWR Anten | ≤ 1.5 : 1 | 1.5 – 2.0 : 1 | **> 2.0 : 1** |
| BER đường truyền | < 10⁻⁶ | 10⁻⁶ – 10⁻⁴ | **> 10⁻⁴** |

---

## 🧰 Công nghệ sử dụng

```
🐳 Docker Compose  — Container hóa toàn bộ stack
📈 Prometheus      — Thu thập & lưu trữ metrics chuỗi thời gian
📊 Grafana         — Dashboard giám sát trực quan
📡 SNMP Exporter   — Truy vấn thông số thiết bị qua SNMP
🔎 Blackbox Exporter — Kiểm tra kết nối TCP / ICMP
🔄 Pushgateway     — Nhận metrics từ Ansible playbook
🤖 Ansible         — Tự động hóa tác vụ đo kiểm từ xa
⚡ FastAPI (Python) — Backend Web Portal
🎨 HTML / CSS / JS — Frontend Canvas Topology + UI
```

---

## 🗂️ Cấu trúc dự án

```
Simulate-RCMS-ATCC-Long-Thanh/
├── 📁 monitoring/              # Docker stack chính
│   ├── docker-compose.yml      # Định nghĩa các dịch vụ
│   ├── prometheus/             # Cấu hình thu thập metrics + alert rules
│   ├── grafana/                # Dashboard provisioning
│   ├── alertmanager/           # Cấu hình cảnh báo
│   ├── snmp/                   # Module SNMP thiết bị
│   ├── blackbox/               # Module probe TCP/ICMP
│   └── simulate_metrics.py     # Script giả lập metrics cho lab
│
├── 📁 web-portal/              # FastAPI + Giao diện Web
│   └── app/
│       ├── main.py             # Backend API routes + WebSocket
│       └── static/             # Frontend: HTML, CSS, JavaScript
│
├── 📁 ansible/                 # Tự động hóa đo kiểm
│   ├── hosts.ini               # Inventory thiết bị
│   ├── group_vars/             # Biến cấu hình
│   └── playbooks/              # Kịch bản đo kiểm & báo cáo
│
└── 📄 README.md
```

---

## 🚀 Khởi động hệ thống (Lab)

> ⚠️ Xem file `.env.template` để chuẩn bị các biến môi trường cần thiết trước khi khởi động.  
> Tuyệt đối **không commit** file `.env` lên repository.

**Bước cơ bản:**
1. Copy `.env.template` → `.env` và điền các giá trị cấu hình
2. Khởi động Docker stack
3. Truy cập Web Portal tại địa chỉ localhost

**Giả lập metrics cho lab** (khi thiết bị thực không khả dụng):
```bash
# Chế độ bình thường
python simulate_metrics.py --mode normal

# Xoay vòng trạng thái (normal → warn → crit) liên tục
python simulate_metrics.py --mode cycle --loop --interval 15
```

---

## 📚 Tài liệu tham chiếu

| # | Tài liệu | Nguồn |
|---|----------|-------|
| 1 | **EUROCAE ED-137** — *Interoperability Standards for VoIP ATM Applications* | EUROCAE |
| 2 | **Quy trình quản lý kỹ thuật QĐ2999** — *Bảo dưỡng & kiểm tra hệ thống CNS* | VATM |
| 3 | **Quy trình xử lý sự cố đường truyền** | VATM SORATS |
| 4 | **Tài liệu kỹ thuật thiết bị** — *T6-TV / T6-RV / xMG / OmniSwitch* | Nhà thầu cung cấp |
| 5 | **Biên bản nghiệm thu & hồ sơ hoàn công** (BVTC) — Hệ thống VCCS ATCC Long Thành | Nhà thầu |
| 6 | **ICAO Doc 9985** — *Manual on VHF Air-Ground Communications* | ICAO |

---

## 👨‍💻 Tác giả

**Đỗ Thanh Long**  
🎖️ Kỹ sư kỹ thuật ATSEP — Trung tâm KSKL Long Thành (ATCC)  
🏢 Công ty QLBMN (VATM SORATS) · Tổng công ty Quản lý bay Việt Nam (VATM)  
📅 Phiên bản 2.1 — Tháng 06/2026

---

### ⚠️ Miễn trừ trách nhiệm

> Đây là **dự án cá nhân mô phỏng** (simulation) được xây dựng phục vụ mục đích **học tập, nghiên cứu và đào tạo nội bộ**.
>
> - Toàn bộ dữ liệu, thông số kỹ thuật và cấu hình trong dự án này đều là **dữ liệu giả lập** hoặc đã được ẩn danh hóa, **không phản ánh cấu hình vận hành thực tế** của hệ thống CNS/ATM tại ATCC Long Thành.
> - Dự án **không thuộc** và **không đại diện** cho bất kỳ hệ thống chính thức nào của VATM, VATM SORATS hay cơ quan hàng không dân dụng Việt Nam.
> - Tuyệt đối **không sử dụng** mã nguồn hoặc cấu hình trong dự án này để can thiệp vào hệ thống vận hành thực tế.
> - Tác giả **không chịu trách nhiệm** về bất kỳ thiệt hại nào phát sinh từ việc sử dụng sai mục đích dự án này.
