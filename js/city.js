/* ======================= world constants ======================= */
const G = 9,
  B = G - 1,
  NODE = 22,
  ROAD = 8,
  LANE = 1.7,
  EXT = (G - 1) * NODE,
  SZ = NODE - ROAD;
const DX = [0, 1, 0, -1],
  DZ = [-1, 0, 1, 0];
const SPEEDS = [0.28, 0.42, 0.6];
const HOLD_MS = 800;
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
let RM = motionPreference.matches;
function rng(s) {
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let R = rng(1);
const valid = (x, y, d) => {
  const nx = x + DX[d],
    ny = y + DZ[d];
  return nx >= 0 && ny >= 0 && nx < G && ny < G;
};
function pos(o) {
  const bx = o.x * NODE + (o.moving ? DX[o.d] * o.p * NODE : 0),
    bz = o.y * NODE + (o.moving ? DZ[o.d] * o.p * NODE : 0);
  return [bx - DZ[o.d] * LANE, bz + DX[o.d] * LANE];
}
function gpsDir(x, y, tx, ty, cur) {
  const dx = tx - x,
    dy = ty - y;
  if (!dx && !dy) return -1;
  const ch = [];
  if (dx) ch.push({ d: dx > 0 ? 1 : 3, m: Math.abs(dx) });
  if (dy) ch.push({ d: dy > 0 ? 2 : 0, m: Math.abs(dy) });
  const keep = ch.find((c) => c.d === cur);
  if (keep) return keep.d;
  ch.sort((a, b) => b.m - a.m);
  return ch[0].d;
}
function farNode(fx, fy, min) {
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(Math.random() * G),
      y = Math.floor(Math.random() * G);
    if (Math.abs(x - fx) + Math.abs(y - fy) >= min) return [x, y];
  }
  return [0, 0];
}
let closed = new Set();
function canGo(x, y, d) {
  return valid(x, y, d) && !closed.has(edgeKey(x, y, d));
}
const bfsCache = new Map();
function bfsFrom(tx, ty) {
  const k = tx + "," + ty + "|" + [...closed].join(";");
  if (bfsCache.has(k)) return bfsCache.get(k);
  const D = new Array(G * G).fill(1e9);
  D[ty * G + tx] = 0;
  const q = [[tx, ty]];
  while (q.length) {
    const [x, y] = q.shift();
    for (let d = 0; d < 4; d++)
      if (canGo(x, y, d)) {
        const nx = x + DX[d],
          ny = y + DZ[d];
        if (D[ny * G + nx] > D[y * G + x] + 1) {
          D[ny * G + nx] = D[y * G + x] + 1;
          q.push([nx, ny]);
        }
      }
  }
  if (bfsCache.size > 200) bfsCache.clear();
  bfsCache.set(k, D);
  return D;
}
function moves(x, y, tx, ty) {
  return bfsFrom(tx, ty)[y * G + x];
}
function routeDir(x, y, tx, ty, cur) {
  if (x === tx && y === ty) return -1;
  const D = bfsFrom(tx, ty),
    h = D[y * G + x];
  if (h >= 1e9) return gpsDir(x, y, tx, ty, cur);
  const ok = [0, 1, 2, 3].filter((d) => canGo(x, y, d) && D[(y + DZ[d]) * G + x + DX[d]] === h - 1);
  return ok.includes(cur) ? cur : ok[0];
}
function connected() {
  const D = bfsFrom(0, 0);
  return D.every((v) => v < 1e9);
}
function edgeKey(x, y, d) {
  if (d === 3) return x - 1 + "," + y + ",1";
  if (d === 0) return x + "," + (y - 1) + ",2";
  return x + "," + y + "," + d;
}

