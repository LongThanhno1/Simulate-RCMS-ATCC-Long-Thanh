/* ================================================================
   VATM ATCC Long Thành — 3D Topology Module  v2.0
   File: js/topology3d.js
   Design: Aviation NOC Dark — CWP at TWR inspired
   Phụ thuộc: Three.js r128 phải load TRƯỚC file này
   Gọi từ: app.js → switchTab('topology') → init3D()
   KHÔNG tự gọi — KHÔNG có DOMContentLoaded listener
   ================================================================ */

/* ── Guard: chỉ khởi tạo một lần ── */
let _3d_inited = false;

/* ================================================================
   DESIGN TOKENS — Aviation NOC Dark
   ================================================================ */
const D3 = {
  bg:          0x020b18,
  gridMajor:   0x0d2040,
  gridMinor:   0x071422,
  fiber:       0x00e5ff,   /* cyan — cáp quang */
  ringRed:     0xff3344,   /* RED ring — primary */
  ringBlue:    0x2288ff,   /* BLUE ring — standby */
  statusOk:    0x00ff88,   /* neon green */
  statusWarn:  0xffaa00,   /* amber */
  statusCrit:  0xff2244,   /* alert red */
  unknown:     0x4a6a8a,
  cwpGlow:     0xffa020,   /* amber — CWP screen glow */
  cwpBlue:     0x1e90ff,   /* dodger blue — CWP screen 2 */
  fogColor:    0x020b18,
};

/* ================================================================
   PHẦN 1 — DATA DEFINITIONS
   ================================================================ */
const NODES_3D = [
  {
    id:'tx', label:'TRẠM PHÁT\nTX Station', sub:'Park Air T6-TV ×9 ch',
    status:'ok',
    info:{
      'Thiết bị':'Park Air T6-TV (×9 kênh)',
      'IP MAIN (LAN3)':'10.60.7.71–79',
      'IP STBY (LAN3)':'10.60.7.81–89',
      'SNMP':'LAN3 — vatm_ro',
      'Kết nối→xMG':'Cáp quang (LAN1)',
    },
    kpi:{ delay:12, jitter:3, loss:0.02 },
  },
  {
    id:'rx', label:'TRẠM THU\nRX Station', sub:'Park Air T6-RV ×9 ch',
    status:'ok',
    info:{
      'Thiết bị':'Park Air T6-RV (×9 kênh)',
      'IP MAIN (LAN3)':'10.60.6.71–79',
      'IP STBY (LAN3)':'10.60.6.81–89',
      'SNMP':'LAN3 — vatm_ro',
      'Kết nối→xMG':'Cáp quang (LAN1)',
    },
    kpi:{ delay:14, jitter:4, loss:0.03 },
  },
  {
    id:'xmg', label:'FREQ. xMG\nxMG#1 + xMG#2', sub:'10.60.8.71–122',
    status:'ok',
    info:{
      'xMG#1 (Primary)':'10.60.8.71–92',
      'xMG#2 (Standby)':'10.60.8.101–122',
      'J1 → RED ring':'RJ45 (in CNS room)',
      'J2 → BLUE ring':'RJ45 (in CNS room)',
      'SNMP':'9116/frequentis_xmg',
    },
    kpi:{},
  },
  {
    id:'red_sw', label:'RED SW CORE\nALE OS6860', sub:'10.60.8.204',
    status:'ok',
    info:{
      'Model':'ALE OmniSwitch OS6860',
      'IP':'10.60.8.204',
      'Vai trò':'RED Ring — Primary path',
      'Uplink TX/RX':'Từ xMG J1 (RJ45)',
      'Uplink→FL20':'Fiber P49/P50 → SW_20FL_1',
    },
    kpi:{},
  },
  {
    id:'blue_sw', label:'BLUE SW CORE\nALE OS6860', sub:'10.60.8.203',
    status:'ok',
    info:{
      'Model':'ALE OmniSwitch OS6860',
      'IP':'10.60.8.203',
      'Vai trò':'BLUE Ring — Standby path',
      'Uplink TX/RX':'Từ xMG J2 (RJ45)',
      'Uplink→FL20':'Fiber P49/P50 → SW_20FL_2',
    },
    kpi:{},
  },
  {
    id:'fl20', label:'TWR TẦNG 20\nT6-TRV + CWP', sub:'10.60.8.201–202',
    status:'ok',
    info:{
      'SW_20FL_1':'10.60.8.201 ← RED CORE',
      'SW_20FL_2':'10.60.8.202 ← BLUE CORE',
      'T6-TRV (VHF)':'×6 radio (10.60.11.1–6)',
      'CWPs':'×11 operator workstations',
      'VCCS WS':'10.60.8.254',
    },
    kpi:{},
  },
];

