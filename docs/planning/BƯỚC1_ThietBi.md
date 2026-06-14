# BƯỚC 1 — BẢNG TỔNG HỢP THIẾT BỊ HỆ THỐNG VHF
## Dự án: Web-Portal Giám sát Truyền dẫn Đường truyền Từ xa — Đài KSKL Long Thành
**Nguồn tài liệu:** TMTK-VHF&BackupVHF.pdf | BVTC VCCS LTIA | BVTC UBVHF LTIA | P6 Park Air S4 IP | P2 Park Air T6 | Switch config 10.60.6.9 / 10.60.99.15
**Tiêu chuẩn:** EUROCAE ED-137 | Quy trình 2999 VATM
**Ngày tổng hợp:** 2026-06-12

---

## BẢNG 1 — ĐÀI KSKL LONG THÀNH (ATCC / TWR)

### 1.1 Hệ thống VHF Backup Tối thượng (Ultimate Backup VHF) — Tầng 20 TWR

| TT | Tên thiết bị | Model | Hãng | SL | IP (LAN1) | Subnet | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | TWR-UBVHF-T6TRV-01 | T6-TRV | Park Air | 1 | 10.60.11.1 | /27 | SNMP V1/V2c/V3 |
| 2 | TWR-UBVHF-T6TRV-02 | T6-TRV | Park Air | 1 | 10.60.11.2 | /27 | SNMP V1/V2c/V3 |
| 3 | TWR-UBVHF-T6TRV-03 | T6-TRV | Park Air | 1 | 10.60.11.3 | /27 | SNMP V1/V2c/V3 |
| 4 | TWR-UBVHF-T6TRV-04 | T6-TRV | Park Air | 1 | 10.60.11.4 | /27 | SNMP V1/V2c/V3 |
| 5 | TWR-UBVHF-T6TRV-05 | T6-TRV | Park Air | 1 | 10.60.11.5 | /27 | SNMP V1/V2c/V3 |
| 6 | TWR-UBVHF-T6TRV-06 | T6-TRV | Park Air | 1 | 10.60.11.6 | /27 | SNMP V1/V2c/V3, tần số 121.5 MHz |
| 7 | TWR-UBVHF-S4IP-01 | S4-IP Controller | Park Air | 1 | 10.60.11.11 | /27 | TCP RCMS port 5001, **Không SNMP** |
| 8 | TWR-UBVHF-S4IP-02 | S4-IP Controller | Park Air | 1 | 10.60.11.12 | /27 | TCP RCMS port 5001, **Không SNMP** |
| 9 | TWR-UBVHF-S4IP-03 | S4-IP Controller | Park Air | 1 | 10.60.11.13 | /27 | TCP RCMS port 5001, **Không SNMP** |
| 10 | TWR-UBVHF-S4IP-04 | S4-IP Controller | Park Air | 1 | 10.60.11.14 | /27 | TCP RCMS port 5001, **Không SNMP** |
| 11 | TWR-UBVHF-S4IP-05 | S4-IP Controller | Park Air | 1 | 10.60.11.15 | /27 | TCP RCMS port 5001, **Không SNMP** |
| 12 | TWR-UBVHF-S4IP-06 | S4-IP Controller | Park Air | 1 | 10.60.11.16 | /27 | TCP RCMS port 5001, **Không SNMP** |
| 13 | UBVHF-LCMS | HP Z1 G9 | HP | 1 | 10.60.11.29 | /27 | Workstation giám sát cục bộ |
| 14 | TWR-UBVHF-SW6360-01 | OS6360-24 | ALE | 1 | *(MGMT: TBD)* | — | Switch RCMS/Monitoring tầng 20 |
| 15 | Anten T6-TRV | 1000075 | Park Air | 6 | — | — | Gắn trên mái tầng 20 TWR |
| 16 | Chống sét | GT-NFM-AL | — | 6 | — | — | |
| 17 | Filter VHF | 68-SYS00101/1 | — | 6 | — | — | |

