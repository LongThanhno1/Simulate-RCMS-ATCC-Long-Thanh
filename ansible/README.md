# VATM ATCC Long Thành — Ansible Monitoring
## Dự án: Giám sát đường truyền từ xa — PHẦN I: Tự động hóa đo kiểm

### Cấu trúc thư mục

```
ansible/
├── ansible.cfg                  # Cấu hình Ansible
├── hosts.ini                    # Inventory: danh sách thiết bị
├── README.md                    # Tài liệu này
├── group_vars/
│   ├── all.yml                  # Variables dùng chung toàn bộ
│   ├── nokia_sros.yml           # Variables cho thiết bị Nokia SR OS
│   └── lab_simulation.yml      # Variables cho môi trường Lab
├── playbooks/
│   ├── site.yml                 # ★ Master playbook (chạy cả pipeline)
│   ├── 00_setup_lab.yml        # Cài đặt lab simulation (chạy 1 lần)
│   ├── 01_collect_metrics.yml  # Thu thập BER/Latency/Jitter/Port Status
│   ├── 02_generate_report.yml  # Tổng hợp báo cáo Markdown + CSV
│   └── 03_schedule_cron.yml    # Cài đặt lịch cron tự động
└── roles/
    └── nokia_sros_collector/
        ├── tasks/main.yml       # Logic thu thập metrics Nokia SR OS
        └── templates/
            └── report.md.j2     # Template báo cáo Markdown
```

---

### Hướng dẫn sử dụng

#### 1. Chuẩn bị môi trường Lab (chạy 1 lần)

```bash
# Cài đặt snmpd + simulator trên các Ubuntu VM lab
ansible-playbook -i hosts.ini playbooks/00_setup_lab.yml --limit lab_simulation
```

#### 2. Chạy thu thập metrics thủ công

```bash
# Chạy toàn bộ pipeline (collect + report)
ansible-playbook -i hosts.ini playbooks/site.yml

# Chỉ thu thập (không generate report)
ansible-playbook -i hosts.ini playbooks/site.yml --tags collect

# Chỉ lab simulation
ansible-playbook -i hosts.ini playbooks/01_collect_metrics.yml --limit lab_simulation

# Chỉ các remote sites thực
ansible-playbook -i hosts.ini playbooks/01_collect_metrics.yml --limit all_remote

# Một site cụ thể
ansible-playbook -i hosts.ini playbooks/01_collect_metrics.yml --limit remote_bmt
```

#### 3. Cài đặt lịch tự động (production)

```bash
ansible-playbook -i hosts.ini playbooks/03_schedule_cron.yml
```

---

### Thiết bị được monitor

| Site | Thiết bị | Model | ISP | Băng thông |
|------|----------|-------|-----|-----------|
| TWR LTIA | TWR-EDGE-ROUTERS-1/2 | Nokia 7250 IXR-e | Dual | — |
| TWR LTIA | TWR-DISTRIBUTION-1/2 | Nokia 7250 IXR-e | — | — |
| TWR LTIA | TWR-VSAT-SAR8 | Nokia 7705 SAR-8 | VSAT | — |
| ATCC HCM | Rx/Tx-VHF-HCM-SAR8 x4 | Nokia 7705 SAR-8 | Dual | — |
| Weather Radar | TWR-WEATHER-RADAR-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 3 Mb/s |
| ADS-B A18 | TWR-ADSB-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 3 Mb/s |
| PSR/SSR TX | TWR-PSR-MSSR-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 3 Mb/s |
| APP/TWR DAN | APP-TWR-DAN-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 3 Mb/s |
| TWR Tuy Hòa | TWR-TUY-HOA-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 3 Mb/s |
| APP/TWR CRA | APP-TWR-CRA-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 7 Mb/s |
| TWR BMT | TWR-BMT-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 8 Mb/s |
| TWR Liên Khương | TWR-LKG-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 3 Mb/s |
| TWR Cần Thơ | TWR-CTH-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 5 Mb/s |
| TWR Cà Mau | TWR-CMU-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 3 Mb/s |
| TWR Rạch Giá | TWR-RGA-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 3 Mb/s |
| TWR Côn Sơn | TWR-CSN-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 3 Mb/s |
| TWR Phú Quốc | TWR-PQC-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 6 Mb/s |
| Radar Quy Nhơn | RADAR-QNH-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 4 Mb/s |
| Radar Cà Mau | RADAR-CMU-SAR8-1 | Nokia 7705 SAR-8 | VNPT+VIETTEL | 4 Mb/s |

---

### Ngưỡng cảnh báo mặc định

| Chỉ số | Cảnh báo Vàng | Cảnh báo Đỏ |
|--------|--------------|------------|
| Latency | > 50 ms | > 150 ms |
| Jitter | > 10 ms | > 30 ms |
| BER | > 1×10⁻⁶ | > 1×10⁻⁴ |
| Băng thông sử dụng | > 70% | > 90% |
| Trạng thái Port | — | Down |

---

### Ghi chú kỹ thuật

- **IP trong hosts.ini**: Sử dụng IP management interface thực tế từ bảng BVTC LTIA ĐT-02 sau khi hệ thống đi vào vận hành.
- **Nokia SR OS SSH**: Thiết bị sản xuất yêu cầu SSH key hoặc password được lưu trong `ansible-vault`.
- **Lab simulation**: Dùng Ubuntu 22.04 + `snmpd` + script `/usr/local/bin/simulate_sros.sh`.
- **BER**: Thu thập từ lệnh `show port <x/x/x> detail` trên Nokia 7705 SAR-8 (các adapter card E1).
- **Latency/Jitter**: Thu thập qua Nokia SAA (Service Assurance Agent) — cần cấu hình SAA test trước trên thiết bị.

---

*Tài liệu tham chiếu: HLD Hệ Thống Đường Truyền VATM LTIA — Hợp đồng 8225/HĐ-QLB*
*Phiên bản: 1.0 | Tháng 4/2025*
