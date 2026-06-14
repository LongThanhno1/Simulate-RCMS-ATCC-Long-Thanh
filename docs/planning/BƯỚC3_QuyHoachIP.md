# BƯỚC 3 — QUY HOẠCH IP TOÀN HỆ THỐNG VHF
## Dự án: Web-Portal Giám sát Truyền dẫn — Đài KSKL Long Thành
**Nguồn:** TMTK-VHF&BackupVHF.pdf | BVTC VCCS | BVTC UBVHF | Switch config 10.60.6.9 / 10.60.99.15
**Ngày:** 2026-06-12 | **Tiêu chuẩn:** EUROCAE ED-137 | QĐ 2999 VATM

> **Quy ước cột "Dùng cho SNMP":**
> ✅ = Prometheus SNMP Exporter poll trực tiếp
> 🔧 = Custom exporter (TCP health check)
> ⬜ = Không monitor SNMP (blackbox ping hoặc chưa xác định)

---

## 1. TRẠM PHÁT (TX) — `10.60.7.0/27` (VoIP) & `10.60.7.64/27` (RCMS)

### 1.1 T6-TV MAIN — Subnet VoIP: 10.60.7.0/27 | Subnet RCMS: 10.60.7.64/27

| TT | Hostname | Model | IP LAN1 (VoIP) | IP LAN3 (RCMS) | Tần số (MHz) | SNMP | Community |
|---|---|---|---|---|---|---|---|
| 1 | TX-VHF-T6TV-MAIN-118425 | Park Air T6-TV | 10.60.7.1/27 | 10.60.7.71/27 | 118.425 | ✅ LAN3 | public (mặc định) |
| 2 | TX-VHF-T6TV-MAIN-121725 | Park Air T6-TV | 10.60.7.2/27 | 10.60.7.72/27 | 121.725 | ✅ LAN3 | public |
| 3 | TX-VHF-T6TV-MAIN-121775 | Park Air T6-TV | 10.60.7.3/27 | 10.60.7.73/27 | 121.775 | ✅ LAN3 | public |
| 4 | TX-VHF-T6TV-MAIN-121850 | Park Air T6-TV | 10.60.7.4/27 | 10.60.7.74/27 | 121.850 | ✅ LAN3 | public |
| 5 | TX-VHF-T6TV-MAIN-121925 | Park Air T6-TV | 10.60.7.5/27 | 10.60.7.75/27 | 121.925 | ✅ LAN3 | public |
| 6 | TX-VHF-T6TV-MAIN-124325 | Park Air T6-TV | 10.60.7.6/27 | 10.60.7.76/27 | 124.325 | ✅ LAN3 | public |
| 7 | TX-VHF-T6TV-MAIN-124625 | Park Air T6-TV | 10.60.7.7/27 | 10.60.7.77/27 | 124.625 | ✅ LAN3 | public |
| 8 | TX-VHF-T6TV-MAIN-125275 | Park Air T6-TV | 10.60.7.8/27 | 10.60.7.78/27 | 125.275 | ✅ LAN3 | public |
| 9 | TX-VHF-T6TV-MAIN-121500 | Park Air T6-TV | 10.60.7.9/27 | 10.60.7.79/27 | **121.500** ⚠️ | ✅ LAN3 | public |

### 1.2 T6-TV STANDBY — Subnet VoIP: 10.60.7.32/27 | Subnet RCMS: 10.60.7.64/27

