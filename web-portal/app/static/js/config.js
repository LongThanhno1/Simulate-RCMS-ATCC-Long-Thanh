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
   NODE DEFINITIONS — Dữ liệu tĩnh từng trạm trên canvas
   ================================================================ */
const NODES = {
  tx: {
    id:'tx', icon:'📡',
    label:['TRẠM PHÁT','TX Station'], sub:'Park Air T6-TV',
    cx:155, cy:148, hw:90, hh:55,
    playbook:'rcms_tx', grafana:'vatm-parkair-t6',
    info:{
      'Thiết bị':'Park Air T6-TV',
      'Số kênh':'9 kênh VHF (118–125 MHz)',
      'IP MAIN (LAN3)':'10.60.7.71–79',
      'IP STBY (LAN3)':'10.60.7.81–89',
      'SNMP Targets':'18 (community: vatm_ro)',
      'Poll qua':'LAN3 — RCMS subnet only',
    },
  },
  atcc: {
    id:'atcc', icon:'🗼',
    label:['ĐÀI KSKL','Long Thành'], sub:'ALE OS6860E + S4-IP',
    cx:480, cy:140, hw:105, hh:58,
    playbook:'all_rcms', grafana:'vatm-ed137-overview',
    info:{
      'Vai trò':'Trung tâm điều phối',
      'Switch':'ALE OS6860E-24 (SNMP v2c)',
      'Controller':'S4-IP (TCP port 5001)',
      'Monitoring':'Blackbox Exporter',
      'Location':'Long Thành, Đồng Nai',
    },
  },
  rx: {
    id:'rx', icon:'📻',
    label:['TRẠM THU','RX Station'], sub:'Park Air T6-RV',
    cx:805, cy:148, hw:90, hh:55,
    playbook:'rcms_rx', grafana:'vatm-parkair-t6',
    info:{
      'Thiết bị':'Park Air T6-RV',
      'Số kênh':'9 kênh VHF',
      'IP MAIN (LAN3)':'10.60.6.71–79',
      'IP STBY (LAN3)':'10.60.6.81–89',
      'SNMP Targets':'18 (community: vatm_ro)',
      'Poll qua':'LAN3 — RCMS subnet only',
    },
  },
};

/* ── LINK DEFINITIONS ── */
const LINKS = [
  { id:'tx_atcc', from:'tx',   to:'atcc', label:'IP / VSAT\nTX → ATCC' },
  { id:'atcc_rx', from:'atcc', to:'rx',   label:'IP / VSAT\nATCC → RX' },
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
  atcc: [
    { section: '🗼 ALE Switch (OS6860E)' },
    { key:'switch_ip',    label:'Switch IP',           type:'text',   val:'10.60.10.1', unit:'' },
    { key:'switch_comm',  label:'SNMP Community',      type:'text',   val:'vatm_ro',    unit:'' },
    { key:'switch_vlan',  label:'VLAN LAN3 (RCMS)',    type:'number', val:30,           unit:'',   min:1, max:4094 },
    { key:'poll_interval',label:'Poll interval',       type:'number', val:15,           unit:'s',  min:5, max:300 },
    { section: '🎛️ S4-IP Controller (Park Air)' },
    { key:'s4ip_ip',      label:'S4-IP IP',            type:'text',   val:'10.60.11.16',unit:'' },
    { key:'s4ip_port',    label:'TCP Port (RCMS)',      type:'number', val:5001,         unit:'',   min:1, max:65535 },
    { key:'s4ip_timeout', label:'Probe timeout',       type:'number', val:5,            unit:'s',  min:1, max:30 },
    { section: '⚡ Ngưỡng ED-137 (toàn tuyến)' },
    { key:'jitter_warn',  label:'Jitter WARN',         type:'number', val:10,           unit:'ms' },
    { key:'jitter_crit',  label:'Jitter CRIT',         type:'number', val:20,           unit:'ms' },
    { key:'loss_warn',    label:'Loss WARN',            type:'number', val:0.1,          unit:'%',  step:0.01 },
    { key:'loss_crit',    label:'Loss CRIT',            type:'number', val:1.0,          unit:'%',  step:0.01 },
    { key:'delay_warn',   label:'Delay WARN',           type:'number', val:50,           unit:'ms' },
    { key:'delay_crit',   label:'Delay CRIT',           type:'number', val:100,          unit:'ms' },
    { section: '📡 Giám sát SNMP Target' },
    { key:'snmp_target_count',    label:'Tổng số SNMP targets', type:'number', val:52,  unit:'target' },
    { key:'alert_threshold_pct',  label:'Cảnh báo khi DOWN >',  type:'number', val:10,  unit:'%',  min:1, max:100 },
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
