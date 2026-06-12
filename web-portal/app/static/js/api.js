/* ================================================================
   VATM ATCC Long Thành — ED-137 Portal
   File: js/api.js — API calls: loadSummary, loadDevices, loadAlerts, runPlaybook, loadGrafana
   Phụ thuộc: config.js (API, GRAFANA, GF_DASH) + app.js (topo, grafanaLoaded)
   ================================================================ */

/* ── Tải KPI summary từ backend ── */
async function loadSummary() {
  try {
    const r = await fetch(API + '/metrics/summary');
    if (!r.ok) throw new Error();
    const d = await r.json();
    document.getElementById('kpi-tx').textContent    = d.t6_radio_up_tx_main ?? '—';
    document.getElementById('kpi-rx').textContent    = d.t6_radio_up_rx_main ?? '—';
    document.getElementById('kpi-ubvhf').textContent = d.t6_radio_up_ubvhf   ?? '—';
    const al = (d.critical_alerts||0) + (d.warning_alerts||0);
    const ae = document.getElementById('kpi-alerts');
    ae.textContent  = al;
    ae.style.color  = al>0 ? 'var(--red)' : 'var(--green)';
    const sb = document.getElementById('status-badge');
    sb.innerHTML  = '<span class="dot dot-g"></span> Connected';
    sb.className  = 'status-ok';
    if (d.tx_status)   topo.tx_status   = d.tx_status;
    if (d.rx_status)   topo.rx_status   = d.rx_status;
    if (d.atcc_status) topo.atcc_status = d.atcc_status;
  } catch(e) {
    const sb = document.getElementById('status-badge');
    sb.innerHTML = '<span class="dot dot-r"></span> Lỗi kết nối';
    sb.className = 'status-err';
  }
}

/* ── Tải danh sách thiết bị + S4-IP ── */
async function loadDevices() {
  const le = document.getElementById('dev-loading');
  const tb = document.getElementById('dev-table');
  le.style.display='block'; tb.style.display='none';
  try {
    const [dr,sr] = await Promise.all([
      fetch(API + '/metrics/t6_status'),
      fetch(API + '/metrics/s4ip_status'),
    ]);
    const dd = await dr.json(), sd = await sr.json();
    const tbody = document.getElementById('dev-tbody');
    tbody.innerHTML = '';
    (dd.devices||[]).forEach(d => {
      const up = d.status==='up';
      tbody.innerHTML += `<tr>
        <td><span class="badge ${up?'bg-green':'bg-red'}">
          <span class="dot ${up?'dot-g':'dot-r'}"></span>${up?'UP':'DOWN'}</span></td>
        <td class="mono">${d.instance}</td>
        <td>${d.device||'—'}</td>
        <td>${d.site||'—'}</td>
        <td>${d.redundancy||'—'}</td>
        <td style="color:var(--text2);font-size:.9em">${d.job}</td>
      </tr>`;
    });
    le.style.display='none'; tb.style.display='table';
    document.getElementById('s4ip-status').innerHTML =
      (sd.s4ip_controllers||[]).map(s => {
        const up = s.status==='up';
        return `<span class="badge ${up?'bg-green':'bg-red'}" style="margin:2px">
          <span class="dot ${up?'dot-g':'dot-r'}"></span>${s.instance}</span>`;
      }).join('') || 'Chưa có dữ liệu';
  } catch(e) {
    le.innerHTML = '<span style="color:var(--red)">⚠ Lỗi: ' + e.message + '</span>';
  }
}

/* ── Tải danh sách cảnh báo đang kích hoạt ── */
async function loadAlerts() {
  try {
    const r = await fetch(API + '/metrics/alerts');
    const d = await r.json();
    const el = document.getElementById('alert-list');
    if (!d.alerts || !d.alerts.length) {
      el.innerHTML = '<div class="badge bg-green" style="padding:8px 12px">✅ Không có cảnh báo đang kích hoạt</div>';
      return;
    }
    el.innerHTML = d.alerts.map(a => `
      <div class="alert-item ${a.severity==='critical'?'a-crit':'a-warn'}">
        <div style="font-size:1.1em">${a.severity==='critical'?'🔴':'⚠️'}</div>
        <div style="flex:1">
          <div style="font-weight:600">${a.alertname}</div>
          <div style="color:var(--text2);font-size:.88em">${a.instance||''} ${a.site?'· '+a.site:''}</div>
        </div>
        <span class="badge ${a.severity==='critical'?'bg-red':'bg-yellow'}">${a.severity.toUpperCase()}</span>
      </div>`).join('');
  } catch(e) {
    document.getElementById('alert-list').innerHTML =
      '<span style="color:var(--red)">⚠ Lỗi: ' + e.message + '</span>';
  }
}

/* ── Chạy Ansible Playbook ── */
async function runPlaybook(pid, selId, def) {
  const target = selId ? document.getElementById(selId).value : (def||'all_rcms');
  try {
    const r = await fetch(API + '/ansible/run', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({playbook:pid, target_group:target}),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const job = await r.json();
    addJobCard(job);
    pollJob(job.job_id);
  } catch(e) {
    alert('⚠ Lỗi khởi chạy: ' + e.message);
  }
}

function addJobCard(job) {
  const el = document.getElementById('job-list');
  if (el.textContent.includes('Chưa có')) el.innerHTML = '';
  const d = document.createElement('div');
  d.id = 'job-' + job.job_id;
  d.className = 'card';
  d.style.marginBottom = '8px';
  d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
    <div>
      <strong>${job.playbook}</strong>
      <span style="color:var(--text2);font-size:.78em;margin-left:8px">→ ${job.job_id}</span>
      <span style="color:var(--text2);font-size:.75em;margin-left:6px">Target: ${job.target_group||'all'}</span>
    </div>
    <span class="badge bg-blue" id="jst-${job.job_id}"><span class="spinner"></span> Đang chạy</span>
  </div>
  <div id="jout-${job.job_id}" class="job-output"></div>`;
  el.prepend(d);
}

function pollJob(jid) {
  const iv = setInterval(async () => {
    try {
      const r = await fetch(API + '/ansible/jobs/' + jid);
      const j = await r.json();
      const se = document.getElementById('jst-'  + jid);
      const oe = document.getElementById('jout-' + jid);
      if (j.status === 'completed') {
        se.innerHTML = '✅ Hoàn tất'; se.className = 'badge bg-green';
        if (j.output) { oe.textContent=j.output; oe.style.display='block'; }
        clearInterval(iv); loadSummary();
      } else if (j.status === 'failed') {
        se.innerHTML = '❌ Thất bại'; se.className = 'badge bg-red';
        if (j.output) { oe.textContent=j.output; oe.style.display='block'; }
        clearInterval(iv);
      }
    } catch(e) { clearInterval(iv); }
  }, 3000);
}

/* ── Load Grafana iframes (chỉ load 1 lần) ── */
function loadGrafana() {
  if (grafanaLoaded) return;
  grafanaLoaded = true;
  Object.entries(GF_DASH).forEach(([k,p]) => {
    const f  = document.getElementById('gf-'   + k);
    const ph = document.getElementById('gfph-' + k);
    if (!f) return;
    f.src = GRAFANA + p;
    f.style.display = 'block';
    if (ph) ph.style.display = 'none';
  });
}
