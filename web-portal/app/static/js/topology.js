/* ================================================================
   VATM ATCC Long Thành — ED-137 Portal
   File: js/topology.js — Canvas drawing: background, nodes, links, animation loop
   Phụ thuộc: config.js (NODES, LINKS) + app.js (canvas, ctx, topo, pulses, selNode, curPanel, lastPulse, lastFrame, animId)
   ================================================================ */

/* ── Canvas logic dimensions ── */
const CW = 960;
const CH = 440;
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
  const HORIZON = CH * 0.74;   /* Hạ horizon xuống để TX/RX node (cy=150,295) đều nằm trên đất */

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
  /* TX+RX cùng x=88 — vẽ 1 compound station đại diện cả 2 VHF sites */
  drawStationBuilding(88, HORIZON+2, 50, 65, true, dark, 'VHF');
  /* ATCC tower đứng ở trung tâm, phía sau CNS room */
  drawATCCTower(400, HORIZON, dark);
  /* TWR tầng 20 bên phải */
  drawTWR20Building(730, HORIZON, dark);
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

function drawStationBuilding(cx, groundY, w, h, isTransmitter, dark, tag) {
  /* isTransmitter=true → TX (trái canvas), Yagi chỉ phải về ATCC
     isTransmitter=false → RX (phải canvas), Yagi chỉ trái về ATCC  */
  ctx.save();
  ctx.globalAlpha = dark ? 0.55 : 0.40;

  const bldCol  = dark ? '#0c1e32' : '#7a9ab5';
  const roofCol = dark ? '#081628' : '#5a7a95';
  const borderC = dark ? '#1e3a5f' : '#5a7a9a';
  const antCol  = dark ? '#38bdf8' : '#0369a1';

  /* ── Tòa nhà chính ── */
  ctx.fillStyle = bldCol;
  roundRectPath(cx-w/2, groundY-h, w, h, 4); ctx.fill();
  ctx.strokeStyle = borderC; ctx.lineWidth = 1; ctx.stroke();

  /* Mái dốc */
  ctx.fillStyle = roofCol;
  ctx.beginPath();
  ctx.moveTo(cx-w/2-4, groundY-h); ctx.lineTo(cx, groundY-h-16); ctx.lineTo(cx+w/2+4, groundY-h);
  ctx.closePath(); ctx.fill();

  /* Cửa sổ */
  ctx.fillStyle = dark ? 'rgba(255,220,80,0.35)' : 'rgba(255,230,100,0.5)';
  for (let row=0; row<3; row++)
    for (let col=0; col<3; col++)
      ctx.fillRect(cx-w/2+6+col*15, groundY-h+12+row*18, 9, 11);

  /* Cửa ra vào */
  ctx.fillStyle = dark ? '#040e1a' : '#4a6a84';
  ctx.fillRect(cx-8, groundY-22, 16, 22);

  /* ── Cột anten (cao hơn để Yagi nhô trên node box) ── */
  ctx.strokeStyle = antCol; ctx.lineWidth = 1.8;
  const mastTopY = groundY - h - 80;   /* đủ cao vượt node box (cy-hh≈93) */
  ctx.beginPath(); ctx.moveTo(cx, groundY-h-16); ctx.lineTo(cx, mastTopY); ctx.stroke();

  /* ── Anten Yagi VHF (118–136 MHz) — nằm ngang, hướng về ATCC ── */
  const boomY = mastTopY - 6;
  const dir   = isTransmitter ? 1 : -1;   /* TX→phải, RX→trái */
  const backX = cx - dir * 10;            /* reflector phía sau */

  /* Boom nằm ngang */
  ctx.strokeStyle = antCol; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(backX, boomY); ctx.lineTo(cx + dir*26, boomY); ctx.stroke();

  ctx.lineWidth = 1.6;
  /* Reflector — dài nhất, phía sau */
  ctx.beginPath(); ctx.moveTo(backX, boomY-13); ctx.lineTo(backX, boomY+13); ctx.stroke();
  /* Driven element — trung bình, ở gốc boom */
  ctx.beginPath(); ctx.moveTo(cx,          boomY-11); ctx.lineTo(cx,          boomY+11); ctx.stroke();
  /* Directors — ngắn dần, phía trước (×3) */
  [ [dir*8, 10], [dir*16, 8.5], [dir*24, 7] ].forEach(([off, elen]) => {
    ctx.beginPath();
    ctx.moveTo(cx+off, boomY-elen); ctx.lineTo(cx+off, boomY+elen); ctx.stroke();
  });

  /* Feed line mảnh từ driven element → đỉnh cột */
  ctx.lineWidth = 0.7; ctx.setLineDash([2,3]);
  ctx.beginPath(); ctx.moveTo(cx, boomY); ctx.lineTo(cx, mastTopY); ctx.stroke();
  ctx.setLineDash([]);

  /* Label */
  ctx.globalAlpha = dark ? 0.45 : 0.35;
  ctx.fillStyle   = dark ? '#94a3b8' : '#334155';
  ctx.font        = 'bold 10px Consolas, monospace';
  ctx.textAlign   = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(tag, cx, groundY-h+2);
  ctx.restore();
}

