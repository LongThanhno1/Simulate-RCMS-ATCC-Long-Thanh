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

/* Topology real-time state — cập nhật từ WebSocket */
let topo = {
  tx_status:'unknown',   atcc_status:'unknown',   rx_status:'unknown',
  link_tx_atcc:'unknown', link_atcc_rx:'unknown',
  delay_tx_atcc:null,    jitter_tx_atcc:null,     loss_tx_atcc:null,
  delay_atcc_rx:null,    jitter_atcc_rx:null,     loss_atcc_rx:null,
  ts:null,
};

/* Animation state */
let pulses    = [];
let lastFrame = 0;
let animId    = null;
let selNode   = null;
let curPanel  = null;
let lastPulse = { tx_atcc:0, atcc_rx:0 };

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
  if (name === 'topology')  resizeCanvas();
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
  /* Khởi tạo canvas */
  canvas = document.getElementById('topo-canvas');
  ctx    = canvas.getContext('2d');

  /* Hook sự kiện canvas + resize */
  initTopology();
  resizeCanvas();

  /* Khởi động animation loop */
  animId = requestAnimationFrame(animLoop);

  /* Kết nối WebSocket */
  connectWS();

  /* Load dữ liệu ban đầu */
  tickClock();
  loadSummary();
});
