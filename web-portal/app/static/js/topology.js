/* ================================================================
   VATM ATCC Long Thành — ED-137 Portal
   File: js/topology.js — Canvas drawing: background, nodes, links, animation loop
   Phụ thuộc: config.js (NODES, LINKS) + app.js (canvas, ctx, topo, pulses, selNode, curPanel, lastPulse, lastFrame, animId)
   ================================================================ */

/* ── Canvas logic dimensions ── */
const CW = 960;
const CH = 380;
const PULSE_SPEED = 0.20;
const PULSE_INT   = 1.5;

/* ── Màu theo trạng thái ED-137 ── */
function sColor(s) {
  return { ok:'#34d399', warn:'#fbbf24', crit:'#f87171', unknown:'#3d5a7a' }[s] || '#3d5a7a';
}
function sFill(s) {
  return {
    ok:      'rgba(52,211,153,0.09)',
    warn:    'rgba(251,191,36,0.09)',
    crit:    'rgba(248,113,113,0.11)',
    unknown: 'rgba(30,58,92,0.08)',
  }[s] || 'rgba(30,58,92,0.08)';
}

/* ── Canvas resize (HiDPI aware) ── */
function resizeCanvas() {
  const cont = document.getElementById('canvas-container');
  const dpr  = window.devicePixelRatio || 1;
  const cssW = cont.clientWidth;
  const cssH = Math.round(cssW * CH / CW);
  canvas.width        = cssW * dpr;
  canvas.height       = cssH * dpr;
  canvas.style.height = cssH + 'px';
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(dpr * cssW / CW, dpr * cssH / CH);
}

/* ── Mouse coordinate mapping ── */
function mouseLogic(e) {
  const r = canvas.getBoundingClientRect();
  return { x:(e.clientX-r.left)*(CW/r.width), y:(e.clientY-r.top)*(CH/r.height) };
}
function hitNode(px, py) {
  const M = 12;
  for (const k in NODES) {
    const n = NODES[k];
    if (px>=n.cx-n.hw-M && px<=n.cx+n.hw+M && py>=n.cy-n.hh-M && py<=n.cy+n.hh+M) return n;
  }
  return null;
}

/* ── Khởi tạo canvas events — gọi từ app.js sau DOMContentLoaded ── */
function initTopology() {
  canvas.addEventListener('click', e => {
    const {x,y} = mouseLogic(e);
    const n = hitNode(x,y);
    if (n) { selNode=n.id; openPanel(n); }
    else   { selNode=null; closePanel(); }
    drawTopo();
  });
  canvas.addEventListener('mousemove', e => {
    const {x,y} = mouseLogic(e);
    document.getElementById('canvas-container').style.cursor = hitNode(x,y) ? 'pointer' : 'default';
  });
  window.addEventListener('resize', () => { resizeCanvas(); drawTopo(); });
}

/* ================================================================
   BACKGROUND DRAWING — Cảnh nền Đài KSKL Long Thành
   ================================================================ */