function drawATCCTower(cx, groundY, dark) {
  /* Tháp KSKL Long Thành — thiết kế nụ sen (lotus bud)
     Cấu trúc từ dưới lên:
       1. Tòa nhà đế rộng
       2. Thân tháp thuôn
       3. Cánh sen đế (5 ellipse xòe ra)
       4. Nụ sen (buồng quan sát — bezier oval nhọn đỉnh)
       5. Vành nền + cột anten + radar + đèn hiệu  */
  ctx.save();

  const baseCol  = dark ? '#0a1e32' : '#6a8aa8';
  const stemCol  = dark ? '#071528' : '#547894';
  const petalCol = dark ? '#0e2444' : '#456a8a';
  const cabCol   = dark ? '#102b4e' : '#3a5e7c';
  const glassCol = dark ? 'rgba(56,189,248,0.22)' : 'rgba(147,197,253,0.44)';
  const borderC  = dark ? '#1e3a5f' : '#3a5a7a';
  const accentC  = dark ? '#38bdf8' : '#0284c7';

  /* ── 1. Tòa nhà đế ── */
  ctx.globalAlpha = dark ? 0.62 : 0.46;
  ctx.fillStyle = baseCol;
  roundRectPath(cx-44, groundY-72, 88, 72, 5); ctx.fill();
  ctx.strokeStyle = borderC; ctx.lineWidth = 1.2; ctx.stroke();

  ctx.fillStyle = dark ? 'rgba(255,220,80,0.28)' : 'rgba(255,230,100,0.42)';
  for (let c=0; c<4; c++) ctx.fillRect(cx-36+c*18, groundY-64, 11, 14);
  for (let c=0; c<4; c++) ctx.fillRect(cx-36+c*18, groundY-44, 11, 14);

  ctx.fillStyle = dark ? '#030c18' : '#4a6a84';
  roundRectPath(cx-10, groundY-24, 20, 24, 2); ctx.fill();

  /* ── 2. Thân tháp thuôn dần ── */
  ctx.fillStyle = stemCol;
  ctx.beginPath();
  ctx.moveTo(cx-8, groundY-72);  ctx.lineTo(cx-5, groundY-138);
  ctx.lineTo(cx+5, groundY-138); ctx.lineTo(cx+8, groundY-72);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = borderC; ctx.lineWidth = 0.8; ctx.stroke();

  /* Thanh chống xiên */
  ctx.strokeStyle = dark ? '#1a3050' : '#5a7a98';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx-8, groundY-78);  ctx.lineTo(cx-30, groundY-135); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx+8, groundY-78);  ctx.lineTo(cx+30, groundY-135); ctx.stroke();

  /* ── 3. Cánh sen đế (5 petals xòe ra) ── */
  ctx.globalAlpha = dark ? 0.58 : 0.42;
  ctx.fillStyle   = petalCol;
  ctx.strokeStyle = borderC; ctx.lineWidth = 0.9;
  const pY = groundY - 142;
  [ [-34, 9, 7], [-18, 13, 8], [0, 15, 9], [18, 13, 8], [34, 9, 7] ]
    .forEach(([ox, rw, rh]) => {
      ctx.beginPath();
      ctx.ellipse(cx+ox, pY, rw, rh, 0, 0, Math.PI*2);
      ctx.fill(); ctx.stroke();
    });

  /* ── 4. Nụ sen — buồng quan sát (bezier oval thuôn nhọn đỉnh) ── */
  ctx.globalAlpha = dark ? 0.65 : 0.48;
  const budBot = groundY - 138;   /* đáy nụ (khớp petals) */
  const budMid = groundY - 158;   /* vị trí rộng nhất */
  const budTop = groundY - 176;   /* đỉnh nụ */
  const budW   = 30;              /* bán kính ngang tại budMid */

  /* Vỏ nụ sen */
  ctx.fillStyle = cabCol;
  ctx.beginPath();
  ctx.moveTo(cx, budBot);
  /* Trái — bezier từ đáy rộng, qua điểm rộng nhất, thu hẹp lên đỉnh */
  ctx.bezierCurveTo(cx-budW-4, budBot-4,  cx-budW, budMid-2,  cx, budTop);
  /* Phải — đối xứng */
  ctx.bezierCurveTo(cx+budW,   budMid-2,  cx+budW+4, budBot-4, cx, budBot);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = borderC; ctx.lineWidth = 1.3; ctx.stroke();

  /* Kính buồng quan sát (gradient nội) */
  const glassGrad = ctx.createLinearGradient(cx-budW+4, budMid, cx+budW-4, budMid);
  glassGrad.addColorStop(0,   'rgba(56,189,248,0.04)');
  glassGrad.addColorStop(0.5, glassCol);
  glassGrad.addColorStop(1,   'rgba(56,189,248,0.04)');
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.moveTo(cx, budBot+2);
  ctx.bezierCurveTo(cx-budW+5, budBot-2, cx-budW+5, budMid, cx, budTop+4);
  ctx.bezierCurveTo(cx+budW-5, budMid,   cx+budW-5, budBot-2, cx, budBot+2);
  ctx.closePath(); ctx.fill();

  /* Đường kính dọc trên kính (thuôn theo hình) */
  ctx.strokeStyle = dark ? 'rgba(56,189,248,0.22)' : 'rgba(3,105,161,0.28)';
  ctx.lineWidth = 0.7;
  for (let i=-2; i<=2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx+i*9, budBot-1); ctx.lineTo(cx+i*6, budTop+5); ctx.stroke();
  }

  /* Đường viền ngang tại điểm rộng nhất */
  ctx.strokeStyle = borderC; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(cx-budW+6, budMid+3); ctx.lineTo(cx+budW-6, budMid+3); ctx.stroke();

  /* Vành nền trên đỉnh nụ */
  ctx.strokeStyle = accentC; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(cx, budTop, 9, 3.5, 0, 0, Math.PI*2); ctx.stroke();

  /* ── 5. Cột anten đỉnh ── */
  ctx.strokeStyle = accentC; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, budTop-1); ctx.lineTo(cx, budTop-32); ctx.stroke();

  /* Radar dish */
  ctx.strokeStyle = accentC; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, budTop-32, 8, 0, Math.PI, true); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, budTop-32); ctx.lineTo(cx+8, budTop-26); ctx.stroke();

  /* ── 6. Đèn hiệu hàng không nhấp nháy ── */
  ctx.globalAlpha = (dark ? 0.9 : 0.75) * (0.5 + 0.5*Math.sin(Date.now()/400));
  ctx.fillStyle   = '#f87171';
  ctx.shadowColor = '#f87171'; ctx.shadowBlur = dark ? 10 : 5;
  ctx.beginPath(); ctx.arc(cx, budTop-34, 3.5, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;

  /* ── 7. Label ── */
  ctx.globalAlpha = dark ? 0.35 : 0.28;
  ctx.fillStyle   = dark ? '#94a3b8' : '#334155';
  ctx.font        = 'bold 9px Consolas, monospace';
  ctx.textAlign   = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('ATCC',        cx, groundY-67);
  ctx.fillText('LONG THÀNH',  cx, groundY-56);
  ctx.restore();
}

