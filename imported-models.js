/* split a merged glTF mesh into separate objects (buildings, trees, props) */
function splitMesh(mesh, eps) {
  const geo = mesh.geometry.clone();
  geo.applyMatrix4(mesh.matrixWorld);
  const pos = geo.attributes.position,
    n = pos.count;
  const idx = geo.index ? geo.index.array : Array.from({ length: n }, (_, i) => i);
  const par = new Int32Array(n).map((_, i) => i);
  const f = (i) => {
    while (par[i] !== i) {
      par[i] = par[par[i]];
      i = par[i];
    }
    return i;
  };
  const u = (a, b) => {
    a = f(a);
    b = f(b);
    if (a !== b) par[a] = b;
  };
  const key = new Map();
  for (let i = 0; i < n; i++) {
    const k =
      Math.round(pos.getX(i) / eps) +
      "," +
      Math.round(pos.getY(i) / eps) +
      "," +
      Math.round(pos.getZ(i) / eps);
    if (key.has(k)) u(i, key.get(k));
    else key.set(k, i);
  }
  for (let t = 0; t < idx.length; t += 3) {
    u(idx[t], idx[t + 1]);
    u(idx[t], idx[t + 2]);
  }
  const comps = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const r = f(idx[t]);
    if (!comps.has(r)) comps.set(r, { tris: [], box: new THREE.Box3() });
    const c = comps.get(r);
    c.tris.push(t);
    for (let k = 0; k < 3; k++) c.box.expandByPoint(new THREE.Vector3().fromBufferAttribute(pos, idx[t + k]));
  }
  return { geo, idx, list: [...comps.values()] };
}
function clusterComps(list, gap) {
  const n = list.length,
    par = list.map((_, i) => i);
  const f = (i) => {
    while (par[i] !== i) i = par[i] = par[par[i]];
    return i;
  };
  const ex = list.map((c) => c.box.clone().expandByScalar(gap));
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) if (ex[i].intersectsBox(ex[j])) par[f(i)] = f(j);
  const out = new Map();
  list.forEach((c, i) => {
    const r = f(i);
    if (!out.has(r)) out.set(r, { parts: [], box: new THREE.Box3() });
    const o = out.get(r);
    o.parts.push(c);
    o.box.union(c.box);
  });
  return [...out.values()];
}
function subGeo(src, idx, tris) {
  const p = src.attributes.position,
    nm = src.attributes.normal,
    uv = src.attributes.uv;
  const P = [],
    N = [],
    U = [];
  tris.forEach((t) => {
    for (let k = 0; k < 3; k++) {
      const v = idx[t + k];
      P.push(p.getX(v), p.getY(v), p.getZ(v));
      if (nm) N.push(nm.getX(v), nm.getY(v), nm.getZ(v));
      if (uv) U.push(uv.getX(v), uv.getY(v));
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
  if (nm) g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  else g.computeVertexNormals();
  if (uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  return g;
}
/* ======================= imported models (CC BY 4.0, see Credits) ======================= */
const ASSETS = { taxi: null, buildings: [], tree: null, lamp: null, mats: {} };
function b64ToBuf(b) {
  const s = atob(b),
    u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u.buffer;
}
function loadAssets() {
  return new Promise((res) => {
    if (!THREE.GLTFLoader) {
      res();
      return;
    }
    const L = new THREE.GLTFLoader();
    let left = 2;
    const done = () => {
      if (--left === 0) res();
    };
    const onTaxi = (g) => {
        ASSETS.taxi = prepTaxi(g.scene);
        done();
      },
      onCity = (g) => {
        prepCity(g.scene);
        done();
      },
      fail = (e) => {
        console.warn(e);
        done();
      };
    try {
      if (typeof TAXI_GLTF !== "undefined") L.parse(JSON.stringify(TAXI_GLTF), "", onTaxi, fail);
      else L.load("assets/taxi/scene.gltf", onTaxi, undefined, fail);
    } catch (e) {
      done();
    }
    try {
      if (typeof CITY_GLB !== "undefined") L.parse(b64ToBuf(CITY_GLB), "", onCity, fail);
      else L.load("assets/city/modular_city_environment.glb", onCity, undefined, fail);
    } catch (e) {
      done();
    }
  });
}
function prepTaxi(root) {
  root.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(root),
    s = b.getSize(new THREE.Vector3()),
    c = b.getCenter(new THREE.Vector3());
  const k = 4.7 / s.x;
  const holder = new THREE.Group();
  root.position.set(-c.x, -b.min.y, -c.z);
  const scaler = new THREE.Group();
  scaler.add(root);
  scaler.scale.setScalar(k);
  scaler.rotation.y = Math.PI / 2;
  holder.add(scaler);
  holder.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      const m = o.material;
      if (m && m.color) {
        const h = m.color.getHSL({});
        if (h.s > 0.5 && h.h > 0.05 && h.h < 0.15) m.userData.paint = true;
      }
    }
  });
  return holder;
}
function makeTaxi(color) {
  if (!ASSETS.taxi) return makeVehicle("taxi", color);
  const g = new THREE.Group(),
    body = new THREE.Group();
  g.add(body);
  const m = ASSETS.taxi.clone(true);
  m.traverse((o) => {
    if (o.isMesh) {
      o.material = o.material.clone();
      if (
        o.material.userData.paint ||
        (o.material.color &&
          o.material.color.getHSL({}).s > 0.5 &&
          o.material.color.getHSL({}).h > 0.05 &&
          o.material.color.getHSL({}).h < 0.15)
      ) {
        o.material.color.setHex(color);
        o.material.metalness = 0.3;
        o.material.roughness = 0.35;
      }
    }
  });
  body.add(m);
  const hg = [-0.6, 0.6].map((x) => {
    const s = glow(0xfff2c0, 1.8);
    s.position.set(x, 0.75, -2.45);
    body.add(s);
    return s;
  });
  const sh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 5.2),
    basic(0x000000, { transparent: true, opacity: 0.3, depthWrite: false }),
  );
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.03;
  g.add(sh);
  g.userData = { body, wheels: [] };
  return g;
}
function prepCity(root) {
  root.updateMatrixWorld(true);
  const B3 = new THREE.Box3().setFromObject(root),
    S = B3.getSize(new THREE.Vector3());
  const W = Math.max(S.x, S.z);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const name = o.material.name || "";
    o.material.side = THREE.FrontSide;
    if (/Pavement/.test(name) || (/Grass/.test(name) && o.material.map) || /Plaza/.test(name)) {
      ASSETS.mats[/Pavement/.test(name) ? "pave" : /Grass/.test(name) ? "grass" : "plaza"] = o.material;
    }
    if (!/BuildingTextures|Grass/.test(name)) return;
    const sp = splitMesh(o, W * 1e-5),
      cl = clusterComps(sp.list, W * 0.004);
    cl.forEach((c) => {
      const s = c.box.getSize(new THREE.Vector3()),
        fx = (s.x / W) * 100,
        fy = (s.y / W) * 100,
        fz = (s.z / W) * 100;
      const tris = [].concat(...c.parts.map((p) => p.tris));
      const kind = /Grass/.test(name)
        ? fy > 2 && fx < 4
          ? "tree"
          : null
        : Math.max(fx, fz) > 4 && fy > 2.9
          ? "building"
          : fy > 5 && Math.max(fx, fz) > 2.5 && Math.min(fx, fz) < 0.7
            ? "lamp"
            : null;
      if (!kind) return;
      if (kind === "tree") return;
      if (kind === "lamp" && ASSETS.lamp) return;
      const geo = subGeo(sp.geo, sp.idx, tris);
      const ctr = c.box.getCenter(new THREE.Vector3());
      geo.translate(-ctr.x, -c.box.min.y, -ctr.z);
      const mesh = new THREE.Mesh(geo, o.material);
      mesh.castShadow = mesh.receiveShadow = true;
      const item = { mesh, w: s.x, h: s.y, d: s.z };
      if (kind === "building") ASSETS.buildings.push(item);
      else ASSETS[kind] = item;
    });
  });
  ASSETS.buildings.sort((a, b) => b.h / Math.max(a.w, a.d) - a.h / Math.max(b.w, b.d));
}
// place a prefab so its footprint fits size×size, rotated a quarter turn n times
function prefab(item, size, rot) {
  const m = item.mesh.clone();
  const k = size / Math.max(item.w, item.d);
  m.scale.setScalar(k);
  m.rotation.y = (rot * Math.PI) / 2;
  return m;
}
