const routeGroup = new THREE.Group();
scene.add(routeGroup);
const routeMat = basic(0xff4fa3, { transparent: true, opacity: 0.9 });
function buildRoute() {
  while (routeGroup.children.length) routeGroup.remove(routeGroup.children[0]);
  const r = game.nav && modeKey !== 'practice' ? [] : routeNodes();
  for (let i = 0; i < r.length - 1; i++) {
    const [ax, ay] = r[i],
      [bx, by] = r[i + 1];
    const d = bx > ax ? 1 : bx < ax ? 3 : by > ay ? 2 : 0;
    const ox = -DZ[d] * LANE,
      oz = DX[d] * LANE;
    for (let k = 1; k < 9; k++) {
      const t = k / 9;
      const m = new THREE.Mesh(chevGeo, routeMat);
      m.position.set(ax * NODE + (bx - ax) * NODE * t + ox, 0.08, ay * NODE + (by - ay) * NODE * t + oz);
      m.rotation.y = (-d * Math.PI) / 2;
      routeGroup.add(m);
    }
  }
}
const chevShape = new THREE.Shape();
chevShape.moveTo(0, 0.9);
chevShape.lineTo(1, 0);
chevShape.lineTo(0.55, 0);
chevShape.lineTo(0, 0.5);
chevShape.lineTo(-0.55, 0);
chevShape.lineTo(-1, 0);
chevShape.closePath();
const chevGeo = new THREE.ShapeGeometry(chevShape);
chevGeo.rotateX(-Math.PI / 2);
const arrowShape = new THREE.Shape();
arrowShape.moveTo(0, 1.8);
arrowShape.lineTo(1.6, 0);
arrowShape.lineTo(0.65, 0);
arrowShape.lineTo(0.65, -1.6);
arrowShape.lineTo(-0.65, -1.6);
arrowShape.lineTo(-0.65, 0);
arrowShape.lineTo(-1.6, 0);
arrowShape.closePath();
const arrowGeo = new THREE.ExtrudeGeometry(arrowShape, {
  depth: 0.35,
  bevelEnabled: true,
  bevelSize: 0.12,
  bevelThickness: 0.12,
  bevelSegments: 2,
});
arrowGeo.rotateX(-Math.PI / 2);
const arrows = [0, 1, 2, 3].map(() => {
  const m = new THREE.Mesh(
    arrowGeo,
    std(0xffffff, {
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.7,
      toneMapped: false,
    }),
  );
  m.visible = false;
  scene.add(m);
  return m;
});
const arrowLabels = {};
["STRAIGHT ON", "LEFT", "RIGHT", "TURN AROUND"].forEach((t) => {
  const s = labelSprite(t, "#1d1238", "#ffd23f", 0.55);
  s.visible = false;
  scene.add(s);
  arrowLabels[t] = s;
});
const brakeRing = new THREE.Group();
for (let i = 0; i < 16; i++) {
  const b = box(0.5, 0.15, 1, basic(0xff4fa3));
  const a = (i / 16) * Math.PI * 2;
  b.position.set(Math.cos(a) * 5, 0.15, Math.sin(a) * 5);
  b.rotation.y = -a;
  brakeRing.add(b);
}
brakeRing.visible = false;
scene.add(brakeRing);
function hideArrows() {
  arrows.forEach((a) => (a.visible = false));
  Object.values(arrowLabels).forEach((s) => (s.visible = false));
  brakeRing.visible = false;
  $("#focus").classList.add("hide");
}
const DIRWORD = {
  "straight on": ["Straight on", "STRAIGHT ON", "straight", "▲"],
  left: ["Turn left", "LEFT", "left", "◀"],
  right: ["Turn right", "RIGHT", "right", "▶"],
  "turn around": ["Turn around", "TURN AROUND", "around", "▼"],
};
window.onScanRender = (it, braked) => {
  const f = $("#focus");
  if (mode === "play" && !menuOpen() && !$("#bar").classList.contains("hide") && it) {
    f.textContent = it.focus || it.label || "";
    f.classList.remove("hide");
    f.classList.toggle("braked", braked);
  } else if (mode === "editor" && it && !$("#bar").classList.contains("hide")) {
    f.textContent = it.focus || it.label || "";
    f.classList.remove("hide");
    f.classList.toggle("braked", braked);
    if (it.hl) it.hl(); else hideEditorMarks();
  } else { f.classList.add("hide"); if (mode === "editor") hideEditorMarks(); }
};
let bT = null;
function banner(t, s) {
  $("#bTitle").textContent = t;
  $("#bSub").textContent = s;
  $("#banner").classList.add("show");
  clearTimeout(bT);
  bT = setTimeout(() => $("#banner").classList.remove("show"), 3000);
}
function stepWalker(o, dt, chooser) {
  if (!o.moving) return;
  o.p += dt;
  while (o.p >= 1) {
    o.x += DX[o.d];
    o.y += DZ[o.d];
    o.p -= 1;
    o.d = chooser(o);
  }
}
function segmentEvents() {
  if (!curSeg) return;
  const p = car.p,
    S = curSeg,
    [x, z] = pos(car);
  if (S.item === "coins") {
    S.parts.forEach((pt) => {
      if (pt.done) return;
      const tt = S.rev ? 1 - pt.t : pt.t;
      if (p >= tt) {
        pt.done = true;
        pt.m.visible = false;
        const k = S.parts.filter((q) => q.done).length - 1;
        sfx("coin" + Math.min(4, k), 0.9);
        burst(pt.m.position.x, 2, pt.m.position.z, [0xffd23f, 0xfff3a0], 8, 6, 0.7);
        roamCoins++;
        collect("coins", 10);
      }
    });
    if (S.parts.every((q) => q.done)) {
      S.used = true;
      S.cool = 6;
      curSeg = null;
    }
  } else if (S.item === "ramp") {
    if (!jump && p >= 0.38) {
      jump = {};
      sfx("jump");
    }
    if (jump && p >= 0.8) {
      jump = null;
      S.used = true;
      S.cool = 4;
      curSeg = null;
      sfx("land");
      burst(x, 0.5, z, [0xd8c8a8, 0xffffff], 18, 7, 0.8);
      banner("Stunt jump!", testing ? "Test drive" : "+$" + 100 * Math.min(5, 1 + combo));
      collect("ramp", 100);
    }
  } else if (p >= 0.46) {
    S.g.visible = false;
    S.used = true;
    S.cool = 5;
    curSeg = null;
    sfx("smash");
    const cols = S.item === "boxes" ? [0xb98a4a, 0x8a6030, 0xe0b070] : [0xff6a1a, 0xffffff];
    burst(x, 1.2, z, cols, 36, 12, 1.2);
    collect(S.item, 25);
  }
}

