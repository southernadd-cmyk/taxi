/* ======================= visual quality: bloom, shared car model, street furniture, clouds ======================= */
let composer = null,
  bloomPass = null,
  gradePass = null,
  fxaaPass = null,
  copOutline = null,
  targetOutline = null;
// colour grade: a touch more saturation and contrast, and a gentle dark edge so the centre stands out
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.12 },
    contrast: { value: 1.06 },
    vignette: { value: 0.28 },
  },
  vertexShader:
    "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
  fragmentShader:
    "uniform sampler2D tDiffuse;uniform float saturation,contrast,vignette;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.2126,.7152,.0722));c.rgb=mix(vec3(l),c.rgb,saturation);c.rgb=(c.rgb-.5)*contrast+.5;vec2 d=vUv-.5;c.rgb*=1.0-vignette*smoothstep(.35,.85,length(d*vec2(1.2,1.0)));gl_FragColor=vec4(clamp(c.rgb,0.,1.),c.a);}",
};
function setupFX() {
  if (!renderer) return;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  if (!THREE.EffectComposer || !THREE.UnrealBloomPass) return;
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  // outlines: police in red, the passenger you are heading for in gold. Both show through buildings, dimmer.
  if (THREE.OutlinePass) {
    const mk = (vis, hid) => {
      const o = new THREE.OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
      o.visibleEdgeColor.set(vis);
      o.hiddenEdgeColor.set(hid);
      o.edgeStrength = 10;
      o.edgeGlow = 1.2;
      o.edgeThickness = 4;
      composer.addPass(o);
      return o;
    };
    copOutline = mk(0xff2a40, 0x991525);
    targetOutline = mk(0xffd23f, 0x8a6d10);
  }
  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.2, 0.3, 0.96);
  composer.addPass(bloomPass);
  if (THREE.ShaderPass) {
    gradePass = new THREE.ShaderPass(GradeShader);
    composer.addPass(gradePass);
    // the post-processing chain loses the browser's own edge smoothing, so FXAA puts it back
    if (THREE.FXAAShader) {
      fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
      composer.addPass(fxaaPass);
    }
  }
}
const EXPO = { neon: 0.88, beach: 0.6, night: 1.05 },
  BLOOM = { neon: 0.2, beach: 0.06, night: 0.3 };
function renderFrame() {
  if (!renderer) return;
  const th = level && level.theme;
  renderer.toneMappingExposure = EXPO[th] || 0.88;
  if (composer && game.gfx === 1) {
    bloomPass.strength = BLOOM[th] ?? 0.2;
    updateOutlines();
    if (gradePass) gradePass.uniforms.vignette.value = mode === "play" ? 0.28 : 0.15;
    composer.render();
  } else renderer.render(scene, camera);
}
function resizeFX(w, h) {
  if (!composer) return;
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  if (fxaaPass) {
    const pr = renderer.getPixelRatio();
    fxaaPass.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
  }
}

// the imported taxi, repainted for traffic and police so every car on the road shares one style
const PAINT_PARTS = ["Material.004", "Material.009"];
function makeSedan(color, kind) {
  if (!ASSETS.taxi) return makeVehicle(kind === "police" ? "police" : "hatch", color);
  const g = new THREE.Group(),
    body = new THREE.Group();
  g.add(body);
  const m = ASSETS.taxi.clone(true);
  m.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    const n = o.material.name;
    if (PAINT_PARTS.includes(n)) {
      o.material.color.setHex(kind === "police" ? 0xf2f4fa : color);
      o.material.metalness = 0.35;
      o.material.roughness = 0.35;
    }
    if (o.name === "Object_18") o.visible = false; // roof taxi sign
    if (kind === "police" && n === "Material.006") o.material.color.setHex(0x101426);
  });
  body.add(m);
  if (kind === "police") {
    g.userData.red = basic(0xff2244);
    g.userData.blue = basic(0x2266ff);
    const base = box(1.3, 0.12, 0.42, MAT.dark);
    base.position.set(0, 1.78, 0.1);
    body.add(base);
    const r = box(0.6, 0.2, 0.38, g.userData.red);
    r.position.set(-0.32, 1.92, 0.1);
    body.add(r);
    const bl = box(0.6, 0.2, 0.38, g.userData.blue);
    bl.position.set(0.32, 1.92, 0.1);
    body.add(bl);
    g.userData.rg = glow(0xff2244, 4);
    g.userData.rg.position.set(-0.4, 2.1, 0.1);
    body.add(g.userData.rg);
    g.userData.bg = glow(0x2266ff, 4);
    g.userData.bg.position.set(0.4, 2.1, 0.1);
    body.add(g.userData.bg);
    [-1, 1].forEach((s) => {
      const d = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 0.42),
        new THREE.MeshBasicMaterial({ map: textTex("POLICE", "#ffffff", null, 512, 128), transparent: true }),
      );
      d.position.set(s * 0.885, 0.98, 0.1);
      d.rotation.y = (s * Math.PI) / 2;
      body.add(d);
    });
  }
  [-0.62, 0.62].forEach((x) => {
    const s = glow(0xfff2c0, 1.6);
    s.position.set(x, 1.05, -2.3);
    body.add(s);
  });
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 5),
    basic(0x000000, { transparent: true, opacity: 0.32, depthWrite: false }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.03;
  g.add(sh);
  g.userData.body = body;
  g.userData.wheels = [];
  return g;
}