/* Node positions — spread wider để camera nhìn rõ toàn cảnh */
const POS_3D = {
  tx:      new THREE.Vector3(-13,  0.5,  4.5),
  rx:      new THREE.Vector3(-13,  0.5, -4.5),
  xmg:     new THREE.Vector3( -3,  0.5,  0  ),
  red_sw:  new THREE.Vector3(  4,  0.5,  3.8),
  blue_sw: new THREE.Vector3(  4,  0.5, -3.8),
  fl20:    new THREE.Vector3( 12,  0.5,  0  ),
};

const LINKS_3D = [
  { id:'tx_xmg',    from:'tx',     to:'xmg',     type:'fiber', ring:'both',  status:'ok' },
  { id:'rx_xmg',    from:'rx',     to:'xmg',     type:'fiber', ring:'both',  status:'ok' },
  { id:'xmg_red',   from:'xmg',    to:'red_sw',  type:'eth',   ring:'red',   status:'ok' },
  { id:'xmg_blue',  from:'xmg',    to:'blue_sw', type:'eth',   ring:'blue',  status:'ok' },
  { id:'red_fl20',  from:'red_sw', to:'fl20',    type:'fiber', ring:'red',   status:'ok' },
  { id:'blue_fl20', from:'blue_sw',to:'fl20',    type:'fiber', ring:'blue',  status:'ok' },
];

const PARTICLE_COUNT_3D = { fiber:5, eth:3 };

/* ================================================================
   PHẦN 2 — GLOBAL SHARED VARIABLES
   ================================================================ */
let scene3d, camera3d, renderer3d, raycaster3d, mouse3d;
let nodeMeshes3d, labelDivs3d, linkObjects3d;
let particles3d, particleData3d;
let camTheta3d, camPhi3d, camRadius3d;
let isDragging3d, prevMouse3d, selectedNode3d;

/* ================================================================
   PHẦN 3 — init3D()
   ================================================================ */
function init3D() {
  if (_3d_inited) return;
  _3d_inited = true;

  const canvas3d = document.getElementById('canvas3d');
  if (!canvas3d) { console.error('[3D] #canvas3d not found'); return; }

  const container = document.getElementById('canvas-container');
  const W = container ? container.clientWidth  : window.innerWidth;
  const H = container ? Math.max(container.clientHeight, 320) : window.innerHeight;

  /* Scene */
  scene3d = new THREE.Scene();
  scene3d.background = new THREE.Color(D3.bg);
  scene3d.fog = new THREE.FogExp2(D3.fogColor, 0.016);

  /* Camera — góc nhìn isometric-like từ phía trước-trên, hơi lệch về CWP */
  camera3d    = new THREE.PerspectiveCamera(48, W / H, 0.1, 300);
  camTheta3d  = Math.PI * 0.04;   /* gần như nhìn thẳng từ trước */
  camPhi3d    = Math.PI * 0.30;   /* cao vừa phải — góc nhìn operator */
  camRadius3d = 24;
  updateCamera3d();

  /* Renderer */
  renderer3d = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true });
  renderer3d.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer3d.setSize(W, H);
  renderer3d.shadowMap.enabled = true;
  renderer3d.shadowMap.type = THREE.PCFSoftShadowMap;

  /* Raycaster & mouse */
  raycaster3d = new THREE.Raycaster();
  mouse3d     = new THREE.Vector2(-999, -999);

  /* Build world */
  buildEnvironment3d();

  /* Nodes */
  nodeMeshes3d = {};
  NODES_3D.forEach(nd => { nodeMeshes3d[nd.id] = buildNode3d(nd); });

  /* Links */
  linkObjects3d = {};
  LINKS_3D.forEach(lk => { linkObjects3d[lk.id] = buildLink3d(lk); });

  /* Particles */
  particles3d    = [];
  particleData3d = [];
  LINKS_3D.forEach(lk => buildParticles3d(lk));

  /* HTML Labels */
  labelDivs3d = {};
  NODES_3D.forEach(nd => { labelDivs3d[nd.id] = buildLabel3d(nd); });

  /* Zone labels */
  _injectZoneLabels3d();

  /* Events */
  isDragging3d   = false;
  prevMouse3d    = { x:0, y:0 };
  selectedNode3d = null;

  canvas3d.addEventListener('mousedown',  onMouseDown3d);
  canvas3d.addEventListener('mouseup',    onMouseUp3d);
  canvas3d.addEventListener('mousemove',  onMouseMove3d);
  canvas3d.addEventListener('wheel',      onWheel3d, { passive:false });
  canvas3d.addEventListener('click',      onClick3d);
  window.addEventListener('resize',       onResize3d);

  animate3d();
}

/* ================================================================
   PHẦN 4 — BUILDING FUNCTIONS
   ================================================================ */