function wander(o) {
  const ch = [0, 1, 2, 3].filter((d) => d !== (o.d + 2) % 4 && canGo(o.x, o.y, d));
  return ch.length ? ch[Math.floor(Math.random() * ch.length)] : (o.d + 2) % 4;
}
/* ======================= editor ======================= */
let ed = null;
const hl = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  basic(0xffd23f, { transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }),
);
hl.visible = false;
scene.add(hl);
let hlLabel = null;
function hlAt(x, z, w, d, h, label) {
  hl.visible = true;
  hl.position.set(x, h / 2, z);
  hl.scale.set(w, h, d);
  if (hlLabel) {
    scene.remove(hlLabel);
    hlLabel = null;
  }
  if (label) {
    hlLabel = labelSprite(label, "#1d1238", "#ffd23f", 1.6);
    hlLabel.position.set(x, h + 12, z);
    scene.add(hlLabel);
  }
}
function hideEditorMarks() {
  hl.visible = false;
  if (hlLabel) {
    scene.remove(hlLabel);
    hlLabel = null;
  }
}
function editorMenu(keepId) {
  toMenuScene();
  const items = [
    {
      id: "new",
      label: "✨  New empty city",
      say: "New empty city",
      act: () => openEditor(blankLevel(), true),
    },
  ];
  BUILTIN.forEach((l) =>
    items.push({
      id: "copy" + l.id,
      label: "📋  Copy " + l.name,
      say: "Start from a copy of " + l.name,
      act: () => {
        const c = JSON.parse(JSON.stringify(l));
        delete c.builtin;
        c.id = null;
        c.name = nextName();
        openEditor(c, true);
      },
    }),
  );
  customLevels().forEach((l) =>
    items.push({
      id: "edit" + l.id,
      label: "✏️  Edit " + l.name,
      say: "Edit " + l.name,
      act: () => openEditor(JSON.parse(JSON.stringify(l)), false),
    }),
  );
  if (customLevels().length)
    items.push({ id: "del", label: "🗑️  Delete a city", say: "Delete a city", act: deleteMenu });
  items.push(
    {
      id: "share",
      label: "🔗  Share codes (needs a mouse)",
      say: "Share codes. Needs a mouse.",
      act: shareWarning,
    },
    { id: "back", label: "⬅️  Back", say: "Back", act: () => titleMenu("editor") },
  );
  showMenu("City editor", "Build your own city, then play it in any mode.", items, "City editor", keepId);
}
function deleteMenu(keepId) {
  const items = customLevels().map(l => ({
    id: "d" + l.id, label: "🗑️ Delete " + l.name, say: "Delete " + l.name,
    act: () => confirmChoice("Delete " + l.name + "?", "This cannot be undone.", "Delete city",
      () => {
        if (savedGame()?.levelId === l.id) {
          showMenu("City has a saved ride", "Finish or replace that ride before deleting this city.",
            [{id:"back",label:"Back",say:"Back",act:()=>deleteMenu("d"+l.id)}], "This city has a saved ride. Finish or replace it before deleting the city.");
          return;
        }
        if (!persistCities(customLevels().filter(x => x.id !== l.id))) {
          showMenu("Could not delete city", "Storage is unavailable. Your city was not deleted.",
            [{id:"back",label:"Back",say:"Back",act:()=>deleteMenu("d"+l.id)}], "Could not delete city");
          return;
        }
        editorMenu("del");
      },
      () => deleteMenu("d" + l.id)),
  }));
  items.push({ id: "back", label: "⬅️ Back", say: "Back", act: () => editorMenu("del") });
  showMenu("Delete a city", "", items, "Delete a city", keepId);
}
function shareWarning() {
  showMenu(
    "Warning",
    "The sharing screen needs a mouse and keyboard. You will not be able to scan and select with your switch there.",
    [
      { id: "cancel", label: "⬅️  Cancel", say: "Cancel. Go back.", act: () => editorMenu("share") },
      { id: "go", label: "🖱️  Continue (mouse needed)", say: "Continue. Mouse needed.", act: openShare },
    ],
    "Warning. The sharing screen needs a mouse and keyboard. You will not be able to scan and select with your switch there. Cancel. Continue.",
  );
}
const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))),
  dec = (s) => JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