function drawTWR20Building(cx, groundY, dark) {
  /* Tòa nhà TWR tầng 20 — cột anten màu xanh dương (BLUE ring) */
  ctx.save();
  ctx.globalAlpha = dark ? 0.50 : 0.38;
  const bldCol  = dark ? '#0c1e32' : '#7a9ab5';
  const roofCol = dark ? '#081628' : '#5a7a95';
  const borderC = dark ? '#1e3a5f' : '#5a7a9a';
  const antCol  = dark ? '#60a5fa' : '#2563eb';
  const w = 42, h = 76;
  ctx.fillStyle = bldCol;
  roundRectPath(cx-w/2, groundY-h, w, h, 4); ctx.fill();
  ctx.strokeStyle = borderC; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = roofCol;
  ctx.beginPath();
  ctx.moveTo(cx-w/2-3, groundY-h); ctx.lineTo(cx, groundY-h-11); ctx.lineTo(cx+w/2+3, groundY-h);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark ? 'rgba(96,165,250,0.30)' : 'rgba(147,197,253,0.50)';
  for (let row=0; row<4; row++)
    for (let col=0; col<3; col++)
      ctx.fillRect(cx-w/2+4+col*12, groundY-h+9+row*16, 7, 10);
  ctx.fillStyle = dark ? '#040e1a' : '#4a6a84';
  ctx.fillRect(cx-5, groundY-17, 10, 17);
  ctx.strokeStyle = antCol; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(cx, groundY-h-11); ctx.lineTo(cx, groundY-h-58); ctx.stroke();
  [18,33,48].forEach(d => {
    ctx.beginPath(); ctx.moveTo(cx-6, groundY-h-11-d); ctx.lineTo(cx+6, groundY-h-11-d); ctx.stroke();
  });
  ctx.globalAlpha = dark ? 0.45 : 0.35;
  ctx.fillStyle = dark ? '#60a5fa' : '#1d4ed8';
  ctx.font = 'bold 9px Consolas, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('FL20', cx, groundY-h+2);
  ctx.restore();
}