function buildEnvironment3d() {
  /* Ambient — dim naval blue */
  scene3d.add(new THREE.AmbientLight(0x06152a, 5));

  /* Key light — muted directional */
  const key = new THREE.DirectionalLight(0x4a7fbb, 0.7);
  key.position.set(10, 25, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -40;
  key.shadow.camera.right = key.shadow.camera.top   =  40;
  scene3d.add(key);

  /* Fill light — from CWP side */
  const fill = new THREE.DirectionalLight(D3.cwpBlue, 0.25);
  fill.position.set(20, 8, 0);
  scene3d.add(fill);

  /* Overhead hemisphere — sky/ground */
  scene3d.add(new THREE.HemisphereLight(0x0a1e38, 0x020b14, 0.4));

  /* Ground plane */
  const gnd = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 80),
    new THREE.MeshLambertMaterial({ color: 0x020f1e })
  );
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.y = -0.5;
  gnd.receiveShadow = true;
  scene3d.add(gnd);

  /* Primary grid — Major lines */
  const gridMaj = new THREE.GridHelper(120, 24, D3.gridMajor, D3.gridMinor);
  gridMaj.position.y = -0.49;
  scene3d.add(gridMaj);

  /* Secondary fine grid */
  const gridFine = new THREE.GridHelper(120, 120, D3.gridMinor, D3.gridMinor);
  gridFine.position.y = -0.485;
  gridFine.material.transparent = true;
  gridFine.material.opacity = 0.35;
  scene3d.add(gridFine);

  /* Scan-line ring effect on ground center */
  for (let r = 4; r <= 22; r += 3.5) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r, r + 0.04, 64),
      new THREE.MeshBasicMaterial({
        color: r < 12 ? D3.fiber : D3.gridMajor,
        transparent: true, opacity: r < 12 ? 0.07 : 0.04,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.48;
    scene3d.add(ring);
  }

  /* Buildings */
  buildStationBuilding3d(POS_3D.tx.x, POS_3D.tx.z, true);
  buildStationBuilding3d(POS_3D.rx.x, POS_3D.rx.z, false);
  buildXmgRack3d(POS_3D.xmg.x, POS_3D.xmg.z);
  buildSwitchRack3d(POS_3D.red_sw.x, POS_3D.red_sw.z, D3.ringRed);
  buildSwitchRack3d(POS_3D.blue_sw.x, POS_3D.blue_sw.z, D3.ringBlue);
  buildTWR20Building3d(POS_3D.fl20.x, POS_3D.fl20.z);
  buildCNSRoomZone3d();
  buildRadarMast3d();
}

/* ── Radar mast ở giữa (ATCC Long Thành building) ── */
function buildRadarMast3d() {
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true; scene3d.add(m);
  };
  const cx = 0, cz = 0;
  add(new THREE.BoxGeometry(6, 2.8, 5),     new THREE.MeshLambertMaterial({color:0x0a1928}), cx, 0.9, cz);
  add(new THREE.BoxGeometry(1.0, 12, 1.0),  new THREE.MeshLambertMaterial({color:0x102030}), cx, 7.9, cz);
  add(new THREE.BoxGeometry(3.4, 0.6, 3.4), new THREE.MeshLambertMaterial({color:0x0d1f38}), cx, 14.1,cz);
  add(new THREE.CylinderGeometry(0.05, 0.07, 6, 8), new THREE.MeshLambertMaterial({color:0x38bdf8}), cx, 17.2, cz);

  /* Beacon blink */
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 8, 8),
    new THREE.MeshBasicMaterial({color:0xef4444, transparent:true})
  );
  beacon.position.set(cx, 20.2, cz);
  beacon.userData.blink = true;
  scene3d.add(beacon);

  /* CWP windows on main building */
  const wMat = new THREE.MeshBasicMaterial({color:0x38bdf8, transparent:true, opacity:0.6});
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), wMat);
    w.position.set(cx + 3.01, 0.6 + i * 0.72, cz);
    w.rotation.y = Math.PI / 2;
    scene3d.add(w);
  }
}

/* ── TX/RX antenna station buildings ── */
function buildStationBuilding3d(cx, cz, isTransmitter) {
  const baseCol = isTransmitter ? 0x0d1e30 : 0x0a1b28;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, 2.2, 3.0),
    new THREE.MeshLambertMaterial({color: baseCol})
  );
  base.position.set(cx, 0.6, cz); base.castShadow = true; scene3d.add(base);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(3.7, 0.2, 3.2),
    new THREE.MeshLambertMaterial({color:0x1a3050})
  );
  roof.position.set(cx, 1.8, cz); scene3d.add(roof);

  /* Window glow */
  const winCol = isTransmitter ? 0x00ffaa : 0x00ccff;
  const wMat = new THREE.MeshBasicMaterial({color:winCol, transparent:true, opacity:0.55});
  for (let i = 0; i < 2; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), wMat);
    w.position.set(cx + 1.76, 0.45 + i * 0.65, cz);
    w.rotation.y = Math.PI / 2;
    scene3d.add(w);
  }

  /* Antenna mast */
  const mastH = isTransmitter ? 5.5 : 4.8;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.065, mastH, 8),
    new THREE.MeshLambertMaterial({color:0x3a5570})
  );
  mast.position.set(cx, 1.9 + mastH / 2, cz); mast.castShadow = true; scene3d.add(mast);

  /* Elements crossbars */
  const elMat = new THREE.MeshLambertMaterial({color:0x4a6a8a});
  const bars = isTransmitter ? [1.7, 1.4, 1.1, 0.9] : [1.5, 1.2, 0.9];
  bars.forEach((l, i) => {
    const el = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, l, 6), elMat);
    el.rotation.z = Math.PI / 2;
    el.position.set(cx, 1.9 + mastH * 0.55 + i * 0.68, cz);
    scene3d.add(el);
  });
}

