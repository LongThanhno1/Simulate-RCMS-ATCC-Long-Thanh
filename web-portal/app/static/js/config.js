/* ================================================================
   VATM ATCC Long Thành — ED-137 Portal
   File: js/config.js — Khai báo hằng số và dữ liệu cấu hình (không có logic)
   Phụ thuộc: (không có — load đầu tiên trong JS)
   ================================================================ */
'use strict';

/* ── API + Grafana ── */
const API     = '/api';
const GRAFANA = window.location.protocol + '//' + window.location.hostname + ':3000';
/* Chỉ cần UID — Grafana tự redirect đúng slug */
const GF_DASH = {
  tx:    '/d/vatm-parkair-t6?orgId=1&kiosk&var-site=tx',
  rx:    '/d/vatm-parkair-t6?orgId=1&kiosk&var-site=rx',
  ubvhf: '/d/vatm-vm-health?orgId=1&kiosk',
  kpi:   '/d/vatm-ed137-overview?orgId=1&kiosk',
};

/* ================================================================
   NODE DEFINITIONS — 6 nodes: TX, RX, xMG, RED SW, BLUE SW, FL20
   Dual-ring topology per BVTC VCCS — xMG J1→RED ring, J2→BLUE ring
   ================================================================ */
const NODES = {
  tx: {
    id:'tx', icon:'📡',
    label:['TRẠM PHÁT','TX Station'], sub:'Park Air T6-TV ×9 ch',
    cx:88, cy:150, hw:78, hh:50,
    playbook:'rcms_tx', grafana:'vatm-parkair-t6',
    info:{
      'Thiết bị':'Park Air T6-TV (×9 kênh VHF)',
      'Dự phòng':'T6-TV Standby ×9',
      'IP MAIN (LAN3)':'10.60.7.71–79',
      'IP STBY (LAN3)':'10.60.7.81–89',
      'SNMP':'LAN3 (RCMS subnet) — vatm_ro',
      'Kết nối→xMG':'Cáp quang (LAN1 VoIP)',
    },
  },
  rx: {
    id:'rx', icon:'📻',
    label:['TRẠM THU','RX Station'], sub:'Park Air T6-RV ×9 ch',
    cx:88, cy:295, hw:78, hh:50,
    playbook:'rcms_rx', grafana:'vatm-parkair-t6',
    info:{
      'Thiết bị':'Park Air T6-RV (×9 kênh VHF)',
      'Dự phòng':'T6-RV Standby ×9',
      'IP MAIN (LAN3)':'10.60.6.71–79',
      'IP STBY (LAN3)':'10.60.6.81–89',
      'SNMP':'LAN3 (RCMS subnet) — vatm_ro',
      'Kết nối→xMG':'Cáp quang (LAN1 VoIP)',
    },
  },
  xmg: {
    id:'xmg', icon:'⚡',
    label:['FREQ. xMG','xMG#1 + xMG#2'], sub:'10.60.8.71–122',
    cx:295, cy:223, hw:86, hh:52,
    playbook:'all_rcms', grafana:'vatm-ed137-overview',
    info:{
      'Vị trí':'CNS Room — ATCC Long Thành',
      'xMG#1 (Primary)':'10.60.8.71–92 (11 QMG cards)',
      'xMG#2 (Standby)':'10.60.8.101–122 (11 QMG cards)',
      'J1 → RED ring':'RJ45 → RED Switch Core (10.60.8.204)',
      'J2 → BLUE ring':'RJ45 → BLUE Switch Core (10.60.8.203)',
      'SNMP':'9116/frequentis_xmg',
    },
  },
  red_sw: {
    id:'red_sw', icon:'🔴',
    label:['RED SW CORE','ALE OS6860'], sub:'10.60.8.204',
    cx:495, cy:150, hw:82, hh:48,
    info:{
      'Model':'ALE OmniSwitch OS6860',
      'IP':'10.60.8.204',
      'Vai trò':'RED Ring — Primary path',
      'Uplink TX/RX':'Từ xMG J1 (RJ45)',
      'Uplink→FL20':'Fiber P49/P50 → SW_20FL_1',
      'SNMP':'9116/ale_switch',
    },
  },
  blue_sw: {
    id:'blue_sw', icon:'🔵',
    label:['BLUE SW CORE','ALE OS6860'], sub:'10.60.8.203',
    cx:495, cy:295, hw:82, hh:48,
    info:{
      'Model':'ALE OmniSwitch OS6860',
      'IP':'10.60.8.203',
      'Vai trò':'BLUE Ring — Standby path',
      'Uplink TX/RX':'Từ xMG J2 (RJ45)',
      'Uplink→FL20':'Fiber P49/P50 → SW_20FL_2',
      'SNMP':'9116/ale_switch',
    },
  },
  fl20: {
    id:'fl20', icon:'🗼',
    label:['TWR TẦNG 20','T6-TRV + CWP'], sub:'10.60.8.201–202',
    cx:730, cy:223, hw:86, hh:52,
    grafana:'vatm-ed137-overview',
    info:{
      'Vị trí':'Đài KSKL Long Thành — Tầng 20',
      'SW_20FL_1':'10.60.8.201 ← RED CORE (fiber)',
      'SW_20FL_2':'10.60.8.202 ← BLUE CORE (fiber)',
      'T6-TRV (VHF)':'×6 radio (10.60.11.1–6)',
      'CWPs':'×11 operator workstations',
      'VCCS WS':'10.60.8.254 / VHF-RCMS: 10.60.11.30',
    },
  },
};

/* ── LINK DEFINITIONS — 6 links: fiber và rj45, ring: red/blue/both ──
   Nguồn: BVTC VCCS LTIA — xác nhận CHỈ cáp quang, KHÔNG có VSAT
   RED ring (J1): xmg→red_sw→fl20 | BLUE ring (J2): xmg→blue_sw→fl20 */
