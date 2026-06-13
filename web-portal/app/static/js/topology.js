'use strict';

/* ================================================================
   topology.js — Option A: 2D NOC Horizontal Flow
   Luồng: TX/RX ←fiber→ xMG ←eth→ RED/BLUE SW ←fiber→ FL20(CWP)
   Color scheme: Aviation NOC Dark (ATCC Long Thành)
   Chuẩn: EUROCAE ED-137 (Delay<100ms / Jitter<20ms / Loss<1%)
   ================================================================ */

const CW = 960, CH = 440;
let _cvs = null, _ctx = null, _dpr = 1, _scale = 1;
let _animRunning = false, _hov = null;

/* ================================================================
   NODE DEFINITIONS
   devices.main / devices.standby — hiển thị trong Panel MAIN/STANDBY
   statusKey: key trong window.topo nhận từ WebSocket
   SN/PN: điền sau khi có dữ liệu thực tế từ nhà cung cấp
   ================================================================ */
/* ================================================================
   TOPO_NODES — Dữ liệu thiết bị thực tế từ Hợp đồng TB06
   Nguồn: TB06 (8225-HĐ-QLB) Phụ lục cung cấp hàng hóa + BƯỚC1_ThietBi.md
   Cấu trúc: devices.main/standby.items[] — mảng thiết bị tại tab đó
   ================================================================ */