/* ── xMG equipment rack ── */
function buildXmgRack3d(cx, cz) {
  const rMat = new THREE.MeshLambertMaterial({color:0x0d1e34});
  for (let i = 0; i < 2; i++) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 0.65), rMat);
    rack.position.set(cx, 0.6 + i * 1.05, cz);
    rack.castShadow = true; scene3d.add(rack);

    /* Rack face LED strip */
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.06, 0.02),
      new THREE.MeshBasicMaterial({color:0x00e5ff, transparent:true, opacity:0.8})
    );
    led.position.set(cx, 0.6 + i * 1.05, cz + 0.34);
    scene3d.add(led);
  }
}

/* ── Switch rack (RED or BLUE) ── */
function buildSwitchRack3d(cx, cz, col) {
  const rack = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.1, 0.6),
    new THREE.MeshLambertMaterial({color:0x0b1a2b})
  );
  rack.position.set(cx, 0.55, cz); rack.castShadow = true; scene3d.add(rack);

  /* Face LED strip — ring color */
  const led = new THREE.Mesh(
    new THREE.BoxGeometry(1.44, 0.06, 0.02),
    new THREE.MeshBasicMaterial({color: col, transparent:true, opacity:0.9})
  );
  led.position.set(cx, 0.7, cz + 0.31);
  scene3d.add(led);

  /* Port indicators */
  for (let i = 0; i < 6; i++) {
    const port = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, 0.02),
      new THREE.MeshBasicMaterial({color: col, transparent:true, opacity:0.6})
    );
    port.position.set(cx - 0.62 + i * 0.24, 0.44, cz + 0.31);
    scene3d.add(port);
  }
}

/* ── TWR Tầng 20 — CWP building (ngôi sao của topology) ── */
function buildTWR20Building3d(cx, cz) {
  /* Base building — taller, more prominent */
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 11, 3.2),
    new THREE.MeshLambertMaterial({color:0x081624})
  );
  body.position.set(cx, 5.0, cz); body.castShadow = true; scene3d.add(body);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 0.35, 3.8),
    new THREE.MeshLambertMaterial({color:0x1a3555})
  );
  roof.position.set(cx, 10.68, cz); scene3d.add(roof);

  /* Antenna on top */
  const ant = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.06, 3.5, 8),
    new THREE.MeshLambertMaterial({color:0x3a6080})
  );
  ant.position.set(cx, 12.43, cz); scene3d.add(ant);

  /* CWP amber windows — upper floors (operators viewing radar) */
  const cwpMat = new THREE.MeshBasicMaterial({color:D3.cwpGlow, transparent:true, opacity:0.88});
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.42), cwpMat);
    w.position.set(cx + 1.61, 7.2 + i * 0.75, cz); w.rotation.y = Math.PI / 2;
    scene3d.add(w);
  }

  /* CWP blue screens — secondary side */
  const cwpBlMat = new THREE.MeshBasicMaterial({color:D3.cwpBlue, transparent:true, opacity:0.75});
  for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), cwpBlMat);
    w.position.set(cx, 7.8 + i * 0.72, cz + 1.61);
    scene3d.add(w);
  }

  /* Lower floors */
  const loMat = new THREE.MeshBasicMaterial({color:0x1e40af, transparent:true, opacity:0.5});
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), loMat);
    w.position.set(cx + 1.61, 2.0 + i * 0.72, cz); w.rotation.y = Math.PI / 2;
    scene3d.add(w);
  }

  /* Ground ring — CWP indicator spotlight */
  const spotRing = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.5, 48),
    new THREE.MeshBasicMaterial({color:D3.cwpGlow, transparent:true, opacity:0.12, side:THREE.DoubleSide})
  );
  spotRing.rotation.x = -Math.PI / 2;
  spotRing.position.set(cx, -0.47, cz);
  scene3d.add(spotRing);

  /* Warm CWP point light */
  const cwpLight = new THREE.PointLight(D3.cwpGlow, 0.7, 12);
  cwpLight.position.set(cx, 8, cz);
  scene3d.add(cwpLight);
}