function drawBackground() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const HORIZON = CH * 0.62;

  /* Bầu trời */
  const sky = ctx.createLinearGradient(0,0,0,HORIZON);
  if (dark) {
    sky.addColorStop(0,'#010810');
    sky.addColorStop(0.6,'#051525');
    sky.addColorStop(1,'#071e3d');
  } else {
    sky.addColorStop(0,'#bcd8f0');
    sky.addColorStop(0.6,'#d4eaf8');
    sky.addColorStop(1,'#e8f4fb');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,CW,HORIZON);

  /* Mặt đất */
  const gnd = ctx.createLinearGradient(0,HORIZON,0,CH);
  if (dark) {
    gnd.addColorStop(0,'#040e06');
    gnd.addColorStop(1,'#020a03');
  } else {
    gnd.addColorStop(0,'#c8e6c0');
    gnd.addColorStop(1,'#afd8a5');
  }
  ctx.fillStyle = gnd;
  ctx.fillRect(0,HORIZON,CW,CH-HORIZON);

  /* Sao (chỉ dark mode) */
  if (dark) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    [[40,22],[90,12],[170,38],[240,18],[330,28],[410,8],[490,20],
     [580,30],[660,14],[740,35],[820,20],[880,10],[920,28],
     [130,55],[290,48],[450,55],[610,45],[770,52],[60,48]].forEach(([sx,sy]) => {
      ctx.beginPath(); ctx.arc(sx,sy,0.8,0,Math.PI*2); ctx.fill();
    });
    ctx.fillStyle = 'rgba(200,230,255,0.8)';
    [[200,28],[500,15],[720,40]].forEach(([sx,sy]) => {
      ctx.beginPath(); ctx.arc(sx,sy,1.3,0,Math.PI*2); ctx.fill();
    });
  }

  /* Trăng lưỡi liềm / mặt trời */
  if (dark) {
    ctx.save();
    ctx.fillStyle = 'rgba(220,230,255,0.85)';
    ctx.beginPath(); ctx.arc(860,36,12,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#010810';
    ctx.beginPath(); ctx.arc(868,33,10,0,Math.PI*2); ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    const sunGrad = ctx.createRadialGradient(860,45,4,860,45,22);
    sunGrad.addColorStop(0,'rgba(255,220,50,0.9)');
    sunGrad.addColorStop(1,'rgba(255,160,50,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath(); ctx.arc(860,45,22,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  /* Mây nhẹ */
  drawCloud(200,55,0.4,dark);
  drawCloud(650,42,0.35,dark);
  drawCloud(420,70,0.3,dark);

  /* Lưới phối cảnh trên mặt đất */
  const VP = { x:CW/2, y:HORIZON };
  ctx.strokeStyle = dark ? 'rgba(0,200,80,0.08)' : 'rgba(50,120,50,0.12)';
  ctx.lineWidth = 0.7;
  for (let i=-7; i<=7; i++) {
    ctx.beginPath(); ctx.moveTo(VP.x,VP.y); ctx.lineTo(VP.x+i*160,CH); ctx.stroke();
  }
  ctx.strokeStyle = dark ? 'rgba(0,200,80,0.05)' : 'rgba(50,120,50,0.08)';
  for (let y=HORIZON+12; y<CH; y+=16) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CW,y); ctx.stroke();
  }

  /* Đường băng + đồi + tòa nhà */
  drawRunway(CW/2, CH, HORIZON, dark);
  drawHills(HORIZON, dark);
  drawStationBuilding(155,  HORIZON+2, 56, 72, true,  dark, 'TX');
  drawATCCTower(480, HORIZON, dark);
  drawStationBuilding(805,  HORIZON+2, 56, 65, false, dark, 'RX');
}