// traffic lights on one corner of every junction, drawn with instancing so they cost almost nothing
let lightRig = null;
function buildStreetFurniture() {
  if (lightRig) {
    lightRig.forEach((m) => city.remove(m));
  }
  lightRig = [];
  const spots = [];
  for (let a = 0; a < G; a++)
    for (let b = 0; b < G; b++)
      if ((a + b) % 2 === 1) spots.push([a * NODE - ROAD / 2 - 0.8, b * NODE + ROAD / 2 + 0.8, a, b]);
  const n = spots.length,
    o = new THREE.Object3D();
  const pole = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.13, 0.16, 5.2, 8),
    std(0x22202e, { metalness: 0.5, roughness: 0.4 }),
    n,
  );
  const head = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.55, 1.5, 0.5),
    std(0x15141c, { roughness: 0.6 }),
    n,
  );
  const lamp = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.17, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    n * 3,
  );
  spots.forEach(([x, z], i) => {
    o.rotation.set(0, 0, 0);
    o.position.set(x, 2.6, z);
    o.updateMatrix();
    pole.setMatrixAt(i, o.matrix);
    o.position.set(x, 5.6, z);
    o.updateMatrix();
    head.setMatrixAt(i, o.matrix);
    [0, 1, 2].forEach((k) => {
      o.position.set(x + 0.28, 6.05 - k * 0.45, z);
      o.updateMatrix();
      lamp.setMatrixAt(i * 3 + k, o.matrix);
    });
  });
  [pole, head].forEach((m) => {
    m.castShadow = true;
    city.add(m);
    lightRig.push(m);
  });
  city.add(lamp);
  lightRig.push(lamp);
  lightRig.lamps = lamp;
  lightRig.count = n;
  setLights(0);
}
const TL_COLS = [
  [0xff3030, 0x302010, 0x103010],
  [0x401010, 0xffb020, 0x103010],
  [0x401010, 0x302010, 0x30ff60],
];
function setLights(t) {
  if (!lightRig || !lightRig.lamps) return;
  const L = lightRig.lamps,
    c = new THREE.Color();
  for (let i = 0; i < lightRig.count; i++) {
    const ph = (t + i) % 3;
    for (let k = 0; k < 3; k++) {
      c.setHex(TL_COLS[ph === 0 ? 0 : ph === 1 ? 2 : 1][k]);
      L.setColorAt(i * 3 + k, c);
    }
  }
  if (L.instanceColor) L.instanceColor.needsUpdate = true;
}

// soft clouds on the horizon
let cloudGroup = null;
function buildClouds() {
  if (cloudGroup) skyMesh.remove(cloudGroup);
  cloudGroup = new THREE.Group();
  const theme = level ? level.theme : "neon";
  const col = theme === "beach" ? 0xffffff : theme === "night" ? 0x2a3466 : 0xffb0c8;
  const op = theme === "night" ? 0.35 : 0.55;
  const r = rng(77);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2,
      e = 0.08 + r() * 0.22,
      d = 520;
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: col,
        transparent: true,
        opacity: op * (0.5 + r() * 0.5),
        depthWrite: false,
        fog: false,
      }),
    );
    s.position.set(Math.cos(a) * d * Math.cos(e), Math.sin(e) * d, Math.sin(a) * d * Math.cos(e));
    s.scale.set(140 + r() * 160, 40 + r() * 40, 1);
    cloudGroup.add(s);
  }
  skyMesh.add(cloudGroup);
}

function updateOutlines() {
  if (!copOutline) return;
  const on = game.outline !== 0 && mode === "play";
  copOutline.enabled = on && copMeshes.length > 0;
  copOutline.selectedObjects = on ? copMeshes.filter((m) => m.visible) : [];
  let tgt = [];
  if (on && shift) {
    const t = currentTarget();
    if (t && t.kind === "pick" && t.ref.g) tgt = [t.ref.g.children[0]];
  }
  targetOutline.enabled = tgt.length > 0;
  targetOutline.selectedObjects = tgt;
  // a slow pulse on the police outline, unless reduced motion is on
  copOutline.pulsePeriod = RM ? 0 : 2;
}