const LINKS = [
  { id:'tx_xmg',    from:'tx',     to:'xmg',     type:'fiber', ring:'both',
    label:'Cáp quang\nTX→xMG (LAN1)' },
  { id:'rx_xmg',    from:'rx',     to:'xmg',     type:'fiber', ring:'both',
    label:'Cáp quang\nRX→xMG (LAN1)' },
  { id:'xmg_red',   from:'xmg',    to:'red_sw',  type:'rj45',  ring:'red',
    label:'RJ45 J1\nxMG→RED' },
  { id:'xmg_blue',  from:'xmg',    to:'blue_sw', type:'rj45',  ring:'blue',
    label:'RJ45 J2\nxMG→BLUE' },
  { id:'red_fl20',  from:'red_sw', to:'fl20',    type:'fiber', ring:'red',
    label:'Cáp quang\nRED→FL20' },
  { id:'blue_fl20', from:'blue_sw',to:'fl20',    type:'fiber', ring:'blue',
    label:'Cáp quang\nBLUE→FL20' },
];

/* ================================================================
   NODE PARAMS DEF — Định nghĩa thông số cấu hình từng trạm
   Mỗi mục: { key, label, type, val, unit, step?, min?, max? }
   Mục { section } là tiêu đề nhóm
   ================================================================ */
const NODE_PARAMS_DEF = {
  tx: [
    { section: '📡 Kết nối IP (LAN3 — RCMS subnet)' },
    { key:'ip_main_base', label:'IP MAIN (bắt đầu)',  type:'text',   val:'10.60.7.71', unit:'' },
    { key:'ip_stby_base', label:'IP STBY (bắt đầu)',  type:'text',   val:'10.60.7.81', unit:'' },
    { key:'channel_count',label:'Số kênh VHF',        type:'number', val:9,            unit:'ch' },
    { section: '🔌 SNMP Polling' },
    { key:'snmp_community',label:'Community string',  type:'text',   val:'vatm_ro',    unit:'' },
    { key:'snmp_version',  label:'SNMP version',      type:'text',   val:'v2c',        unit:'' },
    { key:'poll_interval', label:'Poll interval',     type:'number', val:15,           unit:'s',  min:5,  max:300 },
    { section: '📻 Tần số & Công suất' },
    { key:'freq_start',   label:'Tần số đầu tiên',    type:'text',   val:'118.425',    unit:'MHz' },
    { key:'tx_power',     label:'Công suất phát',     type:'number', val:50,           unit:'W',  min:1,  max:100 },
    { key:'vswr_max',     label:'VSWR tối đa',        type:'number', val:1.5,          unit:'',   step:0.1, min:1, max:3 },
    { section: '⚡ Ngưỡng ED-137 (override)' },
    { key:'jitter_warn',  label:'Jitter WARN',        type:'number', val:10,           unit:'ms', min:1,  max:19 },
    { key:'jitter_crit',  label:'Jitter CRIT',        type:'number', val:20,           unit:'ms', min:2,  max:100 },
    { key:'loss_warn',    label:'Loss WARN',           type:'number', val:0.1,          unit:'%',  step:0.01, min:0, max:0.99 },
    { key:'loss_crit',    label:'Loss CRIT',           type:'number', val:1.0,          unit:'%',  step:0.01, min:0.1, max:10 },
    { key:'delay_warn',   label:'Delay WARN',          type:'number', val:50,           unit:'ms', min:5,  max:99 },
    { key:'delay_crit',   label:'Delay CRIT',          type:'number', val:100,          unit:'ms', min:10, max:500 },
  ],
  rx: [
    { section: '📡 Kết nối IP (LAN3 — RCMS subnet)' },
    { key:'ip_main_base', label:'IP MAIN (bắt đầu)',   type:'text',   val:'10.60.6.71', unit:'' },
    { key:'ip_stby_base', label:'IP STBY (bắt đầu)',   type:'text',   val:'10.60.6.81', unit:'' },
    { key:'channel_count',label:'Số kênh VHF',         type:'number', val:9,            unit:'ch' },
    { section: '🔌 SNMP Polling' },
    { key:'snmp_community',label:'Community string',   type:'text',   val:'vatm_ro',    unit:'' },
    { key:'snmp_version',  label:'SNMP version',       type:'text',   val:'v2c',        unit:'' },
    { key:'poll_interval', label:'Poll interval',      type:'number', val:15,           unit:'s',  min:5, max:300 },
    { section: '📻 Thu sóng & Nhạy cảm' },
    { key:'freq_start',   label:'Tần số đầu tiên',     type:'text',   val:'118.425',    unit:'MHz' },
    { key:'rx_sensitivity',label:'Độ nhạy RX',         type:'number', val:-107,         unit:'dBm', min:-130, max:-50 },
    { key:'squelch',      label:'Squelch level',       type:'number', val:-95,          unit:'dBm', min:-120, max:-50 },
    { section: '⚡ Ngưỡng ED-137 (override)' },
    { key:'jitter_warn',  label:'Jitter WARN',         type:'number', val:10,           unit:'ms' },
    { key:'jitter_crit',  label:'Jitter CRIT',         type:'number', val:20,           unit:'ms' },
    { key:'loss_warn',    label:'Loss WARN',            type:'number', val:0.1,          unit:'%',  step:0.01 },
    { key:'loss_crit',    label:'Loss CRIT',            type:'number', val:1.0,          unit:'%',  step:0.01 },
    { key:'delay_warn',   label:'Delay WARN',           type:'number', val:50,           unit:'ms' },
    { key:'delay_crit',   label:'Delay CRIT',           type:'number', val:100,          unit:'ms' },
  ],
};