function drawCloud(x, y, opacity, dark) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = dark ? 'rgba(100,140,200,0.4)' : 'rgba(255,255,255,0.75)';
  [[0,0,18],[22,5,14],[38,-3,16],[55,5,12],[-14,8,12]].forEach(([ox,oy,r]) => {
    ctx.beginPath(); ctx.arc(x+ox,y+oy,r,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

function drawRunway(cx, bottom, horizon, dark) {
  ctx.save();
  ctx.globalAlpha = dark ? 0.25 : 0.18;
  const w1=18, w2=90;
  ctx.fillStyle = dark ? '#1a2a3a' : '#aabbcc';
  ctx.beginPath();
  ctx.moveTo(cx-w1/2,horizon+2); ctx.lineTo(cx+w1/2,horizon+2);
  ctx.lineTo(cx+w2/2,bottom);    ctx.lineTo(cx-w2/2,bottom);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(255,255,200,0.5)' : 'rgba(255,255,255,0.7)';
  ctx.setLineDash([4,6]); ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(cx,horizon+6); ctx.lineTo(cx,bottom); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawHills(horizon, dark) {
  ctx.save();
  ctx.globalAlpha = dark ? 0.5 : 0.3;
  ctx.fillStyle = dark ? '#071a12' : '#9dbeaa';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.quadraticCurveTo(80,horizon-32,180,horizon-18);
  ctx.quadraticCurveTo(250,horizon-28,310,horizon-12);
  ctx.quadraticCurveTo(380,horizon-8,480,horizon-6);
  ctx.quadraticCurveTo(560,horizon-4,620,horizon-12);
  ctx.quadraticCurveTo(720,horizon-22,800,horizon-15);
  ctx.quadraticCurveTo(880,horizon-25,960,horizon-10);
  ctx.lineTo(960,horizon); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawStationBuilding(cx, groundY, w, h, hasParabola, dark, tag) {
  ctx.save();
  ctx.globalAlpha = dark ? 0.55 : 0.4;
  ctx.fillStyle = dark ? '#0c1e32' : '#7a9ab5';
  ctx.beginPath();
  roundRectPath(cx-w/2, groundY-h, w, h, 4); ctx.fill();
  ctx.strokeStyle = dark ? '#1e3a5f' : '#5a7a9a';
  ctx.lineWidth=1; ctx.stroke();
  /* Mái dốc */
  ctx.fillStyle = dark ? '#081628' : '#5a7a95';
  ctx.beginPath();
  ctx.moveTo(cx-w/2-4, groundY-h); ctx.lineTo(cx, groundY-h-16);
  ctx.lineTo(cx+w/2+4, groundY-h); ctx.closePath(); ctx.fill();
  /* Cửa sổ */
  ctx.fillStyle = dark ? 'rgba(255,220,80,0.35)' : 'rgba(255,230,100,0.5)';
  for (let row=0;row<3;row++) for (let col=0;col<3;col++)
    ctx.fillRect(cx-w/2+6+col*15, groundY-h+12+row*18, 9, 11);
  /* Cửa ra vào */
  ctx.fillStyle = dark ? '#040e1a' : '#4a6a84';
  ctx.fillRect(cx-8, groundY-22, 16, 22);
  /* Cột anten */
  ctx.strokeStyle = dark ? '#38bdf8' : '#0369a1';
  ctx.lineWidth=1.8;
  ctx.beginPath(); ctx.moveTo(cx,groundY-h-16); ctx.lineTo(cx,groundY-h-48); ctx.stroke();
  if (hasParabola) {
    ctx.beginPath(); ctx.arc(cx,groundY-h-48,10,0.3,Math.PI-0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,groundY-h-48); ctx.lineTo(cx+10,groundY-h-42); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx-12,groundY-h-48); ctx.lineTo(cx,groundY-h-56); ctx.lineTo(cx+12,groundY-h-48);
    ctx.stroke();
  }
  /* Label */
  ctx.globalAlpha = dark ? 0.45 : 0.35;
  ctx.fillStyle = dark ? '#94a3b8' : '#334155';
  ctx.font='bold 10px Consolas, monospace';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText(tag, cx, groundY-h+2);
  ctx.restore();
}

function drawATCCTower(cx, groundY, dark) {
  ctx.save();
  ctx.globalAlpha = dark ? 0.62 : 0.45;
  const baseCol  = dark ? '#0a1e32' : '#6a8aa8';
  const stemCol  = dark ? '#071528' : '#547894';
  const cabCol   = dark ? '#0f2540' : '#4a6a88';
  const glassCol = dark ? 'rgba(56,189,248,0.18)' : 'rgba(147,197,253,0.4)';
  const borderC  = dark ? '#1e3a5f' : '#3a5a7a';
  /* Tòa nhà đế */
  ctx.fillStyle = baseCol;
  roundRectPath(cx-44, groundY-68, 88, 68, 5); ctx.fill();
  ctx.strokeStyle=borderC; ctx.lineWidth=1.2; ctx.stroke();
  /* Cột tháp trung gian */
  ctx.fillStyle = stemCol;
  ctx.fillRect(cx-9, groundY-130, 18, 66);
  /* Cầu thang */
  ctx.strokeStyle = dark ? '#1a3050' : '#5a7a98';
  ctx.lineWidth=1.8;
  ctx.beginPath(); ctx.moveTo(cx-9,groundY-68); ctx.lineTo(cx-24,groundY-130); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+9,groundY-68); ctx.lineTo(cx+24,groundY-130); ctx.stroke();
  /* Buồng quan sát */
  ctx.fillStyle = cabCol;
  roundRectPath(cx-36, groundY-160, 72, 32, 4); ctx.fill();
  ctx.strokeStyle=borderC; ctx.lineWidth=1.2; ctx.stroke();
  /* Kính */
  const glassGrad = ctx.createLinearGradient(cx-33,groundY-157,cx+33,groundY-130);
  glassGrad.addColorStop(0, glassCol);
  glassGrad.addColorStop(1, 'rgba(30,60,120,0.05)');
  ctx.fillStyle = glassGrad;
  roundRectPath(cx-33, groundY-157, 66, 26, 3); ctx.fill();
  /* Ống kính */
  ctx.strokeStyle = dark ? 'rgba(56,189,248,0.3)' : 'rgba(3,105,161,0.3)';
  ctx.lineWidth=0.7;
  for (let i=-3;i<=3;i++) {
    ctx.beginPath(); ctx.moveTo(cx+i*9,groundY-160); ctx.lineTo(cx+i*9,groundY-131); ctx.stroke();
  }
  /* Cột anten đỉnh */
  ctx.strokeStyle = dark ? '#38bdf8' : '#0369a1';
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(cx,groundY-160); ctx.lineTo(cx,groundY-195); ctx.stroke();
  /* Radar dish */
  ctx.strokeStyle = dark ? '#38bdf8' : '#0284c7';
  ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(cx,groundY-196,8,0,Math.PI,true); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,groundY-196); ctx.lineTo(cx+8,groundY-190); ctx.stroke();
  /* Đèn hiệu hàng không (nhấp nháy) */
  ctx.globalAlpha = (dark?0.9:0.75) * (0.5 + 0.5*Math.sin(Date.now()/400));
  ctx.fillStyle='#f87171';
  ctx.shadowColor='#f87171'; ctx.shadowBlur=dark?10:5;
  ctx.beginPath(); ctx.arc(cx,groundY-198,3.5,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
  /* Label */
  ctx.globalAlpha = dark ? 0.35 : 0.28;
  ctx.fillStyle = dark ? '#94a3b8' : '#334155';
  ctx.font='bold 9px Consolas, monospace';
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText('ATCC', cx, groundY-64);
  ctx.fillText('LONG THÀNH', cx, groundY-53);
  ctx.restore();
}

/* Utility: rectangle bo góc lên path */
function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

/* Lưới overlay nhẹ */
function drawOverlayGrid() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.strokeStyle = dark ? 'rgba(30,58,92,0.2)' : 'rgba(148,163,184,0.15)';
  ctx.lineWidth=0.4;
  for (let x=0;x<=CW;x+=48) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CH); ctx.stroke(); }
  for (let y=0;y<=CH;y+=48) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CW,y); ctx.stroke(); }
}