/* ======================= themes ======================= */
const PALETTES = {
  neon: {
    name: "Neon sunset",
    sky: [0x150c2e, 0x7a2a78, 0xff9152],
    fog: 0x4a2460,
    hemi: [0xffd0ec, 0x241640, 1.0],
    sun: [0xffb37a, 0.9],
    win: 1,
    side: 0xb8a6d6,
    ground: 0x2a1d4c,
    road: 0x3a3550,
    b: [0xff6fb5, 0x5ee0d6, 0xffc86b, 0x9a7bff, 0xff8a5c, 0xf3e3c3, 0x7fd3ff, 0xc59bff],
    sunDisc: 0xffc35a,
  },
  beach: {
    name: "Sunny beach",
    sky: [0x2f86e8, 0x7cc4ff, 0xe8f6ff],
    fog: 0xcfeaff,
    hemi: [0xffffff, 0x88aa77, 1.15],
    sun: [0xfff1d6, 1.25],
    win: 0.25,
    side: 0xf2e2c8,
    ground: 0x8fc46a,
    road: 0x55566a,
    b: [0xffb3c7, 0x9be7d8, 0xffe08a, 0xc7b5ff, 0xffc49b, 0xffffff, 0xa8dcff, 0xb8f0a0],
    sunDisc: 0xfff6c0,
  },
  night: {
    name: "Midnight",
    sky: [0x02030f, 0x0b1640, 0x24306a],
    fog: 0x0b1238,
    hemi: [0x8899ff, 0x0a0a20, 0.65],
    sun: [0x8fa6ff, 0.45],
    win: 1.3,
    side: 0x6b6f99,
    ground: 0x10142e,
    road: 0x2a2c44,
    b: [0x3b4a8c, 0x5a3d8c, 0x2e6c8c, 0x8c3d6f, 0x445566, 0x6a5acd, 0x2f4f6f, 0x7a4a9a],
    sunDisc: 0xf0f0ff,
  },
};
const BLOCKS = {
  T: { name: "Tower", icon: "🏙️" },
  S: { name: "Shops", icon: "🏪" },
  H: { name: "Houses", icon: "🏠" },
  P: { name: "Park", icon: "🌳" },
  W: { name: "Pool", icon: "🏊" },
  Z: { name: "Plaza", icon: "⬜" },
  PZ: { name: "Pizza Palace", icon: "🍕", unique: 1 },
  MU: { name: "City Museum", icon: "🏛️", unique: 1 },
  HO: { name: "Hideout", icon: "🏚️", unique: 1 },
};
const GOODIES = {
  coins: { name: "Coins", icon: "🪙" },
  ramp: { name: "Stunt ramp", icon: "🛹" },
  boxes: { name: "Crates", icon: "📦" },
  cones: { name: "Cones", icon: "🚧" },
};
function makeLevel(id, name, theme, seed, opts = {}) {
  const r = rng(seed);
  const blocks = [];
  for (let by = 0; by < B; by++)
    for (let bx = 0; bx < B; bx++) {
      const c = Math.abs(bx - 3.5) + Math.abs(by - 3.5);
      const v = r();
      blocks.push(
        c < 2.2
          ? v < 0.75
            ? "T"
            : "S"
          : c < 4.2
            ? v < 0.3
              ? "T"
              : v < 0.6
                ? "S"
                : v < 0.75
                  ? "P"
                  : v < 0.85
                    ? "W"
                    : "Z"
            : v < 0.55
              ? "H"
              : v < 0.75
                ? "P"
                : v < 0.88
                  ? "W"
                  : "S",
      );
    }
  (
    opts.lm || [
      ["PZ", 1, 5],
      ["MU", 6, 1],
      ["HO", 6, 6],
    ]
  ).forEach(([c, x, y]) => (blocks[y * B + x] = c));
  const segs = {};
  for (let i = 0; i < (opts.goodies || 34); i++) {
    const x = Math.floor(r() * G),
      y = Math.floor(r() * G),
      d = r() < 0.5 ? 1 : 2;
    if (!valid(x, y, d)) continue;
    const v = r();
    segs[x + "," + y + "," + d] = v < 0.5 ? "coins" : v < 0.68 ? "ramp" : v < 0.85 ? "boxes" : "cones";
  }
  return { id, name, theme, blocks, segs, start: [4, 4], builtin: true };
}
const BUILTIN = [
  makeLevel("downtown", "Neon Downtown", "neon", 7),
  makeLevel("beach", "Palm Beach", "beach", 31, {
    lm: [
      ["PZ", 2, 6],
      ["MU", 5, 2],
      ["HO", 1, 1],
    ],
    goodies: 40,
  }),
  makeLevel("midnight", "Midnight Run", "night", 99, {
    lm: [
      ["PZ", 5, 5],
      ["MU", 2, 2],
      ["HO", 7, 0],
    ],
    goodies: 30,
  }),
];
function customLevels() {
  return load("switchcity-levels", []);
}
function allLevels() {
  return BUILTIN.concat(customLevels());
}
function findLevel(id) {
  return allLevels().find((l) => l.id === id) || BUILTIN[0];
}
function landmarkNode(level, code) {
  const i = level.blocks.indexOf(code);
  return i < 0 ? null : [i % B, Math.floor(i / B)];
}

/* ======================= scene ======================= */
const cv = $("#c"),
  mm = $("#mm"),
  mx = mm.getContext("2d");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
} catch (e) {
  $("#noGL").classList.remove("hide");
}
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x4a2460, 90, 300);
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 1200);
const hemi = new THREE.HemisphereLight(0xffd0ec, 0x241640, 1);
scene.add(hemi);
const sunL = new THREE.DirectionalLight(0xffb37a, 0.9);
sunL.castShadow = true;
sunL.shadow.mapSize.set(2048, 2048);
const sc = sunL.shadow.camera;
sc.left = -60;
sc.right = 60;
sc.top = 60;
sc.bottom = -60;
sc.near = 10;
sc.far = 260;
sunL.shadow.bias = -0.0006;
scene.add(sunL);
scene.add(sunL.target);
const skyGeo = new THREE.SphereGeometry(600, 32, 20);
const skyMesh = new THREE.Mesh(
  skyGeo,
  new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
);
scene.add(skyMesh);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(40, 48), basic(0xffc35a, { fog: false }));
sunDisc.position.set(-180, 60, -520);
sunDisc.lookAt(0, 0, 0);
skyMesh.add(sunDisc);
const starField = (() => {
  const g = new THREE.BufferGeometry(),
    p = [];
  for (let i = 0; i < 700; i++) {
    const a = Math.random() * Math.PI * 2,
      e = Math.random() * 1.3 + 0.1;
    p.push(Math.cos(a) * 560 * Math.cos(e), Math.sin(e) * 560, Math.sin(a) * 560 * Math.cos(e));
  }
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, fog: false }));
})();
skyMesh.add(starField);
function applyTheme(t) {
  const P = PALETTES[t];
  const p = skyGeo.attributes.position,
    cols = [];
  const top = new THREE.Color(P.sky[0]),
    mid = new THREE.Color(P.sky[1]),
    hor = new THREE.Color(P.sky[2]);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 600;
    const c =
      y > 0.18
        ? mid.clone().lerp(top, Math.min(1, (y - 0.18) / 0.6))
        : hor.clone().lerp(mid, Math.max(0, Math.min(1, (y + 0.02) / 0.2)));
    cols.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  scene.fog.color.setHex(P.fog);
  hemi.color.setHex(P.hemi[0]);
  hemi.groundColor.setHex(P.hemi[1]);
  hemi.intensity = P.hemi[2];
  sunL.color.setHex(P.sun[0]);
  sunL.intensity = P.sun[1];
  sunDisc.material.color.setHex(P.sunDisc);
  starField.visible = t === "night";
  sunDisc.position.y = t === "night" ? 200 : t === "beach" ? 260 : 60;
  cv.style.background = "#" + P.fog.toString(16).padStart(6, "0");
}

