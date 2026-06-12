# Simulate-RCMS-ATCC-Long-Thanh

Hệ thống Web Portal giám sát tập trung và tự động hóa đo kiểm đường truyền VHF hàng không theo chuẩn **EUROCAE ED-137** — Trung tâm KSKL Long Thành (ATCC), VATM.

---

## Tính năng

- **Giám sát real-time** Park Air T6-TV/T6-RV/T6-TRV qua SNMP V2c (LAN3 RCMS), trực quan hóa trên Grafana dashboard
- **Cảnh báo chủ động** về Telegram & Email khi vi phạm ngưỡng ED-137 (Delay > 100ms / Jitter > 20ms / Loss > 1%)
- **Đo kiểm tự động** Jitter, Latency, Packet Loss theo lịch; Ansible push metrics về Pushgateway
- **TCP probe** Park Air S4-IP Controller (port 5001) qua Blackbox Exporter — thiết bị không có SNMP
- **Web Portal FastAPI** — nút bấm kích hoạt Ansible playbook, nhúng Grafana iframe, xem báo cáo trực tuyến
- **Alert rules chuẩn ED-137** tích hợp Prometheus: phân cấp critical/warning, inhibit rules chống spam
- **Container hóa hoàn toàn** — 8 service Docker Compose, deploy 1 lệnh `docker compose up -d`

---

## Stack

`Prometheus` · `Grafana` · `Alertmanager` · `SNMP Exporter` · `Blackbox Exporter` · `Pushgateway` · `FastAPI` · `Ansible`

---

**Tác giả:** Đỗ Thanh Long — ATSEP VATM, ATCC Long Thành
