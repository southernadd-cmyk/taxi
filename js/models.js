/* ======================= models ======================= */
const std = (c, o) =>
  new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0 }, o || {}));
const basic = (c, o) => new THREE.MeshBasicMaterial(Object.assign({ color: c, toneMapped: false }, o || {}));
const box = (w, h, d, mat) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const cyl = (rt, rb, h, seg, mat) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true;
  return m;
};
const MAT = {
  glass: std(0x1b2a44, { metalness: 0.7, roughness: 0.12 }),
  tire: std(0x151515, { roughness: 0.9 }),
  rim: std(0xd8d8e0, { metalness: 0.8, roughness: 0.25 }),
  dark: std(0x1a1a22),
  chrome: std(0xcccccc, { metalness: 0.9, roughness: 0.2 }),
  head: basic(0xfff6d0),
  tail: basic(0xff2a40),
  white: std(0xffffff),
  black: std(0x15121e),
};
const texCache = {};
function textTex(txt, fg, bg, w = 512, h = 128, font = "Bungee, Impact, sans-serif") {
  const k = txt + fg + bg + w + h;
  if (texCache[k]) return texCache[k];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  if (bg) {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
  }
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let fs = h * 0.62;
  g.font = `${fs}px ${font}`;
  while (g.measureText(txt).width > w * 0.9 && fs > 10) {
    fs -= 2;
    g.font = `${fs}px ${font}`;
  }
  g.fillText(txt, w / 2, h / 2 + fs * 0.05);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return (texCache[k] = t);
}
function labelSprite(txt, fg = "#1d1238", bg = "#ffd23f", scale = 1) {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 180;
  const g = c.getContext("2d");
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(8, 8, 624, 164, 40);
  g.fill();
  g.lineWidth = 12;
  g.strokeStyle = "#fff";
  g.stroke();
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  let fs = 110;
  g.font = `${fs}px Bungee, Impact, sans-serif`;
  while (g.measureText(txt).width > 580) {
    fs -= 4;
    g.font = `${fs}px Bungee, Impact, sans-serif`;
  }
  g.fillText(txt, 320, 96);
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      toneMapped: false,
      map: new THREE.CanvasTexture(c),
      depthTest: false,
      fog: false,
    }),
  );
  s.scale.set(11 * scale, 3.1 * scale, 1);
  s.renderOrder = 10;
  return s;
}
function emojiSprite(e, size = 5) {
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const g = c.getContext("2d");
  g.font = "128px serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(e, 80, 90);
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      toneMapped: false,
      map: new THREE.CanvasTexture(c),
      depthTest: false,
      fog: false,
    }),
  );
  s.scale.set(size, size, 1);
  s.renderOrder = 11;
  return s;
}
const glowTex = (() => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.3, "rgba(255,255,255,.5)");
  r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
function glow(color, size) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      toneMapped: false,
      map: glowTex,
      color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }),
  );
  s.scale.set(size, size, 1);
  return s;
}