function openShare() {
  Scan.close();
  hideMenu();
  $("#share").classList.remove("hide");
  $("#shareText").value =
    customLevels()
      .map((l) => l.name + "\n" + enc(l))
      .join("\n\n") || "You have no cities yet. Paste a code here and press Import.";
  $("#shMsg").textContent = "";
}
$("#shCopy").onclick = async () => {
  try { await navigator.clipboard.writeText($("#shareText").value); $("#shMsg").textContent = "Copied."; }
  catch (_) { $("#shareText").focus(); $("#shareText").select(); $("#shMsg").textContent = "Select and copy the code manually."; }
};
$("#shImport").onclick = () => {
  const lines = $("#shareText")
    .value.split(/\s+/)
    .filter((s) => s.length > 40);
  let n = 0;
  const list = customLevels();
  lines.forEach((s) => {
    try {
      const l = validateCity(dec(s));
      if (l) { l.id = newCityId(list); list.push(l); n++; }
    } catch (e) {}
  });
  if (n && !persistCities(list)) { $("#shMsg").textContent = "Could not save imported cities. Storage may be full."; return; }
  $("#shMsg").textContent = n ? `Imported ${n} cit${n > 1 ? "ies" : "y"}.` : "No valid code found.";
};
$("#shClose").onclick = () => {
  $("#share").classList.add("hide");
  editorMenu("share");
};
function nextName() {
  const names = new Set(customLevels().map(l => l.name));
  let n = 1;
  while (names.has("My City " + n)) n++;
  return "My City " + n;
}
function newCityId(list) {
  let id;
  do { id = "c" + Date.now() + "-" + Math.random().toString(36).slice(2, 10); }
  while (list.some(l => l.id === id));
  return id;
}
function validateCity(raw) {
  if (!raw || !Array.isArray(raw.blocks) || raw.blocks.length !== B * B ||
      !raw.blocks.every(k => Object.hasOwn(BLOCKS, k)) ||
      !Object.hasOwn(PALETTES, raw.theme) ||
      !Array.isArray(raw.start) || raw.start.length !== 2 ||
      !raw.start.every(n => Number.isInteger(n) && n >= 0 && n < G) ||
      !raw.segs || typeof raw.segs !== "object" || Array.isArray(raw.segs)) return null;
  const segs = {};
  for (const [key, value] of Object.entries(raw.segs)) {
    if (!/^\d,\d,[12]$/.test(key) || !Object.hasOwn(GOODIES, value)) return null;
    const [x,y,d] = key.split(",").map(Number);
    if (x >= G || y >= G || !valid(x,y,d)) return null;
    segs[key] = value;
  }
  const blocks = [...raw.blocks];
  for (const [key, spec] of Object.entries(BLOCKS)) {
    if (spec.unique && blocks.filter(k => k === key).length > 1) return null;
  }
  const name = typeof raw.name === "string" ? raw.name.replace(/[^\p{L}\p{N} .,'’_-]/gu, "").trim().slice(0, 60) : "";
  return { name: name || "Imported city", theme: raw.theme, blocks, segs, start: [...raw.start] };
}
function persistCities(list) {
  try { localStorage.setItem("switchcity-levels", JSON.stringify(list)); return true; }
  catch (_) { return false; }
}
function blankLevel() {
  return {
    id: null,
    name: nextName(),
    theme: "neon",
    blocks: Array(B * B).fill("Z"),
    segs: {},
    start: [4, 4],
  };
}
function openEditor(lv, isNew) {
  clearRoadworks();
  ed = { dirty: isNew };
  buildLevel(lv);
  spawnTraffic();
  mode = "editor";
  hideMenu();
  $("#hud").classList.remove("hide");
  updateHud();
  $("#stars").textContent = "";
  if (playerMesh) playerMesh.visible = false;
  beacon.visible = false;
  routeGroup.visible = false;
  editRoot("Editing " + level.name + ". Pick what to change.");
}
function edGroup(items, back, keep, speech) {
  $("#bar").classList.remove("hide");
  hints();
  Scan.enterGroup(items, $("#opts"), back, keep, speech);
  resize();
}
function editRoot(arg) {
  mode = "editor";
  hideMenu();
  hideArrows();
  hideEditorMarks();
  $("#hud").classList.remove("hide");
  if (playerMesh) playerMesh.visible = false;
  clearCops();
  clearWaiting();
  playerGlow.visible = false;
  beacon.visible = false;
  routeGroup.visible = false;
  updateHud();
  const P = PALETTES[level.theme];
  const keep = arg && arg.keep;
  const items = [
    { id: "block", label: "🏙️ Change a block", say: "Change a block", act: () => pickRow("block") },
    {
      id: "road",
      label: "🛣️ Change a road",
      say: "Change a road. Add coins, ramps or crates.",
      act: () => pickRow("road"),
    },
    { id: "start", label: "🚩 Set start", say: "Set where the cab starts", act: () => pickRow("start") },
    {
      id: "theme",
      label: "🎨 " + P.name,
      say: "Theme: " + P.name,
      act: () => {
        const k = Object.keys(PALETTES);
        level.theme = k[(k.indexOf(level.theme) + 1) % k.length];
        ed.dirty = true;
        buildLevel(level);
        spawnTraffic();
        Voice.speak("Theme: " + PALETTES[level.theme].name);
        editRoot({ keep: "theme" });
      },
    },
    {
      id: "test",
      label: "🚗 Test drive",
      say: "Test drive",
      act: () => {
        ed.draft = JSON.parse(JSON.stringify(level));
        testing = true;
        start("cruise", null, ed.draft);
      },
    },
    { id: "save", label: "💾 Save", say: "Save city", act: saveCity },
    { id: "done", label: "✅ Done", say: "Done. Leave the editor.", act: leaveEditor },
  ];
  $("#bar").classList.remove("hide");
  hints();
  Scan.open(items, $("#opts"), keep ? null : typeof arg === "string" ? arg : "Editor");
  if (keep) {
    Scan.setItems(items, keep);
    const it = items.find((x) => x.id === keep);
    if (it) Voice.speak(it.say);
  }
  resize();
}
function saveCity() {
  const list = customLevels();
  const data = validateCity(level);
  if (!data) { Voice.speak("City is invalid. Your changes have not been saved."); return false; }
  data.id = level.id || newCityId(list);
  const index = list.findIndex(l => l.id === data.id);
  if (index < 0) list.push(data); else list[index] = data;
  if (!persistCities(list)) { Voice.speak("Could not save city. Storage may be full. Your changes are still here."); return false; }
  level.id = data.id;
  ed.dirty = false;
  sfx("score");
  Voice.speak(level.name + " saved.");
  return true;
}
function leaveEditor() {
  if (!ed.dirty) {
    editorMenu(level.id ? "edit" + level.id : undefined);
    return;
  }
  showMenu(
    "Save your city?",
    "You have changes that are not saved.",
    [
      { id: "keep", label: "⬅️  Keep editing", say: "Keep editing", act: () => editRoot({ keep: "done" }) },
      {
        id: "save",
        label: "💾  Save and leave",
        say: "Save and leave",
        act: () => {
          if (saveCity()) editorMenu();
          else editRoot({ keep: "save" });
        },
      },
      { id: "lose", label: "🗑️  Leave without saving", say: "Leave without saving", act: () => confirmChoice("Discard changes?", "Unsaved changes will be lost.", "Discard changes", () => editorMenu(), leaveEditor) },
    ],
    "You have changes that are not saved. Keep editing. Save and leave. Leave without saving.",
  );
}
function pickRow(kind, keep) {
  const n = kind === "block" ? B : G;
  const items = [];
  for (let r = 0; r < n; r++) {
    const rr = r;
    items.push({
      id: "r" + r,
      label: "Row " + (r + 1),
      focus: "ROW " + (r + 1),
      say: "Row " + (r + 1),
      hl: () =>
        kind === "block"
          ? hlAt(EXT / 2, (rr + 0.5) * NODE, EXT, SZ, 3, "ROW " + (rr + 1))
          : hlAt(EXT / 2, rr * NODE, EXT + ROAD, ROAD, 1, "ROW " + (rr + 1)),
      act: () => (kind === "block" ? pickBlock(rr) : pickNode(rr, kind)),
    });
  }
  edGroup(items, () => editRoot({ keep: kind }), keep);
}
function pickBlock(row, keep) {
  const items = [];
  for (let c = 0; c < B; c++) {
    const i = row * B + c,
      ct = BLOCKS[level.blocks[i]];
    items.push({
      id: "b" + c,
      label: c + 1 + " " + ct.icon,
      focus: "BLOCK " + (c + 1) + "  " + ct.icon,
      say: "Block " + (c + 1) + ", " + ct.name,
      hl: () => hlAt((c + 0.5) * NODE, (row + 0.5) * NODE, SZ + 1, SZ + 1, 4, ct.name.toUpperCase()),
      act: () => pickType(i, row, c),
    });
  }
  edGroup(items, () => pickRow("block", "r" + row), keep);
}
function pickType(i, row, c) {
  const items = Object.entries(BLOCKS).map(([k, v]) => ({
    id: "t" + k,
    label: v.icon + " " + v.name,
    focus: v.icon + "  " + v.name.toUpperCase(),
    say: v.name,
    act: () => {
      if (v.unique) {
        const j = level.blocks.indexOf(k);
        if (j >= 0 && j !== i) {
          level.blocks[j] = "T";
          buildBlock(j);
        }
      }
      level.blocks[i] = k;
      buildBlock(i);
      ed.dirty = true;
      sfx("score");
      burst((c + 0.5) * NODE, 4, (row + 0.5) * NODE, [0xffd23f, 0xff4fa3, 0x2ad1c9], 30, 10);
      Voice.speak(v.name + " built.");
      pickBlock(row, "b" + c);
    },
  }));
  edGroup(items, () => pickBlock(row, "b" + c), "t" + level.blocks[i]);
}
function pickNode(row, kind, keep) {
  const items = [];
  for (let c = 0; c < G; c++) {
    items.push({
      id: "n" + c,
      label: "Junction " + (c + 1),
      focus: "JUNCTION " + (c + 1),
      say: "Junction " + (c + 1),
      hl: () => hlAt(c * NODE, row * NODE, ROAD, ROAD, 2, "JUNCTION " + (c + 1)),
      act: () => {
        if (kind === "start") {
          level.start = [c, row];
          ed.dirty = true;
          sfx("score");
          Voice.speak("The cab will start here.");
          editRoot({ keep: "start" });
        } else pickDir(c, row);
      },
    });
  }
  edGroup(items, () => pickRow(kind, "r" + row), keep);
}
const DNAME = ["North", "East", "South", "West"],
  DARR = ["▲", "▶", "▼", "◀"];
function pickDir(c, row, keep) {
  const items = [];
  [0, 1, 2, 3].forEach((d) => {
    if (!valid(c, row, d)) return;
    const k = edgeKey(c, row, d),
      it = level.segs[k];
    items.push({
      id: "d" + d,
      label: DARR[d] + " " + DNAME[d] + (it ? " " + GOODIES[it].icon : ""),
      focus: DARR[d] + "  " + DNAME[d].toUpperCase() + (it ? "  " + GOODIES[it].icon : ""),
      say: DNAME[d] + " road, " + (it ? GOODIES[it].name : "empty"),
      hl: () =>
        hlAt(
          c * NODE + (DX[d] * NODE) / 2,
          row * NODE + (DZ[d] * NODE) / 2,
          d % 2 ? NODE - ROAD : ROAD,
          d % 2 ? ROAD : NODE - ROAD,
          1.5,
          DNAME[d].toUpperCase() + " ROAD",
        ),
      act: () => pickGoodie(c, row, d),
    });
  });
  edGroup(items, () => pickNode(row, "road", "n" + c), keep);
}
function pickGoodie(c, row, d) {
  const k = edgeKey(c, row, d);
  const items = Object.entries(GOODIES).map(([g, v]) => ({
    id: "g" + g,
    label: v.icon + " " + v.name,
    focus: v.icon + "  " + v.name.toUpperCase(),
    say: v.name,
    act: () => {
      level.segs[k] = g;
      buildGoodie(k);
      ed.dirty = true;
      sfx("score");
      Voice.speak(v.name + " added.");
      pickDir(c, row, "d" + d);
    },
  }));
  items.push({
    id: "gnone",
    label: "❌ Nothing",
    focus: "❌  NOTHING",
    say: "Nothing. Clear this road.",
    act: () => {
      delete level.segs[k];
      buildGoodie(k);
      ed.dirty = true;
      Voice.speak("Road cleared.");
      pickDir(c, row, "d" + d);
    },
  });
  edGroup(items, () => pickDir(c, row, "d" + d), level.segs[k] ? "g" + level.segs[k] : "gnone");
}
// mouse/touch picking in the editor
const ray = new THREE.Raycaster(),
  ndc = new THREE.Vector2(),
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
cv.addEventListener("pointerdown", (e) => {
  if (mode !== "editor" || menuOpen()) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(plane, p)) return;
  const fx = p.x / NODE,
    fz = p.z / NODE;
  const bx = Math.floor(fx),
    by = Math.floor(fz),
    lx = fx - bx,
    lz = fz - by,
    m = ROAD / 2 / NODE;
  if (bx >= 0 && by >= 0 && bx < B && by < B && lx > m && lx < 1 - m && lz > m && lz < 1 - m) {
    pickType(by * B + bx, by, bx);
    hlAt(
      (bx + 0.5) * NODE,
      (by + 0.5) * NODE,
      SZ + 1,
      SZ + 1,
      4,
      BLOCKS[level.blocks[by * B + bx]].name.toUpperCase(),
    );
    return;
  }
  const nx = Math.round(fx),
    nz = Math.round(fz);
  if (Math.abs(fx - nx) < m) {
    const y = Math.floor(fz);
    if (nx >= 0 && nx < G && y >= 0 && y < B) {
      pickGoodie(nx, y, 2);
      hlAt(nx * NODE, (y + 0.5) * NODE, ROAD, NODE - ROAD, 1.5, "ROAD");
    }
  } else if (Math.abs(fz - nz) < m) {
    const x = Math.floor(fx);
    if (nz >= 0 && nz < G && x >= 0 && x < B) {
      pickGoodie(x, nz, 1);
      hlAt((x + 0.5) * NODE, nz * NODE, NODE - ROAD, ROAD, 1.5, "ROAD");
    }
  }
});

/* ======================= camera, minimap, loop ======================= */
let camSnap = true;
const camPos = new THREE.Vector3(),
  camLook = new THREE.Vector3();
function ease(o, dt) {
  const tgt = (-o.d * Math.PI) / 2;
  const d = ((((tgt - o.ang) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  o.ang += d * Math.min(1, dt * (RM ? 30 : 7));
}
function place(m, o) {
  const [x, z] = pos(o);
  m.position.set(x, 0, z);
  m.rotation.y = o.ang;
}
function updateCamera(dt, now) {
  let p, l;
  if (mode === "editor") {
    p = new THREE.Vector3(EXT / 2, 175, EXT + 95);
    l = new THREE.Vector3(EXT / 2, 0, EXT / 2 + 8);
  } else if (mode === "garage") {
    const a = RM ? 0.8 : (now / 1000) * 0.35;
    p = new THREE.Vector3(car.x * NODE + Math.cos(a) * 11, 4.5, car.y * NODE + Math.sin(a) * 11);
    l = new THREE.Vector3(car.x * NODE, 1.2, car.y * NODE);
  } else if (mode !== "play") {
    const a = RM ? 0.6 : (now / 1000) * 0.04;
    p = new THREE.Vector3(EXT / 2 + Math.cos(a) * 130, 80, EXT / 2 + Math.sin(a) * 130);
    l = new THREE.Vector3(EXT / 2, 0, EXT / 2);
  } else {
    const [x, z] = pos(car);
    const fx = -Math.sin(car.ang),
      fz = -Math.cos(car.ang);
    const waiting = !car.moving;
    const jh = playerMesh ? playerMesh.position.y : 0;
    if (RM) {
      // North-up camera: no turning with the taxi, no stunt bounce or zoom.
      p = new THREE.Vector3(x, 52, z + 0.01);
      l = new THREE.Vector3(x, 0, z);
    } else if (game.cam === 0) {
      p = new THREE.Vector3(
        x - fx * (waiting ? 13 : 11),
        (waiting ? 10 : 7) + jh * 0.6,
        z - fz * (waiting ? 13 : 11),
      );
      l = new THREE.Vector3(x + fx * 6, 1.5 + jh * 0.5, z + fz * 6);
    } else if (game.cam === 1) {
      p = new THREE.Vector3(x - fx * 14, 28, z - fz * 14);
      l = new THREE.Vector3(x + fx * 4, 0, z + fz * 4);
    } else {
      p = new THREE.Vector3(x, 52, z + 0.01);
      l = new THREE.Vector3(x, 0, z);
    }
  }
  if (camSnap || RM) {
    camPos.copy(p);
    camLook.copy(l);
    camSnap = false;
  } else {
    const k = Math.min(1, dt * 3);
    camPos.lerp(p, k);
    camLook.lerp(l, k);
  }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  skyMesh.position.copy(camPos);
  sunL.target.position.copy(camLook);
  sunL.position.set(camLook.x - 50, 90, camLook.z - 40);
  sunL.castShadow = game.gfx === 1;
}
function resize() {
  if (!renderer) return;
  const w = innerWidth,
    h = innerHeight;
  renderer.setPixelRatio(game.gfx ? Math.min(devicePixelRatio || 1, 2) : 1);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const barH = $("#bar").classList.contains("hide") ? 0 : $("#bar").offsetHeight;
  document.documentElement.style.setProperty("--barH", barH + "px");
  camera.setViewOffset(w, h, 0, barH ? barH * 0.45 + Math.min(140, h * 0.14) : 0, w, h);
  camera.updateProjectionMatrix();
  resizeFX(w, h);
}
addEventListener("resize", resize);
new ResizeObserver(resize).observe($("#bar"));
function applyMotion() {
  RM = !!game.motion || motionPreference.matches;
  document.documentElement.dataset.motion = RM ? "reduced" : "standard";
  camSnap = true;
  if (RM) setLights(0);
}
if (motionPreference.addEventListener) motionPreference.addEventListener("change", applyMotion);
else if (motionPreference.addListener) motionPreference.addListener(applyMotion);
applyMotion();
applyUI();
if (typeof installHubScan === 'function') installHubScan();
hints();
$("#menuSub").textContent = "Loading the city…";
if (!renderer) {
  $("#noGL").classList.add("hide");
  showMenu("3D graphics unavailable", "This browser could not start WebGL. Try another browser or enable hardware acceleration.",
    [{id:"exit",label:"Exit game",say:"Exit game",act:exitGame}], "3D graphics unavailable. Exit game.");
} else loadAssets().then(() => {
  setupFX();
  buildLevel(BUILTIN[0]);
  spawnTraffic();
  resize();
  titleMenu();
  requestAnimationFrame(loop);
}).catch(() => {
  showMenu("Could not load city", "Reload the page to try again, or exit.", [
    {id:"retry",label:"Try again",say:"Try again",act:()=>location.reload()},
    {id:"exit",label:"Exit game",say:"Exit game",act:exitGame}
  ], "Could not load city. Try again or exit.");
});