### 1.2 Hệ thống Điều khiển và Giám sát Trung tâm — Tech Building / ATCC

| TT | Tên thiết bị | Model | Hãng | SL | IP | Subnet | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | ATCT-VCCS-SW6860-01 | OS6860E-24 | ALE | 1 | *(TBD)* | — | Port 21: RX RCMS; Port 22: TX RCMS |
| 2 | ATCT-VCCS-SW6860-02 | OS6860E-24 | ALE | 1 | *(TBD)* | — | VCCS VoIP backbone |
| 3 | ATCT-UBVHF-SW6360-01 | OS6360-24 | ALE | 1 | *(TBD)* | — | Port 22→GAMS; Port 23→RAPS; Port 24→RCMS |
| 4 | TX-VHF-RCMS | HP Z1 G9 | HP | 1 | 10.60.7.98 | /28 | Giám sát từ xa TX, SNMP poll T6-TV |
| 5 | RX-VHF-RCMS | HP Z1 G9 | HP | 1 | 10.60.7.97 | /28 | Giám sát từ xa RX, SNMP poll T6-RV |
| 6 | UBVHF-RCMS | HP Z1 G9 | HP | 1 | 10.60.11.30 | /27 | Giám sát từ xa UBVHF |
| 7 | GAMS | GAMS Server | — | 1 | *(TBD)* | 10.60.8.x | SNMP từ RCMS → alarm display |
| 8 | RAPS | Voice Recorder | — | 1 | *(TBD)* | — | Kết nối analog audio từ S4-IP |

### 1.3 Hệ thống VCCS

| TT | Tên thiết bị | Model | Hãng | SL | IP | Subnet | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | VCCS xMG #1 | xMG | FREQUENTIS | 1 | *(TBD)* | 10.60.8.x | Media Gateway VoIP |
| 2 | VCCS xMG #2 | xMG | FREQUENTIS | 1 | *(TBD)* | 10.60.8.x | Media Gateway VoIP (dự phòng) |
| 3 | RED SWITCH CORE | — | FREQUENTIS | 1 | *(TBD)* | 10.60.8.x | |
| 4 | BLUE SWITCH CORE | — | FREQUENTIS | 1 | *(TBD)* | 10.60.8.x | |
| 5 | CWP (Controller Working Position) | — | FREQUENTIS | 15 | *(TBD)* | 10.60.8.x | |
| 6 | Phone Switch | — | FREQUENTIS | 12 | *(TBD)* | 10.60.8.x | |
| 7 | TDS (Training/Debrief System) | — | FREQUENTIS | 1 | *(TBD)* | 10.60.8.x | |
| 8 | VCCS SVR1 | — | FREQUENTIS | 1 | *(TBD)* | 10.60.8.x | |
| 9 | VCCS SVR2 | — | FREQUENTIS | 1 | *(TBD)* | 10.60.8.x | |

### 1.4 Hạ tầng Mạng / Truyền dẫn

| TT | Tên thiết bị | Model | Hãng | SL | IP | Subnet | Ghi chú |
|---|---|---|---|---|---|---|---|
| 1 | Nokia Router TWR | Nokia 7250 IXR-e | Nokia | 1 | *(TBD)* | — | MPLS backbone, tại TWR |
| 2 | Nokia Router E&M | Nokia 7705 SAR-8 | Nokia | 1 | *(TBD)* | — | E&M interface |
| 3 | Cáp quang 48 Fo (Fo1) | 48-fiber SM | — | 1 route | — | — | TX ↔ ATCC ↔ RX (tuyến chính) |
| 4 | Cáp quang 48 Fo (Fo2) | 48-fiber SM | — | 1 route | — | — | TX ↔ ATCC ↔ RX (tuyến dự phòng) |