/* ---------- vehicles ---------- */
function profileGeo(pts, width, bevel = 0.08) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]);
    else s.lineTo(p[0], p[1]);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 8,
  });
  g.translate(0, 0, -(width - bevel * 2) / 2);
  g.rotateY(Math.PI / 2);
  return g;
}
const VEHICLES = {
  hatch: { name: "Hatchback", price: 0 },
  sports: { name: "Sports car", price: 600 },
  van: { name: "Camper van", price: 1500 },
  monster: { name: "Monster truck", price: 3000 },
  icecream: { name: "Ice cream van", price: 5000 },
  gold: { name: "Golden supercar", price: 12000 },
};
function makeVehicle(type, color) {
  const g = new THREE.Group(),
    body = new THREE.Group();
  g.add(body);
  const paint = std(color, { metalness: 0.35, roughness: 0.32 });
  const W = type === "van" || type === "icecream" || type === "pizza" ? 2.4 : 2.2;
  let L = 4.4,
    wheelR = 0.44,
    wheelZ = 1.35,
    lift = 0;
  const addLights = (zf, zr, y) => {
    [-1, 1].forEach((s) => {
      const h = box(0.55, 0.22, 0.12, MAT.head);
      h.position.set(s * (W / 2 - 0.4), y, -zf);
      body.add(h);
      const gl = glow(0xfff2c0, 1.6);
      gl.position.set(s * (W / 2 - 0.4), y, -zf - 0.2);
      body.add(gl);
      const t = box(0.5, 0.2, 0.12, MAT.tail);
      t.position.set(s * (W / 2 - 0.4), y, zr);
      body.add(t);
    });
  };
  if (type === "sports" || type === "gold") {
    L = 4.6;
    const geo = profileGeo(
      [
        [-2.3, 0.3],
        [2.3, 0.3],
        [2.35, 0.55],
        [2.3, 0.75, 1.4, 0.85],
        [-2.1, 0.95],
        [-2.35, 0.85, -2.3, 0.55],
      ],
      W,
    );
    const m = new THREE.Mesh(geo, type === "gold" ? std(0xffc933, { metalness: 1, roughness: 0.2 }) : paint);
    m.castShadow = true;
    body.add(m);
    const cab = new THREE.Mesh(
      profileGeo(
        [
          [1.0, 0.85],
          [0.1, 1.35],
          [-1.0, 1.35],
          [-1.8, 0.95],
        ],
        W - 0.3,
        0.06,
      ),
      MAT.glass,
    );
    body.add(cab);
    const sp = box(W, 0.08, 0.5, MAT.dark);
    sp.position.set(0, 1.25, 1.95);
    body.add(sp);
    [-0.8, 0.8].forEach((x) => {
      const p = box(0.08, 0.35, 0.08, MAT.dark);
      p.position.set(x, 1.05, 1.95);
      body.add(p);
    });
    addLights(2.3, 2.3, 0.62);
    wheelZ = 1.45;
  } else if (type === "van" || type === "icecream" || type === "pizza") {
    L = 4.8;
    const geo = profileGeo(
      [
        [-2.4, 0.35],
        [2.4, 0.35],
        [2.45, 0.9],
        [2.3, 1.3, 1.6, 1.7],
        [1.3, 2.45],
        [-2.3, 2.5],
        [-2.45, 2.3],
        [-2.45, 0.6],
      ],
      W,
    );
    const m = new THREE.Mesh(geo, paint);
    m.castShadow = true;
    body.add(m);
    const ws = new THREE.Mesh(
      profileGeo(
        [
          [2.0, 1.45],
          [1.45, 2.25],
          [1.25, 2.25],
          [1.3, 1.45],
        ],
        W - 0.1,
        0.04,
      ),
      MAT.glass,
    );
    body.add(ws);
    [-1, 1].forEach((s) => {
      const sw = box(0.05, 0.5, 1.6, MAT.glass);
      sw.position.set(s * (W / 2 + 0.02), 1.85, -0.2);
      body.add(sw);
    });
    const stripe = box(W + 0.04, 0.25, 4.2, std(0xffffff));
    stripe.position.set(0, 1.1, 0.1);
    body.add(stripe);
    addLights(2.45, 2.45, 0.8);
    if (type === "icecream") {
      const cone = cyl(0.6, 0.05, 1.4, 12, std(0xd99b4a));
      cone.rotation.x = Math.PI;
      cone.position.set(0, 3.2, 0.2);
      body.add(cone);
      const sc = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), std(0xffb6d9));
      sc.position.set(0, 4.0, 0.2);
      body.add(sc);
    }
    if (type === "pizza") {
      const sign = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 0.15), [
        MAT.dark,
        MAT.dark,
        MAT.dark,
        MAT.dark,
        new THREE.MeshBasicMaterial({ map: textTex("PIZZA", "#ffd23f", "#c22a2a") }),
        new THREE.MeshBasicMaterial({ map: textTex("PIZZA", "#ffd23f", "#c22a2a") }),
      ]);
      sign.position.set(0, 2.9, 0);
      sign.rotation.y = Math.PI / 2;
      body.add(sign);
    }
  } else if (type === "monster") {
    lift = 0.9;
    wheelR = 0.95;
    wheelZ = 1.55;
    const geo = profileGeo(
      [
        [-2.2, 0.35],
        [2.2, 0.35],
        [2.3, 0.8],
        [2.2, 1.0, 1.4, 1.1],
        [-2.2, 1.1],
        [-2.3, 0.8],
      ],
      W,
    );
    const m = new THREE.Mesh(geo, paint);
    m.castShadow = true;
    body.add(m);
    const cab = new THREE.Mesh(
      profileGeo(
        [
          [1.2, 1.05],
          [0.6, 1.8],
          [-0.6, 1.8],
          [-0.8, 1.05],
        ],
        W - 0.2,
        0.06,
      ),
      MAT.glass,
    );
    body.add(cab);
    const roof = box(W - 0.25, 0.1, 1.25, paint);
    roof.position.set(0, 1.85, 0);
    body.add(roof);
    const bar = box(W + 0.2, 0.15, 0.15, MAT.chrome);
    bar.position.set(0, 1.95, -0.3);
    body.add(bar);
    addLights(2.3, 2.3, 0.8);
  } else {
    // hatch / sedan / taxi / police
    const geo = profileGeo(
      [
        [-2.2, 0.33],
        [2.2, 0.33],
        [2.27, 0.75],
        [2.2, 1.02, 1.5, 1.08],
        [-1.9, 1.12],
        [-2.27, 1.05, -2.25, 0.75],
      ],
      W,
    );
    const m = new THREE.Mesh(
      geo,
      type === "police" ? std(0xf4f4fa, { metalness: 0.3, roughness: 0.35 }) : paint,
    );
    m.castShadow = true;
    body.add(m);
    const cab = new THREE.Mesh(
      profileGeo(
        [
          [1.25, 1.06],
          [0.45, 1.72],
          [-1.0, 1.72],
          [-1.65, 1.1],
        ],
        W - 0.28,
        0.07,
      ),
      MAT.glass,
    );
    body.add(cab);
    const roof = box(W - 0.36, 0.09, 1.35, type === "police" ? MAT.white : paint);
    roof.position.set(0, 1.75, 0.28);
    body.add(roof);
    addLights(2.27, 2.27, 0.72);
    if (type === "police") {
      const door = box(W + 0.03, 0.5, 1.9, MAT.black);
      door.position.set(0, 0.72, 0.1);
      body.add(door);
      [-1, 1].forEach((s) => {
        const d = new THREE.Mesh(
          new THREE.PlaneGeometry(1.7, 0.42),
          new THREE.MeshBasicMaterial({
            map: textTex("POLICE", "#ffffff", null, 512, 128),
            transparent: true,
          }),
        );
        d.position.set(s * (W / 2 + 0.04), 0.75, 0.1);
        d.rotation.y = (s * Math.PI) / 2;
        body.add(d);
      });
      g.userData.red = basic(0xff2244);
      g.userData.blue = basic(0x2266ff);
      const r = box(0.75, 0.22, 0.4, g.userData.red);
      r.position.set(-0.42, 1.9, 0.28);
      body.add(r);
      const b = box(0.75, 0.22, 0.4, g.userData.blue);
      b.position.set(0.42, 1.9, 0.28);
      body.add(b);
      g.userData.rg = glow(0xff2244, 3.5);
      g.userData.rg.position.set(-0.5, 2.1, 0.28);
      body.add(g.userData.rg);
      g.userData.bg = glow(0x2266ff, 3.5);
      g.userData.bg.position.set(0.5, 2.1, 0.28);
      body.add(g.userData.bg);
    }
    if (type === "taxi") {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.5), [
        MAT.white,
        MAT.white,
        MAT.white,
        MAT.white,
        new THREE.MeshBasicMaterial({ map: textTex("TAXI", "#1d1238", "#fff6c0") }),
        new THREE.MeshBasicMaterial({ map: textTex("TAXI", "#1d1238", "#fff6c0") }),
      ]);
      s.position.set(0, 2.0, 0.3);
      s.rotation.y = Math.PI / 2;
      body.add(s);
      const ch = box(W + 0.03, 0.14, 3.2, MAT.black);
      ch.position.set(0, 0.85, 0);
      body.add(ch);
    }
  }
  const bump = box(W - 0.1, 0.22, 0.25, MAT.dark);
  bump.position.set(0, 0.42, -L / 2 - 0.02);
  body.add(bump);
  const bump2 = bump.clone();
  bump2.position.z = L / 2 + 0.02;
  body.add(bump2);
  [-1, 1].forEach((s) => {
    const mr = box(0.25, 0.15, 0.2, MAT.dark);
    mr.position.set(s * (W / 2 + 0.12), 1.15, -0.9);
    body.add(mr);
  });
  g.userData.wheels = [];
  [
    [1, -1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ].forEach(([sx, sz]) => {
    const w = new THREE.Group();
    const t = cyl(wheelR, wheelR, 0.42 * (type === "monster" ? 1.6 : 1), 18, MAT.tire);
    t.rotation.z = Math.PI / 2;
    w.add(t);
    const r = cyl(wheelR * 0.6, wheelR * 0.6, 0.44 * (type === "monster" ? 1.6 : 1), 12, MAT.rim);
    r.rotation.z = Math.PI / 2;
    w.add(r);
    w.position.set(sx * (W / 2 - 0.05 + (type === "monster" ? 0.25 : 0)), wheelR, sz * wheelZ);
    g.add(w);
    g.userData.wheels.push(w);
  });
  body.position.y = lift;
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 0.8, L + 0.8),
    basic(0x000000, { transparent: true, opacity: 0.3, depthWrite: false }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.03;
  g.add(sh);
  g.userData.body = body;
  return g;
}