| TT | Hostname | Model | IP LAN1 (VoIP) | IP LAN3 (RCMS) | Tần số (MHz) | SNMP |
|---|---|---|---|---|---|---|
| 10 | TX-VHF-T6TV-STANDBY-118425 | Park Air T6-TV | 10.60.7.41/27 | 10.60.7.81/27 | 118.425 | ✅ LAN3 |
| 11 | TX-VHF-T6TV-STANDBY-121725 | Park Air T6-TV | 10.60.7.42/27 | 10.60.7.82/27 | 121.725 | ✅ LAN3 |
| 12 | TX-VHF-T6TV-STANDBY-121775 | Park Air T6-TV | 10.60.7.43/27 | 10.60.7.83/27 | 121.775 | ✅ LAN3 |
| 13 | TX-VHF-T6TV-STANDBY-121850 | Park Air T6-TV | 10.60.7.44/27 | 10.60.7.84/27 | 121.850 | ✅ LAN3 |
| 14 | TX-VHF-T6TV-STANDBY-121925 | Park Air T6-TV | 10.60.7.45/27 | 10.60.7.85/27 | 121.925 | ✅ LAN3 |
| 15 | TX-VHF-T6TV-STANDBY-124325 | Park Air T6-TV | 10.60.7.46/27 | 10.60.7.86/27 | 124.325 | ✅ LAN3 |
| 16 | TX-VHF-T6TV-STANDBY-124625 | Park Air T6-TV | 10.60.7.47/27 | 10.60.7.87/27 | 124.625 | ✅ LAN3 |
| 17 | TX-VHF-T6TV-STANDBY-125275 | Park Air T6-TV | 10.60.7.48/27 | 10.60.7.88/27 | 125.275 | ✅ LAN3 |
| 18 | TX-VHF-T6TV-STANDBY-121500 | Park Air T6-TV | 10.60.7.49/27 | 10.60.7.89/27 | **121.500** ⚠️ | ✅ LAN3 |

### 1.3 Hạ tầng mạng TX

| TT | Hostname | Model | IP VoIP/Mgmt | Subnet | Vai trò | SNMP |
|---|---|---|---|---|---|---|
| 1 | TX-VHF-SW6860-MAIN-01 | ALE OS6860E-24 | 10.60.7.30/27 | VoIP GW | Switch VoIP MAIN | ✅ |
| 2 | TX-VHF-SW6860-STANDBY-01 | ALE OS6860E-24 | 10.60.7.62/27 | VoIP GW | Switch VoIP STANDBY | ✅ |
| 3 | TX-VHF-SW6360 | ALE OS6360-24 | 10.60.7.94/27 | RCMS GW | Switch RCMS/monitoring | ✅ |
| 4 | TX-VHF-LCMS | HP Z1 G9 | 10.60.7.65/27 | RCMS subnet | Workstation LCMS tại TX | ⬜ Ping |

---

## 2. TRẠM THU (RX) — `10.60.6.0/27` (VoIP) & `10.60.6.64/27` (RCMS)

### 2.1 T6-RV MAIN — Subnet VoIP: 10.60.6.0/27 | Subnet RCMS: 10.60.6.64/27

| TT | Hostname | Model | IP LAN1 (VoIP) | IP LAN3 (RCMS) | Tần số (MHz) | SNMP |
|---|---|---|---|---|---|---|
| 1 | RX-VHF-T6RV-MAIN-118425 | Park Air T6-RV | 10.60.6.1/27 | 10.60.6.71/27 | 118.425 | ✅ LAN3 |
| 2 | RX-VHF-T6RV-MAIN-121725 | Park Air T6-RV | 10.60.6.2/27 | 10.60.6.72/27 | 121.725 | ✅ LAN3 |
| 3 | RX-VHF-T6RV-MAIN-121775 | Park Air T6-RV | 10.60.6.3/27 | 10.60.6.73/27 | 121.775 | ✅ LAN3 |
| 4 | RX-VHF-T6RV-MAIN-121850 | Park Air T6-RV | 10.60.6.4/27 | 10.60.6.74/27 | 121.850 | ✅ LAN3 |
| 5 | RX-VHF-T6RV-MAIN-121925 | Park Air T6-RV | 10.60.6.5/27 | 10.60.6.75/27 | 121.925 | ✅ LAN3 |
| 6 | RX-VHF-T6RV-MAIN-124325 | Park Air T6-RV | 10.60.6.6/27 | 10.60.6.76/27 | 124.325 | ✅ LAN3 |
| 7 | RX-VHF-T6RV-MAIN-124625 | Park Air T6-RV | 10.60.6.7/27 | 10.60.6.77/27 | 124.625 | ✅ LAN3 |
| 8 | RX-VHF-T6RV-MAIN-125275 | Park Air T6-RV | 10.60.6.8/27 | 10.60.6.78/27 | 125.275 | ✅ LAN3 |
| 9 | RX-VHF-T6RV-MAIN-121500 | Park Air T6-RV | 10.60.6.9/27 | 10.60.6.79/27 | **121.500** ⚠️ | ✅ LAN3 |