/* Vẽ node topology box */
function drawNode(node, status, selected) {
  const {cx,cy,hw,hh} = node;
  const border = sColor(status);
  const fill   = sFill(status);
  ctx.save();
  if (selected) {
    ctx.shadowColor=border; ctx.shadowBlur=20;
    ctx.strokeStyle=border; ctx.lineWidth=3;
    roundRectPath(cx-hw-6,cy-hh-6,(hw+6)*2,(hh+6)*2,13);
    ctx.stroke(); ctx.shadowBlur=0;
  }
  const bg = document.documentElement.getAttribute('data-theme')==='dark'
    ? 'rgba(6,13,26,0.88)' : 'rgba(255,255,255,0.88)';
  ctx.fillStyle=bg;
  roundRectPath(cx-hw,cy-hh,hw*2,hh*2,10); ctx.fill();
  ctx.fillStyle=fill;
  roundRectPath(cx-hw,cy-hh,hw*2,hh*2,10); ctx.fill();
  ctx.strokeStyle=border; ctx.lineWidth=selected?2.5:1.5;
  roundRectPath(cx-hw,cy-hh,hw*2,hh*2,10); ctx.stroke();

  const dark = document.documentElement.getAttribute('data-theme')==='dark';
  ctx.fillStyle=dark?'#cdd9e8':'#0f2340';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='17px Segoe UI, sans-serif'; ctx.fillText(node.icon,cx,cy-18);
  ctx.font='bold 13px Segoe UI, sans-serif'; ctx.fillText(node.label[0],cx,cy-4);
  ctx.font='12px Segoe UI, sans-serif'; ctx.fillText(node.label[1],cx,cy+10);
  ctx.fillStyle=dark?'#3d5a7a':'#6b8aaa';
  ctx.font='9.5px Consolas, monospace'; ctx.fillText(node.sub,cx,cy+24);
  drawStatusBadge(cx,cy-hh+10,status);
  ctx.restore();
}

function drawStatusBadge(bx, by, status) {
  const c  = sColor(status);
  const lb = {ok:'OK',warn:'WARN',crit:'CRIT',unknown:'—'}[status]||'—';
  ctx.save();
  ctx.fillStyle=c+'22';
  roundRectPath(bx-18,by-6,36,13,4); ctx.fill();
  ctx.strokeStyle=c; ctx.lineWidth=0.8;
  roundRectPath(bx-18,by-6,36,13,4); ctx.stroke();
  ctx.fillStyle=c; ctx.font='bold 8.5px Segoe UI';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(lb,bx,by);
  ctx.restore();
}