/* ── CNS Room zone boundary ── */
function buildCNSRoomZone3d() {
  const minX=-5.5, maxX=7.5, minZ=-6.5, maxZ=6.5, cy=-0.47;
  const pts = [
    new THREE.Vector3(minX,cy,minZ), new THREE.Vector3(maxX,cy,minZ),
    new THREE.Vector3(maxX,cy,maxZ), new THREE.Vector3(minX,cy,maxZ),
    new THREE.Vector3(minX,cy,minZ),
  ];
  scene3d.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({color:0x1e3a5f, transparent:true, opacity:0.5})
  ));
  /* Corner markers */
  [[minX,minZ],[maxX,minZ],[maxX,maxZ],[minX,maxZ]].forEach(([x,z]) => {
    const corner = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.05, 0.15),
      new THREE.MeshBasicMaterial({color:0x38bdf8, transparent:true, opacity:0.5})
    );
    corner.position.set(x, cy+0.03, z);
    scene3d.add(corner);
  });
  /* Floor tint */
  const fl = new THREE.Mesh(
    new THREE.PlaneGeometry(maxX-minX, maxZ-minZ),
    new THREE.MeshBasicMaterial({color:0x091828, transparent:true, opacity:0.15, side:THREE.DoubleSide})
  );
  fl.rotation.x = -Math.PI / 2;
  fl.position.set((minX+maxX)/2, cy+0.002, (minZ+maxZ)/2);
  scene3d.add(fl);
}

/* ================================================================
   PHẦN 5 — NODE BUILD
   ================================================================ */

function statusColor3d(st) {
  return { ok:D3.statusOk, warn:D3.statusWarn, crit:D3.statusCrit }[st] || D3.unknown;
}

function buildNode3d(nd) {
  const pos = POS_3D[nd.id];
  const col = statusColor3d(nd.status);

  /* Special size for CWP node */
  const isCWP = nd.id === 'fl20';
  const isHub = nd.id === 'xmg';
  const r = isCWP ? 0.62 : isHub ? 0.52 : 0.44;

  /* Outer pulsing ring */
  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(r + 0.22, r + 0.36, 36),
    new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.15, side:THREE.DoubleSide})
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.set(pos.x, -0.46, pos.z);
  scene3d.add(outerRing);

  /* Inner ring — solid */
  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(r + 0.05, r + 0.14, 36),
    new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.35, side:THREE.DoubleSide})
  );
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.set(pos.x, -0.45, pos.z);
  scene3d.add(innerRing);

  /* Node sphere — emissive */
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 24),
    new THREE.MeshPhongMaterial({
      color:     col,
      emissive:  col,
      emissiveIntensity: isCWP ? 0.7 : 0.5,
      transparent: true,
      opacity:   0.92,
      shininess: 80,
    })
  );
  sphere.position.copy(pos);
  sphere.castShadow = true;
  sphere.userData.nodeId = nd.id;
  scene3d.add(sphere);

  /* CWP extra outer sphere (glass look) */
  if (isCWP) {
    const glassShell = new THREE.Mesh(
      new THREE.SphereGeometry(r + 0.18, 24, 24),
      new THREE.MeshPhongMaterial({
        color: D3.cwpGlow, emissive: D3.cwpGlow,
        emissiveIntensity: 0.08, transparent:true, opacity:0.08,
        shininess: 120, side: THREE.FrontSide,
      })
    );
    glassShell.position.copy(pos);
    scene3d.add(glassShell);
  }

  /* Vertical beam to ground */
  const beamH = pos.y + 0.5;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.025, beamH, 6),
    new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.2})
  );
  beam.position.set(pos.x, beamH / 2 - 0.5, pos.z);
  scene3d.add(beam);

  /* Point light */
  const intensity = isCWP ? 0.6 : isHub ? 0.5 : 0.4;
  const distance  = isCWP ? 7   : 5;
  const pl = new THREE.PointLight(col, intensity, distance);
  pl.position.copy(pos);
  scene3d.add(pl);

  return { sphere, outerRing, innerRing, pl };
}

/* ================================================================
   PHẦN 6 — LINKS
   ================================================================ */

function linkColor3d(lk) {
  if (lk.ring === 'red')  return D3.ringRed;
  if (lk.ring === 'blue') return D3.ringBlue;
  return D3.fiber; /* both / fiber default */
}

function buildLink3d(lk) {
  const a   = POS_3D[lk.from].clone();
  const b   = POS_3D[lk.to].clone();
  const col = linkColor3d(lk);
  const arc = lk.type === 'fiber' ? 1.6 : 0.8;
  const mid = new THREE.Vector3((a.x+b.x)/2, Math.max(a.y,b.y)+arc, (a.z+b.z)/2);
  const curve = new THREE.CatmullRomCurve3([a, mid, b]);
  const r     = lk.type === 'fiber' ? 0.048 : 0.032;
  const segs  = lk.type === 'fiber' ? 48 : 32;
  const tube  = new THREE.Mesh(
    new THREE.TubeGeometry(curve, segs, r, 8, false),
    new THREE.MeshPhongMaterial({
      color:             col,
      emissive:          col,
      emissiveIntensity: lk.type === 'fiber' ? 0.75 : 0.60,
      transparent:       true,
      opacity:           lk.type === 'fiber' ? 0.90 : 0.78,
      shininess:         40,
    })
  );
  scene3d.add(tube);
  return { tube, curve, col };
}