### 2.2 T6-RV STANDBY — Subnet VoIP: 10.60.6.32/27 | Subnet RCMS: 10.60.6.64/27

| TT | Hostname | Model | IP LAN1 (VoIP) | IP LAN3 (RCMS) | Tần số (MHz) | SNMP |
|---|---|---|---|---|---|---|
| 10 | RX-VHF-T6RV-STANDBY-118425 | Park Air T6-RV | 10.60.6.41/27 | 10.60.6.81/27 | 118.425 | ✅ LAN3 |
| 11 | RX-VHF-T6RV-STANDBY-121725 | Park Air T6-RV | 10.60.6.42/27 | 10.60.6.82/27 | 121.725 | ✅ LAN3 |
| 12 | RX-VHF-T6RV-STANDBY-121775 | Park Air T6-RV | 10.60.6.43/27 | 10.60.6.83/27 | 121.775 | ✅ LAN3 |
| 13 | RX-VHF-T6RV-STANDBY-121850 | Park Air T6-RV | 10.60.6.44/27 | 10.60.6.84/27 | 121.850 | ✅ LAN3 |
| 14 | RX-VHF-T6RV-STANDBY-121925 | Park Air T6-RV | 10.60.6.45/27 | 10.60.6.85/27 | 121.925 | ✅ LAN3 |
| 15 | RX-VHF-T6RV-STANDBY-124325 | Park Air T6-RV | 10.60.6.46/27 | 10.60.6.86/27 | 124.325 | ✅ LAN3 |
| 16 | RX-VHF-T6RV-STANDBY-124625 | Park Air T6-RV | 10.60.6.47/27 | 10.60.6.87/27 | 124.625 | ✅ LAN3 |
| 17 | RX-VHF-T6RV-STANDBY-125275 | Park Air T6-RV | 10.60.6.48/27 | 10.60.6.88/27 | 125.275 | ✅ LAN3 |
| 18 | RX-VHF-T6RV-STANDBY-121500 | Park Air T6-RV | 10.60.6.49/27 | 10.60.6.89/27 | **121.500** ⚠️ | ✅ LAN3 |

### 2.3 Hạ tầng mạng RX

| TT | Hostname | Model | IP VoIP/Mgmt | Subnet | Vai trò | SNMP |
|---|---|---|---|---|---|---|
| 1 | RX-VHF-SW6860-MAIN-01 | ALE OS6860E-24 | 10.60.6.20/27 *(VoIP)*<br>10.60.99.9/24 *(MGMT)* | VoIP / MGMT | Switch VoIP MAIN ✅ xác nhận từ config | ✅ |
| 2 | RX-VHF-SW6860-STANDBY-01 | ALE OS6860E-24 | *(TBD)* | VoIP | Switch VoIP STANDBY | ✅ |
| 3 | RX-VHF-SW6360 | ALE OS6360-24 | 10.60.6.94/27 | RCMS GW | Switch RCMS/monitoring | ✅ |
| 4 | RX-VHF-LCMS | HP Z1 G9 | 10.60.6.65/27 | RCMS subnet | Workstation LCMS tại RX | ⬜ Ping |

---

## 3. ĐÀI KSKL LONG THÀNH — RCMS Tập trung — `10.60.7.96/28`