/* Vẽ đường kết nối */
function drawLink(link, status) {
  const fn=NODES[link.from], tn=NODES[link.to];
  const x1=fn.cx+fn.hw, y1=fn.cy, x2=tn.cx-tn.hw, y2=tn.cy, mx=(x1+x2)/2;
  const c=sColor(status);
  ctx.save();
  ctx.shadowColor=c; ctx.shadowBlur=status==='crit'?12:5;
  ctx.strokeStyle=c; ctx.lineWidth=status==='crit'?2.5:1.8;
  ctx.setLineDash(status==='unknown'?[8,5]:[]);
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.bezierCurveTo(mx,y1,mx,y2,x2,y2); ctx.stroke();
  ctx.setLineDash([]); ctx.shadowBlur=0;
  /* Nhãn link */
  const lx=mx, ly=(y1+y2)/2-18;
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  ctx.fillStyle=dark?'rgba(6,13,26,0.82)':'rgba(238,242,247,0.85)';
  roundRectPath(lx-44,ly-10,88,22,4); ctx.fill();
  ctx.fillStyle=c;
  ctx.font='9.5px Consolas,monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  link.label.split('\n').forEach((l,i) => ctx.fillText(l,lx,ly-4+i*12));
  ctx.restore();
}

/* Bezier interpolation */
function bez(p0,p1,p2,p3,t) {
  const u=1-t;
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
}

/* Xung tín hiệu */
function drawPulses(link) {
  const fn=NODES[link.from], tn=NODES[link.to];
  const x1=fn.cx+fn.hw, y1=fn.cy, x2=tn.cx-tn.hw, y2=tn.cy, mx=(x1+x2)/2;
  pulses.filter(p=>p.lid===link.id).forEach(p=>{
    const px=bez(x1,mx,mx,x2,p.t), py=bez(y1,y1,y2,y2,p.t);
    ctx.save();
    ctx.shadowColor=p.c; ctx.shadowBlur=10;
    ctx.fillStyle=p.c;
    ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fill();
    const t2=Math.max(0,p.t-0.04);
    const px2=bez(x1,mx,mx,x2,t2), py2=bez(y1,y1,y2,y2,t2);
    ctx.globalAlpha=0.3; ctx.shadowBlur=4;
    ctx.beginPath(); ctx.arc(px2,py2,3,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
}

/* ── HÀM VẼ CHÍNH ── */
function drawTopo() {
  ctx.clearRect(0,0,CW,CH);
  drawBackground();
  drawOverlayGrid();
  LINKS.forEach(lk => drawLink(lk, lk.id==='tx_atcc'?topo.link_tx_atcc:topo.link_atcc_rx));
  LINKS.forEach(lk => drawPulses(lk));
  const stMap = {tx:topo.tx_status, atcc:topo.atcc_status, rx:topo.rx_status};
  Object.values(NODES).forEach(n => drawNode(n, stMap[n.id]||'unknown', selNode===n.id));
  /* Nhãn tiêu đề */
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  ctx.save();
  ctx.fillStyle=dark?'#1e3a5f':'#6b8aaa';
  ctx.font='11px Segoe UI, sans-serif';
  ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillText('RCMS — TX ⟶ ATCC Long Thành ⟶ RX', 10, 8);
  if (topo.ts) {
    ctx.textAlign='right';
    ctx.fillText('Cập nhật: '+new Date(topo.ts).toLocaleTimeString('vi-VN'), CW-10, 8);
  }
  ctx.restore();
}

/* ── Animation loop ── */
function animLoop(ts) {
  const dt = Math.min((ts-lastFrame)/1000, 0.1);
  lastFrame = ts;
  pulses = pulses.map(p=>({...p, t:p.t+PULSE_SPEED*dt})).filter(p=>p.t<1);
  const now = ts/1000;
  LINKS.forEach(lk => {
    const st = lk.id==='tx_atcc'?topo.link_tx_atcc:topo.link_atcc_rx;
    if (st==='crit'||st==='unknown') return;
    if (now-lastPulse[lk.id]>PULSE_INT) {
      pulses.push({lid:lk.id, t:0, c:st==='warn'?'#fbbf24':'#38bdf8'});
      lastPulse[lk.id]=now;
    }
  });
  drawTopo();
  animId = requestAnimationFrame(animLoop);
}
