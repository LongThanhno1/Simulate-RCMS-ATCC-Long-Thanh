/* ================================================================
   VATM ATCC Long Thành — ED-137 Portal
   File: js/app.js — Shared state, theme, clock, tabs, WebSocket, init
   Phụ thuộc: config.js + topology.js + panel.js + api.js (load sau cùng)
   ================================================================ */
'use strict';

/* ================================================================
   SHARED STATE — Khai báo biến toàn cục dùng chung toàn ứng dụng
   topology.js, panel.js, api.js đọc/ghi các biến này qua window scope
   ================================================================ */

/* Canvas elements — gán trong DOMContentLoaded */
let canvas, ctx;

/* Topology real-time state — cập nhật từ WebSocket
   Dual-ring: TX/RX→xMG (fiber) | xMG→RED/BLUE SW (rj45) | SW→FL20 (fiber) */
let topo = {
  /* Node statuses — 6 nodes */
  tx_status:'unknown',      rx_status:'unknown',
  xmg_status:'unknown',     red_sw_status:'unknown',
  blue_sw_status:'unknown', fl20_status:'unknown',
  /* Link statuses — 6 links */
  link_tx_xmg:'unknown',   link_rx_xmg:'unknown',
  link_xmg_red:'unknown',  link_xmg_blue:'unknown',
  link_red_fl20:'unknown', link_blue_fl20:'unknown',
  /* KPI metrics ED-137 — long-haul fiber links (tx_xmg, rx_xmg) */
  delay_tx_xmg:null,  jitter_tx_xmg:null,  loss_tx_xmg:null,
  delay_rx_xmg:null,  jitter_rx_xmg:null,  loss_rx_xmg:null,
  ts:null,
};

/* Animation state */
let pulses    = [];
let lastFrame = 0;
let animId    = null;
let selNode   = null;
let curPanel  = null;
let lastPulse = { tx_xmg:0, rx_xmg:0, xmg_red:0, xmg_blue:0, red_fl20:0, blue_fl20:0 };

/* Node parameter settings — persistent via localStorage */
let nodeSettings = {};
try { nodeSettings = JSON.parse(localStorage.getItem('vatm_node_settings') || '{}'); } catch(e) {}

/* Grafana load flag (chỉ load iframe một lần) */
let grafanaLoaded = false;

/* WebSocket state */
let ws      = null;
let wsTimer = null;
let wsDelay = 2000;

/* ================================================================
   THEME — Dark / Light mode
   ================================================================ */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  btn.textContent = t==='dark' ? '☀️' : '🌙';
  btn.title       = t==='dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối';
}
function toggleTheme() {
  const n = document.documentElement.getAttribute('data-theme')==='dark' ? 'light' : 'dark';
  applyTheme(n);
  try { localStorage.setItem('vatm-theme', n); } catch(e) {}
  requestAnimationFrame(drawTopo);
}
/* Auto-apply theme từ localStorage khi trang load */
(function() {
  let t = 'dark';
  try { t = localStorage.getItem('vatm-theme') || 'dark'; } catch(e) {}
  applyTheme(t);
})();

/* ================================================================
   CLOCK
   ================================================================ */
function tickClock() {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toLocaleTimeString('vi-VN', {hour12:false}) + ' ICT';
}
setInterval(tickClock, 1000);

/* ================================================================
   NAV / TAB SWITCHING
   ================================================================ */
const TABS = ['topology', 'dashboard', 'ansible', 'thongso'];

function switchTab(name) {
  document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  const idx = TABS.indexOf(name);
  if (idx >= 0) document.querySelectorAll('.nav-item')[idx].classList.add('active');
  if (name === 'thongso')   { loadDevices(); loadAlerts(); }
  if (name === 'topology')  { resizeCanvas(); }
  if (name === 'dashboard') loadGrafana();
}

/* ================================================================
   WEBSOCKET — Nhận dữ liệu topology realtime
   ================================================================ */
function connectWS() {
  try { ws = new WebSocket('ws://' + window.location.host + '/ws/topology'); }
  catch(e) { setWsLabel('err'); schedReconnect(); return; }
  ws.onopen    = () => { wsDelay=2000; setWsLabel('ok'); };
  ws.onmessage = e => {
    try {
      Object.assign(topo, JSON.parse(e.data));
      if (curPanel) updatePanelKpi(curPanel.id);
    } catch(e) {}
  };
  ws.onerror = () => setWsLabel('err');
  ws.onclose = () => { setWsLabel('dc'); schedReconnect(); };
}
function schedReconnect() {
  clearTimeout(wsTimer);
  wsTimer = setTimeout(() => { wsDelay=Math.min(wsDelay*1.5,30000); connectWS(); }, wsDelay);
}
function setWsLabel(s) {
  const el = document.getElementById('ws-label');
  if (!el) return;
  const m = {ok:'⬤ WS Live', dc:'○ WS Offline', err:'⬤ WS Error'};
  const c = {ok:'var(--green)', dc:'var(--text2)', err:'var(--red)'};
  el.textContent = m[s] || '○ WS...';
  el.style.color = c[s] || 'var(--text2)';
}

/* ================================================================
   REFRESH — Tự động làm mới mỗi 30 giây
   ================================================================ */
function refreshAll() {
  loadSummary();
  const act = (document.querySelector('.tab-content.active') || {}).id || '';
  if (act==='tab-thongso') { loadDevices(); loadAlerts(); }
}
setInterval(refreshAll, 30000);

/* ================================================================
   INIT — DOMContentLoaded
   ================================================================ */
window.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('topo-canvas');
  ctx    = canvas ? canvas.getContext('2d') : null;

  /* Khởi tạo 2D topology canvas (Option A: NOC Horizontal Flow) */
  if (canvas) { initTopology(); }

  connectWS();
  tickClock();
  loadSummary();
});