| TT | Hostname | Model | IP | Subnet | Vai trò | Giao thức poll |
|---|---|---|---|---|---|---|
| 1 | TX-VHF-RCMS | HP Z1 G9 | 10.60.7.98/28 | /28 | Giám sát xa Trạm TX | ⬜ Ping / WMI |
| 2 | RX-VHF-RCMS | HP Z1 G9 | 10.60.7.97/28 | /28 | Giám sát xa Trạm RX | ⬜ Ping / WMI |
| — | Gateway RCMS | — | 10.60.7.110/28 | /28 | Default GW của subnet RCMS | — |

---

## 4. ULTIMATE BACKUP VHF (UBVHF) — `10.60.11.0/27`

| TT | Hostname | Model | IP LAN1 | Tần số | SNMP / Giao thức |
|---|---|---|---|---|---|
| 1 | TWR-UBVHF-T6TRV-01 | Park Air T6-TRV | 10.60.11.1/27 | Tùy chỉnh | ✅ SNMP V1/V2c/V3 |
| 2 | TWR-UBVHF-T6TRV-02 | Park Air T6-TRV | 10.60.11.2/27 | Tùy chỉnh | ✅ SNMP |
| 3 | TWR-UBVHF-T6TRV-03 | Park Air T6-TRV | 10.60.11.3/27 | Tùy chỉnh | ✅ SNMP |
| 4 | TWR-UBVHF-T6TRV-04 | Park Air T6-TRV | 10.60.11.4/27 | Tùy chỉnh | ✅ SNMP |
| 5 | TWR-UBVHF-T6TRV-05 | Park Air T6-TRV | 10.60.11.5/27 | Tùy chỉnh | ✅ SNMP |
| 6 | TWR-UBVHF-T6TRV-06 | Park Air T6-TRV | 10.60.11.6/27 | **121.500** ⚠️ | ✅ SNMP |
| 7 | TWR-UBVHF-S4IP-01 | Park Air S4-IP | 10.60.11.11/27 | — | 🔧 TCP 5001 |
| 8 | TWR-UBVHF-S4IP-02 | Park Air S4-IP | 10.60.11.12/27 | — | 🔧 TCP 5001 |
| 9 | TWR-UBVHF-S4IP-03 | Park Air S4-IP | 10.60.11.13/27 | — | 🔧 TCP 5001 |
| 10 | TWR-UBVHF-S4IP-04 | Park Air S4-IP | 10.60.11.14/27 | — | 🔧 TCP 5001 |
| 11 | TWR-UBVHF-S4IP-05 | Park Air S4-IP | 10.60.11.15/27 | — | 🔧 TCP 5001 |
| 12 | TWR-UBVHF-S4IP-06 | Park Air S4-IP | 10.60.11.16/27 | — | 🔧 TCP 5001 |
| 13 | UBVHF-LCMS | HP Z1 G9 | 10.60.11.29/27 | — | ⬜ Ping |
| 14 | UBVHF-RCMS | HP Z1 G9 | 10.60.11.30/27 | — | ⬜ Ping |
| 15 | TWR-UBVHF-SW6360-01 | ALE OS6360-24 | *(TBD — Tầng 20 TWR)* | — | ✅ SNMP |
| 16 | ATCT-UBVHF-SW6360-01 | ALE OS6360-24 | *(TBD — Tech Building)* | — | ✅ SNMP |

> ⚠️ IP `10.60.11.10/27` xuất hiện trong switch config `10.60.99.15` với label `VHF-BACKUP_LAN1` — có thể là interface của switch HCM kết nối vào UBVHF subnet. Cần xác nhận thêm.

---

## 5. VCCS FREQUENTIS — `10.60.8.0/24`