> **Chú thích:** *(TBD)* = Chưa xác định được từ tài liệu TB06 đã đọc. IP VCCS nằm trong subnet 10.60.8.x/24 nhưng địa chỉ cụ thể từng thiết bị chưa có trong tài liệu đã đọc.

---

## BẢNG 2 — TRẠM PHÁT (TX)

**Vị trí:** Trạm Phát VHF Long Thành | **Subnet VoIP:** `10.60.7.0/27` | **Subnet RCMS:** `10.60.7.64/27`

### 2.1 Thiết bị Radio VHF

| TT | Tên thiết bị | Model | Hãng | IP LAN1 (VoIP) | IP LAN3 (RCMS) | Tần số (MHz) | Chú thích |
|---|---|---|---|---|---|---|---|
| 1 | TX-VHF-T6TV-MAIN-118,425 | T6-TV | Park Air | 10.60.7.1/27 | 10.60.7.71/27 | 118.425 | MAIN, SNMP |
| 2 | TX-VHF-T6TV-MAIN-121,725 | T6-TV | Park Air | 10.60.7.2/27 | 10.60.7.72/27 | 121.725 | MAIN, SNMP |
| 3 | TX-VHF-T6TV-MAIN-121,775 | T6-TV | Park Air | 10.60.7.3/27 | 10.60.7.73/27 | 121.775 | MAIN, SNMP |
| 4 | TX-VHF-T6TV-MAIN-121,850 | T6-TV | Park Air | 10.60.7.4/27 | 10.60.7.74/27 | 121.850 | MAIN, SNMP |
| 5 | TX-VHF-T6TV-MAIN-121,925 | T6-TV | Park Air | 10.60.7.5/27 | 10.60.7.75/27 | 121.925 | MAIN, SNMP |
| 6 | TX-VHF-T6TV-MAIN-124,325 | T6-TV | Park Air | 10.60.7.6/27 | 10.60.7.76/27 | 124.325 | MAIN, SNMP |
| 7 | TX-VHF-T6TV-MAIN-124,625 | T6-TV | Park Air | 10.60.7.7/27 | 10.60.7.77/27 | 124.625 | MAIN, SNMP |
| 8 | TX-VHF-T6TV-MAIN-125,275 | T6-TV | Park Air | 10.60.7.8/27 | 10.60.7.78/27 | 125.275 | MAIN, SNMP |
| 9 | TX-VHF-T6TV-MAIN-121,500 | T6-TV | Park Air | 10.60.7.9/27 | 10.60.7.79/27 | 121.500 | MAIN, SNMP, Khẩn nguy |
| 10 | TX-VHF-T6TV-STANDBY-118,425 | T6-TV | Park Air | 10.60.7.41/27 | 10.60.7.81/27 | 118.425 | STANDBY, SNMP |
| 11 | TX-VHF-T6TV-STANDBY-121,725 | T6-TV | Park Air | 10.60.7.42/27 | 10.60.7.82/27 | 121.725 | STANDBY, SNMP |
| 12 | TX-VHF-T6TV-STANDBY-121,775 | T6-TV | Park Air | 10.60.7.43/27 | 10.60.7.83/27 | 121.775 | STANDBY, SNMP |
| 13 | TX-VHF-T6TV-STANDBY-121,850 | T6-TV | Park Air | 10.60.7.44/27 | 10.60.7.84/27 | 121.850 | STANDBY, SNMP |
| 14 | TX-VHF-T6TV-STANDBY-121,925 | T6-TV | Park Air | 10.60.7.45/27 | 10.60.7.85/27 | 121.925 | STANDBY, SNMP |
| 15 | TX-VHF-T6TV-STANDBY-124,325 | T6-TV | Park Air | 10.60.7.46/27 | 10.60.7.86/27 | 124.325 | STANDBY, SNMP |
| 16 | TX-VHF-T6TV-STANDBY-124,625 | T6-TV | Park Air | 10.60.7.47/27 | 10.60.7.87/27 | 124.625 | STANDBY, SNMP |
| 17 | TX-VHF-T6TV-STANDBY-125,275 | T6-TV | Park Air | 10.60.7.48/27 | 10.60.7.88/27 | 125.275 | STANDBY, SNMP |
| 18 | TX-VHF-T6TV-STANDBY-121,500 | T6-TV | Park Air | 10.60.7.49/27 | 10.60.7.89/27 | 121.500 | STANDBY, SNMP, Khẩn nguy |

