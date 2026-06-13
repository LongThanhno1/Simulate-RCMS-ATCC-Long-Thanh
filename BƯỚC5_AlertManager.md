# BƯỚC 5 — Cảnh báo Chủ động: Alertmanager + Telegram + Triển khai Stack

**Hệ thống:** VATM ATCC Long Thành | Park Air VHF Monitoring | ED-137  
**Ngày:** 2026-06-12  
**Phiên bản:** 1.0

---

## Tổng quan

BƯỚC 5 hoàn thiện toàn bộ stack giám sát với cơ chế cảnh báo chủ động:
- **Alertmanager** nhận firing alerts từ Prometheus
- **Telegram Bot** bắn tin nhắn cảnh báo thời gian thực (<30 giây)
- **Gmail** gửi email backup cho cảnh báo critical
- **Docker Compose** dựng toàn bộ 8 services trong 1 lệnh

Luồng cảnh báo:

```
Park Air T6 / S4-IP / Switches
        ↓ (SNMP/TCP/ICMP)
   SNMP/Blackbox Exporter
        ↓ (metrics)
      Prometheus
        ↓ (alert rules vi phạm ngưỡng)
    Alertmanager
     ↙         ↘
Telegram Bot   Gmail
(real-time)   (backup)
```

---

## Phần 1 — Tạo Telegram Bot

### 1.1 Tạo Bot mới qua BotFather

1. Mở Telegram → tìm **@BotFather** → nhắn `/start`
2. Nhắn `/newbot`
3. Đặt tên hiển thị: `VATM ATCC Long Thành Monitor`
4. Đặt username (phải kết thúc bằng `bot`): `vatm_longthanh_monitor_bot`
5. BotFather trả về token dạng:
   ```
   1234567890:ABCDefGhIJKlmNoPQRsTUVwxyZ
   ```
6. **Lưu token này** → điền vào `TELEGRAM_BOT_TOKEN` trong file `.env`

### 1.2 Tạo Group cảnh báo

1. Tạo Telegram Group mới: `VATM ATCC Alert - Kỹ thuật VHF`
2. Thêm bot vào group (tìm theo username đã tạo)
3. Thêm tất cả kỹ thuật viên trực ca vào group

### 1.3 Lấy Chat ID của Group

**Cách 1 — qua API:**
1. Gửi 1 tin nhắn bất kỳ vào group (để tạo update)
2. Mở trình duyệt, truy cập:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
   (thay `<TOKEN>` bằng token thực)
3. Tìm `"chat":{"id": -XXXXXXXXXX}` → Chat ID là số âm (group)

**Cách 2 — qua @userinfobot:**
1. Thêm @userinfobot vào group
2. Bot tự gửi thông tin group bao gồm Chat ID
3. Sau khi lấy được ID, remove bot ra khỏi group

4. **Lưu Chat ID** → điền vào `TELEGRAM_CHAT_ID` trong file `.env`

### 1.4 Test Bot hoạt động

```bash
# Thay TOKEN và CHAT_ID bằng giá trị thực
TOKEN="1234567890:ABCDefGhIJKlmNoPQRsTUVwxyZ"
CHAT_ID="-1001234567890"

curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -d "chat_id=${CHAT_ID}" \
  -d "parse_mode=Markdown" \
  -d "text=✅ *Test thành công!* Bot VATM đã kết nối."
```

Nếu trả về `"ok":true` → Bot hoạt động bình thường.

---

## Phần 2 — Cấu hình Gmail App Password (tùy chọn)

> Bỏ qua phần này nếu chỉ dùng Telegram.