/* ---------- props ---------- */
function palm(parent, x, z, s = 1) {
  const g = new THREE.Group();
  const tm = std(0x8a5a3c);
  let px = 0,
    py = 0;
  for (let i = 0; i < 6; i++) {
    const seg = cyl(0.22 * s, 0.28 * s, 1.1 * s, 7, tm);
    px += 0.08 * s * i;
    py += 1.05 * s;
    seg.position.set(px, py - 0.5 * s, 0);
    seg.rotation.z = -0.06 * i;
    g.add(seg);
  }
  const lm = std(0x2fae5e, { side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const f = new THREE.Group();
    const leaf = box(0.7 * s, 0.06 * s, 3.2 * s, lm);
    leaf.position.z = 1.5 * s;
    leaf.rotation.x = 0.45;
    f.add(leaf);
    f.position.set(px, py + 0.1, 0);
    f.rotation.y = a;
    g.add(f);
  }
  const co = new THREE.Mesh(new THREE.SphereGeometry(0.25 * s, 8, 6), std(0x5a3a22));
  co.position.set(px, py - 0.2, 0.2);
  g.add(co);
  g.position.set(x, 0.3, z);
  parent.add(g);
}
function roundTree(parent, x, z, s = 1) {
  const t = cyl(0.2 * s, 0.28 * s, 1.8 * s, 7, std(0x6b4630));
  t.position.set(x, 1.2 * s, z);
  parent.add(t);
  const lm = std(0x2a9a56);
  [
    [0, 2.8, 0, 1.3],
    [0.6, 2.4, 0.3, 0.95],
    [-0.5, 2.5, -0.3, 1],
    [0.1, 3.4, -0.2, 0.8],
  ].forEach(([a, b, c, r]) => {
    const s2 = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 0), lm);
    s2.castShadow = true;
    s2.position.set(x + a * s, b * s, z + c * s);
    parent.add(s2);
  });
}
function streetLamp(parent, x, z, ang) {
  const g = new THREE.Group();
  const pm = std(0x2b2447, { metalness: 0.5 });
  const p = cyl(0.12, 0.16, 6.5, 8, pm);
  p.position.y = 3.25;
  g.add(p);
  const arm = box(1.8, 0.14, 0.14, pm);
  arm.position.set(-0.9, 6.4, 0);
  g.add(arm);
  const bl = box(0.8, 0.22, 0.5, basic(0xfff0c0));
  bl.position.set(-1.7, 6.25, 0);
  g.add(bl);
  const gl = glow(0xffd890, 6);
  gl.position.set(-1.7, 6, 0);
  g.add(gl);
  g.position.set(x, 0, z);
  g.rotation.y = ang;
  parent.add(g);
}
function person() {
  const g = new THREE.Group();
  const r = Math.random;
  const skin = [0xf1c27d, 0xc68642, 0x8d5524, 0xe0ac69, 0x5c3a21, 0xffdbac][Math.floor(r() * 6)];
  const top = [0xff4fa3, 0x2ad1c9, 0xffd23f, 0x7a5cff, 0xff7a3c, 0xffffff, 0x3ccf6a, 0x1e88e5][
      Math.floor(r() * 8)
    ],
    legs = [0x2a2a40, 0x3b5b8f, 0x5a4632, 0x222222, 0x8a8a99][Math.floor(r() * 5)],
    hairC = [0x2b1a10, 0x5a3a1a, 0x111111, 0xd9b36b, 0xb0482a, 0xdddddd][Math.floor(r() * 6)];
  const S = std(skin, { roughness: 0.8 }),
    T = std(top, { roughness: 0.7 }),
    L = std(legs, { roughness: 0.8 });
  const mkLeg = (x) => {
    const p = new THREE.Group();
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.11, 0.82, 8), L);
    l.position.y = -0.41;
    l.castShadow = true;
    p.add(l);
    const sh = box(0.24, 0.14, 0.36, MAT.dark);
    sh.position.set(0, -0.84, 0.06);
    p.add(sh);
    p.position.set(x, 0.95, 0);
    return p;
  };
  const l1 = mkLeg(-0.14),
    l2 = mkLeg(0.14);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.22, 0.78, 10), T);
  t.position.y = 1.36;
  t.castShadow = true;
  const hip = box(0.46, 0.18, 0.28, L);
  hip.position.y = 0.98;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.12, 8), S);
  neck.position.y = 1.81;
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 10), S);
  h.position.y = 2.0;
  h.castShadow = true;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.245, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    std(hairC, { roughness: 0.9 }),
  );
  hair.position.y = 2.03;
  hair.rotation.x = -0.25;
  const mkArm = (x) => {
    const p = new THREE.Group();
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.7, 8), T);
    a.position.y = -0.35;
    p.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), S);
    hand.position.y = -0.72;
    p.add(hand);
    p.position.set(x, 1.7, 0);
    return p;
  };
  const a1 = mkArm(-0.36),
    a2 = mkArm(0.36);
  g.add(l1, l2, hip, t, neck, h, hair, a1, a2);
  g.userData = { l1, l2, a1, a2 };
  return g;
}
/* ---------- particles ---------- */
const particles = [];
const partGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
function burst(x, y, z, colors, n = 24, spd = 8, size = 1) {
  if (RM) return;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(partGeo, basic(colors[i % colors.length]));
    m.scale.setScalar(size * (0.5 + Math.random()));
    m.position.set(x, y, z);
    scene.add(m);
    particles.push({
      m,
      v: new THREE.Vector3(
        (Math.random() - 0.5) * spd,
        Math.random() * spd * 0.9 + 2,
        (Math.random() - 0.5) * spd,
      ),
      r: new THREE.Vector3(Math.random() * 8, Math.random() * 8, 0),
      life: 1.4 + Math.random() * 0.6,
    });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (RM) { scene.remove(p.m); p.m.material.dispose(); particles.splice(i, 1); continue; }
    p.v.y -= 18 * dt;
    p.m.position.addScaledVector(p.v, dt);
    if (p.m.position.y < 0.2) {
      p.m.position.y = 0.2;
      p.v.y *= -0.35;
      p.v.x *= 0.7;
      p.v.z *= 0.7;
    }
    p.m.rotation.x += p.r.x * dt;
    p.m.rotation.y += p.r.y * dt;
    if (p.life < 0.4) p.m.scale.multiplyScalar(0.9);
    if (p.life <= 0) {
      scene.remove(p.m);
      p.m.material.dispose();
      particles.splice(i, 1);
    }
  }
}
