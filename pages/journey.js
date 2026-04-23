/* Arrowpac — 3D Scroll Journey
   5 beats: modes → pickup → ocean → air → arrival
   Navy #151b5b + Red #BC0C06 palette
   Canvas is sticky-pinned within .journey-wrap (not full-page fixed).
   Uses the global THREE loaded by the globe.gl <script> tag in index.html.
*/

(function(){
if (typeof THREE === 'undefined') { console.warn('THREE not loaded — journey scene skipped'); return; }

const PAL = {
  bg: 0x0A0D14,
  navy: 0x151b5b,
  navyLight: 0x2d3587,
  red: 0xBC0C06,
  redLight: 0xff3a30,
  metal: 0xE8E2D1,
  dark: 0x1a2030,
  water: 0x152940,
  ground: 0x0f1620,
  warmLight: 0xfff1d6,
  rimLight: 0x4a8ccf,
  windowLight: 0xFFE98A,
};

const canvas = document.getElementById('journey-canvas');
if (!canvas) {
  console.warn('journey-canvas not found — aborting journey scene');
} else {

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(PAL.bg, 0.020);

const camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
camera.position.set(0, 3, 10);

/* ==================== Lights ==================== */
scene.add(new THREE.HemisphereLight(0xbcd3ff, 0x0a1020, 0.45));

const key = new THREE.DirectionalLight(PAL.warmLight, 1.5);
key.position.set(6, 10, 4);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -12; key.shadow.camera.right = 12;
key.shadow.camera.top = 12; key.shadow.camera.bottom = -12;
key.shadow.bias = -0.0005;
scene.add(key);

const rim = new THREE.DirectionalLight(PAL.rimLight, 0.7);
rim.position.set(-8, 4, -6);
scene.add(rim);

const accentLight = new THREE.PointLight(PAL.red, 2.2, 22);
accentLight.position.set(0, 2, 4);
scene.add(accentLight);

/* ==================== Ground / grid ==================== */
const groundGeo = new THREE.PlaneGeometry(400, 400);
const groundMat = new THREE.MeshStandardMaterial({ color: PAL.ground, roughness: 0.95, transparent: true, opacity: 0 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(400, 80, PAL.red, 0x1a2030);
grid.position.y = -1.18;
grid.material.transparent = true;
grid.material.opacity = 0;
scene.add(grid);

/* ==================== Text-to-texture helper ==================== */
function makeTextDecal(text, w, h, bg, fg, weight = '600') {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#' + new THREE.Color(fg).getHexString();
  ctx.font = `${weight} ${Math.floor(h * 0.48)}px "Raleway", "Space Grotesk", system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ==================== Container (with opening doors) ==================== */
function buildContainer() {
  const g = new THREE.Group();
  const W = 3.2, H = 1.6, D = 1.6, T = 0.05;

  const bodyMat = new THREE.MeshStandardMaterial({ color: PAL.red, roughness: 0.55, metalness: 0.35 });
  const innerMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9, side: THREE.DoubleSide });

  function makeSidePanel(w, h, d, mat) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.castShadow = true; body.receiveShadow = true;
    grp.add(body);
    const ridgeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PAL.red).multiplyScalar(0.78),
      roughness: 0.5, metalness: 0.4,
    });
    const ridgeCount = Math.floor(w * 5);
    for (let i = 0; i < ridgeCount; i++) {
      const x = -w / 2 + (i + 0.5) * (w / ridgeCount);
      const r = new THREE.Mesh(
        new THREE.BoxGeometry(w / ridgeCount * 0.15, h * 0.9, d + 0.01),
        ridgeMat
      );
      r.position.set(x, 0, 0);
      grp.add(r);
    }
    return grp;
  }

  const top = makeSidePanel(W, T, D, bodyMat); top.position.y = H / 2; g.add(top);
  const bottom = makeSidePanel(W, T, D, bodyMat); bottom.position.y = -H / 2; g.add(bottom);
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), bodyMat);
  back.position.z = -D / 2; back.castShadow = true; g.add(back);
  const leftSide = makeSidePanel(T, H, D, bodyMat); leftSide.position.x = -W / 2; g.add(leftSide);
  const rightSide = makeSidePanel(T, H, D, bodyMat); rightSide.position.x = W / 2; g.add(rightSide);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * T, T * 0.5, D - 2 * T), innerMat);
  floor.position.y = -H / 2 + T / 2; g.add(floor);

  const doorMat = new THREE.MeshStandardMaterial({ color: PAL.red, roughness: 0.55, metalness: 0.4 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x222, roughness: 0.4, metalness: 0.7 });

  const leftDoorPivot = new THREE.Group();
  leftDoorPivot.position.set(-W / 2, 0, D / 2);
  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(W / 2, H, T), doorMat);
  leftDoor.position.set(W / 4, 0, 0); leftDoor.castShadow = true;
  [-0.35, 0.35].forEach(dx => {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, H * 0.78, 8), handleMat);
    h.position.set(W / 4 + dx, 0, T / 2 + 0.03);
    leftDoorPivot.add(h);
  });
  leftDoorPivot.add(leftDoor);
  g.add(leftDoorPivot);

  const rightDoorPivot = new THREE.Group();
  rightDoorPivot.position.set(W / 2, 0, D / 2);
  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(W / 2, H, T), doorMat);
  rightDoor.position.set(-W / 4, 0, 0); rightDoor.castShadow = true;
  [-0.35, 0.35].forEach(dx => {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, H * 0.78, 8), handleMat);
    h.position.set(-W / 4 + dx, 0, T / 2 + 0.03);
    rightDoorPivot.add(h);
  });
  rightDoorPivot.add(rightDoor);
  g.add(rightDoorPivot);

  // Corner castings
  const cornerMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.3 });
  [[-1,-1,-1],[1,-1,-1],[-1,1,-1],[1,1,-1],[-1,-1,1],[1,-1,1],[-1,1,1],[1,1,1]].forEach(([sx, sy, sz]) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), cornerMat);
    c.position.set(sx * (W / 2 - 0.04), sy * (H / 2 - 0.04), sz * (D / 2 - 0.04));
    g.add(c);
  });

  // ARROWPAC decal on side
  const decalTex = makeTextDecal('ARROWPAC', 512, 128, PAL.bg, 0xffffff);
  const decalMat = new THREE.MeshBasicMaterial({ map: decalTex, transparent: true });
  const sideDecalL = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), decalMat);
  sideDecalL.position.set(-W / 2 - 0.002, 0.1, 0);
  sideDecalL.rotation.y = -Math.PI / 2;
  g.add(sideDecalL);
  const sideDecalR = sideDecalL.clone();
  sideDecalR.position.set(W / 2 + 0.002, 0.1, 0);
  sideDecalR.rotation.y = Math.PI / 2;
  g.add(sideDecalR);

  // Mode crates revealed when doors open
  const contents = new THREE.Group();
  const crateMat = new THREE.MeshStandardMaterial({ color: PAL.metal, roughness: 0.7 });
  ['OCE', 'AIR', 'GND'].forEach((label, i) => {
    const crate = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), crateMat);
    box.castShadow = true; box.receiveShadow = true;
    crate.add(box);
    const labelTex = makeTextDecal(label, 256, 256, PAL.bg, PAL.red, '700');
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });
    [-1, 1].forEach(s => {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), labelMat);
      l.position.set(0, 0, s * 0.36);
      if (s === -1) l.rotation.y = Math.PI;
      crate.add(l);
    });
    crate.position.set((i - 1) * 0.85, -H / 2 + 0.35 + T, 0);
    crate.rotation.y = (Math.random() - 0.5) * 0.2;
    contents.add(crate);
  });
  g.add(contents);

  g.userData = { leftDoorPivot, rightDoorPivot, contents };
  return g;
}

/* ==================== Truck ==================== */
function buildTruck() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: PAL.dark, roughness: 0.6, metalness: 0.4 });
  const cabMat = new THREE.MeshStandardMaterial({ color: PAL.metal, roughness: 0.4, metalness: 0.5 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 });

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 1.6), cabMat);
  cab.position.set(-2.4, 0.65, 0); cab.castShadow = true; g.add(cab);

  const ws = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 1.52), glassMat);
  ws.position.set(-2.15, 1.0, 0); g.add(ws);

  const bed = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.25, 1.7), bodyMat);
  bed.position.set(0.5, 0.3, 0); bed.castShadow = true; bed.receiveShadow = true; g.add(bed);

  const wheels = [];
  function addWheel(x, z) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 16), tireMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.15, z);
    w.castShadow = true;
    g.add(w); wheels.push(w);
  }
  addWheel(-2.6, 0.78); addWheel(-2.6, -0.78);
  [0.3, 1.5].forEach(x => {
    addWheel(x, 0.78); addWheel(x, -0.78);
    addWheel(x, 1.02); addWheel(x, -1.02);
  });

  g.userData = { wheels };
  return g;
}

/* ==================== Container ship ==================== */
function buildShip() {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: PAL.dark, roughness: 0.6, metalness: 0.4 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.9 });
  const superMat = new THREE.MeshStandardMaterial({ color: PAL.metal, roughness: 0.5, metalness: 0.3 });

  const hullShape = new THREE.Shape();
  hullShape.moveTo(-5, 0);
  hullShape.lineTo(4.5, 0);
  hullShape.lineTo(5.5, 0.9);
  hullShape.lineTo(4.8, 1.2);
  hullShape.lineTo(-4.8, 1.2);
  hullShape.lineTo(-5.2, 0.9);
  hullShape.closePath();
  const hull = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hullShape, { depth: 2.2, bevelEnabled: false }),
    hullMat
  );
  hull.rotation.x = Math.PI / 2;
  hull.position.set(0, -0.1, 1.1);
  hull.castShadow = true; hull.receiveShadow = true;
  g.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.1, 2), deckMat);
  deck.position.set(-0.3, 1.18, 0);
  g.add(deck);

  const supers = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const w = 1.4 - i * 0.1, h = 0.5, d = 1.6 - i * 0.1;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), superMat);
    b.position.set(3.5, 1.3 + i * 0.5, 0);
    b.castShadow = true;
    supers.add(b);
  }
  const wLine = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 1.6), new THREE.MeshBasicMaterial({ color: PAL.windowLight }));
  wLine.position.set(3.5, 2.9, 0);
  supers.add(wLine);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.8), hullMat);
  funnel.position.set(3.5, 3.7, 0);
  supers.add(funnel);
  g.add(supers);

  // Cargo containers (brand colors)
  const boxColors = [PAL.navy, PAL.red, 0x16609e, 0xd88a2a, 0x4a8a4a, 0xE8E2D1];
  const cargo = new THREE.Group();
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 2; col++) {
      for (let lvl = 0; lvl < 2; lvl++) {
        if (Math.random() < 0.15) continue;
        const color = boxColors[Math.floor(Math.random() * boxColors.length)];
        const m = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2 });
        const c = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.6), m);
        c.position.set(-3 + row * 1.15, 1.5 + lvl * 0.58, -0.7 + col * 1.4);
        c.castShadow = true;
        cargo.add(c);
      }
    }
  }
  const hero = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.05, 1.1),
    new THREE.MeshStandardMaterial({ color: PAL.red, roughness: 0.5, metalness: 0.4 })
  );
  hero.position.set(-0.5, 2.7, 0);
  hero.castShadow = true;
  cargo.add(hero);
  g.add(cargo);

  return g;
}

/* ==================== Plane (cargo) ==================== */
function buildPlane() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: PAL.metal, roughness: 0.35, metalness: 0.6 });
  const accentMat = new THREE.MeshStandardMaterial({ color: PAL.red, roughness: 0.5, metalness: 0.4 });

  const fuse = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 4.5, 8, 16), bodyMat);
  fuse.rotation.z = Math.PI / 2; fuse.castShadow = true;
  g.add(fuse);

  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 4.3, 24, 1, true), accentMat);
  stripe.rotation.z = Math.PI / 2; stripe.scale.set(1, 1, 0.12);
  g.add(stripe);

  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.lineTo(0, -0.15); wingShape.lineTo(3.2, 0.3); wingShape.lineTo(3.0, 0.4); wingShape.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: false });
  const wingL = new THREE.Mesh(wingGeo, bodyMat);
  wingL.rotation.x = Math.PI / 2; wingL.position.set(0.2, 0, -0.05); wingL.castShadow = true;
  g.add(wingL);
  const wingR = wingL.clone(); wingR.scale.x = -1; g.add(wingR);

  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, 0); tailShape.lineTo(0.9, 1.2); tailShape.lineTo(1.1, 1.2); tailShape.lineTo(0.3, 0); tailShape.closePath();
  const tail = new THREE.Mesh(new THREE.ExtrudeGeometry(tailShape, { depth: 0.08, bevelEnabled: false }), bodyMat);
  tail.position.set(-2.2, 0.3, -0.04);
  g.add(tail);

  const hstab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 1.4), bodyMat);
  hstab.position.set(-2.3, 0.4, 0);
  g.add(hstab);

  [[-0.6, -0.55, 1.2], [-0.6, -0.55, -1.2]].forEach(p => {
    const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 12), bodyMat);
    e.rotation.z = Math.PI / 2; e.position.set(...p);
    g.add(e);
  });

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0x111 }));
  cockpit.position.set(2.1, 0.1, 0);
  g.add(cockpit);

  return g;
}

/* ==================== Warehouse ==================== */
function buildWarehouse() {
  const g = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({ color: PAL.metal, roughness: 0.7 });
  const roofMat = new THREE.MeshStandardMaterial({ color: PAL.dark, roughness: 0.9 });
  const bayMat = new THREE.MeshStandardMaterial({ color: 0x111, roughness: 0.9 });
  const lightMat = new THREE.MeshBasicMaterial({ color: PAL.windowLight });

  const body = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 5), wallMat);
  body.position.y = 1.5; body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.1, 5.2), roofMat);
  roof.position.y = 3.05; g.add(roof);

  for (let i = 0; i < 4; i++) {
    const bay = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 0.1), bayMat);
    bay.position.set(-3 + i * 2, 0.9, 2.51); g.add(bay);
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.1), lightMat);
    l.position.set(-3 + i * 2, 2.3, 2.52); g.add(l);
  }

  const signTex = makeTextDecal('ARROWPAC · EAST WINDSOR', 1024, 128, PAL.bg, 0xffffff);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.6), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
  sign.position.set(0, 2.6, 2.53);
  g.add(sign);

  return g;
}

/* ==================== Puerto Rico island ==================== */
function buildPR() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  const pts = [
    [-3, 0.2], [-2.5, 0.8], [-1.5, 1.0], [0, 1.1], [1.5, 0.9], [2.8, 0.7], [3.2, 0.2],
    [3.0, -0.4], [1.5, -0.8], [0, -0.9], [-1.8, -0.7], [-2.8, -0.4]
  ];
  shape.moveTo(...pts[0]);
  pts.slice(1).forEach(p => shape.lineTo(...p));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.4, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.08, bevelSegments: 3 });
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1e3a2c, roughness: 0.9 });
  const island = new THREE.Mesh(geo, mat);
  island.receiveShadow = true; island.castShadow = true;
  g.add(island);

  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x2a4a38, roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const r = new THREE.Mesh(
      new THREE.ConeGeometry(0.35 + Math.random() * 0.2, 0.5 + Math.random() * 0.4, 5),
      ridgeMat
    );
    r.position.set(-1.5 + i * 0.6, 0.3, 0.1);
    r.castShadow = true;
    g.add(r);
  }

  const pinBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8),
    new THREE.MeshBasicMaterial({ color: PAL.red })
  );
  pinBase.position.set(1.8, 0.5, -0.3); g.add(pinBase);
  const pinHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 12),
    new THREE.MeshBasicMaterial({ color: PAL.red })
  );
  pinHead.position.set(1.8, 0.9, -0.3); g.add(pinHead);

  const labelTex = makeTextDecal('SAN JUAN', 512, 96, PAL.bg, PAL.red, '700');
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.2),
    new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
  );
  label.position.set(1.8, 1.25, -0.3); g.add(label);

  return g;
}

/* ==================== Ocean ==================== */
function buildOcean() {
  const geo = new THREE.PlaneGeometry(120, 120, 60, 60);
  const mat = new THREE.MeshStandardMaterial({
    color: PAL.water, roughness: 0.3, metalness: 0.6,
    flatShading: true, transparent: true, opacity: 0,
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = -1.2;
  m.receiveShadow = true;
  m.userData.base = geo.attributes.position.array.slice();
  return m;
}

/* ==================== Dust particles ==================== */
function buildDust() {
  const count = 400;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = Math.random() * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: PAL.windowLight, size: 0.03, transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}

/* ==================== Flight arc ==================== */
function buildFlightArc() {
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-8, 0, 0),
    new THREE.Vector3(-3, 6, 0),
    new THREE.Vector3(3, 6, 0),
    new THREE.Vector3(8, 0, 0),
  );
  const geo = new THREE.TubeGeometry(curve, 64, 0.018, 8, false);
  const mat = new THREE.MeshBasicMaterial({ color: PAL.red, transparent: true, opacity: 0 });
  const m = new THREE.Mesh(geo, mat);
  m.userData.curve = curve;
  return m;
}

/* ==================== Instantiate actors ==================== */
const container = buildContainer(); scene.add(container);
const truck = buildTruck(); truck.visible = false; scene.add(truck);
const ship = buildShip(); ship.visible = false; scene.add(ship);
const plane = buildPlane(); plane.visible = false; scene.add(plane);
const warehouse = buildWarehouse(); warehouse.visible = false; scene.add(warehouse);
const pr = buildPR(); pr.visible = false; scene.add(pr);
const ocean = buildOcean(); scene.add(ocean);
const dust = buildDust(); scene.add(dust);
const flightArc = buildFlightArc(); flightArc.visible = false; scene.add(flightArc);

/* ==================== Scroll-driven timeline ==================== */
const NUM_BEATS = 5;       // modes → pickup → ocean → air → arrival
let scrollT = 0;
let targetT = 0;

const wrap = document.querySelector('.journey-wrap');
function updateScroll() {
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const total = wrap.offsetHeight - window.innerHeight;
  const offset = Math.max(0, -rect.top);
  const p = total > 0 ? Math.max(0, Math.min(1, offset / total)) : 0;
  targetT = p * (NUM_BEATS - 1);
}
window.addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const segT = (t, from, to) => smoothstep(from, to, t);

/* ==================== Choreography ==================== */
function choreograph(t) {
  container.visible = true;
  truck.visible = false;
  ship.visible = false;
  plane.visible = false;
  warehouse.visible = false;
  pr.visible = false;
  flightArc.visible = false;

  // BEAT 0 → 1: Modes. Container rotates to face camera; doors open; crates reveal.
  if (t < 1) {
    const s = t;
    const rotY = lerp(0.6, 0, Math.min(1, s * 2));
    container.position.set(lerp(0, -1.5, s), 0.1 + Math.sin(performance.now() * 0.0008) * 0.05, lerp(0, 0.5, s));
    container.rotation.set(-0.05, rotY - 0.25, 0);
    container.scale.setScalar(1);

    const openT = segT(s, 0.25, 0.9);
    const angle = openT * Math.PI * 0.75;
    container.userData.leftDoorPivot.rotation.y = -angle;
    container.userData.rightDoorPivot.rotation.y = angle;

    const cT = segT(s, 0.45, 1);
    container.userData.contents.scale.setScalar(cT);
    container.userData.contents.children.forEach((c, i) => {
      c.position.y = lerp(-0.5, -0.5 + Math.sin(performance.now() * 0.002 + i) * 0.05, cT);
    });

    camera.position.set(lerp(0, 2.5, s), lerp(1.5, 1.2, s), lerp(6.5, 5.5, s));
    camera.lookAt(lerp(0, -1.5, s), 0.2, 0);

    groundMat.opacity = 0;
    grid.material.opacity = 0;
    ocean.material.opacity = 0;
    accentLight.intensity = 2.8;
  }
  // BEAT 1 → 2: Pickup. Doors close, container mounts on truck, warehouse slides in.
  else if (t < 2) {
    const s = t - 1;
    const closeT = 1 - segT(s, 0, 0.3);
    const angle = closeT * Math.PI * 0.75;
    container.userData.leftDoorPivot.rotation.y = -angle;
    container.userData.rightDoorPivot.rotation.y = angle;
    container.userData.contents.scale.setScalar(Math.max(0, closeT));

    truck.visible = true;
    warehouse.visible = true;
    warehouse.position.set(lerp(-20, -9, s), 0, lerp(-5, -2, s));
    warehouse.rotation.y = 0.3;

    const truckX = lerp(-8, -1, s);
    truck.position.set(truckX, -0.85, 0);
    truck.rotation.y = 0;
    container.position.set(truckX + 0.5, 0.7, 0);
    container.rotation.set(0, 0, 0);
    container.scale.setScalar(0.85);
    truck.userData.wheels.forEach(w => { w.rotation.x += 0.1; });

    groundMat.opacity = lerp(0, 0.9, s);
    grid.material.opacity = lerp(0, 0.08, s);
    ocean.material.opacity = 0;

    camera.position.set(lerp(2.5, -2, s), lerp(1.2, 2.2, s), lerp(5.5, 7, s));
    camera.lookAt(lerp(-1.5, -1, s), 0.5, 0);
  }
  // BEAT 2 → 3: Ocean. Truck drives off; ground → water; ship arrives.
  else if (t < 3) {
    const s = t - 2;
    truck.visible = true;
    ship.visible = true;

    const truckX = lerp(-1, -14, s);
    truck.position.set(truckX, -0.85, 0);
    container.position.set(truckX + 0.5, 0.7, 0);
    container.rotation.set(0, 0, 0);
    container.scale.setScalar(0.85);
    truck.userData.wheels.forEach(w => { w.rotation.x += 0.15; });

    ship.position.set(lerp(18, 2, s), -0.2, lerp(2, 0, s));
    ship.rotation.y = lerp(0.4, 0, s);

    const waterT = segT(s, 0.2, 0.8);
    groundMat.opacity = lerp(0.9, 0, waterT);
    grid.material.opacity = lerp(0.08, 0, waterT);
    ocean.material.opacity = lerp(0, 1, waterT);

    warehouse.visible = true;
    warehouse.position.x = lerp(-9, -30, s);

    camera.position.set(lerp(-2, 0, s), lerp(2.2, 3.5, s), lerp(7, 9, s));
    camera.lookAt(lerp(-1, 2, s), 0.5, 0);
  }
  // BEAT 3 → 4: Air. Ship sails; plane arcs overhead.
  else if (t < 4) {
    const s = t - 3;
    ship.visible = true;
    plane.visible = true;
    flightArc.visible = true;

    ship.position.set(lerp(2, 0, s), -0.2 + Math.sin(performance.now() * 0.0015) * 0.06, 0);

    flightArc.material.opacity = lerp(0, 0.35, segT(s, 0.1, 0.6));
    const planeT = clamp(s * 1.1, 0, 1);
    const pt = flightArc.userData.curve.getPointAt(planeT);
    const pt2 = flightArc.userData.curve.getPointAt(Math.min(1, planeT + 0.01));
    plane.position.copy(pt);
    plane.position.y += 0.5;
    plane.lookAt(pt2.x, pt2.y + 0.5, pt2.z);
    plane.rotateY(Math.PI / 2);
    plane.scale.setScalar(0.55);

    container.visible = false;
    ocean.material.opacity = 1;
    groundMat.opacity = 0;

    camera.position.set(lerp(0, 1, s), lerp(3.5, 4.5, s), lerp(9, 10, s));
    camera.lookAt(lerp(2, 0, s), lerp(0.5, 1.8, s), 0);
  }
  // BEAT 4: Arrival in Puerto Rico.
  else {
    const s = clamp(t - 4, 0, 1);
    ship.visible = true;
    plane.visible = s < 0.6;
    pr.visible = true;
    flightArc.visible = s < 0.5;

    if (plane.visible) {
      const planeT = clamp(0.9 + s * 0.15, 0, 1);
      const pt = flightArc.userData.curve.getPointAt(planeT);
      const pt2 = flightArc.userData.curve.getPointAt(Math.min(1, planeT + 0.01));
      plane.position.copy(pt);
      plane.position.y += 0.5 - s * 0.6;
      plane.lookAt(pt2.x, pt2.y + 0.5, pt2.z);
      plane.rotateY(Math.PI / 2);
    }

    const prY = lerp(-2.2, -0.8, segT(s, 0, 0.6));
    pr.position.set(lerp(6, 0, s), prY, lerp(-1, 0, s));
    pr.rotation.y = lerp(0.4, 0, s);
    pr.scale.setScalar(lerp(1.2, 1.4, s));

    ship.position.set(lerp(0, -4.5, s), -0.2 + Math.sin(performance.now() * 0.0015) * 0.04, lerp(0, 0.5, s));
    ship.rotation.y = lerp(0, 0.2, s);

    container.visible = false;

    camera.position.set(lerp(1, 0, s), lerp(4.5, 6, s), lerp(10, 9, s));
    camera.lookAt(lerp(0, 0, s), lerp(1.8, 0.5, s), 0);
  }

  // Ocean wave motion
  if (ocean.material.opacity > 0.01) {
    const pos = ocean.geometry.attributes.position;
    const base = ocean.userData.base;
    const tt = performance.now() * 0.0008;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      pos.array[i * 3 + 2] = Math.sin(x * 0.25 + tt) * 0.25 + Math.cos(y * 0.3 + tt * 1.2) * 0.15;
    }
    pos.needsUpdate = true;
    ocean.geometry.computeVertexNormals();
  }

  // Dust drift
  const dustPos = dust.geometry.attributes.position;
  for (let i = 0; i < dustPos.count; i++) {
    dustPos.array[i * 3 + 1] += 0.002;
    if (dustPos.array[i * 3 + 1] > 8) dustPos.array[i * 3 + 1] = 0;
  }
  dustPos.needsUpdate = true;
}

/* ==================== Render loop ==================== */
function tick() {
  scrollT += (targetT - scrollT) * 0.08;
  choreograph(scrollT);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

/* ==================== Resize ==================== */
function onResize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
new ResizeObserver(onResize).observe(canvas);

/* ==================== Rail progress ==================== */
const railFill = document.getElementById('journeyRailFill');
const railStops = document.querySelectorAll('.journey-rail__stops li');
function updateRail() {
  const pct = targetT / (NUM_BEATS - 1);
  if (railFill) railFill.style.height = (pct * 100) + '%';
  const active = Math.round(pct * (NUM_BEATS - 1));
  railStops.forEach((li, i) => li.classList.toggle('active', i === active));
}
window.addEventListener('scroll', updateRail, { passive: true });
updateRail();

choreograph(0);

}
})();