1. Đăng nhập [myaccount.google.com](https://myaccount.google.com)
2. **Security** → **2-Step Verification** → Bật nếu chưa bật
3. **Security** → **App Passwords** → Chọn **Mail** → **Other (Custom name)**
4. Đặt tên: `VATM Alertmanager`
5. Copy **16-character password** (dạng: `abcd efgh ijkl mnop`)
6. Điền vào `GMAIL_APP_PASSWORD` trong `.env` (không có dấu cách)

---

## Phần 3 — Cấu hình file .env

```bash
# Trên VM1 (Ubuntu), trong thư mục monitoring/
cd monitoring/
cp .env.template .env
nano .env
```

Điền đầy đủ các giá trị:

```bash
MONITOR_HOST=192.168.100.10        # IP VM1

GRAFANA_ADMIN_USER=vatm_admin
GRAFANA_ADMIN_PASSWORD=VatmGrafana@2025!  # Đổi password mạnh

TELEGRAM_BOT_TOKEN=1234567890:ABCDefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_CHAT_ID=-1001234567890

ALERT_EMAIL_TO=thanhlong01vt@gmail.com
ALERT_EMAIL_FROM=your.gmail@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

> ⚠️ **Quan trọng:** File `.env` chứa thông tin nhạy cảm. Đảm bảo `.gitignore` đã có entry cho `.env`:
> ```bash
> echo "monitoring/.env" >> .gitignore
> ```

---

## Phần 4 — Cập nhật alertmanager/config.yml

File `monitoring/alertmanager/config.yml` hiện dùng placeholder. Cần cập nhật để đọc từ biến môi trường.

> **Lưu ý về env vars trong Alertmanager config:**  
> Alertmanager **không hỗ trợ** đọc biến môi trường trực tiếp trong config.yml dạng `${VAR}`.  
> Giải pháp: dùng `envsubst` để render config trước khi mount vào container, hoặc dùng file secret riêng.

### 4.1 Tạo script render config

```bash
# Tạo file monitoring/alertmanager/render-config.sh
cat > monitoring/alertmanager/render-config.sh << 'EOF'
#!/bin/bash
# Render alertmanager/config.yml từ template với env vars
set -e
source /app/monitoring/.env

envsubst '${TELEGRAM_BOT_TOKEN} ${TELEGRAM_CHAT_ID} ${GMAIL_APP_PASSWORD} ${ALERT_EMAIL_FROM} ${ALERT_EMAIL_TO} ${MONITOR_HOST}' \
  < /app/monitoring/alertmanager/config.yml.template \
  > /app/monitoring/alertmanager/config.yml

echo "✅ Alertmanager config rendered successfully"
EOF
chmod +x monitoring/alertmanager/render-config.sh
```

### 4.2 Cách đơn giản hơn — thay thủ công

Mở `monitoring/alertmanager/config.yml` và thay thế:

| Placeholder | Giá trị thực |
|---|---|
| `<TELEGRAM_BOT_TOKEN>` | Token từ BotFather |
| `<TELEGRAM_CHAT_ID>` | Chat ID (số nguyên, âm nếu là group) |
| `<GMAIL_APP_PASSWORD>` | App Password 16 ký tự |

```bash
# Dùng sed để thay thế (đọc từ .env):
source monitoring/.env

sed -i "s/<TELEGRAM_BOT_TOKEN>/${TELEGRAM_BOT_TOKEN}/g" monitoring/alertmanager/config.yml
sed -i "s/<TELEGRAM_CHAT_ID>/${TELEGRAM_CHAT_ID}/g" monitoring/alertmanager/config.yml
sed -i "s/<GMAIL_APP_PASSWORD>/${GMAIL_APP_PASSWORD}/g" monitoring/alertmanager/config.yml

echo "✅ Config updated"
```

---

## Phần 5 — Triển khai Stack

### 5.1 Chuẩn bị thư mục

```bash
# Kiểm tra cấu trúc thư mục trước khi chạy
ls -la monitoring/
# Phải có: docker-compose.yml, .env, prometheus/, alertmanager/, snmp/, blackbox/, grafana/

# Kiểm tra .env đã có đủ giá trị
cat monitoring/.env | grep -v "^#" | grep -v "^$"
```

### 5.2 Build Web Portal image

```bash
cd monitoring/
docker compose build web-portal
```

### 5.3 Khởi động toàn bộ stack

```bash
cd monitoring/
docker compose up -d

# Xem tiến trình khởi động
docker compose ps

# Xem log real-time
docker compose logs -f
```

### 5.4 Kiểm tra health các service

```bash
# Chờ 30-60 giây cho các container healthy
docker compose ps

# Kết quả mong đợi (tất cả STATUS = running (healthy)):
# vatm_prometheus        running (healthy)
# vatm_grafana           running (healthy)
# vatm_alertmanager      running (healthy)
# vatm_snmp_exporter     running (healthy)
# vatm_blackbox_exporter running (healthy)
# vatm_pushgateway       running (healthy)
# vatm_web_portal        running (healthy)
# vatm_node_exporter     running
```

### 5.5 Kiểm tra từng service

| Service | URL | Kiểm tra |
|---|---|---|
| Prometheus | http://192.168.100.10:9090 | Status → Targets (tất cả UP) |
| Grafana | http://192.168.100.10:3000 | Login với vatm_admin |
| Alertmanager | http://192.168.100.10:9093 | Status → Config |
| Web Portal | http://192.168.100.10:8080 | Dashboard hiển thị |
| SNMP Exporter | http://192.168.100.10:9116/metrics | Trả về metrics |
| Blackbox Exporter | http://192.168.100.10:9115/metrics | Trả về metrics |
| Pushgateway | http://192.168.100.10:9091 | Trang chủ hiển thị |
| Node Exporter | http://192.168.100.10:9100/metrics | Trả về metrics |

---

## Phần 6 — Test Cảnh báo Telegram

### 6.1 Gửi test alert thủ công qua Alertmanager API

```bash
# Gửi alert test trực tiếp đến Alertmanager
curl -s -X POST http://192.168.100.10:9093/api/v2/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TEST_VHF_Radio_Down",
      "severity": "critical",
      "site": "tx",
      "instance": "10.60.7.71",
      "job": "snmp_tx_t6tv_main"
    },
    "annotations": {
      "summary": "TEST: T6-TV #1 Trạm TX không phản hồi SNMP",
      "description": "ĐÂY LÀ CẢNH BÁO THỬ NGHIỆM — không phải sự cố thực"
    },
    "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }]'