/* ================================================================
   PHẦN 7 — PARTICLES
   ================================================================ */

function buildParticles3d(lk) {
  const obj = linkObjects3d[lk.id];
  if (!obj) return;
  const n   = PARTICLE_COUNT_3D[lk.type] || 3;
  const col = obj.col;
  for (let i = 0; i < n; i++) {
    const pSize = lk.type === 'fiber' ? 0.10 : 0.075;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(pSize, 8, 8),
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.95})
    );
    scene3d.add(mesh);
    particles3d.push(mesh);
    particleData3d.push({
      curve: obj.curve,
      t:     i / n,
      speed: 0.0030 + Math.random() * 0.0022,
      col,
    });
  }
}

/* ================================================================
   PHẦN 8 — HTML LABELS (Aviation callsign strip style)
   ================================================================ */

function buildLabel3d(nd) {
  const container = document.getElementById('canvas-container') || document.body;
  const div = document.createElement('div');
  div.className = 'node-label-3d';
  div.id = 'lbl3d-' + nd.id;

  const lines   = nd.label.split('\n');
  const col     = statusColor3d(nd.status);
  const hexCol  = '#' + col.toString(16).padStart(6, '0');
  const isCWP   = nd.id === 'fl20';
  const isHub   = nd.id === 'xmg';

  /* Ring indicator color for label border */
  const ringMap  = { tx:D3.fiber, rx:D3.fiber, xmg:D3.fiber, red_sw:D3.ringRed, blue_sw:D3.ringBlue, fl20:D3.cwpGlow };
  const borderC  = '#' + (ringMap[nd.id] || D3.fiber).toString(16).padStart(6,'0');

  div.style.cssText =
    'position:absolute;pointer-events:none;transform:translate(-50%,-100%);' +
    'text-align:left;white-space:nowrap;z-index:10;';

  const scale    = isCWP ? '1.08' : '1';
  const bgAlpha  = isCWP ? '0.94' : '0.88';
  const topLine  = isCWP
    ? `<span style="font-size:.63em;color:${hexCol};font-weight:900;letter-spacing:.04em">${lines[0]}</span>`
    : `<span style="font-size:.60em;font-weight:700;color:#c8daf0">${lines[0]}</span>`;

  div.innerHTML =
    `<div style="
      background:rgba(2,10,22,${bgAlpha});
      border:1px solid ${borderC};
      border-left:3px solid ${borderC};
      border-radius:3px;
      padding:3px 8px 3px 6px;
      line-height:1.5;
      box-shadow:0 0 8px rgba(0,0,0,0.6)${isCWP ? ',0 0 14px '+borderC+'44' : ''};
      transform:scale(${scale});
      transform-origin:bottom center;
    ">
      ${topLine}<br>
      <span style="font-size:.56em;color:#5a88b8;font-weight:400">${lines[1]||''}</span>
      <div style="margin-top:2px;font-size:.53em;color:#2a5070;font-family:'Consolas',monospace;
        border-top:1px solid rgba(30,58,95,.4);padding-top:1px">${nd.sub}</div>
    </div>`;

  container.appendChild(div);
  return div;
}

/* ── Zone labels: CNS ROOM + CWP ── */
function _injectZoneLabels3d() {
  const container = document.getElementById('canvas-container') || document.body;

  /* CNS ROOM */
  if (!document.getElementById('cns-label-3d')) {
    const el = document.createElement('div');
    el.id = 'cns-label-3d';
    el.style.cssText =
      'position:absolute;pointer-events:none;transform:translate(-50%,-100%);z-index:10;' +
      'font-size:.56em;color:#1e3a5f;font-weight:700;letter-spacing:.12em;text-transform:uppercase;' +
      'background:rgba(2,10,22,.72);padding:2px 7px;border-radius:2px;' +
      'border:1px solid #0d2040;font-family:"Consolas",monospace;';
    el.textContent = '── CNS ROOM ──';
    container.appendChild(el);
  }

  /* CWP ACTIVE badge above TWR */
  if (!document.getElementById('cwp-label-3d')) {
    const el = document.createElement('div');
    el.id = 'cwp-label-3d';
    el.style.cssText =
      'position:absolute;pointer-events:none;transform:translate(-50%,-100%);z-index:11;' +
      'font-size:.58em;color:#ffa020;font-weight:800;letter-spacing:.1em;text-transform:uppercase;' +
      'background:rgba(30,12,2,.85);padding:2px 8px;border-radius:2px;' +
      'border:1px solid #ffa02066;font-family:"Consolas",monospace;margin-bottom:2px;';
    el.textContent = '★ CWP ACTIVE';
    container.appendChild(el);
  }
}

/* ================================================================
   PHẦN 9 — ANIMATION
   ================================================================ */

let _t0_3d = Date.now();