| TT | Hostname | Model | IP | Subnet | Vai trò | SNMP |
|---|---|---|---|---|---|---|
| 1 | VCCS-xMG-01 | FREQUENTIS xMG | *(TBD)* | 10.60.8.x | Media Gateway VoIP chính | ⬜ TBD |
| 2 | VCCS-xMG-02 | FREQUENTIS xMG | *(TBD)* | 10.60.8.x | Media Gateway VoIP dự phòng | ⬜ TBD |
| 3 | VCCS-RED-CORE | FREQUENTIS | *(TBD)* | 10.60.8.x | RED Switch Core | ⬜ TBD |
| 4 | VCCS-BLUE-CORE | FREQUENTIS | *(TBD)* | 10.60.8.x | BLUE Switch Core | ⬜ TBD |
| 5 | VCCS-SVR1 | FREQUENTIS | *(TBD)* | 10.60.8.x | VCCS Server 1 | ⬜ TBD |
| 6 | VCCS-SVR2 | FREQUENTIS | *(TBD)* | 10.60.8.x | VCCS Server 2 | ⬜ TBD |
| 7 | VCCS-TDS | FREQUENTIS | *(TBD)* | 10.60.8.x | Training/Debrief System | ⬜ TBD |
| 8–22 | VCCS-CWP-01~15 | FREQUENTIS | *(TBD)* | 10.60.8.x | Controller Working Position ×15 | ⬜ TBD |

> **Ghi chú:** Subnet 10.60.8.0/24 đã xác nhận từ tài liệu BVTC VCCS. IP cụ thể từng component chưa có trong tài liệu TB06 đã đọc — cần tài liệu IP planning VCCS của FREQUENTIS.

---

## 6. VCCS LINKS & FIREWALL — `10.60.9.0/24`

| TT | Hostname | IP | Subnet | Vai trò | Nguồn |
|---|---|---|---|---|---|
| 1 | Sw1-Fw1 Interface | 10.60.9.21 | /30 | VCCS Link Fw1 | Switch config 10.60.99.15 |
| 2 | Sw1-Fw2 Interface | 10.60.9.25 | /30 | VCCS Link Fw2 | Switch config 10.60.99.15 |
| 3 | Rx-VCCS Interface | 10.60.9.101 | /30 | RX → VCCS uplink | Switch config 10.60.99.15 |

---

## 7. MẠNG QUẢN LÝ (MGMT) — `10.60.99.0/24`

| TT | Hostname | Model | IP MGMT | Vị trí | Nguồn xác nhận |
|---|---|---|---|---|---|
| 1 | RX-VHF-SW6860-MAIN-01 | ALE OS6860E-24 | **10.60.99.9/24** | Trạm RX | ✅ Switch config file |
| 2 | RX-VHF-HCM-SW6860-MAIN-01 | ALE OS6860E-24 | **10.60.99.15/24** | Trạm RX HCM | ✅ Switch config file |
| 3–n | Các switch còn lại | — | *(TBD)* | TX, ATCC | Chưa có config file |

---

## 8. NOKIA MPLS BACKBONE

| TT | Hostname | Model | IP | Vai trò | SNMP |
|---|---|---|---|---|---|
| 1 | TWR-MPLS-7250 | Nokia 7250 IXR-e | *(TBD)* | MPLS Router tại TWR | ✅ SNMP (Nokia TiMOS) |
| 2 | TWR-E1-7705 | Nokia 7705 SAR-8 | *(TBD)* | E&M Interface | ✅ SNMP |

---

## 9. BẢN ĐỒ SUBNET TỔNG HỢP