```

Telegram group nhận được tin nhắn trong vòng 10-30 giây.

### 6.2 Test Prometheus firing alert

```bash
# Tạm thời hạ ngưỡng để trigger alert (chỉ dùng test)
# Ví dụ: đổi ngưỡng jitter từ > 20ms xuống > 0.1ms
# Sau khi test xong, đặt lại ngưỡng đúng

# Reload config sau khi sửa rules
curl -X POST http://192.168.100.10:9090/-/reload
```

### 6.3 Kiểm tra Alertmanager nhận alert từ Prometheus

```bash
# Xem alert đang active
curl -s http://192.168.100.10:9093/api/v2/alerts | python3 -m json.tool | grep -E '"alertname"|"state"'
```

---

## Phần 7 — Cấu trúc file hoàn chỉnh sau BƯỚC 5

```
monitoring/
├── docker-compose.yml          ✅ 8 services: Prometheus, Grafana, Alertmanager,
│                                              SNMP/Blackbox/Pushgateway, WebPortal, NodeExporter
├── .env.template               ✅ Template biến môi trường
├── .env                        🔒 File thực (KHÔNG commit Git)
│
├── prometheus/
│   ├── prometheus.yml          ✅ 13 scrape jobs (T6-TV, T6-RV, T6-TRV, S4-IP, switches)
│   └── rules/
│       ├── park_air_t6_alerts.yml   ✅ Alert rules thiết bị Park Air
│       ├── ed137_alerts.yml         ✅ Alert rules vi phạm ED-137 KPI
│       └── switch_alerts.yml        ✅ Alert rules ALE switches
│
├── alertmanager/
│   ├── config.yml              ✅ Routing: Telegram (critical/warning/ED-137) + Email
│   └── templates/
│       └── vatm.tmpl           ✅ Go templates tin nhắn Telegram
│
├── snmp/
│   └── snmp.yml               ✅ Modules: park_air_t6, ale_switch, linux_snmp
│
├── blackbox/
│   └── blackbox.yml           ✅ Modules: tcp_rcms_s4ip, icmp_ping, icmp_ping_large
│
└── grafana/
    └── provisioning/          ⏳ Dashboard JSON (Bước tiếp theo)

web-portal/
├── Dockerfile                  ⏳ Cần tạo
├── requirements.txt            ⏳
└── app/
    ├── main.py                 ✅ FastAPI với routers
    ├── routers/
    │   ├── ansible.py          ✅
    │   └── metrics.py          ✅
    └── static/
        └── index.html          ✅ Dark theme UI 5 tabs

ansible/
├── hosts.ini                   ✅ RCMS workstations + radio groups + switches
└── playbooks/                  ⏳ Playbooks đo kiểm
```

---

## Phần 8 — Lệnh vận hành thường ngày

```bash
# Khởi động stack
docker compose -f monitoring/docker-compose.yml up -d

# Dừng stack (giữ data)
docker compose -f monitoring/docker-compose.yml down

# Dừng và xóa data (reset hoàn toàn)
docker compose -f monitoring/docker-compose.yml down -v

# Reload Prometheus config (sau khi sửa rules)
curl -X POST http://192.168.100.10:9090/-/reload

# Reload Alertmanager config
curl -X POST http://192.168.100.10:9093/-/reload

# Xem log service cụ thể
docker compose -f monitoring/docker-compose.yml logs -f vatm_alertmanager

# Kiểm tra alert đang active
curl -s http://192.168.100.10:9093/api/v2/alerts | python3 -m json.tool

# Update image mới nhất
docker compose -f monitoring/docker-compose.yml pull
docker compose -f monitoring/docker-compose.yml up -d
```

---

## Phần 9 — Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Bot không nhận tin | Token sai | Kiểm tra lại token từ BotFather |
| Bot nhận tin nhưng không vào group | Chat ID sai | Lấy lại Chat ID theo hướng dẫn 1.3 |
| Alertmanager không fire alert | Prometheus chưa reach Alertmanager | Kiểm tra `docker compose ps`, xem log alertmanager |
| Prometheus targets DOWN | Network route thiếu | Kiểm tra `ip route` trên VM1; đảm bảo có route đến 10.60.x.x |
| SNMP timeout | Community string sai | Kiểm tra `vatm_ro` trên thiết bị Park Air |
| Telegram: `chat not found` | Bot chưa trong group | Thêm bot vào group Telegram trước khi test |
| Container restart loop | Config file syntax error | `docker compose logs vatm_alertmanager` để xem lỗi cụ thể |

---

*Hoàn thành BƯỚC 5. Stack sẵn sàng triển khai.  
Bước tiếp theo: Import Grafana dashboards và viết Ansible playbooks đo kiểm.*
