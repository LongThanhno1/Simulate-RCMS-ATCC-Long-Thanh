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
const TOPO_NODES = [
  {
    id: 'tx', title: 'TRẠM PHÁT', sub: 'TX Station', ip: '10.60.7.71~89',
    kpi: { delay: 12, jitter: 3, loss: 0.02 },
    devices: {
      main: {
        label:     'T6-TV MAIN (×9 kênh VHF)',
        model:     'Park Air T6-TV',
        sn:        '—',
        pn:        '—',
        ip:        '10.60.7.71 ÷ 10.60.7.79',
        conn:      'SNMP UDP 161 · LAN3 (RCMS subnet)',
        statusKey: 'tx_status',
      },
      standby: {
        label:     'T6-TV STANDBY (×9 kênh VHF)',
        model:     'Park Air T6-TV',
        sn:        '—',
        pn:        '—',
        ip:        '10.60.7.81 ÷ 10.60.7.89',
        conn:      'SNMP UDP 161 · LAN3 (RCMS subnet)',
        statusKey: 'tx_stby_status',
      },
    },
  },
  {
    id: 'rx', title: 'TRẠM THU', sub: 'RX Station', ip: '10.60.6.71~89',
    kpi: { delay: 18, jitter: 4, loss: 0.05 },
    devices: {
      main: {
        label:     'T6-RV MAIN (×9 kênh VHF)',
        model:     'Park Air T6-RV',
        sn:        '—',
        pn:        '—',
        ip:        '10.60.6.71 ÷ 10.60.6.79',
        conn:      'SNMP UDP 161 · LAN3 (RCMS subnet)',
        statusKey: 'rx_status',
      },
      standby: {
        label:     'T6-RV STANDBY (×9 kênh VHF)',
        model:     'Park Air T6-RV',
        sn:        '—',
        pn:        '—',
        ip:        '10.60.6.81 ÷ 10.60.6.89',
        conn:      'SNMP UDP 161 · LAN3 (RCMS subnet)',
        statusKey: 'rx_stby_status',
      },
    },
  },
  {
    id: 'xmg', title: 'xMG SWITCH', sub: 'Core Aggregation', ip: '10.60.8.71~122',
    kpi: { delay: 5, jitter: 1, loss: 0.01 },
    devices: {
      main: {
        label:     'Frequentis xMG #1 (Primary)',
        model:     'Frequentis xMG VoIP Gateway',
        sn:        '—',
        pn:        '—',
        ip:        '10.60.8.71 ÷ 10.60.8.92  (11 QMG cards)',
        conn:      'SNMP UDP 9116 · LAN3 (RCMS subnet)',
        statusKey: 'xmg_status',
      },
      standby: {
        label:     'Frequentis xMG #2 (Standby)',
        model:     'Frequentis xMG VoIP Gateway',
        sn:        '—',
        pn:        '—',
        ip:        '10.60.8.101 ÷ 10.60.8.122  (11 QMG cards)',
        conn:      'SNMP UDP 9116 · LAN3 (RCMS subnet)',
        statusKey: 'xmg_stby_status',
      },
    },
  },
  {
    id: 'red_sw', title: 'RED J1 SW', sub: 'Primary Ring Switch', ip: '10.60.8.204',
    kpi: { delay: 8, jitter: 2, loss: 0.01 },
    devices: {
      main: {
        label:     'ALE OS6860 CORE (RED ring)',
        model:     'ALE OmniSwitch OS6860',
        sn:        '—',
        pn:        '—',
        ip:        '10.60.8.204',
        conn:      'SNMP UDP 161 · LAN3 (RCMS subnet)',
        statusKey: 'red_sw_status',
      },
      standby: null,   /* Dự phòng ở cấp Ring — không có SW vật lý riêng */
    },
  },
  {
    id: 'blue_sw', title: 'BLUE J2 SW', sub: 'Standby Ring Switch', ip: '10.60.8.203',
    kpi: { delay: 10, jitter: 3, loss: 0.02 },
    devices: {
      main: {
        label:     'ALE OS6860 CORE (BLUE ring)',
        model:     'ALE OmniSwitch OS6860',
        sn:        '—',
        pn:        '—',
        ip:        '10.60.8.203',
        conn:      'SNMP UDP 161 · LAN3 (RCMS subnet)',
        statusKey: 'blue_sw_status',
      },
      standby: null,   /* Dự phòng ở cấp Ring — không có SW vật lý riêng */
    },
  },
  {
    id: 'fl20', title: 'FL 20 — TWR', sub: 'Đài KSKL Tầng 20', ip: '10.60.8.201~202',
    kpi: { delay: 25, jitter: 5, loss: 0.1 },
    devices: {
      main: {
        label:     'SW_20FL_1 (RED ring side)',
        model:     'ALE OmniSwitch (SW_20FL_1)',
        sn:        '—',
        pn:        '—',
        ip:        '10.60.8.201',
        conn:      'Cáp quang ← RED SW CORE (10.60.8.204)',
        statusKey: 'fl20_status',
      },
      standby: {
        label:     'SW_20FL_2 (BLUE ring side)',
        model:     'ALE OmniSwitch (SW_20FL_2)',
        sn:        '—',
        pn:        '—',
        ip:        '10.60.8.202',
        conn:      'Cáp quang ← BLUE SW CORE (10.60.8.203)',
        statusKey: 'fl20_stby_status',
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
  const t  = window.topo || {};
  const st = statusKey ? (t[statusKey] || 'unknown') : 'unknown';
  return {
    ok:      { cls: 'st-ok',   icon: '●', lbl: 'OK' },
    warn:    { cls: 'st-warn', icon: '⚠', lbl: 'WARNING' },
    crit:    { cls: 'st-crit', icon: '✕', lbl: 'CRITICAL' },
    unknown: { cls: 'st-unk',  icon: '?', lbl: 'UNKNOWN' },
  }[st] || { cls: 'st-unk', icon: '?', lbl: 'UNKNOWN' };
}

/**
 * _renderDevCard — render thẻ thiết bị vào container
 * @param {string} slot  — 'main' hoặc 'standby'
 * @param {object|null} dev — object device từ TOPO_NODES.devices
 */
function _renderDevCard(slot, dev) {
  const el = document.getElementById('ptab-' + slot + '-card');
  if (!el) return;

  /* Không có thiết bị dự phòng vật lý */
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

  el.innerHTML = `
    <div class="dev-status-bar ${si.cls}">
      <span>${si.icon} ${si.lbl}</span>
      <span class="dev-ts">${ts}</span>
    </div>
    <table class="dev-table">
      <tr><td class="dk">Thiết bị</td>
          <td class="dv">${dev.model}<br><small style="opacity:.7;font-size:.85em">${dev.label}</small></td></tr>
      <tr><td class="dk">Serial Number</td>
          <td class="dv mono">${dev.sn}</td></tr>
      <tr><td class="dk">Part Number</td>
          <td class="dv mono">${dev.pn}</td></tr>
      <tr><td class="dk">IP Address</td>
          <td class="dv mono">${dev.ip}</td></tr>
      <tr><td class="dk">Kết nối</td>
          <td class="dv">${dev.conn}</td></tr>
    </table>`;
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