### 2.2 Thiết bị Mạng & Giám sát

| TT | Tên thiết bị | Model | Hãng | SL | IP | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | TX-VHF-SW6860-MAIN-01 | OS6860E-24 | ALE | 1 | 10.60.7.30/27 (GW) | Switch VoIP — T6-TV LAN1 → VCCS |
| 2 | TX-VHF-SW6860-STANDBY-01 | OS6860E-24 | ALE | 1 | 10.60.7.62/27 (GW) | Switch VoIP dự phòng |
| 3 | TX-VHF-SW6360 | OS6360-24 | ALE | 1 | 10.60.7.94/27 (GW) | Switch RCMS — T6-TV LAN3 |
| 4 | TX-VHF-LCMS | HP Z1 G9 | HP | 1 | 10.60.7.65/27 | Workstation giám sát cục bộ tại trạm |

### 2.3 Thiết bị Phụ trợ

| TT | Tên thiết bị | Model | Hãng | SL | Ghi chú |
|---|---|---|---|---|---|
| 1 | Anten VHF | CXL 3-1LW | — | 18 | Kết nối từng T6-TV |
| 2 | Filter VHF | 68-SYS00101/1 | — | 18 | Lọc sóng hài |
| 3 | Chống sét VHF | GT-NFM-AL | — | 18 | Bảo vệ đường anten |
| 4 | Rack thiết bị | Rack 42U | — | 2 | Chứa toàn bộ thiết bị TX |

---

## BẢNG 3 — TRẠM THU (RX)

**Vị trí:** Trạm Thu VHF Long Thành | **Subnet VoIP:** `10.60.6.0/27` | **Subnet RCMS:** `10.60.6.64/27`

### 3.1 Thiết bị Radio VHF