const TOPO_NODES = [
  /* ── TRẠM PHÁT (TX) ────────────────────────────────────────── */
  {
    id: 'tx', title: 'TRẠM PHÁT', sub: 'TX Station — VHF AM Transmitter', ip: '10.60.7.0/27',
    kpi: { delay: 12, jitter: 3, loss: 0.02 },
    devices: {
      main: {
        label:     'TX MAIN — 9 kênh VHF AM (Park Air T6-TV)',
        statusKey: 'tx_status',
        items: [
          { name: 'Máy phát VHF AM CH01', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.71', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH02', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.72', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH03', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.73', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH04', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.74', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH05', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.75', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH06', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.76', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH07', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.77', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH08', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.78', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH09', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.79', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Switch VoIP MAIN',     model: 'OS6860E-24',    pn: 'OS6860E-24',    vendor: 'ALE / China',             qty: 1, ip: '10.60.7.30', freq: '—', note: 'GW VLAN VoIP MAIN' },
          { name: 'Switch RCMS (LAN3)',   model: 'OS6360-24',     pn: 'OS6360-24',     vendor: 'ALE / China',             qty: 1, ip: '10.60.7.94', freq: '—', note: 'GW RCMS subnet' },
          { name: 'Máy tính LCMS',        model: 'HP Z1 G9',      pn: 'Z1 G9',         vendor: 'HP / China',              qty: 1, ip: '10.60.7.65', freq: '—', note: 'Giám sát cục bộ' },
          { name: 'Anten VHF (×9)',        model: 'CXL 3-1LW',     pn: '100000075',     vendor: 'Procom / North Macedonia', qty: 9, ip: '—',         freq: 'VHF 118–137 MHz', note: 'Gắn cột anten TX' },
          { name: 'Bộ lọc VHF (×9)',       model: '68-SYS00101/1', pn: '68-SYS00101/1', vendor: 'Park Air / Italia',       qty: 9, ip: '—',         freq: 'VHF 118–137 MHz', note: 'Lọc sóng hài' },
          { name: 'Chống sét VHF (×9)',    model: 'GT-NFM-AL',     pn: 'GT-NFM-AL',     vendor: 'PolyPhaser / China',      qty: 9, ip: '—',         freq: '—', note: 'Bảo vệ đường anten' },
        ],
      },
      standby: {
        label:     'TX STANDBY — 9 kênh VHF AM (Park Air T6-TV)',
        statusKey: 'tx_stby_status',
        items: [
          { name: 'Máy phát VHF AM CH01', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.81', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH02', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.82', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH03', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.83', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH04', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.84', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH05', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.85', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH06', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.86', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH07', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.87', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH08', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.88', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy phát VHF AM CH09', model: 'T6-TV', pn: 'T6-TV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.7.89', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Switch VoIP STANDBY',  model: 'OS6860E-24',    pn: 'OS6860E-24',    vendor: 'ALE / China',  qty: 1, ip: '10.60.7.62', freq: '—', note: 'GW VoIP STANDBY' },
          { name: 'Máy tính RCMS',        model: 'HP Z1 G9',      pn: 'Z1 G9',         vendor: 'HP / China',   qty: 1, ip: '10.60.7.98', freq: '—', note: 'Giám sát từ xa TX' },
          { name: 'PM giám sát R4-MARCS', model: 'R4-MARCS',      pn: 'R4-MARCS',      vendor: 'Park Air',     qty: 1, ip: '—',         freq: '—', note: 'SW RCMS poll T6-TV' },
          { name: 'Anten VHF (×9)',        model: 'CXL 3-1LW',     pn: '100000075',     vendor: 'Procom / North Macedonia', qty: 9, ip: '—', freq: 'VHF 118–137 MHz', note: 'Gắn cột anten TX' },
          { name: 'Bộ lọc VHF (×9)',       model: '68-SYS00101/1', pn: '68-SYS00101/1', vendor: 'Park Air / Italia', qty: 9, ip: '—', freq: 'VHF 118–137 MHz', note: '' },
          { name: 'Chống sét VHF (×9)',    model: 'GT-NFM-AL',     pn: 'GT-NFM-AL',     vendor: 'PolyPhaser / China', qty: 9, ip: '—', freq: '—', note: '' },
        ],
      },
    },
  },

  /* ── TRẠM THU (RX) ─────────────────────────────────────────── */
  {
    id: 'rx', title: 'TRẠM THU', sub: 'RX Station — VHF AM Receiver', ip: '10.60.6.0/27',
    kpi: { delay: 18, jitter: 4, loss: 0.05 },
    devices: {
      main: {
        label:     'RX MAIN — 9 kênh VHF AM (Park Air T6-RV)',
        statusKey: 'rx_status',
        items: [
          { name: 'Máy thu VHF AM CH01', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.71', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH02', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.72', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH03', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.73', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH04', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.74', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH05', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.75', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH06', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.76', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH07', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.77', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH08', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.78', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH09', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.79', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Switch VoIP MAIN',   model: 'OS6860E-24',    pn: 'OS6860E-24',    vendor: 'ALE / China',             qty: 1, ip: '10.60.99.9', freq: '—', note: 'VLAN VoIP / MGMT' },
          { name: 'Switch RCMS (LAN3)', model: 'OS6360-24',     pn: 'OS6360-24',     vendor: 'ALE / China',             qty: 1, ip: '10.60.6.94', freq: '—', note: 'GW RCMS subnet' },
          { name: 'Máy tính LCMS',      model: 'HP Z1 G9',      pn: 'Z1 G9',         vendor: 'HP / China',              qty: 1, ip: '10.60.6.65', freq: '—', note: 'Giám sát cục bộ' },
          { name: 'Anten VHF (×9)',      model: 'CXL 3-1LW',     pn: '100000075',     vendor: 'Procom / North Macedonia', qty: 9, ip: '—',         freq: 'VHF 118–137 MHz', note: 'Yagi gắn cột anten RX' },
          { name: 'Bộ lọc VHF (×9)',     model: '68-SYS00101/1', pn: '68-SYS00101/1', vendor: 'Park Air / Italia',       qty: 9, ip: '—',         freq: 'VHF 118–137 MHz', note: 'Lọc sóng hài' },
          { name: 'Chống sét VHF (×9)',  model: 'GT-NFM-AL',     pn: 'GT-NFM-AL',     vendor: 'PolyPhaser / China',      qty: 9, ip: '—',         freq: '—', note: 'Bảo vệ đường anten' },
        ],
      },
      standby: {
        label:     'RX STANDBY — 9 kênh VHF AM (Park Air T6-RV)',
        statusKey: 'rx_stby_status',
        items: [
          { name: 'Máy thu VHF AM CH01', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.81', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH02', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.82', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH03', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.83', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH04', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.84', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH05', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.85', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH06', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.86', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH07', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.87', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH08', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.88', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Máy thu VHF AM CH09', model: 'T6-RV', pn: 'T6-RV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.6.89', freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Switch VoIP STANDBY',  model: 'OS6860E-24',    pn: 'OS6860E-24',    vendor: 'ALE / China', qty: 1, ip: 'TBD',        freq: '—', note: 'GW VoIP dự phòng' },
          { name: 'Máy tính RCMS',        model: 'HP Z1 G9',      pn: 'Z1 G9',         vendor: 'HP / China',  qty: 1, ip: '10.60.7.97', freq: '—', note: 'Giám sát từ xa RX' },
          { name: 'PM giám sát R4-MARCS', model: 'R4-MARCS',      pn: 'R4-MARCS',      vendor: 'Park Air',    qty: 1, ip: '—',         freq: '—', note: 'SW RCMS poll T6-RV' },
          { name: 'Anten VHF (×9)',        model: 'CXL 3-1LW',     pn: '100000075',     vendor: 'Procom / North Macedonia', qty: 9, ip: '—', freq: 'VHF 118–137 MHz', note: '' },
          { name: 'Bộ lọc VHF (×9)',       model: '68-SYS00101/1', pn: '68-SYS00101/1', vendor: 'Park Air / Italia', qty: 9, ip: '—', freq: 'VHF 118–137 MHz', note: '' },
          { name: 'Chống sét VHF (×9)',    model: 'GT-NFM-AL',     pn: 'GT-NFM-AL',     vendor: 'PolyPhaser / China', qty: 9, ip: '—', freq: '—', note: '' },
        ],
      },
    },
  },

  /* ── xMG SWITCH (VCCS Media Gateway) ───────────────────────── */
  {
    id: 'xmg', title: 'xMG SWITCH', sub: 'VCCS Media Gateway — Frequentis', ip: '10.60.8.71÷122',
    kpi: { delay: 5, jitter: 1, loss: 0.01 },
    devices: {
      main: {
        label:     'xMG #1 PRIMARY — 11 QMG Modules VoIP (18 tần số A/G)',
        statusKey: 'xmg_status',
        items: [
          { name: 'xMG Chassis 2.0 #1',      model: 'xMG 2.0',                pn: 'xMG-2.0',    vendor: 'Frequentis / Canada', qty: 1,  ip: '10.60.8.71÷81', freq: 'VoIP SIP ED-137',    note: 'VoIP A/G gateway VCCS' },
          { name: 'QMG Module (VHF VoIP)',    model: 'QMG Module for xMG 2.0', pn: 'QMG-xMG2.0', vendor: 'Frequentis / Canada', qty: 10, ip: '10.60.8.71÷80', freq: 'VHF AM · 18 tần số',  note: '2 tần số/card · ED-137' },
          { name: 'QMG Module (D-ATIS)',      model: 'QMG Module for xMG 2.0', pn: 'QMG-xMG2.0', vendor: 'Frequentis / Canada', qty: 1,  ip: '10.60.8.81',    freq: 'D-ATIS VoIP',         note: 'D-ATIS VoIP interface' },
          { name: 'LS4 Application Server',   model: 'Dell PowerEdge R250',     pn: 'R250DELL',   vendor: 'Frequentis / Canada', qty: 1,  ip: 'TBD',           freq: '—',                   note: 'VCCS application server' },
          { name: 'LS4 Unmanaged Switch',     model: 'LS4 Ethernet Switch',     pn: 'LS4-SW',     vendor: 'Frequentis / Canada', qty: 6,  ip: '—',             freq: '—',                   note: 'Internal LAN VCCS #1' },
        ],
      },
      standby: {
        label:     'xMG #2 STANDBY — 4 QMG Modules + Grandstream FXO GW',
        statusKey: 'xmg_stby_status',
        items: [
          { name: 'xMG Chassis 2.0 #2',      model: 'xMG 2.0',                pn: 'xMG-2.0',    vendor: 'Frequentis / Canada', qty: 1, ip: '10.60.8.101÷111', freq: 'VoIP SIP ED-137',   note: 'VoIP failover chassis' },
          { name: 'QMG Module (dự phòng)',    model: 'QMG Module for xMG 2.0', pn: 'QMG-xMG2.0', vendor: 'Frequentis / Canada', qty: 4, ip: '10.60.8.101÷104', freq: 'VHF AM · VoIP',    note: 'Failover VoIP interface' },
          { name: 'Grandstream FXO Gateway',  model: 'GS 8FXS/8FXO + TMG-3E', pn: 'TMG-3E',     vendor: 'Frequentis / Canada', qty: 3, ip: 'TBD',             freq: 'PSTN analog FXO',   note: 'Thoại analog FXO: 10 line' },
          { name: 'LS4 Unmanaged Switch',     model: 'LS4 Ethernet Switch',     pn: 'LS4-SW',     vendor: 'Frequentis / Canada', qty: 6, ip: '—',               freq: '—',                 note: 'Internal LAN VCCS #2' },
          { name: 'Máy tính LCMS VCCS',       model: 'HP Z1 G9',                pn: 'Z1 G9',      vendor: 'HP / China',          qty: 1, ip: 'TBD',             freq: '—',                 note: 'Quản lý VCCS' },
          { name: 'Máy tính RCMS VCCS',       model: 'HP Z1 G9',                pn: 'Z1 G9',      vendor: 'HP / China',          qty: 1, ip: 'TBD',             freq: '—',                 note: 'Giám sát từ xa VCCS' },
        ],
      },
    },
  },

  /* ── RED SWITCH CORE (J1 — Primary Ring) ───────────────────── */
  {
    id: 'red_sw', title: 'RED J1 SW', sub: 'Core Switch — Nokia/ALE (RED Ring Primary)', ip: '10.60.8.204',
    kpi: { delay: 8, jitter: 2, loss: 0.01 },
    devices: {
      main: {
        label:     'RED SWITCH CORE — Hệ thống hạ tầng đường truyền chính (J1)',
        statusKey: 'red_sw_status',
        items: [
          { name: 'Router định tuyến biên',       model: '7250 IXR-eL',      pn: '7250 IXR-eL', vendor: 'Nokia / Mexico',    qty: 1, ip: 'TBD',        freq: '—', note: 'MPLS backbone router J1' },
          { name: 'Router phân phối',              model: '7250 IXR-eL',      pn: '7250 IXR-eL', vendor: 'Nokia / Mexico',    qty: 1, ip: 'TBD',        freq: '—', note: 'Distribution router J1' },
          { name: 'Thiết bị tổng hợp dịch vụ',    model: 'Nokia SAR-8',      pn: 'SAR-8',       vendor: 'Nokia / Mexico',    qty: 1, ip: 'TBD',        freq: '—', note: 'Service Aggregation Router' },
          { name: 'Switch truy cập 24P (RED)',     model: 'OS6860E-24',       pn: 'OS6860E-24',  vendor: 'ALE / China',       qty: 4, ip: '10.60.8.204', freq: '—', note: 'SNMP UDP 161 · RED ring core' },
          { name: 'Tường lửa vùng biên',           model: 'FortiGate FG-100F', pn: 'FG-100F',   vendor: 'Fortinet / Taiwan', qty: 1, ip: 'TBD',        freq: '—', note: 'Bảo vệ vùng biên RED' },
          { name: 'Tường lửa DMZ',                model: 'FortiGate FG-400F', pn: 'FG-400F',   vendor: 'Fortinet / Taiwan', qty: 1, ip: 'TBD',        freq: '—', note: 'DMZ firewall' },
        ],
      },
      standby: null,  /* Dự phòng ở cấp Ring (RED↔BLUE dual-ring) — không có SW vật lý riêng */
    },
  },

  /* ── BLUE SWITCH CORE (J2 — Standby Ring) ──────────────────── */
  {
    id: 'blue_sw', title: 'BLUE J2 SW', sub: 'Core Switch — Nokia/ALE (BLUE Ring Standby)', ip: '10.60.8.203',
    kpi: { delay: 10, jitter: 3, loss: 0.02 },
    devices: {
      main: {
        label:     'BLUE SWITCH CORE — Hệ thống hạ tầng đường truyền dự phòng (J2)',
        statusKey: 'blue_sw_status',
        items: [
          { name: 'Router định tuyến biên',       model: '7250 IXR-eL',      pn: '7250 IXR-eL', vendor: 'Nokia / Mexico',    qty: 1, ip: 'TBD',        freq: '—', note: 'MPLS backbone router J2' },
          { name: 'Thiết bị tổng hợp dịch vụ',    model: 'Nokia SAR-8',      pn: 'SAR-8',       vendor: 'Nokia / Mexico',    qty: 1, ip: 'TBD',        freq: '—', note: 'Service Aggregation Router' },
          { name: 'Switch truy cập 24P (BLUE)',    model: 'OS6860E-24',       pn: 'OS6860E-24',  vendor: 'ALE / China',       qty: 4, ip: '10.60.8.203', freq: '—', note: 'SNMP UDP 161 · BLUE ring core' },
          { name: 'Tường lửa vùng biên',           model: 'FortiGate FG-100F', pn: 'FG-100F',   vendor: 'Fortinet / Taiwan', qty: 1, ip: 'TBD',        freq: '—', note: 'Bảo vệ vùng biên BLUE' },
          { name: 'Máy chủ quản trị (FOC)',        model: 'HPE DL360 Gen10+',  pn: 'DL360-G10+', vendor: 'HPE / Singapore',  qty: 1, ip: 'TBD',        freq: '—', note: 'Management server FOC' },
        ],
      },
      standby: null,  /* Dự phòng ở cấp Ring (RED↔BLUE dual-ring) — không có SW vật lý riêng */
    },
  },

  /* ── FL20 — Đài KSKL Tầng 20 (TWR) ─────────────────────────── */
  {
    id: 'fl20', title: 'FL 20 — TWR', sub: 'Đài KSKL · Tầng 20 · ATCC Long Thành', ip: '10.60.11.0/27',
    kpi: { delay: 25, jitter: 5, loss: 0.1 },
    devices: {
      main: {
        label:     'UBVHF MAIN — SW_20FL_1 kết nối RED ring (6 kênh VHF dự phòng)',
        statusKey: 'fl20_status',
        items: [
          { name: 'Bộ thu phát VHF CH01 (UBVHF)', model: 'T6-TRV', pn: 'T6-TRV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.1',  freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Bộ thu phát VHF CH02 (UBVHF)', model: 'T6-TRV', pn: 'T6-TRV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.2',  freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Bộ thu phát VHF CH03 (UBVHF)', model: 'T6-TRV', pn: 'T6-TRV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.3',  freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Bộ thu phát VHF CH04 (UBVHF)', model: 'T6-TRV', pn: 'T6-TRV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.4',  freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Bộ thu phát VHF CH05 (UBVHF)', model: 'T6-TRV', pn: 'T6-TRV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.5',  freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'Bộ thu phát VHF CH06 (UBVHF)', model: 'T6-TRV', pn: 'T6-TRV', vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.6',  freq: 'VHF AM · TBD MHz', note: 'SNMP UDP 161 · LAN3' },
          { name: 'S4-IP Controller CH01',         model: 'S4-IP',  pn: 'S4-IP',  vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.11', freq: '—', note: 'TCP port 5001 · Không SNMP' },
          { name: 'S4-IP Controller CH02',         model: 'S4-IP',  pn: 'S4-IP',  vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.12', freq: '—', note: 'TCP port 5001 · Không SNMP' },
          { name: 'S4-IP Controller CH03',         model: 'S4-IP',  pn: 'S4-IP',  vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.13', freq: '—', note: 'TCP port 5001 · Không SNMP' },
          { name: 'S4-IP Controller CH04',         model: 'S4-IP',  pn: 'S4-IP',  vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.14', freq: '—', note: 'TCP port 5001 · Không SNMP' },
          { name: 'S4-IP Controller CH05',         model: 'S4-IP',  pn: 'S4-IP',  vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.15', freq: '—', note: 'TCP port 5001 · Không SNMP' },
          { name: 'S4-IP Controller CH06',         model: 'S4-IP',  pn: 'S4-IP',  vendor: 'Park Air / UK', qty: 1, ip: '10.60.11.16', freq: '—', note: 'TCP port 5001 · Không SNMP' },
          { name: 'Switch RCMS UBVHF',             model: 'OS6360-24',     pn: 'OS6360-24',     vendor: 'ALE / China',             qty: 1, ip: 'TBD',         freq: '—', note: 'Monitoring LAN tầng 20' },
          { name: 'Máy tính LCMS UBVHF',           model: 'HP Z1 G9',      pn: 'Z1 G9',         vendor: 'HP / China',              qty: 1, ip: '10.60.11.29', freq: '—', note: 'Giám sát cục bộ' },
          { name: 'Anten VHF UBVHF (×6)',           model: 'CXL 3-1LW',     pn: '100000075',     vendor: 'Procom / North Macedonia', qty: 6, ip: '—',          freq: 'VHF 118–137 MHz', note: 'Mái tầng 20 TWR' },
          { name: 'Bộ lọc VHF (×6)',                model: '68-SYS00101/1',  pn: '68-SYS00101/1', vendor: 'Park Air / Italia',       qty: 6, ip: '—',          freq: 'VHF 118–137 MHz', note: '' },
          { name: 'Chống sét VHF (×6)',             model: 'GT-NFM-AL',      pn: 'GT-NFM-AL',     vendor: 'PolyPhaser / China',      qty: 6, ip: '—',          freq: '—', note: '' },
        ],
      },
      standby: {
        label:     'CWP VCCS + RCMS — SW_20FL_2 kết nối BLUE ring',
        statusKey: 'fl20_stby_status',
        items: [
          { name: 'Vị trí CWP VCCS (Frequentis)', model: 'PCU + TED', pn: 'CWP-PCU', vendor: 'Frequentis / Canada', qty: 14, ip: '10.60.8.x',   freq: 'VoIP SIP ED-137',  note: 'PCU + TED + Mic + HS + Headset' },
          { name: 'Vị trí RCMS VCCS',              model: 'PCU + TED', pn: 'CWP-PCU', vendor: 'Frequentis / Canada', qty: 1,  ip: '10.60.8.x',   freq: 'VoIP SIP ED-137',  note: 'Remote monitoring position' },
          { name: 'Máy tính RCMS UBVHF',           model: 'HP Z1 G9',  pn: 'Z1 G9',   vendor: 'HP / China',          qty: 1,  ip: '10.60.11.30', freq: '—',                note: 'Giám sát từ xa UBVHF' },
          { name: 'Máy thu phát TETRA (cố định)',  model: 'MXM600',    pn: 'MXM600',  vendor: 'Motorola / Malaysia', qty: 4,  ip: '—',           freq: 'TETRA UHF 380–400 MHz', note: 'Gắn rack đài chỉ huy' },
          { name: 'Máy thu phát TETRA (cầm tay)',  model: 'MXP600',    pn: 'MXP600',  vendor: 'Motorola / Malaysia', qty: 4,  ip: '—',           freq: 'TETRA UHF 380–400 MHz', note: 'Handheld' },
          { name: 'Anten UHF TETRA (×4)',          model: 'BS450XL6-A', pn: 'BS450XL6', vendor: 'Mobile Mark / USA', qty: 4,  ip: '—',           freq: 'UHF 380–470 MHz',  note: 'Gắn tại Đài chỉ huy' },
        ],
      },
    },
  },
];

/* ================================================================
   LAYOUT — center (cx,cy), half-size (hw,hh) in canvas coords
   ================================================================ */
const LAYOUT = {
  tx:      { cx: 100, cy: 128, hw: 71, hh: 28 },
  rx:      { cx: 100, cy: 312, hw: 71, hh: 28 },
  xmg:     { cx: 300, cy: 220, hw: 79, hh: 32 },
  red_sw:  { cx: 510, cy: 152, hw: 72, hh: 28 },
  blue_sw: { cx: 510, cy: 290, hw: 72, hh: 28 },
  fl20:    { cx: 776, cy: 220, hw: 86, hh: 38 },
};

/* ================================================================
   TOPO_LINKS — render config (màu, nét, độ rộng)
   Dùng tên TOPO_LINKS để tránh xung đột với const LINKS trong config.js
   ================================================================ */
const TOPO_LINKS = [
  { id: 'tx_xmg',    color: '#00e5ff', dash: true,  w: 1.5, lbl: 'fiber' },
  { id: 'rx_xmg',    color: '#00e5ff', dash: true,  w: 1.5, lbl: 'fiber' },
  { id: 'xmg_red',   color: '#ff3344', dash: false, w: 2.0, lbl: 'RED J1' },
  { id: 'xmg_blue',  color: '#2288ff', dash: false, w: 2.0, lbl: 'BLUE J2' },
  { id: 'red_fl20',  color: '#ff3344', dash: true,  w: 1.8, lbl: 'RED J1' },
  { id: 'blue_fl20', color: '#2288ff', dash: true,  w: 1.8, lbl: 'BLUE J2' },
];

/* ================================================================
   BEZIER PATHS — [P0, CP1, CP2, P3]
   Tính từ cạnh trái/phải của các node trong LAYOUT
   ================================================================ */
const BEZ = {
  /* TX right(171,128) → xMG left(221,220) */
  tx_xmg:    [[171, 128], [208, 128], [208, 220], [221, 220]],
  /* RX right(171,312) → xMG left(221,220) */
  rx_xmg:    [[171, 312], [208, 312], [208, 220], [221, 220]],
  /* xMG right(379,220) → RED SW left(438,152) */
  xmg_red:   [[379, 220], [416, 220], [416, 152], [438, 152]],
  /* xMG right(379,220) → BLUE SW left(438,290) */
  xmg_blue:  [[379, 220], [416, 220], [416, 290], [438, 290]],
  /* RED SW right(582,152) → FL20 left(690,220) */
  red_fl20:  [[582, 152], [638, 152], [638, 220], [690, 220]],
  /* BLUE SW right(582,290) → FL20 left(690,220) */
  blue_fl20: [[582, 290], [638, 290], [638, 220], [690, 220]],
};

/* ── Particles ── */
let _parts = [];

/* ================================================================
   PUBLIC API
   ================================================================ */

/**
 * initTopology — gọi từ app.js DOMContentLoaded
 */
function initTopology() {
  _cvs = document.getElementById('topo-canvas');
  if (!_cvs) return;
  _dpr = window.devicePixelRatio || 1;
  _ctx = _cvs.getContext('2d');

  resizeCanvas();

  /* Khởi tạo particles — mỗi link 4–5 particles trải đều trên đường */
  TOPO_LINKS.forEach(lk => {
    const n = lk.dash ? 5 : 4;
    for (let i = 0; i < n; i++) {
      _parts.push({
        id:  lk.id,
        t:   i / n,
        spd: 0.0018 + Math.random() * 0.0014,
        col: lk.color,
      });
    }
  });

  _cvs.addEventListener('click',     _onClick);
  _cvs.addEventListener('mousemove', _onHover);
  window.addEventListener('resize',  resizeCanvas);

  if (!_animRunning) {
    _animRunning = true;
    requestAnimationFrame(animLoop);
  }
}

/**
 * resizeCanvas — tính lại kích thước canvas theo container + DPR
 */
function resizeCanvas() {
  if (!_cvs) return;
  const cont = document.getElementById('canvas-container');
  const cssW = cont ? cont.clientWidth : window.innerWidth;
  const cssH = Math.round(cssW * CH / CW);
  _dpr   = window.devicePixelRatio || 1;
  _scale = cssW / CW;
  _cvs.width  = Math.round(cssW * _dpr);
  _cvs.height = Math.round(cssH * _dpr);
  _cvs.style.width  = cssW + 'px';
  _cvs.style.height = cssH + 'px';
}

/**
 * drawTopo — vẽ một frame hoàn chỉnh từ global window.topo
 */
function drawTopo() {
  if (!_ctx || !_cvs) return;
  const c = _ctx;
  c.save();
  c.scale(_dpr * _scale, _dpr * _scale);

  _drawBG(c);
  _drawGrid(c);
  _drawCNSZone(c);
  TOPO_LINKS.forEach(lk => _drawLink(c, lk));
  _parts.forEach(p     => _drawParticle(c, p));
  TOPO_NODES.forEach(nd => _drawNode(c, nd));
  _drawLegend(c);

  c.restore();
}

/**
 * animLoop — RAF loop, cập nhật particles mỗi frame
 */
let _lastTs = 0;
function animLoop(ts) {
  _lastTs = ts;
  _parts.forEach(p => { p.t = (p.t + p.spd) % 1; });
  drawTopo();
  requestAnimationFrame(animLoop);
}

/* ================================================================
   DRAW FUNCTIONS
   ================================================================ */

function _drawBG(c) {
  c.fillStyle = '#020b18';
  c.fillRect(0, 0, CW, CH);
}

function _drawGrid(c) {
  c.save();
  c.strokeStyle = '#091527';
  c.lineWidth   = 0.5;
  for (let x = 0; x <= CW; x += 40) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, CH); c.stroke();
  }
  for (let y = 0; y <= CH; y += 40) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(CW, y); c.stroke();
  }
  c.restore();
}

function _drawCNSZone(c) {
  const x = 213, y = 108, w = 397, h = 244;
  c.save();
  c.fillStyle = 'rgba(9, 21, 38, 0.35)';
  c.fillRect(x, y, w, h);
  c.setLineDash([5, 4]);
  c.strokeStyle = '#1a3558';
  c.lineWidth   = 1;
  c.strokeRect(x, y, w, h);
  c.setLineDash([]);
  c.fillStyle = '#1e3a5f';
  c.font      = 'bold 10px Consolas, monospace';
  c.fillText('── CNS EQUIPMENT ROOM ──', x + 8, y + 15);
  c.restore();
}

function _drawLink(c, lk) {
  const b = BEZ[lk.id];
  if (!b) return;
  const st  = _linkStatus(lk.id);
  const col = st === 'crit' ? '#ff2244' : st === 'warn' ? '#ffaa00' : lk.color;

  c.save();
  c.beginPath();
  c.moveTo(b[0][0], b[0][1]);
  c.bezierCurveTo(b[1][0], b[1][1], b[2][0], b[2][1], b[3][0], b[3][1]);
  c.strokeStyle  = col;
  c.lineWidth    = lk.w;
  c.globalAlpha  = 0.72;
  if (lk.dash) c.setLineDash([6, 4]);
  c.stroke();
  c.setLineDash([]);

  /* Label tại mid-bezier */
  const m = _bezPt(0.5, b);
  c.font        = '9px Consolas, monospace';
  c.fillStyle   = col;
  c.globalAlpha = 0.65;
  c.fillText(lk.lbl, m[0] + 4, m[1] - 5);
  c.restore();
}

function _drawParticle(c, p) {
  const b = BEZ[p.id];
  if (!b) return;
  const pt    = _bezPt(p.t, b);
  const alpha = 0.25 + 0.75 * Math.pow(Math.sin(p.t * Math.PI), 0.5);
  c.save();
  c.beginPath();
  c.arc(pt[0], pt[1], 3, 0, Math.PI * 2);
  c.fillStyle   = p.col;
  c.globalAlpha = alpha;
  c.shadowColor = p.col;
  c.shadowBlur  = 7;
  c.fill();
  c.restore();
}

function _drawNode(c, nd) {
  const L     = LAYOUT[nd.id];
  if (!L) return;
  const isCWP = nd.id === 'fl20';
  const st    = _nodeStatus(nd.id);
  const stC   = _statusColor(st);
  const x = L.cx - L.hw, y = L.cy - L.hh, w = L.hw * 2, h = L.hh * 2;

  c.save();

  /* Nền + viền */
  if (isCWP) {
    c.shadowColor = '#ffa020';
    c.shadowBlur  = 18;
    _rrect(c, x, y, w, h, 7);
    c.fillStyle = '#120d02';
    c.fill();
    c.shadowBlur = 0;
    _rrect(c, x, y, w, h, 7);
    c.strokeStyle = '#ffa020';
    c.lineWidth   = 2;
    c.stroke();
  } else {
    _rrect(c, x, y, w, h, 5);
    c.fillStyle = '#0d1e34';
    c.fill();
    _rrect(c, x, y, w, h, 5);
    c.strokeStyle  = stC;
    c.lineWidth    = 0.8;
    c.globalAlpha  = 0.55;
    c.stroke();
    c.globalAlpha = 1;
  }

  /* Thanh accent trái */
  c.fillStyle = isCWP ? '#ffa020' : stC;
  _rrect(c, x, y, 4, h, 2);
  c.fill();

  /* Status dot */
  c.beginPath();
  c.arc(x + w - 10, y + 10, 5, 0, Math.PI * 2);
  c.fillStyle   = stC;
  c.shadowColor = stC;
  c.shadowBlur  = isCWP ? 10 : 6;
  c.fill();
  c.shadowBlur = 0;

  /* Text */
  const tx = x + 10;
  if (isCWP) {
    c.fillStyle = '#ffd070'; c.font = 'bold 12px Consolas, monospace';
    c.fillText(nd.title, tx, y + 20);
    c.fillStyle = '#b07020'; c.font = '10px Consolas, monospace';
    c.fillText(nd.sub, tx, y + 34);
    c.fillStyle = '#7a5010'; c.font = '9px Consolas, monospace';
    c.fillText(nd.ip || '', tx, y + 47);
    c.fillStyle = '#ffa020'; c.font = 'bold 9px Consolas, monospace';
    c.fillText('★ CWP ×11', tx, y + h - 10);
  } else {
    c.fillStyle = '#c8daf0'; c.font = 'bold 10px Consolas, monospace';
    c.fillText(nd.title, tx, y + 17);
    c.fillStyle = '#4a7090'; c.font = '9px Consolas, monospace';
    c.fillText(nd.sub,   tx, y + 30);
    c.fillStyle = '#2a5070'; c.font = '9px Consolas, monospace';
    c.fillText(nd.ip || '', tx, y + 43);
  }

  /* Hover ring */
  if (_hov === nd.id) {
    _rrect(c, x - 2, y - 2, w + 4, h + 4, isCWP ? 9 : 7);
    c.strokeStyle  = isCWP ? '#ffd070' : '#c8daf0';
    c.lineWidth    = 1.5;
    c.globalAlpha  = 0.45;
    c.stroke();
    c.globalAlpha = 1;
  }

  c.restore();
}

function _drawLegend(c) {
  const items = [
    { col: '#00e5ff', dash: true,  lbl: 'Cáp quang (fiber)' },
    { col: '#ff3344', dash: false, lbl: 'RED ring J1' },
    { col: '#2288ff', dash: false, lbl: 'BLUE ring J2' },
    { col: '#00ff88', dot: true,   lbl: 'ED-137 ✓' },
    { col: '#ffaa00', dot: true,   lbl: 'Cảnh báo' },
    { col: '#ff2244', dot: true,   lbl: 'Lỗi kết nối' },
  ];
  const y = CH - 12;
  let x = 16;

  c.save();
  c.font = '9px Consolas, monospace';

  items.forEach(it => {
    if (it.dot) {
      c.beginPath(); c.arc(x + 5, y, 5, 0, Math.PI * 2);
      c.fillStyle   = it.col;
      c.globalAlpha = 0.85;
      c.fill();
      c.globalAlpha = 1;
      x += 14;
    } else {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y);
      c.strokeStyle = it.col;
      c.lineWidth   = 2;
      if (it.dash) c.setLineDash([4, 3]);
      c.stroke();
      c.setLineDash([]);
      x += 22;
    }
    c.fillStyle   = '#4a7090';
    c.globalAlpha = 1;
    const tw = c.measureText(it.lbl).width;
    c.fillText(it.lbl, x, y + 4);
    x += tw + 16;
  });

  c.fillStyle   = '#2a4060';
  c.font        = 'italic 9px sans-serif';
  c.globalAlpha = 1;
  c.textAlign   = 'right';
  c.fillText('💡 Click node để xem chi tiết', CW - 8, y + 4);
  c.textAlign = 'left';
  c.restore();
}

/* ================================================================
   HELPERS
   ================================================================ */

function _bezPt(t, b) {
  const u = 1 - t;
  return [
    u*u*u*b[0][0] + 3*u*u*t*b[1][0] + 3*u*t*t*b[2][0] + t*t*t*b[3][0],
    u*u*u*b[0][1] + 3*u*u*t*b[1][1] + 3*u*t*t*b[2][1] + t*t*t*b[3][1],
  ];
}

function _rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.arcTo(x + w, y,     x + w, y + r,     r);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);     c.arcTo(x,     y + h, x,     y + h - r, r);
  c.lineTo(x, y + r);         c.arcTo(x,     y,     x + r, y,         r);
  c.closePath();
}

function _nodeStatus(id) {
  const t = window.topo || {};
  return t[id + '_status'] || 'ok';
}

function _linkStatus(id) {
  const t = window.topo || {};
  return t['link_' + id] || 'ok';
}

function _statusColor(st) {
  return { ok: '#00ff88', warn: '#ffaa00', crit: '#ff2244', unknown: '#4a7090' }[st] || '#4a7090';
}

/* ================================================================
   EVENT HANDLERS
   ================================================================ */

function _canvasPt(e) {
  const r = _cvs.getBoundingClientRect();
  return { x: (e.clientX - r.left) / _scale, y: (e.clientY - r.top) / _scale };
}

function _onHover(e) {
  const p = _canvasPt(e);
  let hit = null;
  TOPO_NODES.forEach(nd => {
    const L = LAYOUT[nd.id];
    if (Math.abs(p.x - L.cx) <= L.hw && Math.abs(p.y - L.cy) <= L.hh) hit = nd.id;
  });
  _hov = hit;
  _cvs.style.cursor = hit ? 'pointer' : 'default';
}

function _onClick(e) {
  const p = _canvasPt(e);
  let hit = null;
  TOPO_NODES.forEach(nd => {
    const L = LAYOUT[nd.id];
    if (Math.abs(p.x - L.cx) <= L.hw && Math.abs(p.y - L.cy) <= L.hh) hit = nd;
  });
  if (hit) _openNodePanel(hit);
  else if (typeof window.closePanel === 'function') window.closePanel();
}

/* ================================================================
   NODE DETAIL PANEL — MAIN / STANDBY
   ================================================================ */

/**
 * _devStatusInfo — lấy trạng thái thiết bị từ window.topo
 * @param {string|null} statusKey — key trong window.topo (vd: 'tx_status')
 * @returns {{ cls, icon, lbl }} — CSS class + icon + label hiển thị
 */
function _devStatusInfo(statusKey) {
  const t = window.topo || {};
  /* Chưa nhận được dữ liệu từ WebSocket/Prometheus → Pending */
  if (!t.ts) {
    return { cls: 'st-pend', icon: '⟳', lbl: 'Đang đồng bộ Prometheus...' };
  }
  const st = statusKey ? (t[statusKey] || 'unknown') : 'unknown';
  return ({
    ok:      { cls: 'st-ok',   icon: '●', lbl: 'OK — ED-137 ✓' },
    warn:    { cls: 'st-warn', icon: '⚠', lbl: 'CẢNH BÁO — Suy hao/Trễ cao' },
    crit:    { cls: 'st-crit', icon: '✕', lbl: 'LỖI — Mất kết nối' },
    unknown: { cls: 'st-unk',  icon: '?', lbl: 'KHÔNG XÁC ĐỊNH' },
  }[st] || { cls: 'st-unk', icon: '?', lbl: 'KHÔNG XÁC ĐỊNH' });
}

/**
 * _renderDevCard — render bảng danh sách thiết bị tại tab MAIN/STANDBY
 * @param {string} slot  — 'main' hoặc 'standby'
 * @param {object|null} dev — { label, statusKey, items[] } từ TOPO_NODES.devices
 */
function _renderDevCard(slot, dev) {
  const el = document.getElementById('ptab-' + slot + '-card');
  if (!el) return;

  /* Không có thiết bị dự phòng vật lý (red_sw, blue_sw) */
  if (!dev) {
    el.innerHTML = `<div class="dev-na">
      Không có thiết bị STANDBY vật lý riêng.<br>
      <small style="opacity:.75">Dự phòng ở cấp Ring — RED ↔ BLUE tự động chuyển đổi.</small>
    </div>`;
    return;
  }

  const si = _devStatusInfo(dev.statusKey);
  const ts = (window.topo && window.topo.ts)
    ? new Date(window.topo.ts).toLocaleTimeString('vi-VN')
    : '—';

  /* Render rows cho từng thiết bị trong items[] */
  const rows = (dev.items || []).map((it, idx) => {
    const hasIp = it.ip && it.ip !== '—' && !it.ip.includes('÷') && !it.ip.includes('x');
    const pingCell = hasIp
      ? `<button class="eq-ping-btn" onclick="pingDevice('${it.ip}',this)" title="Ping ${it.ip}">⚡ Ping</button><span class="ping-result"></span>`
      : `<span style="color:var(--text3)">—</span>`;
    return `
    <tr class="eq-row${idx % 2 === 0 ? '' : ' eq-row-alt'}">
      <td class="eq-stt">${idx + 1}</td>
      <td class="eq-name">${it.name}</td>
      <td class="eq-model mono">${it.model}<br><span class="eq-pn">PN: ${it.pn}</span></td>
      <td class="eq-vendor">${it.vendor}</td>
      <td class="eq-qty">${it.qty}</td>
      <td class="eq-ip mono">${it.ip}</td>
      <td class="eq-freq"><input class="freq-input"
        value="${(it.freq || '—').replace(/"/g, '&quot;')}"
        data-node="${window.curPanel ? window.curPanel.id : ''}"
        data-slot="${slot}" data-idx="${idx}"
        onchange="updateFreq(this)"
        title="Nhấp để chỉnh tần số — tự động lưu"></td>
      <td class="eq-note">${it.note || '—'}</td>
      <td class="eq-ping">${pingCell}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <div class="dev-status-bar ${si.cls}">
      <span>${si.icon} ${si.lbl} — ${dev.label}</span>
      <span class="dev-ts">${ts}</span>
    </div>
    <div class="eq-wrap">
      <table class="eq-table">
        <thead>
          <tr>
            <th class="eq-stt">#</th>
            <th class="eq-name">Tên thiết bị</th>
            <th class="eq-model">Model / PN</th>
            <th class="eq-vendor">Hãng / XS</th>
            <th class="eq-qty">SL</th>
            <th class="eq-ip">IP (LAN3)</th>
            <th class="eq-freq">Tần số / Chuẩn</th>
            <th class="eq-note">Ghi chú</th>
            <th class="eq-ping">Ping</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/**
 * pingDevice — gọi /api/ping/{ip}, hiển thị RTT ngay tại hàng thiết bị
 * @param {string}      ip  — địa chỉ IP cần ping (LAN3 RCMS subnet)
 * @param {HTMLElement} btn — nút bấm (span.ping-result là nextElementSibling)
 */
async function pingDevice(ip, btn) {
  const resultEl = btn.nextElementSibling; // span.ping-result
  btn.disabled   = true;
  btn.textContent = '⟳';
  resultEl.textContent = '';
  resultEl.className   = 'ping-result';
  try {
    const res  = await fetch(`/api/ping/${encodeURIComponent(ip)}`);
    const data = await res.json();
    if (data.reachable) {
      resultEl.textContent = `✔ ${data.rtt_ms}ms`;
      resultEl.classList.add('ping-ok');
    } else {
      resultEl.textContent = '✘ Timeout';
      resultEl.classList.add('ping-fail');
    }
  } catch (e) {
    resultEl.textContent = '✘ Lỗi';
    resultEl.classList.add('ping-fail');
  } finally {
    btn.disabled    = false;
    btn.textContent = '⚡ Ping';
  }
}

/**
 * _openNodePanel — mở panel khi click vào node trên canvas
 * @param {object} nd — phần tử từ TOPO_NODES
 */
function _openNodePanel(nd) {
  window.selNode  = nd.id;
  window.curPanel = nd;

  const overlay = document.getElementById('node-modal-overlay');
  if (!overlay) return;

  /* Header */
  const $t = document.getElementById('panel-title');
  const $s = document.getElementById('panel-sub');
  if ($t) $t.textContent = nd.title;
  if ($s) $s.textContent = nd.sub + (nd.ip ? ' · ' + nd.ip : '');

  /* Render device cards */
  const devs = nd.devices || {};
  _renderDevCard('main',    devs.main    || null);
  _renderDevCard('standby', devs.standby || null);

  /* Active tab → MAIN */
  switchPanelTab('main');

  overlay.style.display = 'flex';
}

/* ================================================================
   TRẠNG THÁI TAB — Status card grid với ping check
   ================================================================ */

/**
 * _renderStatusTab — vẽ lưới card trạng thái tất cả thiết bị trong node
 * Màu: xanh lá=OK · vàng=Cảnh báo · đỏ=Lỗi · xám=Ra khỏi hệ thống/Chưa kiểm tra
 */
function _renderStatusTab(nd) {
  const el = document.getElementById('ptab-status-card');
  if (!el) return;
  const devs = nd.devices || {};

  const legend = `
    <div class="status-legend">
      <span class="leg-item"><span class="leg-dot" style="background:#00ff88;box-shadow:0 0 6px #00ff88"></span> OK — Đạt ngưỡng ED-137</span>
      <span class="leg-item"><span class="leg-dot" style="background:#ffaa00"></span> Cảnh báo — Trễ cao / Suy hao</span>
      <span class="leg-item"><span class="leg-dot" style="background:#ff2244"></span> Lỗi — Mất kết nối</span>
      <span class="leg-item"><span class="leg-dot" style="background:#4a7090"></span> Xám — Ra khỏi hệ thống / Chưa kiểm tra</span>
    </div>`;

  let html = legend;

  ['main', 'standby'].forEach(slot => {
    const dev = devs[slot];
    if (!dev || !dev.items || dev.items.length === 0) return;
    html += `<div class="status-group-title">${slot === 'main' ? '🟢 MAIN' : '🔵 STANDBY'} — ${dev.label}</div>`;
    html += '<div class="status-grid">';
    dev.items.forEach((it, idx) => {
      const pingable = it.ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(it.ip);
      const cardId   = `stcard-${slot}-${idx}`;
      html += `
        <div class="status-card st-unk" id="${cardId}"
          ${pingable ? `onclick="pingStatusCard('${it.ip}','${cardId}')" title="Click để ping ${it.ip}"` : 'title="Không có IP — không thể ping"'}
          style="${pingable ? '' : 'cursor:default;opacity:.65'}">
          <div class="sc-dot st-unk" id="${cardId}-dot"></div>
          <div class="sc-name">${it.name}</div>
          <div class="sc-ip">${it.ip}</div>
          <div class="sc-rtt" id="${cardId}-rtt">${pingable ? 'Chưa kiểm tra' : '—'}</div>
        </div>`;
    });
    html += '</div>';
  });

  el.innerHTML = html;
}

/** pingStatusCard — ping 1 thiết bị và cập nhật màu card */
async function pingStatusCard(ip, cardId) {
  const card  = document.getElementById(cardId);
  const dot   = document.getElementById(cardId + '-dot');
  const rttEl = document.getElementById(cardId + '-rtt');
  if (!card) return;

  dot.className   = 'sc-dot st-pend';
  card.className  = 'status-card st-pend';
  if (rttEl) rttEl.textContent = '⟳ Đang ping...';

  try {
    const res  = await fetch(`/api/ping/${encodeURIComponent(ip)}`);
    const data = await res.json();
    if (data.reachable) {
      const cls = (data.rtt_ms !== null && data.rtt_ms < 100) ? 'st-ok' : 'st-warn';
      card.className = `status-card ${cls}`;
      dot.className  = `sc-dot ${cls}`;
      if (rttEl) rttEl.textContent = `RTT: ${data.rtt_ms ?? '—'}ms · Loss: ${data.loss_pct}%`;
    } else {
      card.className = 'status-card st-crit';
      dot.className  = 'sc-dot st-crit';
      if (rttEl) rttEl.textContent = 'Timeout — không phản hồi';
    }
  } catch (e) {
    card.className = 'status-card st-crit';
    dot.className  = 'sc-dot st-crit';
    if (rttEl) rttEl.textContent = 'Lỗi kết nối backend';
  }
}

/** _pingAllStatus — ping đồng loạt tất cả thiết bị có IP trong tab Trạng thái */
async function _pingAllStatus() {
  if (!window.curPanel) return;
  const devs  = window.curPanel.devices || {};
  const tasks = [];

  ['main', 'standby'].forEach(slot => {
    const dev = devs[slot];
    if (!dev || !dev.items) return;
    dev.items.forEach((it, idx) => {
      if (it.ip && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(it.ip)) {
        tasks.push(pingStatusCard(it.ip, `stcard-${slot}-${idx}`));
      }
    });
  });

  await Promise.allSettled(tasks);
}

/* ================================================================
   KẾ HOẠCH TẦN SỐ — Lưu/Load qua localStorage
   ================================================================ */
const _FREQ_KEY = 'vatm_freq_plan';

/** updateFreq — gọi từ onchange của input tần số trong bảng thiết bị */
function updateFreq(input) {
  const ndId = input.dataset.node;
  const slot = input.dataset.slot;
  const idx  = parseInt(input.dataset.idx);
  const nd   = TOPO_NODES.find(n => n.id === ndId);
  if (nd && nd.devices && nd.devices[slot] && nd.devices[slot].items[idx]) {
    nd.devices[slot].items[idx].freq = input.value;
  }
  _saveFreqStore();
}

function _saveFreqStore() {
  try {
    const store = {};
    TOPO_NODES.forEach(nd => {
      ['main', 'standby'].forEach(slot => {
        const dev = nd.devices && nd.devices[slot];
        if (!dev || !dev.items) return;
        dev.items.forEach((it, i) => {
          store[`${nd.id}__${slot}__${i}`] = it.freq;
        });
      });
    });
    localStorage.setItem(_FREQ_KEY, JSON.stringify(store));
  } catch (e) {}
}

function _loadFreqStore() {
  try {
    const raw = localStorage.getItem(_FREQ_KEY);
    if (!raw) return;
    const store = JSON.parse(raw);
    TOPO_NODES.forEach(nd => {
      ['main', 'standby'].forEach(slot => {
        const dev = nd.devices && nd.devices[slot];
        if (!dev || !dev.items) return;
        dev.items.forEach((it, i) => {
          const k = `${nd.id}__${slot}__${i}`;
          if (store[k] !== undefined) it.freq = store[k];
        });
      });
    });
  } catch (e) {}
}

/* Nạp kế hoạch tần số đã lưu ngay khi script load */
_loadFreqStore();