/* Khung dashed bao quanh CNS Room (xMG + RED SW + BLUE SW) */
function drawCNSRoom() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const pad = 20;
  const left   = NODES.xmg.cx    - NODES.xmg.hw    - pad;
  const right  = NODES.red_sw.cx + NODES.red_sw.hw  + pad;
  const top    = NODES.red_sw.cy  - NODES.red_sw.hh  - pad;
  const bottom = NODES.blue_sw.cy + NODES.blue_sw.hh + pad;
  ctx.save();
  /* Fill nhẹ */
  ctx.fillStyle = dark ? 'rgba(56,189,248,0.03)' : 'rgba(3,105,161,0.03)';
  roundRectPath(left, top, right-left, bottom-top, 10); ctx.fill();
  /* Border dashed */
  ctx.strokeStyle = dark ? 'rgba(56,189,248,0.28)' : 'rgba(3,105,161,0.22)';
  ctx.lineWidth = 1.2; ctx.setLineDash([6, 4]);
  ctx.shadowColor = dark ? 'rgba(56,189,248,0.15)' : 'transparent'; ctx.shadowBlur = 8;
  roundRectPath(left, top, right-left, bottom-top, 10); ctx.stroke();
  ctx.setLineDash([]); ctx.shadowBlur = 0;
  /* Label */
  ctx.fillStyle = dark ? 'rgba(56,189,248,0.50)' : 'rgba(3,105,161,0.45)';
  ctx.font = 'bold 9px Consolas, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText('■ CNS ROOM — ATCC Long Thành', (left+right)/2, top+4);
  ctx.restore();
}