| TT | Tên thiết bị | Model | Hãng | IP LAN1 (VoIP) | IP LAN3 (RCMS) | Tần số (MHz) | Chú thích |
|---|---|---|---|---|---|---|---|
| 1 | RX-VHF-T6RV-MAIN-118,425 | T6-RV | Park Air | 10.60.6.1/27 | 10.60.6.71/27 | 118.425 | MAIN, SNMP |
| 2 | RX-VHF-T6RV-MAIN-121,725 | T6-RV | Park Air | 10.60.6.2/27 | 10.60.6.72/27 | 121.725 | MAIN, SNMP |
| 3 | RX-VHF-T6RV-MAIN-121,775 | T6-RV | Park Air | 10.60.6.3/27 | 10.60.6.73/27 | 121.775 | MAIN, SNMP |
| 4 | RX-VHF-T6RV-MAIN-121,850 | T6-RV | Park Air | 10.60.6.4/27 | 10.60.6.74/27 | 121.850 | MAIN, SNMP |
| 5 | RX-VHF-T6RV-MAIN-121,925 | T6-RV | Park Air | 10.60.6.5/27 | 10.60.6.75/27 | 121.925 | MAIN, SNMP |
| 6 | RX-VHF-T6RV-MAIN-124,325 | T6-RV | Park Air | 10.60.6.6/27 | 10.60.6.76/27 | 124.325 | MAIN, SNMP |
| 7 | RX-VHF-T6RV-MAIN-124,625 | T6-RV | Park Air | 10.60.6.7/27 | 10.60.6.77/27 | 124.625 | MAIN, SNMP |
| 8 | RX-VHF-T6RV-MAIN-125,275 | T6-RV | Park Air | 10.60.6.8/27 | 10.60.6.78/27 | 125.275 | MAIN, SNMP |
| 9 | RX-VHF-T6RV-MAIN-121,500 | T6-RV | Park Air | 10.60.6.9/27 | 10.60.6.79/27 | 121.500 | MAIN, SNMP, Khẩn nguy |
| 10 | RX-VHF-T6RV-STANDBY-118,425 | T6-RV | Park Air | 10.60.6.41/27 | 10.60.6.81/27 | 118.425 | STANDBY, SNMP |
| 11 | RX-VHF-T6RV-STANDBY-121,725 | T6-RV | Park Air | 10.60.6.42/27 | 10.60.6.82/27 | 121.725 | STANDBY, SNMP |
| 12 | RX-VHF-T6RV-STANDBY-121,775 | T6-RV | Park Air | 10.60.6.43/27 | 10.60.6.83/27 | 121.775 | STANDBY, SNMP |
| 13 | RX-VHF-T6RV-STANDBY-121,850 | T6-RV | Park Air | 10.60.6.44/27 | 10.60.6.84/27 | 121.850 | STANDBY, SNMP |
| 14 | RX-VHF-T6RV-STANDBY-121,925 | T6-RV | Park Air | 10.60.6.45/27 | 10.60.6.85/27 | 121.925 | STANDBY, SNMP |
| 15 | RX-VHF-T6RV-STANDBY-124,325 | T6-RV | Park Air | 10.60.6.46/27 | 10.60.6.86/27 | 124.325 | STANDBY, SNMP |
| 16 | RX-VHF-T6RV-STANDBY-124,625 | T6-RV | Park Air | 10.60.6.47/27 | 10.60.6.87/27 | 124.625 | STANDBY, SNMP |
| 17 | RX-VHF-T6RV-STANDBY-125,275 | T6-RV | Park Air | 10.60.6.48/27 | 10.60.6.88/27 | 125.275 | STANDBY, SNMP |
| 18 | RX-VHF-T6RV-STANDBY-121,500 | T6-RV | Park Air | 10.60.6.49/27 | 10.60.6.89/27 | 121.500 | STANDBY, SNMP, Khẩn nguy |

### 3.2 Thiết bị Mạng & Giám sát

| TT | Tên thiết bị | Model | Hãng | SL | IP | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | RX-VHF-SW6860-MAIN-01 | OS6860E-24 | ALE | 1 | 10.60.99.9/24 (MGMT) / 10.60.6.20/27 (VoIP) | VLAN 10: VoIP, VLAN 99: MGMT ✅ từ switch config |
| 2 | RX-VHF-SW6860-STANDBY-01 | OS6860E-24 | ALE | 1 | *(TBD)* | Switch VoIP dự phòng |
| 3 | RX-VHF-SW6360 | OS6360-24 | ALE | 1 | 10.60.6.94/27 (GW) | Switch RCMS — T6-RV LAN3 |
| 4 | RX-VHF-LCMS | HP Z1 G9 | HP | 1 | 10.60.6.65/27 | Workstation giám sát cục bộ tại trạm |

### 3.3 Thiết bị Phụ trợ

| TT | Tên thiết bị | Model | Hãng | SL | Ghi chú |
|---|---|---|---|---|---|
| 1 | Anten VHF | CXL 3-1LW | PN: 100000075 | 18 | Kết nối từng T6-RV |
| 2 | Filter VHF | 68-SYS00101/1 | — | 18 | Lọc sóng hài |
| 3 | Chống sét VHF | GT-NFM-AL | — | 18 | Bảo vệ đường anten |
| 4 | Rack thiết bị | Rack 42U | — | 2 | Chứa toàn bộ thiết bị RX |

---

## PHỤ LỤC — QUY HOẠCH SUBNET TỔNG HỢP

