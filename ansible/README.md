# VATM ATCC Long Thành — Ansible Playbooks
## Tự động hóa đo kiểm đường truyền VHF theo chuẩn ED-137

---

## Mục đích

Module Ansible SSH vào các **RCMS Workstation (HP Z1 G9)** tại từng trạm để:
- Chạy kịch bản đo kiểm Latency / Jitter / Packet Loss / ICMP ping
- Đẩy kết quả lên **Pushgateway** để Prometheus thu thập và Grafana hiển thị
- Xuất báo cáo kỹ thuật định kỳ (Markdown/CSV) theo Quy trình 2999

> **Lưu ý kiến trúc:**  
> Ansible **không SSH trực tiếp vào T6 radio** — các radio chỉ được poll qua SNMP (qua LAN3).  
> Ansible **không SSH vào S4-IP** — S4-IP được probe qua TCP:5001 (Blackbox Exporter).

---

## Cấu trúc thư mục

```
ansible/
├── ansible.cfg                      # Cấu hình Ansible (SSH timeout, pipelining...)
├── hosts.ini                        # Inventory: RCMS workstations + T6 radio targets
├── group_vars/
│   ├── all.yml                      # Variables chung: IP, ngưỡng ED-137, paths
│   └── lab_simulation.yml           # Variables cho môi trường Lab (mock targets)
├── playbooks/
│   ├── site.yml                     # ★ Master playbook (chạy toàn bộ pipeline)
│   ├── 00_setup_lab.yml            # Cài đặt môi trường lab (chạy 1 lần)
│   ├── 01_collect_metrics.yml      # ★ Thu thập metrics đo kiểm → Pushgateway
│   ├── 02_generate_report.yml      # Xuất báo cáo Markdown + CSV
│   └── 03_ping_check.yml           # ICMP ping check nhanh toàn tuyến
├── roles/
│   └── vatm_collector/
│       ├── tasks/main.yml           # Logic đo kiểm chính
│       └── templates/report.md.j2  # Template báo cáo Markdown
└── reports/                         # Thư mục chứa báo cáo xuất ra (auto-created)
```

---

## Inventory (hosts.ini)

### Nhóm thiết bị

| Nhóm | Mô tả | Số lượng |
|------|-------|---------|
| `rcms_tx` | RCMS/LCMS workstation tại Trạm TX | 2 host |
| `rcms_rx` | RCMS/LCMS workstation tại Trạm RX | 2 host |
| `rcms_ubvhf` | RCMS/LCMS tại UBVHF Tower | 2 host |
| `t6tv_main` / `t6tv_stby` | T6-TV radio MAIN/STBY (Trạm TX) | 9+9 host |
| `t6rv_main` / `t6rv_stby` | T6-RV radio MAIN/STBY (Trạm RX) | 9+9 host |
| `t6trv_*` | T6-TRV radio UBVHF | biến thể |
| `all_rcms` | Toàn bộ RCMS workstation | parent group |

### Dải IP thực tế (LAN3 — RCMS subnet)

| Vị trí | RCMS Workstation | T6 Radio MAIN | T6 Radio STBY |
|--------|-----------------|--------------|--------------|
| Trạm TX | 10.60.7.98 / 10.60.7.65 | 10.60.7.71–79 | 10.60.7.81–89 |
| Trạm RX | 10.60.7.97 / 10.60.6.65 | 10.60.6.71–79 | 10.60.6.81–89 |
| UBVHF TWR | 10.60.11.30 / 10.60.11.29 | 10.60.11.x | — |

---

## Hướng dẫn sử dụng

### Chạy thủ công từ command line

```bash
# Toàn bộ pipeline (collect metrics + generate report)
ansible-playbook -i hosts.ini playbooks/site.yml

# Chỉ thu thập metrics (không xuất report)
ansible-playbook -i hosts.ini playbooks/01_collect_metrics.yml

# Chỉ một nhóm trạm
ansible-playbook -i hosts.ini playbooks/01_collect_metrics.yml --limit rcms_tx
ansible-playbook -i hosts.ini playbooks/01_collect_metrics.yml --limit rcms_rx
ansible-playbook -i hosts.ini playbooks/01_collect_metrics.yml --limit rcms_ubvhf

# Ping check nhanh toàn tuyến
ansible-playbook -i hosts.ini playbooks/03_ping_check.yml

# Xuất báo cáo
ansible-playbook -i hosts.ini playbooks/02_generate_report.yml
```

### Kích hoạt từ Web Portal

Truy cập **http://localhost:8080** → Tab "⚡ Đo kiểm" → Chọn nhóm → Nhấn **▶ Chạy đo kiểm**

Web Portal gọi ngầm `ansible-playbook` thông qua FastAPI backend, kết quả trả về real-time.

---

## Ngưỡng cảnh báo ED-137 (mặc định)

| Chỉ số | 🟡 Cảnh báo | 🔴 Vi phạm |
|--------|------------|----------|
| One-way Delay | > 50 ms | **> 100 ms** |
| Jitter | > 10 ms | **> 20 ms** |
| Packet Loss | > 0.1% | **> 1%** |
| VSWR Anten | > 1.5:1 | **> 2.0:1** |
| BER đường truyền | > 10⁻⁶ | **> 10⁻⁴** |

Các ngưỡng này có thể override per-site trong `group_vars/all.yml`.

---

## Môi trường Lab

Khi thiết bị thực (10.60.x.x) không reachable, sử dụng script giả lập metrics:

```bash
# Từ thư mục monitoring/
python simulate_metrics.py --mode cycle --loop --interval 15
```

Script đẩy trực tiếp vào Pushgateway (`localhost:9091`) — không cần Ansible.

---

## Ghi chú kỹ thuật

- **SSH target**: Ansible SSH vào RCMS Workstation (HP Z1 G9), không SSH trực tiếp vào T6 radio
- **SNMP Security**: SNMP exporter poll T6 radio qua LAN3 (10.60.x.x/27) — KHÔNG qua LAN1 (VoIP subnet)
- **S4-IP**: Không có SNMP — chỉ probe TCP:5001 qua Blackbox Exporter
- **Ansible Vault**: Thông tin nhạy cảm (SSH password) nên lưu trong `ansible-vault encrypt_string`
- **Pushgateway URL**: Mặc định `http://localhost:9091` (hoặc container name `vatm_pushgateway:9091`)

---

*Tài liệu tham chiếu: EUROCAE ED-137 | VATM QĐ2999 | HLD Hệ Thống Đường Truyền (HĐ 8225/HĐ-QLB)*  
*Phiên bản: 2.0 | Tháng 6/2026 | Tác giả: Đỗ Thanh Long — ATSEP VATM ATCC Long Thành*