function animate3d() {
  requestAnimationFrame(animate3d);
  const t = (Date.now() - _t0_3d) * 0.001;

  /* Particles travel along link curves */
  for (let i = 0; i < particles3d.length; i++) {
    const pd = particleData3d[i];
    pd.t = (pd.t + pd.speed) % 1;
    particles3d[i].position.copy(pd.curve.getPoint(pd.t));
    /* Fade in/out at endpoints */
    particles3d[i].material.opacity = 0.35 + 0.65 * Math.abs(Math.sin(pd.t * Math.PI));
  }

  /* Beacon blink */
  scene3d.traverse(obj => {
    if (obj.userData && obj.userData.blink) {
      obj.material.opacity = 0.25 + 0.75 * Math.abs(Math.sin(t * 2.8));
    }
  });

  /* Node pulse — subtle breathe */
  Object.entries(nodeMeshes3d).forEach(([id, nm], idx) => {
    const isCWP = id === 'fl20';
    const amp   = isCWP ? 0.045 : 0.025;
    const freq  = isCWP ? 1.4   : 1.8;
    nm.sphere.scale.setScalar(1 + amp * Math.sin(t * freq + idx));
    nm.outerRing.material.opacity = 0.06 + 0.10 * Math.sin(t * 1.0 + idx * 0.6);
    nm.innerRing.material.opacity = 0.25 + 0.12 * Math.sin(t * 1.5 + idx * 0.4);
  });

  /* Scan-line rings — rotate slowly */
  scene3d.traverse(obj => {
    if (obj.userData && obj.userData.scanRing) {
      obj.material.opacity = 0.04 + 0.03 * Math.abs(Math.sin(t * 0.4 + obj.userData.scanPhase));
    }
  });

  updateLabels3d();
  updateZoneLabels3d();
  renderer3d.render(scene3d, camera3d);
}

/* ================================================================
   PHẦN 10 — LABEL PROJECTION
   ================================================================ */

function updateLabels3d() {
  const W = renderer3d.domElement.clientWidth  || 960;
  const H = renderer3d.domElement.clientHeight || 440;
  NODES_3D.forEach(nd => {
    const isCWP = nd.id === 'fl20';
    const liftY = isCWP ? 1.1 : 0.85;
    const pos3d = POS_3D[nd.id].clone().add(new THREE.Vector3(0, liftY, 0));
    const proj  = pos3d.project(camera3d);
    const x = ( proj.x * 0.5 + 0.5) * W;
    const y = (-proj.y * 0.5 + 0.5) * H;
    const div = labelDivs3d[nd.id];
    if (!div) return;
    if (proj.z < 1 && proj.z > -1) {
      div.style.display = 'block';
      div.style.left    = x + 'px';
      div.style.top     = y + 'px';
    } else {
      div.style.display = 'none';
    }
  });
}

function updateZoneLabels3d() {
  const W = renderer3d.domElement.clientWidth  || 960;
  const H = renderer3d.domElement.clientHeight || 440;

  /* CNS ROOM label */
  const cnsPt  = new THREE.Vector3(1, 2.2, 0);
  const cnsEl  = document.getElementById('cns-label-3d');
  _proj3dLabel(cnsPt, cnsEl, W, H);

  /* CWP ACTIVE badge — slightly above TWR node */
  const cwpPt  = new THREE.Vector3(POS_3D.fl20.x, POS_3D.fl20.y + 1.7, POS_3D.fl20.z);
  const cwpEl  = document.getElementById('cwp-label-3d');
  _proj3dLabel(cwpPt, cwpEl, W, H);
}

function _proj3dLabel(pos3d, el, W, H) {
  if (!el) return;
  const proj = pos3d.project(camera3d);
  if (proj.z < 1) {
    el.style.display = 'block';
    el.style.left    = ( proj.x * 0.5 + 0.5) * W + 'px';
    el.style.top     = (-proj.y * 0.5 + 0.5) * H + 'px';
  } else {
    el.style.display = 'none';
  }
}

/* ================================================================
   PHẦN 11 — CAMERA
   ================================================================ */

function updateCamera3d() {
  const x = camRadius3d * Math.sin(camTheta3d) * Math.cos(camPhi3d);
  const y = camRadius3d * Math.sin(camPhi3d);
  const z = camRadius3d * Math.cos(camTheta3d) * Math.cos(camPhi3d);
  camera3d.position.set(x, Math.max(2.5, y), z);
  /* lookAt hơi lệch về phía CWP để bố cục cân */
  camera3d.lookAt(1.5, 1.5, 0);
}

/* ================================================================
   PHẦN 12 — EVENTS
   ================================================================ */