| Subnet | Mô tả | Thiết bị chính |
|---|---|---|
| `10.60.6.0/27` | VHF RX VoIP — LAN1 T6-RV MAIN | 10.60.6.1–9 (MAIN), .20 (SW GW VoIP) |
| `10.60.6.32/27` | VHF RX VoIP — LAN1 T6-RV STANDBY | 10.60.6.41–49 |
| `10.60.6.64/27` | VHF RX RCMS — LAN3 T6-RV | 10.60.6.65 (LCMS), .71–89 (T6-RV LAN3) |
| `10.60.7.0/27` | VHF TX VoIP — LAN1 T6-TV MAIN | 10.60.7.1–9 (MAIN), .30 (GW) |
| `10.60.7.32/27` | VHF TX VoIP — LAN1 T6-TV STANDBY | 10.60.7.41–49, .62 (GW standby) |
| `10.60.7.64/27` | VHF TX RCMS — LAN3 T6-TV | 10.60.7.65 (LCMS), .71–89 (T6-TV LAN3), .94 (GW) |
| `10.60.7.96/28` | RCMS WAN | 10.60.7.97 (RX RCMS), .98 (TX RCMS) |
| `10.60.8.0/24` | VCCS Internal | FREQUENTIS xMG, CWP, SVR… |
| `10.60.9.0/24` | VCCS Links | 10.60.9.21/30, .25/30 (Fw links), .101 (Rx-VCCS) |
| `10.60.11.0/27` | Ultimate Backup VHF | T6-TRV: .1–6; S4-IP: .11–16; LCMS: .29; RCMS: .30 |
| `10.60.99.0/24` | MGMT Network | .9 (Rx-SW6860-MAIN-01), .15 (Rx-SW6860-HCM) |

---

## PHỤ LỤC — CHIẾN LƯỢC GIÁM SÁT SNMP CHO WEB PORTAL

| Thiết bị | Giao thức | Cổng | IP Poll (từ) | Ghi chú |
|---|---|---|---|---|
| T6-TV / T6-RV (×36) | SNMP V1/V2c/V3 | 161/UDP | Prometheus Exporter | Dùng LAN3 (subnet .64-.94) để không ảnh hưởng VoIP |
| T6-TRV (×6) | SNMP V1/V2c/V3 | 161/UDP | Prometheus Exporter | LAN1, subnet 10.60.11.x |
| S4-IP (×6) | TCP Health Check | 5001/TCP | Custom Exporter | **Không SNMP** — kiểm tra port 5001 |
| SW6860 / SW6360 | SNMP | 161/UDP | Prometheus SNMP Exporter | Băng thông, trạng thái port |
| RCMS HP Z1 G9 | Ping / WMI | — | Prometheus blackbox | Kiểm tra sống/chết |
| Nokia 7250/7705 | SNMP | 161/UDP | Prometheus SNMP Exporter | Trạng thái E1/IP link |

**Ngưỡng cảnh báo ED-137:**

| KPI | Ngưỡng Xanh (OK) | Ngưỡng Vàng (Warning) | Ngưỡng Đỏ (Critical) |
|---|---|---|---|
| One-way Delay | < 50ms | 50–100ms | > 100ms |
| Jitter | < 10ms | 10–20ms | > 20ms |
| Packet Loss | < 0.1% | 0.1–1% | > 1% |
| BER | < 10⁻⁶ | 10⁻⁶–10⁻⁴ | > 10⁻⁴ |
| VSWR | ≤ 1.5:1 | 1.5–2.0:1 | > 2.0:1 |

---

*Tài liệu này được tổng hợp từ hồ sơ thiết kế kỹ thuật TB06 (Hợp đồng 8225/HĐ-QLB ngày 06/12/2024). Các trường *(TBD)* cần bổ sung từ tài liệu IP planning của VCCS hoặc Nokia chưa đọc được.*