let level = null,
  city = null,
  blockGroups = [],
  goodies = {},
  peds = [],
  spinners = [],
  blinkers = [],
  museumDuck = null;
const WT = [];
function winTex(r) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const v = r();
      g.fillStyle = v < 0.42 ? "#ffcf86" : v < 0.56 ? "#86ecff" : v < 0.62 ? "#ff8fd0" : "#0c0818";
      g.fillRect(x * 16 + 3, y * 16 + 4, 10, 9);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
{
  const r = rng(5);
  for (let i = 0; i < 6; i++) WT.push(winTex(r));
}
const SHOPS = [
  "CAFE",
  "ARCADE",
  "RECORDS",
  "DONUTS",
  "GYM",
  "BURGERS",
  "COMICS",
  "FLOWERS",
  "RAMEN",
  "TACOS",
  "BAKERY",
  "GAMES",
];
const BILL = [
  "SWITCH FM",
  "DUCK INSURANCE",
  "DRIVE SAFE",
  "PIZZA PALACE",
  "VISIT THE MUSEUM",
  "RADIO 2-SWITCH",
];

function tower(par, x, z, w, d, h, color, P) {
  const r = R;
  const tex = (n) => {
    const t = WT[Math.floor(r() * WT.length)].clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, Math.round(n / 3.5)), Math.max(1, Math.round((h - 3) / 3.5)));
    return t;
  };
  const pod = box(w + 0.4, 3, d + 0.4, std(new THREE.Color(color).multiplyScalar(0.55)));
  pod.position.set(x, 1.8, z);
  par.add(pod);
  const shop = box(
    w + 0.5,
    1.5,
    d + 0.5,
    std(0x223040, {
      emissive: r() < 0.5 ? 0x66e0ff : 0xffc070,
      emissiveIntensity: 0.55 * P.win + 0.15,
      metalness: 0.5,
      roughness: 0.2,
    }),
  );
  shop.position.set(x, 1.4, z);
  shop.castShadow = false;
  par.add(shop);
  const aw = box(w + 0.9, 0.25, d + 0.9, std(P.b[Math.floor(r() * P.b.length)]));
  aw.position.set(x, 2.5, z);
  par.add(aw);
  const mk = (n) => {
    const m = std(color, {
      emissive: 0xffffff,
      emissiveMap: tex(n),
      emissiveIntensity: 0.9 * P.win,
      roughness: 0.55,
    });
    return m;
  };
  const roof = std(new THREE.Color(color).multiplyScalar(0.5));
  const sh = new THREE.Mesh(new THREE.BoxGeometry(w, h - 3, d), [mk(d), mk(d), roof, roof, mk(w), mk(w)]);
  sh.castShadow = sh.receiveShadow = true;
  sh.position.set(x, 3.3 + (h - 3) / 2, z);
  par.add(sh);
  let top = h + 0.3;
  if (h > 16 && r() < 0.7) {
    const th = h * 0.3;
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, th, d * 0.65), [
      mk(d * 0.65),
      mk(d * 0.65),
      roof,
      roof,
      mk(w * 0.65),
      mk(w * 0.65),
    ]);
    t2.castShadow = true;
    t2.position.set(x, top + th / 2, z);
    par.add(t2);
    top += th;
  }
  const v = r();
  if (v < 0.3) {
    const ant = cyl(0.08, 0.12, 6, 6, MAT.chrome);
    ant.position.set(x, top + 3, z);
    par.add(ant);
    const bl = glow(0xff2040, 3);
    bl.position.set(x, top + 6.1, z);
    par.add(bl);
    blinkers.push(bl);
  } else if (v < 0.55) {
    const tk = cyl(1, 1, 2, 12, std(0x8a6a4a));
    tk.position.set(x + w * 0.2, top + 1.4, z);
    par.add(tk);
    const cn = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.8, 12), std(0x6a4a3a));
    cn.position.set(x + w * 0.2, top + 2.8, z);
    par.add(cn);
    [-1, 1].forEach((s) => {
      const l = cyl(0.08, 0.08, 1, 4, MAT.dark);
      l.position.set(x + w * 0.2 + s * 0.7, top + 0.4, z);
      par.add(l);
    });
  } else if (v < 0.7) {
    const hp = cyl(Math.min(w, d) * 0.38, Math.min(w, d) * 0.38, 0.15, 24, std(0x333344));
    hp.position.set(x, top + 0.1, z);
    par.add(hp);
    const H = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: textTex("H", "#ffffff", null, 128, 128), transparent: true }),
    );
    H.rotation.x = -Math.PI / 2;
    H.position.set(x, top + 0.2, z);
    par.add(H);
  } else {
    const bb = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w, 8), 2.6, 0.25), [
      MAT.dark,
      MAT.dark,
      MAT.dark,
      MAT.dark,
      new THREE.MeshBasicMaterial({
        map: textTex(BILL[Math.floor(r() * BILL.length)], "#ffffff", "#ff4fa3", 512, 160),
      }),
      new THREE.MeshBasicMaterial({
        map: textTex(BILL[Math.floor(r() * BILL.length)], "#1d1238", "#2ad1c9", 512, 160),
      }),
    ]);
    bb.position.set(x, top + 2.2, z);
    bb.rotation.y = r() < 0.5 ? 0 : Math.PI / 2;
    par.add(bb);
    [-1, 1].forEach((s) => {
      const l = box(0.15, 1.2, 0.15, MAT.dark);
      l.position.set(
        x + s * Math.min(w, 8) * 0.35 * (bb.rotation.y ? 0 : 1),
        top + 0.6,
        z + s * Math.min(w, 8) * 0.35 * (bb.rotation.y ? 1 : 0),
      );
      par.add(l);
    });
  }
  if (r() < 0.5) {
    const rim = box(w + 0.2, 0.3, d + 0.2, basic(r() < 0.5 ? 0xff4fa3 : 0x2ad1c9));
    rim.position.set(x, h + 0.3, z);
    rim.castShadow = false;
    par.add(rim);
  }
}
function house(par, x, z, ang, color, P) {
  const g = new THREE.Group();
  const wl = box(5, 3.2, 4.4, std(color));
  wl.position.y = 1.9;
  g.add(wl);
  const rf = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.4, 4), std(R() < 0.5 ? 0xa0453a : 0x4a4a5a));
  rf.rotation.y = Math.PI / 4;
  rf.scale.set(1, 1, 0.9);
  rf.position.y = 4.7;
  rf.castShadow = true;
  g.add(rf);
  const dr = box(1, 1.8, 0.1, std(0x6a3a2a));
  dr.position.set(0, 1.2, 2.23);
  g.add(dr);
  [-1.5, 1.5].forEach((s) => {
    const wn = box(1, 0.9, 0.1, std(0x223344, { emissive: 0xffd890, emissiveIntensity: 0.5 * P.win }));
    wn.position.set(s, 2.2, 2.23);
    g.add(wn);
  });
  const ch = box(0.6, 1.4, 0.6, std(0x7a4a3a));
  ch.position.set(1.3, 5, -0.6);
  g.add(ch);
  g.position.set(x, 0.3, z);
  g.rotation.y = ang;
  par.add(g);
}
function shopUnit(par, x, z, ang, color, name, P) {
  const g = new THREE.Group();
  const b = box(5.4, 4.6, 4.6, std(color));
  b.position.y = 2.6;
  g.add(b);
  const win = box(
    4.4,
    1.8,
    0.12,
    std(0x203040, {
      emissive: 0xffd8a0,
      emissiveIntensity: 0.6 * P.win + 0.1,
      metalness: 0.4,
      roughness: 0.2,
    }),
  );
  win.position.set(0, 1.6, 2.33);
  g.add(win);
  const aw = box(5.6, 0.25, 1.3, std(P.b[Math.floor(R() * P.b.length)]));
  aw.position.set(0, 2.95, 2.9);
  aw.rotation.x = 0.25;
  g.add(aw);
  const sg = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 1.1),
    new THREE.MeshBasicMaterial({ map: textTex(name, "#ffffff", "#1d1238", 512, 128) }),
  );
  sg.position.set(0, 4.1, 2.32);
  g.add(sg);
  g.position.set(x, 0.3, z);
  g.rotation.y = ang;
  par.add(g);
}
function bench(par, x, z, a) {
  const g = new THREE.Group();
  const s = box(2.2, 0.15, 0.6, std(0x9a6a3a));
  s.position.y = 0.6;
  g.add(s);
  const bk = box(2.2, 0.6, 0.12, std(0x9a6a3a));
  bk.position.set(0, 1, -0.28);
  g.add(bk);
  g.position.set(x, 0.3, z);
  g.rotation.y = a;
  par.add(g);
}
function texMat(kind, color, rep) {
  const src = ASSETS.mats[kind];
  if (!src || !src.map) return std(color);
  const t = src.map.clone();
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep);
  return std(color, { map: t });
}
function treeAt(par, x, z, s = 1) {
  if (!ASSETS.tree) {
    roundTree(par, x, z, s);
    return;
  }
  const t = ASSETS.tree,
    m = t.mesh.clone();
  m.scale.setScalar((4.8 * s) / t.h);
  m.position.set(x, 0.3, z);
  m.rotation.y = Math.random() * 6;
  par.add(m);
}
function buildBlock(i) {
  const P = PALETTES[level.theme];
  const old = blockGroups[i];
  if (old) city.remove(old);
  const g = new THREE.Group();
  blockGroups[i] = g;
  city.add(g);
  const bx = i % B,
    by = Math.floor(i / B),
    cx = (bx + 0.5) * NODE,
    cz = (by + 0.5) * NODE,
    code = level.blocks[i];
  R = rng(1000 + i * 31 + code.length * 7 + code.charCodeAt(0));
  // Separate pavement and kerb tops; retain the 0.30 furnishing floor.
  const slab = box(SZ, 0.12, SZ, texMat("pave", P.side, 4));
  slab.position.set(cx, 0.24, cz);
  slab.castShadow = false;
  g.add(slab);
  const curb = box(SZ + 0.2, 0.24, SZ + 0.2, std(new THREE.Color(P.side).multiplyScalar(0.75)));
  curb.position.set(cx, 0.10, cz);
  curb.castShadow = false;
  g.add(curb);
  const pc = () => P.b[Math.floor(R() * P.b.length)];
  const I = SZ - 3;
  if ((code === "T" || code === "S") && ASSETS.buildings.length) {
    const L = ASSETS.buildings,
      half = Math.ceil(L.length / 2);
    const pool = code === "T" ? L.slice(0, half) : L.slice(half);
    const it = pool[Math.floor(R() * pool.length)] || L[0];
    const m = prefab(it, I + 1.5, Math.floor(R() * 4));
    m.position.set(cx, 0.3, cz);
    g.add(m);
    if (code === "T" && R() < 0.4) {
      const rim = glow(R() < 0.5 ? 0xff4fa3 : 0x2ad1c9, 8);
      rim.position.set(cx, (it.h * (I + 1.5)) / Math.max(it.w, it.d) + 2, cz);
      g.add(rim);
    }
  } else if (code === "T") {
    const split = Math.floor(R() * 3);
    const centre = Math.abs(bx - 3.5) + Math.abs(by - 3.5) < 2.2;
    const parts =
      split === 0
        ? [[0, 0, 1, 1]]
        : split === 1
          ? [
              [-0.25, 0, 0.5, 1],
              [0.25, 0, 0.5, 1],
            ]
          : [
              [-0.25, -0.25, 0.5, 0.5],
              [0.25, -0.25, 0.5, 0.5],
              [-0.25, 0.25, 0.5, 0.5],
              [0.25, 0.25, 0.5, 0.5],
            ];
    parts.forEach(([ox, oz, w, d]) =>
      tower(
        g,
        cx + ox * I,
        cz + oz * I,
        I * w - 1.2,
        I * d - 1.2,
        (8 + R() * 14) * (centre ? 1.8 : 1) * (split === 0 ? 1.25 : 1),
        pc(),
        P,
      ),
    );
  } else if (code === "S") {
    [
      [0, -I / 4, Math.PI],
      [0, I / 4, 0],
      [-I / 4, 0, -Math.PI / 2],
      [I / 4, 0, Math.PI / 2],
    ].forEach(([ox, oz, a]) =>
      shopUnit(g, cx + ox, cz + oz, a, pc(), SHOPS[Math.floor(R() * SHOPS.length)], P),
    );
  } else if (code === "H") {
    [
      [-I / 4, -I / 4, Math.PI],
      [I / 4, -I / 4, Math.PI],
      [-I / 4, I / 4, 0],
      [I / 4, I / 4, 0],
    ].forEach(([ox, oz, a]) => house(g, cx + ox, cz + oz, a, pc(), P));
    treeAt(g, cx, cz, 0.8);
  } else if (code === "P") {
    const gr = box(I + 1, 0.1, I + 1, texMat("grass", 0x9be08a, 3));
    gr.position.set(cx, 0.35, cz);
    gr.castShadow = false;
    g.add(gr);
    [0, 1].forEach((k) => {
      const pth = box(k ? 1.4 : I + 1, 0.12, k ? I + 1 : 1.4, std(0xe8d8b0));
      pth.position.set(cx, 0.37, cz);
      pth.castShadow = false;
      g.add(pth);
    });
    const f = cyl(2, 2.2, 0.8, 20, std(0xddd6e8));
    f.position.set(cx, 0.7, cz);
    g.add(f);
    const wt = cyl(1.7, 1.7, 0.1, 20, std(0x5ad0ff, { emissive: 0x1166aa, emissiveIntensity: 0.5 }));
    wt.position.set(cx, 1.12, cz);
    g.add(wt);
    const jet = cyl(0.15, 0.3, 2, 8, std(0xbfefff, { transparent: true, opacity: 0.7 }));
    jet.position.set(cx, 2, cz);
    g.add(jet);
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([a, b]) => {
      treeAt(g, cx + a * I * 0.3, cz + b * I * 0.3, 1);
      bench(g, cx + a * 2.6, cz + b * 3.6, b > 0 ? Math.PI : 0);
    });
  } else if (code === "W") {
    const dk = box(I + 1, 0.1, I + 1, std(0xf3e3c3));
    dk.position.set(cx, 0.36, cz);
    dk.castShadow = false;
    g.add(dk);
    const pl = box(
      I - 3,
      0.12,
      I - 4.5,
      std(0x3ec8f0, { emissive: 0x0b5a80, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.3 }),
    );
    pl.position.set(cx, 0.42, cz);
    pl.castShadow = false;
    g.add(pl);
    for (let k = 0; k < 4; k++) {
      const l = box(0.9, 0.25, 2, std(0xffffff));
      l.position.set(cx - I / 2 + 1.5 + k * 2.2, 0.55, cz + I / 2 - 0.8);
      g.add(l);
      if (k % 2 === 0) {
        const u = cyl(1.4, 0.05, 0.6, 8, std(k ? 0x2ad1c9 : 0xff4fa3));
        u.position.set(cx - I / 2 + 2.6 + k * 2.2, 2.6, cz + I / 2 - 1);
        g.add(u);
        const up = cyl(0.05, 0.05, 2.3, 4, MAT.chrome);
        up.position.set(cx - I / 2 + 2.6 + k * 2.2, 1.4, cz + I / 2 - 1);
        g.add(up);
      }
    }
    palm(g, cx - I / 2 + 0.8, cz - I / 2 + 0.8);
    palm(g, cx + I / 2 - 0.8, cz - I / 2 + 0.8, 0.9);
  } else if (code === "Z") {
    const t = box(I + 1, 0.08, I + 1, std(new THREE.Color(P.side).multiplyScalar(0.9)));
    t.position.set(cx, 0.34, cz);
    t.castShadow = false;
    g.add(t);
    const ped = box(2.2, 1.6, 2.2, std(0xddd6e8));
    ped.position.set(cx, 1.1, cz);
    g.add(ped);
    const st = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.2, 0.35, 64, 10),
      std(0xffc933, { metalness: 1, roughness: 0.25 }),
    );
    st.position.set(cx, 3.6, cz);
    st.castShadow = true;
    g.add(st);
    spinners.push([st, 0.4]);
    [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ].forEach(([a, b]) => {
      bench(g, cx + a * 4, cz + b * 4, Math.atan2(a, b) + Math.PI);
      treeAt(g, cx + a * 4.5 + b * 3, cz + b * 4.5 + a * 3, 0.7);
    });
  } else if (code === "PZ") {
    const b = box(I, 5.5, I - 2, std(0xd8433a));
    b.position.set(cx, 3, cz);
    g.add(b);
    const aw = box(I + 0.6, 0.3, I - 1.2, std(0xffffff));
    aw.position.set(cx, 4, cz);
    g.add(aw);
    const w = box(
      I + 0.1,
      1.8,
      I - 1.9,
      std(0x203040, { emissive: 0xffc070, emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.2 }),
    );
    w.position.set(cx, 1.8, cz);
    g.add(w);
    const pz = cyl(4.2, 4.2, 0.6, 32, std(0xffb84d, { emissive: 0x663300, emissiveIntensity: 0.4 }));
    pz.position.set(cx, 9.5, cz);
    pz.rotation.x = Math.PI / 2.6;
    g.add(pz);
    for (let k = 0; k < 7; k++) {
      const p = cyl(0.6, 0.6, 0.2, 12, std(0xb5281f));
      p.position.set(Math.cos(k * 0.9) * 2.4, 0.35, Math.sin(k * 1.7) * 2.4);
      pz.add(p);
    }
    spinners.push([pz, 0.6, "z"]);
    const s = labelSprite("PIZZA PALACE", "#ffffff", "#c22a2a", 1.1);
    s.position.set(cx, 15, cz);
    g.add(s);
  } else if (code === "MU") {
    const st = box(I + 1, 1, I, std(0xf3ead8));
    st.position.set(cx, 0.8, cz);
    g.add(st);
    const b = box(I - 1, 6, I - 3, std(0xeee3cc));
    b.position.set(cx, 4.3, cz);
    g.add(b);
    for (let k = 0; k < 6; k++) {
      const c = cyl(0.45, 0.5, 6, 12, std(0xffffff));
      c.position.set(cx - (I - 2) / 2 + (k * (I - 2)) / 5, 4.3, cz + (I - 3) / 2 + 0.6);
      g.add(c);
    }
    const rf = new THREE.Mesh(new THREE.ConeGeometry(I * 0.75, 3, 4), std(0xd8cdb4));
    rf.rotation.y = Math.PI / 4;
    rf.scale.set(1, 1, 0.75);
    rf.position.set(cx, 8.8, cz);
    rf.castShadow = true;
    g.add(rf);
    const duck = new THREE.Group();
    const gold = std(0xffcc33, { metalness: 1, roughness: 0.2, emissive: 0x553300, emissiveIntensity: 0.3 });
    const db = new THREE.Mesh(new THREE.SphereGeometry(1.5, 20, 14), gold);
    db.scale.set(1.3, 1, 1);
    duck.add(db);
    const dh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 14), gold);
    dh.position.set(1.1, 1.4, 0);
    duck.add(dh);
    const bk = box(0.9, 0.35, 0.6, std(0xff8a2a));
    bk.position.set(2.1, 1.3, 0);
    duck.add(bk);
    duck.position.set(cx, 12.5, cz);
    g.add(duck);
    museumDuck = duck;
    const dg = glow(0xffd23f, 9);
    dg.position.set(cx, 12.5, cz);
    g.add(dg);
    duck.userData.glow = dg;
    const s = labelSprite("CITY MUSEUM", "#1d1238", "#ffffff", 1.1);
    s.position.set(cx, 18, cz);
    g.add(s);
  } else if (code === "HO") {
    const b = box(I, 6, I - 2, std(0x5a5a68));
    b.position.set(cx, 3.3, cz);
    g.add(b);
    const dr = box(6, 4, 0.2, std(0xc8a040));
    dr.position.set(cx, 2.4, cz + (I - 2) / 2 + 0.05);
    g.add(dr);
    for (let k = 0; k < 5; k++) {
      const l = box(6, 0.12, 0.25, MAT.dark);
      l.position.set(cx, 0.8 + k * 0.8, cz + (I - 2) / 2 + 0.1);
      g.add(l);
    }
    [0xff4fa3, 0x2ad1c9, 0xffd23f].forEach((c, k) => {
      const gr = box(0.2, 2, 2.4, std(c, { emissive: c, emissiveIntensity: 0.3 }));
      gr.position.set(cx - I / 2 - 0.05, 3 + k * 0.3, cz - 3 + k * 3);
      g.add(gr);
    });
    const s = labelSprite("HIDEOUT", "#ffd23f", "#1d1238", 1);
    s.position.set(cx, 11, cz);
    g.add(s);
  }
}
function buildGoodie(key) {
  if (goodies[key]) city.remove(goodies[key].g);
  delete goodies[key];
  const item = level.segs[key];
  if (!item) return;
  const [x, y, d] = key.split(",").map(Number);
  const g = new THREE.Group();
  const ax = x * NODE,
    az = y * NODE,
    bx = (x + DX[d]) * NODE,
    bz = (y + DZ[d]) * NODE;
  const at = (t) => [ax + (bx - ax) * t, az + (bz - az) * t];
  const rot = d === 1 ? Math.PI / 2 : 0;
  const parts = [];
  if (item === "coins") {
    const cm = std(0xffd23f, { metalness: 1, roughness: 0.25, emissive: 0x664400, emissiveIntensity: 0.6 });
    [0.25, 0.375, 0.5, 0.625, 0.75].forEach((t) => {
      const [px, pz] = at(t);
      const c = new THREE.Group();
      const m = cyl(1, 1, 0.25, 20, cm);
      m.rotation.x = Math.PI / 2;
      c.add(m);
      const gl = glow(0xffe080, 4);
      c.add(gl);
      c.position.set(px, 2, pz);
      g.add(c);
      parts.push({ m: c, t, done: false });
    });
  } else if (item === "ramp") {
    const [px, pz] = at(0.5);
    const m = cyl(3.4, 3.4, ROAD - 0.8, 28, std(0xffd23f, { roughness: 0.5 }));
    if (d === 1) m.rotation.x = Math.PI / 2;
    else m.rotation.z = Math.PI / 2;
    m.position.set(px, -2.25, pz);
    m.receiveShadow = true;
    g.add(m);
    for (let k = -2; k <= 2; k++) {
      const s = box(d === 1 ? 0.5 : ROAD - 0.6, 0.05, d === 1 ? ROAD - 0.6 : 0.5, MAT.black);
      s.position.set(
        px + (d === 1 ? k * 1.1 : 0),
        Math.sqrt(Math.max(0, 3.4 * 3.4 - (k * 1.1) ** 2)) - 2.2,
        pz + (d === 2 ? k * 1.1 : 0),
      );
      s.castShadow = false;
      g.add(s);
    }
    const sg = labelSprite("JUMP!", "#1d1238", "#ffd23f", 0.6);
    sg.position.set(px, 5, pz);
    g.add(sg);
    parts.push({ t: 0.5 });
  } else if (item === "boxes") {
    const [px, pz] = at(0.5);
    const wm = std(0xb98a4a),
      wm2 = std(0x8a6030);
    [
      [0, 0, 0],
      [1.3, 0, 0],
      [-1.3, 0, 0],
      [0.6, 1.2, 0],
      [-0.6, 1.2, 0],
      [0, 2.4, 0],
    ].forEach(([a, b]) => {
      const c = box(1.2, 1.2, 1.2, (a + b) % 2 ? wm : wm2);
      c.position.set(px + (d === 2 ? a : 0), 0.9 + b, pz + (d === 1 ? a : 0));
      c.rotation.y = Math.random() * 0.3;
      g.add(c);
    });
    parts.push({ t: 0.5 });
  } else if (item === "cones") {
    const [px, pz] = at(0.5);
    for (let k = -2; k <= 2; k++) {
      const c = new THREE.Group();
      const cn = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 12), std(0xff6a1a));
      cn.position.y = 0.9;
      cn.castShadow = true;
      c.add(cn);
      const st = cyl(0.33, 0.4, 0.25, 12, MAT.white);
      st.position.y = 0.8;
      c.add(st);
      const bs = box(1, 0.15, 1, std(0xff6a1a));
      bs.position.y = 0.2;
      c.add(bs);
      c.position.set(px + (d === 2 ? k * 1.4 : 0), 0, pz + (d === 1 ? k * 1.4 : 0));
      g.add(c);
    }
    parts.push({ t: 0.5 });
  }
  city.add(g);
  goodies[key] = { g, item, parts, x, y, d, used: false, cool: 0 };
}
function buildLevel(lv) {
  level = JSON.parse(JSON.stringify(lv));
  if (city) scene.remove(city);
  city = new THREE.Group();
  scene.add(city);
  blockGroups = [];
  goodies = {};
  peds = [];
  spinners = [];
  blinkers = [];
  museumDuck = null;
  const P = PALETTES[level.theme];
  applyTheme(level.theme);
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), std(P.ground));
  gnd.rotation.x = -Math.PI / 2;
  gnd.position.set(EXT / 2, -0.06, EXT / 2);
  gnd.receiveShadow = true;
  city.add(gnd);
  const rd = new THREE.Mesh(
    new THREE.PlaneGeometry(EXT + ROAD + 4, EXT + ROAD + 4),
    std(P.road, { roughness: 0.9 }),
  );
  rd.rotation.x = -Math.PI / 2;
  rd.position.set(EXT / 2, 0, EXT / 2);
  rd.receiveShadow = true;
  city.add(rd);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(1600, 700),
    std(0x2b7fc8, { emissive: 0x0b3a66, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.4 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(EXT / 2, -0.04, EXT + 390);
  city.add(sea);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(1600, 40), std(0xf0c98a));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(EXT / 2, -0.03, EXT + ROAD / 2 + 22);
  sand.receiveShadow = true;
  city.add(sand);
  for (let k = 0; k < 12; k++) palm(city, -20 + k * 16, EXT + ROAD / 2 + 12 + (k % 2) * 8, 1.1);
  {
    const segs = [];
    for (let n = 0; n < G; n++)
      for (let t = 0; t < EXT; t += 4) {
        const l = t % NODE;
        if (l < ROAD / 2 + 1.5 || l > NODE - ROAD / 2 - 1.5) continue;
        segs.push([n * NODE, t + 1, 0], [t + 1, n * NODE, 1]);
      }
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 2.2), basic(0xffe9a8), segs.length);
    const m = new THREE.Object3D();
    segs.forEach(([x, z, r], i) => {
      m.position.set(x, 0.03, z);
      m.rotation.set(-Math.PI / 2, 0, r ? Math.PI / 2 : 0);
      m.updateMatrix();
      im.setMatrixAt(i, m.matrix);
    });
    city.add(im);
    const zs = [];
    for (let a = 0; a < G; a++)
      for (let b = 0; b < G; b++)
        for (let k = -3; k <= 3; k++) {
          zs.push(
            [a * NODE + k * 1.05, b * NODE - ROAD / 2 - 1.2, 0],
            [a * NODE + k * 1.05, b * NODE + ROAD / 2 + 1.2, 0],
            [a * NODE - ROAD / 2 - 1.2, b * NODE + k * 1.05, 1],
            [a * NODE + ROAD / 2 + 1.2, b * NODE + k * 1.05, 1],
          );
        }
    const zm = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.6, 2.2), basic(0xf4f0ff), zs.length);
    zs.forEach(([x, z, r], i) => {
      m.position.set(x, 0.025, z);
      m.rotation.set(-Math.PI / 2, 0, r ? Math.PI / 2 : 0);
      m.updateMatrix();
      zm.setMatrixAt(i, m.matrix);
    });
    city.add(zm);
  }
  for (let i = 0; i < B * B; i++) buildBlock(i);
  for (let a = 0; a < G; a++)
    for (let b = 0; b < G; b++)
      if ((a + b) % 2 === 0) {
        if (ASSETS.lamp) {
          const L = ASSETS.lamp,
            m = L.mesh.clone();
          m.scale.setScalar(6.5 / L.h);
          m.position.set(a * NODE + ROAD / 2 + 0.8, 0, b * NODE - ROAD / 2 - 0.8);
          city.add(m);
          const gl = glow(0xffd890, 5);
          gl.position.set(a * NODE + ROAD / 2 + 0.8, 6.2, b * NODE - ROAD / 2 - 0.8);
          city.add(gl);
        } else streetLamp(city, a * NODE + ROAD / 2 + 0.8, b * NODE - ROAD / 2 - 0.8, 0);
      }
  Object.keys(level.segs).forEach(buildGoodie);
  if (typeof buildStreetFurniture === "function") {
    buildStreetFurniture();
    buildClouds();
  }
  for (let k = 0; k < 26; k++) {
    const p = person();
    city.add(p);
    const bi = Math.floor(Math.random() * B * B);
    peds.push({
      m: p,
      bx: bi % B,
      by: Math.floor(bi / B),
      t: Math.random(),
      sp: (0.012 + Math.random() * 0.01) * (Math.random() < 0.5 ? 1 : -1),
    });
  }
}
function pedPos(p) {
  const cx = (p.bx + 0.5) * NODE,
    cz = (p.by + 0.5) * NODE,
    h = SZ / 2 - 0.7;
  const t = (((p.t % 1) + 1) % 1) * 4;
  const s = Math.floor(t),
    f = t - s;
  const c = [
    [-h, -h],
    [h, -h],
    [h, h],
    [-h, h],
  ];
  const a = c[s],
    b = c[(s + 1) % 4];
  return [
    cx + a[0] + (b[0] - a[0]) * f,
    cz + a[1] + (b[1] - a[1]) * f,
    Math.atan2(b[0] - a[0], b[1] - a[1]) * (p.sp > 0 ? 1 : -1) + (p.sp > 0 ? 0 : Math.PI),
  ];
}