let _drag3d = false;
function onMouseDown3d(e) {
  _drag3d = false; isDragging3d = false;
  prevMouse3d = { x:e.clientX, y:e.clientY };
}
function onMouseUp3d(e) { isDragging3d = _drag3d; }
function onMouseMove3d(e) {
  const rect = renderer3d.domElement.getBoundingClientRect();
  mouse3d.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
  mouse3d.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  if (e.buttons === 1) {
    const dx = e.clientX - prevMouse3d.x;
    const dy = e.clientY - prevMouse3d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) _drag3d = true;
    camTheta3d -= dx * 0.006;
    camPhi3d    = Math.max(0.08, Math.min(Math.PI * 0.46, camPhi3d - dy * 0.005));
    prevMouse3d = { x:e.clientX, y:e.clientY };
    updateCamera3d();
  }
}
function onWheel3d(e) {
  e.preventDefault();
  camRadius3d = Math.max(8, Math.min(60, camRadius3d + e.deltaY * 0.04));
  updateCamera3d();
}
function onResize3d() {
  const container = document.getElementById('canvas-container');
  if (!container) return;
  const W = container.clientWidth;
  const H = Math.max(container.clientHeight, 320);
  camera3d.aspect = W / H;
  camera3d.updateProjectionMatrix();
  renderer3d.setSize(W, H);
}
function onClick3d(e) {
  if (_drag3d) return;
  raycaster3d.setFromCamera(mouse3d, camera3d);
  const spheres = Object.values(nodeMeshes3d).map(nm => nm.sphere);
  const hits    = raycaster3d.intersectObjects(spheres);
  if (hits.length) {
    const nodeId = hits[0].object.userData.nodeId;
    const nd = NODES_3D.find(n => n.id === nodeId);
    if (nd) { selectedNode3d = nodeId; openPanel3d(nd); }
  } else {
    closePanel3d();
  }
}

/* ================================================================
   PHẦN 13 — INFO PANEL
   ================================================================ */

function openPanel3d(nd) {
  const panel = document.getElementById('node-panel');
  if (!panel) return;

  const lines   = nd.label.split('\n');
  const titleEl = document.getElementById('panel-title');
  const subEl   = document.getElementById('panel-sub');
  if (titleEl) titleEl.textContent = lines[0];
  if (subEl)   subEl.textContent   = lines[1] || nd.sub;

  const badgeEl = document.getElementById('panel-badge');
  if (badgeEl) {
    const stC = { ok:'bg-green', warn:'bg-yellow', crit:'bg-red', unknown:'bg-blue' };
    const stL = { ok:'● NORMAL',  warn:'⚠ WARNING', crit:'✕ CRITICAL', unknown:'? UNKNOWN' };
    badgeEl.className  = 'badge ' + (stC[nd.status] || 'bg-blue');
    badgeEl.textContent = stL[nd.status] || '? UNKNOWN';
  }

  const infoEl = document.getElementById('panel-info');
  if (infoEl) {
    infoEl.innerHTML = Object.entries(nd.info || {}).map(([k, v]) =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;
       border-bottom:1px solid rgba(30,58,95,.4);font-size:.77em;gap:8px">
       <span style="color:var(--text2)">${k}</span>
       <span style="color:var(--text1);font-family:'Consolas',monospace;font-size:.9em;
       text-align:right;word-break:break-all">${v}</span></div>`
    ).join('');
  }

  const kpi  = nd.kpi || {};
  const dPct = Math.min((kpi.delay  || 0) / 100 * 100, 100);
  const jPct = Math.min((kpi.jitter || 0) / 20  * 100, 100);
  const lPct = Math.min((kpi.loss   || 0) / 1   * 100, 100);
  const bc   = p => p < 50 ? 'var(--green)' : p < 100 ? 'var(--yellow)' : 'var(--red)';

  const delayEl  = document.getElementById('pv-delay');
  const jitEl    = document.getElementById('pv-jitter');
  const lossEl   = document.getElementById('pv-loss');
  const pbDelay  = document.getElementById('pb-delay');
  const pbJitter = document.getElementById('pb-jitter');
  const pbLoss   = document.getElementById('pb-loss');

  if (kpi.delay !== undefined) {
    if (delayEl)  delayEl.textContent  = kpi.delay  + ' ms';
    if (jitEl)    jitEl.textContent    = kpi.jitter + ' ms';
    if (lossEl)   lossEl.textContent   = kpi.loss   + '%';
    if (pbDelay)  { pbDelay.style.width  = dPct+'%'; pbDelay.style.background  = bc(dPct); }
    if (pbJitter) { pbJitter.style.width = jPct+'%'; pbJitter.style.background = bc(jPct); }
    if (pbLoss)   { pbLoss.style.width   = lPct+'%'; pbLoss.style.background   = bc(lPct); }
  } else {
    if (delayEl) delayEl.textContent = 'N/A';
    if (jitEl)   jitEl.textContent   = 'N/A';
    if (lossEl)  lossEl.textContent  = 'N/A';
  }

  panel.style.display = 'flex';
  selectedNode3d = nd.id;
}

function closePanel3d() {
  const panel = document.getElementById('node-panel');
  if (panel) panel.style.display = 'none';
  selectedNode3d = null;
}

/* Export để close button trong HTML gọi được */
window.closePanel = window.closePanel || closePanel3d;
