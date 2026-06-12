/* ================================================================
   VATM ATCC Long Thành — ED-137 Portal
   File: js/panel.js — Node Detail Panel: mở/đóng, KPI bars, param form, đo kiểm
   Phụ thuộc: config.js (NODES, NODE_PARAMS_DEF) + app.js (topo, selNode, curPanel, nodeSettings)
   ================================================================ */

/* ── Chuyển tab bên trong Node Panel ── */
function switchPanelTab(tab) {
  document.querySelectorAll('.panel-tab').forEach((t,i) => {
    t.classList.toggle('active', (tab==='thongtin'&&i===0)||(tab==='thongso'&&i===1));
  });
  document.querySelectorAll('.panel-tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById('ptab-'+tab).classList.add('active');
  if (tab === 'thongso' && curPanel) renderParamForm(curPanel.id);
}

/* ── Render form thông số cho một node ── */
function renderParamForm(nodeId) {
  const defs  = NODE_PARAMS_DEF[nodeId] || [];
  const saved = nodeSettings[nodeId]    || {};
  let html = '';
  defs.forEach(p => {
    if (p.section) {
      html += `<div class="param-section">${p.section}</div>`;
      return;
    }
    const curVal = saved[p.key] !== undefined ? saved[p.key] : p.val;
    const step   = p.step  ? `step="${p.step}"` : (p.type==='number'?'step="1"':'');
    const minmax = [p.min!=null?`min="${p.min}"`:'', p.max!=null?`max="${p.max}"`:'']
                    .filter(Boolean).join(' ');
    html += `<div class="param-row">
      <span class="param-label">${p.label}</span>
      <input class="param-input" id="pi-${nodeId}-${p.key}"
             type="${p.type||'text'}" value="${curVal}" ${step} ${minmax} />
      <span class="param-unit">${p.unit||''}</span>
    </div>`;
  });
  document.getElementById('panel-params-body').innerHTML = html;
}

/* ── Lưu thông số của node hiện tại ── */
function saveNodeParams() {
  if (!curPanel) return;
  const nodeId = curPanel.id;
  const defs   = NODE_PARAMS_DEF[nodeId] || [];
  const vals   = {};
  defs.forEach(p => {
    if (p.section) return;
    const el = document.getElementById(`pi-${nodeId}-${p.key}`);
    if (!el) return;
    vals[p.key] = p.type==='number' ? parseFloat(el.value)||p.val : el.value;
  });
  nodeSettings[nodeId] = vals;
  try { localStorage.setItem('vatm_node_settings', JSON.stringify(nodeSettings)); } catch(e) {}
  const msg = document.getElementById('param-save-msg');
  msg.style.display='block';
  setTimeout(() => { msg.style.display='none'; }, 2000);
}

/* ── Reset thông số về mặc định ── */
function resetNodeParams() {
  if (!curPanel) return;
  if (!confirm('Đặt lại tất cả thông số về giá trị mặc định?')) return;
  delete nodeSettings[curPanel.id];
  try { localStorage.setItem('vatm_node_settings', JSON.stringify(nodeSettings)); } catch(e) {}
  renderParamForm(curPanel.id);
}

/* ── Mở panel chi tiết node ── */
function openPanel(node) {
  curPanel = node;
  switchPanelTab('thongtin');
  document.getElementById('param-save-msg').style.display = 'none';
  document.getElementById('panel-title').textContent = node.label.join(' ');
  document.getElementById('panel-sub').textContent   = node.icon + ' ' + node.sub;
  const stMap = {tx:topo.tx_status, atcc:topo.atcc_status, rx:topo.rx_status};
  const st = stMap[node.id] || 'unknown';
  const badgeTxt = {ok:'● NORMAL', warn:'⚠ WARNING', crit:'✕ CRITICAL', unknown:'? UNKNOWN'};
  const badgeCls = {ok:'bg-green', warn:'bg-yellow', crit:'bg-red',     unknown:'bg-blue'};
  const b = document.getElementById('panel-badge');
  b.textContent = badgeTxt[st];
  b.className   = 'badge ' + badgeCls[st];
  document.getElementById('panel-ts').textContent =
    topo.ts ? new Date(topo.ts).toLocaleTimeString('vi-VN') : '';
  /* Bảng thông tin tĩnh */
  document.getElementById('panel-info').innerHTML =
    Object.entries(node.info).map(([k,v]) => `
      <div class="info-row">
        <span class="ik">${k}</span>
        <span class="iv ${/\d{1,3}\.\d/.test(v)||v.includes(':')?' mono':''}">${v}</span>
      </div>`).join('');
  updatePanelKpi(node.id);
  document.getElementById('node-panel').style.display = 'block';
}

/* ── Cập nhật KPI mini-bars trong panel ── */
function updatePanelKpi(nodeId) {
  const keys = nodeId==='rx'
    ? {d:'delay_atcc_rx', j:'jitter_atcc_rx', l:'loss_atcc_rx'}
    : {d:'delay_tx_atcc', j:'jitter_tx_atcc', l:'loss_tx_atcc'};

  function setBar(bid, vid, val, max, unit) {
    if (val===null||val===undefined) return;
    const p = Math.min((val/max)*100, 100);
    const c = p<50?'var(--green)':p<100?'var(--yellow)':'var(--red)';
    document.getElementById(bid).style.width      = p+'%';
    document.getElementById(bid).style.background = c;
    document.getElementById(vid).textContent =
      typeof val==='number' ? val.toFixed(val<1?3:1)+unit : val;
  }
  setBar('pb-delay',  'pv-delay',  topo[keys.d], 100, ' ms');
  setBar('pb-jitter', 'pv-jitter', topo[keys.j],  20, ' ms');
  setBar('pb-loss',   'pv-loss',   topo[keys.l],   1, ' %');
}

/* ── Đóng panel ── */
function closePanel() {
  document.getElementById('node-panel').style.display = 'none';
  selNode = null;
  curPanel = null;
  drawTopo();
}

/* ── Đo kiểm riêng trạm này (chuyển sang tab Ansible) ── */
function runNodeMeasure() {
  if (!curPanel) return;
  switchTab('ansible');
  const sel = document.getElementById('target-metrics');
  for (let i=0; i<sel.options.length; i++) {
    if (sel.options[i].value === curPanel.playbook) { sel.selectedIndex=i; break; }
  }
  runPlaybook('01_collect_metrics', 'target-metrics');
  closePanel();
}

/* ── Mở Grafana dashboard của node ── */
function openNodeGrafana() {
  if (!curPanel) return;
  window.open(GRAFANA + '/d/' + curPanel.grafana + '?orgId=1', '_blank');
}