/* Legend góc dưới phải */
function drawLegend() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const items = [
    { c:'#38bdf8', label:'Cáp quang (2 rings)', dash:false, thick:true  },
    { c:'#f87171', label:'RED ring (J1)',        dash:false, thick:false },
    { c:'#60a5fa', label:'BLUE ring (J2)',       dash:false, thick:false },
    { c:'#94a3b8', label:'RJ45 (CNS room)',      dash:true,  thick:false },
  ];
  const iH=14, bW=138, bH=items.length*iH+10;
  const bx=CW-bW-8, by=CH-bH-8;
  ctx.save();
  ctx.fillStyle = dark ? 'rgba(6,13,26,0.82)' : 'rgba(235,242,250,0.88)';
  roundRectPath(bx, by, bW, bH, 5); ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(56,189,248,0.20)' : 'rgba(148,163,184,0.30)';
  ctx.lineWidth = 0.6; roundRectPath(bx, by, bW, bH, 5); ctx.stroke();
  items.forEach(({c,label,dash,thick},i) => {
    const y = by+6+i*iH+iH/2;
    ctx.strokeStyle=c; ctx.lineWidth=thick?2.8:(dash?1.5:2);
    ctx.setLineDash(dash?[4,3]:[]);
    ctx.beginPath(); ctx.moveTo(bx+8,y); ctx.lineTo(bx+26,y); ctx.stroke();
    if (thick) {
      ctx.strokeStyle='rgba(255,255,255,0.20)'; ctx.lineWidth=0.8;
      ctx.beginPath(); ctx.moveTo(bx+8,y); ctx.lineTo(bx+26,y); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle=dark?'#94a3b8':'#475569';
    ctx.font='9px Consolas,monospace'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText(label, bx+30, y);
  });
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

/* Vẽ đường kết nối — hỗ trợ fiber/rj45 và ring RED/BLUE/BOTH */
function drawLink(link, status) {
  const fn = NODES[link.from], tn = NODES[link.to];
  /* Anchor: right-edge của from → left-edge của to */
  const x1 = fn.cx + fn.hw, y1 = fn.cy;
  const x2 = tn.cx - tn.hw, y2 = tn.cy;
  const mx = (x1 + x2) / 2;

  /* Màu ring — override bởi status nếu warn/crit */
  const RING_C = { red:'#f87171', blue:'#60a5fa', both:'#38bdf8' };
  const ringC  = RING_C[link.ring] || '#38bdf8';
  const lineC  = (status==='warn') ? '#fbbf24' : (status==='crit') ? '#ef4444' : ringC;

  ctx.save();
  if (link.type === 'fiber') {
    /* Fiber — đường dày, phát sáng */
    ctx.shadowColor = lineC; ctx.shadowBlur = status==='crit' ? 16 : 8;
    ctx.strokeStyle = lineC; ctx.lineWidth  = status==='crit' ? 3.5 : 2.8;
    ctx.setLineDash(status==='unknown' ? [8,5] : []);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.bezierCurveTo(mx,y1,mx,y2,x2,y2); ctx.stroke();
    /* Lõi sáng trắng bên trong */
    ctx.shadowBlur=0; ctx.strokeStyle='rgba(255,255,255,0.20)'; ctx.lineWidth=0.9;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.bezierCurveTo(mx,y1,mx,y2,x2,y2); ctx.stroke();
  } else {
    /* RJ45 — đường mảnh hơn */
    ctx.shadowColor = lineC; ctx.shadowBlur = 4;
    ctx.strokeStyle = lineC; ctx.lineWidth  = status==='unknown' ? 1.4 : 2.0;
    ctx.setLineDash(status==='unknown' ? [6,4] : []);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.bezierCurveTo(mx,y1,mx,y2,x2,y2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.shadowBlur = 0;

  /* Nhãn link + KPI overlay */
  const lx = mx, ly = (y1+y2)/2 - 12;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';

  /* KPI chỉ hiển thị trên 2 fiber long-haul (tx_xmg, rx_xmg) */
  const isLH = (link.id==='tx_xmg' || link.id==='rx_xmg');
  const kd   = link.id==='tx_xmg' ? topo.delay_tx_xmg  : topo.delay_rx_xmg;
  const kl   = link.id==='tx_xmg' ? topo.loss_tx_xmg   : topo.loss_rx_xmg;
  const hasKpi = isLH && kd !== null && kd !== undefined;
  const boxH = hasKpi ? 36 : 24;

  ctx.fillStyle = dark ? 'rgba(6,13,26,0.85)' : 'rgba(234,242,250,0.90)';
  roundRectPath(lx-46, ly-10, 92, boxH, 4); ctx.fill();
  ctx.strokeStyle=lineC; ctx.lineWidth=0.7;
  roundRectPath(lx-46, ly-10, 92, boxH, 4); ctx.stroke();

  ctx.fillStyle=lineC; ctx.font='8.5px Consolas,monospace';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  link.label.split('\n').forEach((l,i) => ctx.fillText(l, lx, ly-1+i*11));

  if (hasKpi) {
    const dC = kd>100?'#f87171': kd>50?'#fbbf24':'#34d399';
    const lC = kl>1  ?'#f87171': kl>0.1?'#fbbf24':'#34d399';
    ctx.font='bold 7.5px Consolas,monospace';
    ctx.fillStyle=dC;  ctx.fillText('Δ'+kd.toFixed(1)+'ms',   lx-20, ly+22);
    ctx.fillStyle=dark?'#3d5a7a':'#94a3b8'; ctx.fillText('|', lx,    ly+22);
    ctx.fillStyle=lC;  ctx.fillText((kl||0).toFixed(2)+'%',   lx+20, ly+22);
  }
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
  ctx.clearRect(0, 0, CW, CH);
  drawBackground();
  drawOverlayGrid();
  drawCNSRoom();   /* Khung CNS Room trước khi vẽ links */
  /* Trạng thái link: topo['link_' + id] (app.js khai báo đủ 6 keys) */
  LINKS.forEach(lk => drawLink(lk, topo['link_'+lk.id] || 'unknown'));
  LINKS.forEach(lk => drawPulses(lk));
  const stMap = {
    tx:topo.tx_status,    rx:topo.rx_status,
    xmg:topo.xmg_status,  red_sw:topo.red_sw_status,
    blue_sw:topo.blue_sw_status, fl20:topo.fl20_status,
  };
  Object.values(NODES).forEach(n => drawNode(n, stMap[n.id]||'unknown', selNode===n.id));
  drawLegend();
  /* Nhãn tiêu đề */
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.save();
  ctx.fillStyle = dark ? '#1e3a5f' : '#6b8aaa';
  ctx.font = '11px Segoe UI, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('TX/RX Sites ──[Cáp quang]──▶ CNS Room (xMG ▷ RED/BLUE ring) ──[Fiber]──▶ TWR FL20', 10, 8);
  if (topo.ts) {
    ctx.textAlign = 'right';
    ctx.fillText('Cập nhật: ' + new Date(topo.ts).toLocaleTimeString('vi-VN'), CW-10, 8);
  }
  ctx.restore();
}

/* ── Animation loop ── */
function animLoop(ts) {
  const dt = Math.min((ts-lastFrame)/1000, 0.1);
  lastFrame = ts;
  pulses = pulses.map(p=>({...p, t:p.t+PULSE_SPEED*dt})).filter(p=>p.t<1);
  const now = ts/1000;
  const RING_C = { red:'#f87171', blue:'#60a5fa', both:'#38bdf8' };
  LINKS.forEach(lk => {
    const st = topo['link_'+lk.id] || 'unknown';
    if (st==='crit' || st==='unknown') return;
    if (now - lastPulse[lk.id] > PULSE_INT) {
      const c = st==='warn' ? '#fbbf24' : (RING_C[lk.ring] || '#38bdf8');
      pulses.push({ lid:lk.id, t:0, c });
      lastPulse[lk.id] = now;
    }
  });
  drawTopo();
  animId = requestAnimationFrame(animLoop);
}