```
10.60.0.0/16  — VATM Long Thành
│
├── 10.60.6.0/27   — VHF RX VoIP MAIN  (T6-RV MAIN LAN1: .1–.9)
├── 10.60.6.20/27  — RX-SW6860-MAIN-01 VoIP interface
├── 10.60.6.30/27  — RX VoIP Gateway (default GW)
├── 10.60.6.32/27  — VHF RX VoIP STANDBY (T6-RV STBY LAN1: .41–.49)
├── 10.60.6.62/27  — RX VoIP STANDBY Gateway
├── 10.60.6.64/27  — VHF RX RCMS (T6-RV LAN3: .71–.89)
├── 10.60.6.65/27  — RX-VHF-LCMS
├── 10.60.6.94/27  — RX SW6360 Gateway (RCMS GW)
│
├── 10.60.7.0/27   — VHF TX VoIP MAIN (T6-TV MAIN LAN1: .1–.9)
├── 10.60.7.30/27  — TX VoIP MAIN Gateway
├── 10.60.7.32/27  — VHF TX VoIP STANDBY (T6-TV STBY LAN1: .41–.49)
├── 10.60.7.62/27  — TX VoIP STANDBY Gateway
├── 10.60.7.64/27  — VHF TX RCMS (T6-TV LAN3: .71–.89)
├── 10.60.7.65/27  — TX-VHF-LCMS
├── 10.60.7.94/27  — TX SW6360 Gateway (RCMS GW)
├── 10.60.7.96/28  — RCMS WAN (.97 = RX-RCMS, .98 = TX-RCMS, GW .110)
│
├── 10.60.8.0/24   — VCCS Internal (FREQUENTIS)
│
├── 10.60.9.0/24   — VCCS Links & Firewall
│   ├── 10.60.9.20/30  — Fw1 link (.21 Sw side)
│   ├── 10.60.9.24/30  — Fw2 link (.25 Sw side)
│   └── 10.60.9.100/30 — Rx-VCCS link (.101)
│
├── 10.60.11.0/27  — Ultimate Backup VHF
│   ├── .1–.6      T6-TRV ×6
│   ├── .10        VHF-BACKUP_LAN1 (SW HCM interface — cần xác nhận)
│   ├── .11–.16    S4-IP ×6
│   ├── .29        UBVHF-LCMS
│   └── .30        UBVHF-RCMS
│
└── 10.60.99.0/24  — MGMT Network
    ├── .9   RX-VHF-SW6860-MAIN-01
    └── .15  RX-VHF-HCM-SW6860-MAIN-01
```

---

## 10. MỤC TIÊU SNMP EXPORTER CHO PROMETHEUS (Tổng hợp)

Bảng này là **input trực tiếp** cho file `snmp_exporter/targets.yml` ở BƯỚC 2 (Docker):

| Nhóm | Targets (IP:port) | Module SNMP | Số lượng |
|---|---|---|---|
| `vhf_tx_main` | 10.60.7.71–79:161 | park_air_t6 | 9 |
| `vhf_tx_standby` | 10.60.7.81–89:161 | park_air_t6 | 9 |
| `vhf_rx_main` | 10.60.6.71–79:161 | park_air_t6 | 9 |
| `vhf_rx_standby` | 10.60.6.81–89:161 | park_air_t6 | 9 |
| `vhf_ubvhf_trv` | 10.60.11.1–6:161 | park_air_t6 | 6 |
| `switch_voip` | 10.60.7.30, .62, 10.60.6.20 :161 | ale_os6860 | 3+ |
| `switch_rcms` | 10.60.7.94, 10.60.6.94:161 | ale_os6360 | 2+ |
| `s4ip_tcp_check` | 10.60.11.11–16:5001 | blackbox TCP | 6 |
| `rcms_workstation` | 10.60.7.97, .98, 10.60.11.30:icmp | blackbox ICMP | 3 |
| **TỔNG** | | | **56 targets** |

> **Ghi chú SNMP poll:** Prometheus SNMP Exporter **phải nằm trong cùng VLAN** với LAN3 (RCMS subnet) của T6 radio, hoặc có route từ container network tới dải 10.60.7.64/27 và 10.60.6.64/27. Thực hiện qua tunnel VPN hoặc SSH port-forward khi chạy trên Lab VMware.

---

*Các trường *(TBD)* cần bổ sung từ: tài liệu IP Planning VCCS (FREQUENTIS), tài liệu Nokia router, và switch config file của TX station và ATCC switches.*
