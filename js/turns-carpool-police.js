/* ======================= turn-based shift: carpool, police, dares, nitro ======================= */
// Every junction is one turn. When the cab moves one block, every police car moves one block and
// every passenger loses one move of patience. Nothing happens between turns, so nothing is timed.
const MODES = {
  shift: { name: "Taxi shift" },
  daily: { name: "Daily challenge" },
  cruise: { name: "Cruise", roam: true },
  practice: { name: "Driving practice" },
};
const PICKUP_LINES = [
  "Take me to {d}, and step on it!",
  "{d}, please. I am late!",
  "Hey cabbie! {d}. Make it exciting!",
  "{d}. And do not spare the horses!",
  "Quick! {d}! My soup is getting cold.",
  "{d}. I hear you are the best in town.",
];
const THANKS = [
  "Wow! What a ride!",
  "Best cab in the city!",
  "Keep the change.",
  "I am never taking the bus again.",
  "My hair is a mess. Five stars!",
];
const SEATS = 3,
  MAX_STRIKES = 3,
  SPOT = [0, 2, 3];
let mode = "menu",
  modeKey = "shift",
  shift = null,
  waiting = [],
  cops = [],
  copMeshes = [],
  heat = 0,
  evade = 0,
  turnNo = 0,
  turn = null,
  targetPick = null,
  nitroArmed = false,
  pendingDares = [];
let autoT = null,
  resetArmed = false,
  combo = 0,
  segHad = false,
  curSeg = null,
  jump = null,
  testing = false,
  roamCoins = 0,
  buyArmed = null,
  restartArmed = false,
  workGroup = null;
let rand = Math.random;
const TIPS = load("switchcity-tips", {});
let tipQueue = [];
function tip(id, text) {
  if (testing || modeKey === "practice" || TIPS[id]) return;
  TIPS[id] = 1;
  store("switchcity-tips", TIPS);
  tipQueue.push("Tip: " + text);
}
function takeTips() {
  return tipQueue.splice(0).join(" ");
}
const car = { x: 4, y: 4, d: 0, p: 0, moving: false, ang: 0 };
let playerMesh = null;
const playerGlow = new THREE.PointLight(0xffc040, 1.1, 16);
scene.add(playerGlow);
const nodeEq = (a, x, y) => a && a[0] === x && a[1] === y;
const cap = (s) => s.replace(/^./, (c) => c.toUpperCase());
const shortName = (s) => cap(s.replace(/^the /, ""));

/* ---------- places and waiting passengers ---------- */
function places() {
  const out = [];
  const nm = {
    PZ: "Pizza Palace",
    MU: "the City Museum",
    HO: "the Hideout",
    P: "the park",
    W: "the pool",
    S: "the shops",
    H: "the houses",
    T: "the office towers",
    Z: "the plaza",
  };
  level.blocks.forEach((c, i) => {
    const bx = i % B,
      by = Math.floor(i / B);
    out.push({
      name: nm[c],
      code: c,
      node: [
        [bx, by],
        [bx + 1, by],
        [bx, by + 1],
        [bx + 1, by + 1],
      ][i % 4],
    });
  });
  return out;
}
function fareColor(n) {
  return n >= 10 ? 0x3ccf6a : n >= 6 ? 0xffd23f : 0xff4a3c;
}
function makeWaitingVisual(w) {
  const g = new THREE.Group();
  const p = person();
  p.position.set(LANE + 2.6, 0, LANE + 2.6);
  p.rotation.y = -Math.PI * 0.75;
  g.add(p);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 3.4, 40),
    basic(w.col, { side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(LANE + 2.6, 0.12, LANE + 2.6);
  g.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 26, 20, 1, true),
    basic(w.col, {
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  beam.position.set(LANE + 2.6, 13, LANE + 2.6);
  g.add(beam);
  const ic = emojiSprite("🙋", 4.5);
  ic.position.set(LANE + 2.6, 5.2, LANE + 2.6);
  g.add(ic);
  const tag = labelSprite(w.size + " $" + w.pay, "#1d1238", "#" + w.col.toString(16).padStart(6, "0"), 0.55);
  tag.position.set(LANE + 2.6, 9, LANE + 2.6);
  g.add(tag);
  g.position.set(w.x * NODE, 0, w.y * NODE);
  scene.add(g);
  w.g = g;
  w.icon = ic;
}
const WANT_WAITING = 4;
function spawnWaiting(near) {
  if (!shift) return;
  let guard = 0;
  while (waiting.length < WANT_WAITING && guard++ < 20) {
    const pl = places();
    let node,
      tries = 0;
    const close = near || rand() < 0.6;
    near = false;
    do {
      node = [Math.floor(rand() * G), Math.floor(rand() * G)];
      tries++;
    } while (
      tries < 120 &&
      ((close && tries < 80 && moves(car.x, car.y, node[0], node[1]) > 6) ||
        Math.abs(node[0] - car.x) + Math.abs(node[1] - car.y) < 2 ||
        (rival && nodeEq([rival.x, rival.y], node[0], node[1])) ||
        waiting.some((w) => w.x === node[0] && w.y === node[1]) ||
        shift.onboard.some((p) => nodeEq(p.dest, node[0], node[1])))
    );
    const cands = pl.filter(
      (p) => Math.abs(p.node[0] - node[0]) + Math.abs(p.node[1] - node[1]) >= 3 && p.code !== "HO",
    );
    const dst = cands[Math.floor(rand() * cands.length)] || pl[0];
    const n = moves(node[0], node[1], dst.node[0], dst.node[1]);
    const w = {
      id: "w" + Math.floor(Math.random() * 1e9),
      x: node[0],
      y: node[1],
      dest: dst.node,
      destName: dst.name,
      dist: n,
      pay: Math.round((40 + n * 18) * (1 + 0.12 * (shift.level - 1))),
      col: fareColor(n),
      size: n >= 10 ? "LONG" : n >= 6 ? "MEDIUM" : "SHORT",
    };
    makeWaitingVisual(w);
    waiting.push(w);
  }
}
function clearWaiting() {
  waiting.forEach((w) => w.g && scene.remove(w.g));
  waiting = [];
}

/* ---------- difficulty curve ---------- */
function spareMoves() {
  const s = SPARE[game.diff];
  if (s == null) return null;
  const lv = shift ? shift.level : 1;
  return Math.max(game.diff === 2 ? 1 : 2, s - Math.floor((lv - 1) / 2));
}
function seatsFree() {
  return shift ? SEATS - shift.onboard.length : 0;
}

/* ---------- targets (GPS) ---------- */
function targets() {
  if (!shift) return [];
  const t = shift.onboard.map((p) => ({ kind: "drop", ref: p, node: p.dest, name: p.destName }));
  if (seatsFree() > 0)
    waiting.forEach((w) =>
      t.push({ kind: "pick", ref: w, node: [w.x, w.y], name: "the " + w.size.toLowerCase() + " fare" }),
    );
  return t;
}
function urgency(p) {
  return p.patience == null ? 99 : p.patience - moves(car.x, car.y, p.dest[0], p.dest[1]);
}
function currentTarget() {
  const t = targets();
  if (!t.length) return null;
  const keep = targetPick && t.find((x) => x.ref === targetPick);
  if (keep) return keep;
  const drops = t.filter((x) => x.kind === "drop");
  if (drops.length) {
    drops.sort(
      (a, b) =>
        urgency(a.ref) - urgency(b.ref) ||
        moves(car.x, car.y, a.node[0], a.node[1]) - moves(car.x, car.y, b.node[0], b.node[1]),
    );
    return drops[0];
  }
  t.sort((a, b) => moves(car.x, car.y, a.node[0], a.node[1]) - moves(car.x, car.y, b.node[0], b.node[1]));
  return t[0];
}
function target() {
  const t = currentTarget();
  return t ? t.node : null;
}
function targetName() {
  const t = currentTarget();
  return t ? t.name : "";
}
const REL = ["straight on", "right", "turn around", "left"],
  COMPASS = ["north", "east", "south", "west"];
function relName(d) {
  return REL[(d - car.d + 4) % 4];
}
function routeNodes() {
  const t = target();
  if (!t) return [];
  let x = car.x,
    y = car.y,
    d = car.d;
  const out = [[x, y]];
  for (let i = 0; i < 60; i++) {
    const g = routeDir(x, y, t[0], t[1], d);
    if (g < 0 || g === undefined) break;
    x += DX[g];
    y += DZ[g];
    d = g;
    out.push([x, y]);
  }
  return out;
}
let lastGuide = "";
function guidance(full) {
  const t = target();
  let s = "";
  if (t) {
    const n = moves(car.x, car.y, t[0], t[1]);
    if (game.nav) {
      const dx = t[0] - car.x,
        dy = t[1] - car.y;
      const parts = [];
      if (dy) parts.push(Math.abs(dy) + " " + (dy < 0 ? "north" : "south"));
      if (dx) parts.push(Math.abs(dx) + " " + (dx > 0 ? "east" : "west"));
      if (parts.length)
        s = `${cap(targetName())} is ${parts.join(" and ")}. You are facing ${COMPASS[car.d]}.`;
    } else {
      const g = routeDir(car.x, car.y, t[0], t[1], car.d);
      if (g >= 0) {
        const r = relName(g),
          how = r === "straight on" ? "go straight on" : r === "turn around" ? "turn around" : "turn " + r;
        const key = targetName();
        const brief = !full && key === lastGuide;
        lastGuide = key;
        s =
          game.guide || full
            ? brief
              ? `${cap(how)}, ${n} to go.`
              : `GPS: ${how}. ${n} move${n > 1 ? "s" : ""} to ${targetName()}.`
            : `GPS: ${how}.`;
      }
    }
  }
  if (shift) {
    shift.onboard.forEach((p, i) => {
      const u = urgency(p);
      if (u <= 1) s += ` Passenger ${i + 1} has ${u} spare move${u === 1 ? "" : "s"}!`;
    });
  }
  const cd = nearestCop();
  if (cd && cd.n <= 3) s += ` Police ${cd.n} move${cd.n > 1 ? "s" : ""} away.`;
  s += rivalWarning();
  if (full && shift && shift.fuel != null) s += ` Fuel: ${shift.fuel} moves.`;
  if (full && shift && shift.onboard.length)
    s +=
      " On board: " +
      shift.onboard
        .map((p, i) => `${i + 1}, ${p.destName}${p.patience != null ? ", " + urgency(p) + " spare" : ""}${p.dare ? ". Dare: " + dareGoal(p.dare) + ". " + Math.min(p.dare.have, p.dare.need) + " of " + p.dare.need + " complete" : ""}`)
        .join(". ") +
      ".";
  return s.trim();
}
function nearestCop(chasingOnly) {
  const list = chasingOnly ? cops.filter((c) => c.chasing) : cops;
  if (!list.length) return null;
  let best = null;
  list.forEach((c) => {
    const n = moves(c.x, c.y, car.x, car.y);
    if (!best || n < best.n) best = { c, n };
  });
  return best;
}

/* ---------- rival cab: races you for fares, one block per turn ---------- */
let rival = null,
  rivalMesh = null;
const rivalMat = basic(0xb05cff, { transparent: true, opacity: 0.95 });
function rivalActive() {
  return !!shift && game.diff > 0 && (game.diff === 2 || shift.level >= 2);
}
function addRival() {
  if (rival || !rivalActive()) return;
  const D = bfsFrom(car.x, car.y);
  const far = [];
  for (let x = 0; x < G; x++)
    for (let y = 0; y < G; y++) if (D[y * G + x] >= 4 && D[y * G + x] < 1e9) far.push([x, y]);
  if (!far.length) return;
  const [x, y] = far[Math.floor(rand() * far.length)];
  const d = [0, 1, 2, 3].find((k) => canGo(x, y, k));
  rival = { x, y, d, p: 0, moving: false, ang: (-d * Math.PI) / 2, plan: -1, target: null };
  rivalMesh = makeTaxi(0x8a3cff);
  const tag = labelSprite("RIVAL", "#ffffff", "#8a3cff", 0.5);
  tag.position.y = 6;
  rivalMesh.add(tag);
  scene.add(rivalMesh);
  tip(
    "rival",
    "A rival cab is after your fares. Purple arrows show its next move. If it reaches a waiting passenger before you, it steals the fare.",
  );
  return rival;
}
function clearRival() {
  if (rivalMesh) scene.remove(rivalMesh);
  rival = null;
  rivalMesh = null;
}
function rivalTarget() {
  if (!rival || !waiting.length) return null;
  let best = null,
    bv = -1;
  waiting.forEach((w) => {
    const m = moves(rival.x, rival.y, w.x, w.y);
    if (m >= 1e9) return;
    const v = w.pay / (m + 2);
    if (v > bv) {
      bv = v;
      best = w;
    }
  });
  return best;
}
function planRival() {
  if (!rival) return;
  const keep = rival.target && waiting.includes(rival.target) ? rival.target : null;
  const w = keep || rivalTarget();
  rival.target = w;
  const per = game.diff === 2 ? 4 : shift.level < 4 ? 2 : 3;
  const rest = turnNo % per === per - 1;
  rival.plan = !w || rest ? -1 : routeDir(rival.x, rival.y, w.x, w.y, rival.d);
  if (rival.plan === undefined) rival.plan = -1;
  rival.resting = rest;
  if (rival.plan >= 0)
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      const m = new THREE.Mesh(chevGeo, rivalMat);
      m.scale.setScalar(1.5);
      m.position.set(
        rival.x * NODE + DX[rival.plan] * NODE * t - DZ[rival.plan] * LANE,
        0.12,
        rival.y * NODE + DZ[rival.plan] * NODE * t + DX[rival.plan] * LANE,
      );
      m.rotation.y = (-rival.plan * Math.PI) / 2;
      intentGroup.add(m);
    }
}
function rivalNext() {
  return rival && rival.plan >= 0
    ? [rival.x + DX[rival.plan], rival.y + DZ[rival.plan]]
    : rival
      ? [rival.x, rival.y]
      : null;
}
function rivalSteal() {
  if (!rival) return "";
  const w = waiting.find((w) => w.x === rival.x && w.y === rival.y && !(w.x === car.x && w.y === car.y));
  if (!w) return "";
  scene.remove(w.g);
  waiting = waiting.filter((x) => x !== w);
  if (targetPick === w) targetPick = null;
  rival.target = null;
  shift.stolen = (shift.stolen || 0) + 1;
  sfx("steal");
  banner("Fare stolen!", "The rival got the " + w.size.toLowerCase() + " fare");
  return `The rival cab stole the ${w.size.toLowerCase()} fare to ${w.destName}!`;
}
function rivalWarning() {
  if (!rival || !rival.target) return "";
  const w = rival.target,
    m = moves(rival.x, rival.y, w.x, w.y),
    mine = moves(car.x, car.y, w.x, w.y);
  if (m > 3) return "";
  return ` The rival is ${m} move${m === 1 ? "" : "s"} from the ${w.size.toLowerCase()} fare${seatsFree() > 0 ? ", you are " + mine : ""}.`;
}

/* ---------- destination beacons ---------- */
const beacon = new THREE.Group();
scene.add(beacon);
function refreshMarkers() {
  while (beacon.children.length) beacon.remove(beacon.children[0]);
  if (!shift || mode !== "play") {
    updateHud();
    buildRoute();
    return;
  }
  shift.onboard.forEach((p, i) => {
    const g = new THREE.Group();
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 90, 28, 1, true),
      basic(0xffd23f, {
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    col.position.y = 45;
    g.add(col);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.4, 4.6, 48),
      basic(0xffd23f, { side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    g.add(ring);
    const hot = urgency(p) <= 1;
    const lab = labelSprite(
      i + 1 + "  " + shortName(p.destName).toUpperCase() + (hot ? "  HURRY" : ""),
      hot ? "#ffffff" : "#1d1238",
      hot ? "#e8261b" : "#ffd23f",
      0.8,
    );
    lab.position.y = 11;
    g.add(lab);
    g.position.set(p.dest[0] * NODE, 0, p.dest[1] * NODE);
    beacon.add(g);
  });
  if (museumDuck) {
    museumDuck.visible = true;
    museumDuck.userData.glow.visible = true;
  }
  updateHud();
  buildRoute();
}
const refreshMission = refreshMarkers;

/* ---------- police: one block per turn, plans shown in advance ---------- */
const intentGroup = new THREE.Group();
scene.add(intentGroup);
const intentMat = basic(0xff2a40, { transparent: true, opacity: 0.9 });
function copNext(c) {
  return c.plan >= 0 ? [c.x + DX[c.plan], c.y + DZ[c.plan]] : [c.x, c.y];
}
function patrolDir(c) {
  const ch = [0, 1, 2, 3].filter((d) => d !== (c.d + 2) % 4 && canGo(c.x, c.y, d));
  return ch.length ? ch[Math.floor(rand() * ch.length)] : [0, 1, 2, 3].find((d) => canGo(c.x, c.y, d));
}
function planCops() {
  while (intentGroup.children.length) intentGroup.remove(intentGroup.children[0]);
  let spotted = false;
  cops.forEach((c, i) => {
    if (!c.chasing && moves(c.x, c.y, car.x, car.y) <= SPOT[game.cops]) {
      c.chasing = true;
      spotted = true;
    }
    const rest = c.chasing && (game.cops === 1 ? (turnNo + i) % 3 === 2 : (turnNo + i) % 5 === 4);
    c.plan = rest ? -1 : c.chasing ? routeDir(c.x, c.y, car.x, car.y, c.d) : patrolDir(c);
    if (c.plan === undefined) c.plan = -1;
    c.resting = rest;
    if (c.plan >= 0) {
      for (let k = 1; k < 6; k++) {
        const t = k / 6;
        const m = new THREE.Mesh(chevGeo, intentMat);
        m.scale.setScalar(1.6);
        m.position.set(
          c.x * NODE + DX[c.plan] * NODE * t - DZ[c.plan] * LANE,
          0.1,
          c.y * NODE + DZ[c.plan] * NODE * t + DX[c.plan] * LANE,
        );
        m.rotation.y = (-c.plan * Math.PI) / 2;
        intentGroup.add(m);
      }
    } else {
      const z = labelSprite("WAITING", "#ffffff", "#2266ff", 0.4);
      z.position.set(c.x * NODE, 6, c.y * NODE);
      intentGroup.add(z);
    }
    if (!c.chasing) {
      const z = labelSprite("PATROL", "#ffffff", "#2266ff", 0.4);
      z.position.set(c.x * NODE, 8, c.y * NODE);
      intentGroup.add(z);
    }
  });
  planRival();
  if (spotted) {
    sfx("siren1", 0.9);
    tip(
      "spotted",
      "A patrol car spotted you and is now chasing. Its red arrows show where it will move next. Stay five moves away from every chasing car for two turns to lose them.",
    );
  }
  return spotted;
}
function addCop() {
  const D = bfsFrom(car.x, car.y);
  const far = [];
  for (let x = 0; x < G; x++)
    for (let y = 0; y < G; y++) if (D[y * G + x] >= 5 && D[y * G + x] < 1e9) far.push([x, y]);
  if (!far.length) return;
  const [x, y] = far[Math.floor(rand() * far.length)];
  const d = [0, 1, 2, 3].find((k) => canGo(x, y, k));
  cops.push({ x, y, d, p: 0, moving: false, ang: (-d * Math.PI) / 2, plan: -1, chasing: true });
  const m = makeSedan(0, "police");
  scene.add(m);
  copMeshes.push(m);
  return cops[cops.length - 1];
}
function patrolCount() {
  if (!shift || !game.cops) return 0;
  return Math.min(
    3,
    Math.floor((shift.level - 1 + (game.diff === 2 ? 1 : 0)) / 2) + (game.diff === 0 ? -1 : 0),
  );
}
function topUpPatrols() {
  const want = patrolCount();
  let have = cops.filter((c) => !c.chasing).length;
  while (have < want && cops.length < copCap()) {
    const c = addCop();
    if (!c) break;
    c.chasing = false;
    have++;
  }
}
function clearCops() {
  copMeshes.forEach((m) => scene.remove(m));
  copMeshes = [];
  cops = [];
  evade = 0;
  while (intentGroup.children.length) intentGroup.remove(intentGroup.children[0]);
  updateHud();
}
function copCap() {
  return game.diff === 2 ? 4 : 3;
}
function startChase(n) {
  if (!game.cops) return;
  if (!cops.some((c) => c.chasing)) evade = 0;
  cops.forEach((c) => (c.chasing = true));
  while (cops.length < Math.min(copCap(), n)) addCop();
  if (!car.moving) planCops();
  updateHud();
}
function calmCops() {
  const keep = patrolCount();
  evade = 0;
  cops.forEach((c) => (c.chasing = false));
  while (cops.length > keep) {
    cops.pop();
    scene.remove(copMeshes.pop());
  }
  if (!car.moving) planCops();
  updateHud();
}
function pathNodes(d) {
  const n1 = [car.x + DX[d], car.y + DZ[d]];
  const out = [n1];
  if (nitroArmed && canGo(n1[0], n1[1], d)) out.push([n1[0] + DX[d], n1[1] + DZ[d]]);
  return out;
}
function danger(d) {
  const path = pathNodes(d);
  return cops.some((c) => {
    const nx = copNext(c);
    return (
      path.some(([x, y]) => nodeEq(nx, x, y)) ||
      (nodeEq(path[0], c.x, c.y) && nodeEq(nx, car.x, car.y)) ||
      (path.length > 1 && nodeEq([c.x, c.y], path[1][0], path[1][1]) && nodeEq(nx, path[0][0], path[0][1]))
    );
  });
}

/* ---------- a turn ---------- */
// A player may explicitly authorise a short, straight GPS run. Each block is
// still a normal turn; recheck the route and all conditions after every block.
function quickRouteAllowed() {
  return mode === "play" && modeKey === "shift" && !!shift && !game.nav &&
    !testing && !nitroArmed && !heat && !cops.length && !rival &&
    !pendingDares.length && !shift.onboard.some(p => p.getaway || p.dare || urgency(p) <= 1) &&
    (shift.fuel == null || shift.fuel > 10);
}
function quickRouteStop(x, y) {
  return waiting.some(w => w.x === x && w.y === y) ||
    shift.onboard.some(p => nodeEq(p.dest, x, y));
}
function quickRouteLength(d, destination, limit = 3) {
  if (!quickRouteAllowed() || !destination || !Number.isInteger(d) || d < 0 || d > 3 ||
      quickRouteStop(car.x, car.y)) return 0;
  let x = car.x, y = car.y, facing = car.d, count = 0;
  for (let i = 0; i < limit; i++) {
    if (routeDir(x, y, destination[0], destination[1], facing) !== d || !canGo(x, y, d)) break;
    if (shift.fuel != null && shift.fuel - i <= 10) break;
    const gd = goodies[edgeKey(x, y, d)];
    // Even used goodies may respawn during the run; leave these decisions manual.
    if (gd) break;
    const nx = x + DX[d], ny = y + DZ[d];
    if (shift.onboard.some(p => p.patience != null && p.patience - i - 1 - moves(nx, ny, p.dest[0], p.dest[1]) <= 1)) break;
    count++; x = nx; y = ny; facing = d;
    if (quickRouteStop(x, y) || nodeEq(destination, x, y)) break;
  }
  return count;
}
function quickRouteItem(d, destination) {
  const count = quickRouteLength(d, destination);
  if (count < 2) return null;
  const direction = relName(d);
  return {
    id: "quickRoute",
    label: "⭐ GPS: " + direction + " · " + count + " blocks",
    say: "GPS shortcut. " + direction + ", " + count + " blocks. Stops for changes or passenger events.",
    focus: "⭐ GPS · " + count + " BLOCKS",
    sound: DIRWORD[direction][2],
    act: () => {
      const targetNow = currentTarget();
      if (!targetNow || !nodeEq(destination, targetNow.node[0], targetNow.node[1]) ||
          quickRouteLength(d, destination, count) < count) return openJunction("Route changed. Choose your next move.");
      drive(d, { d, destination: [...destination], ref: targetNow.ref, remaining: count - 1 });
    }
  };
}
function continueQuickRoute(say) {
  const q = turn && turn.quick;
  if (!q || q.remaining <= 0 || say.some(Boolean)) return false;
  const now = currentTarget();
  if (!now || now.ref !== q.ref || !nodeEq(q.destination, now.node[0], now.node[1]) ||
      quickRouteLength(q.d, q.destination, 1) !== 1) return false;
  drive(q.d, { ...q, remaining: q.remaining - 1 });
  return true;
}
function openJunction(speech) {
  const practice = modeKey === 'practice';
  car.moving = false;
  clearTimeout(autoT);
  const t = target(),
    g = t ? routeDir(car.x, car.y, t[0], t[1], car.d) : -1,
    gps = game.nav && !practice ? -1 : g;
  let opts = [0, 3, 1, 2].map((r) => ({ d: (car.d + r) % 4 })).filter((o) => canGo(car.x, car.y, o.d));
  opts.forEach((o) => {
    o.gps = o.d === gps;
    const gd = goodies[edgeKey(car.x, car.y, o.d)];
    o.goodie = gd && !gd.used ? gd.item : null;
    o.danger = danger(o.d);
  });
  if (!game.nav || practice) opts.sort((a, b) => b.gps - a.gps);
  const items = opts.map((o) => {
    const W = DIRWORD[relName(o.d)],
      gi = o.goodie ? GOODIES[o.goodie] : null,
      cmp = game.nav && !practice ? " (" + COMPASS[o.d] + ")" : "";
    return {
      id: "dir" + o.d,
      d: o.d,
      gps: o.gps,
      danger: o.danger,
      sound: W[2],
      focus:
        W[3] +
        "  " +
        W[1] +
        (nitroArmed ? "  🔥" : "") +
        (gi ? "  " + gi.icon : "") +
        (o.danger ? "  🚨" : "") +
        (o.gps ? "  ★" : ""),
      say:
        W[0] +
        cmp +
        (nitroArmed ? ", with nitro" : "") +
        (o.gps ? ", GPS way" : "") +
        (gi ? ", " + gi.name : "") +
        (o.danger ? ", police danger!" : ""),
      html: `<span class="ar" aria-hidden="true">${W[3]}</span>${W[0]}${game.nav && !practice ? '<span class="tag">' + COMPASS[o.d].toUpperCase() + "</span>" : ""}${gi ? ' <span aria-hidden="true">' + gi.icon + "</span>" : ""}${o.danger ? ' <span class="tag" style="background:#ff2a40;color:#fff">POLICE</span>' : ""}${o.gps ? ' <span class="tag">GPS</span>' : ""}`,
      act: () => drive(o.d),
    };
  });
  const shortcut = gps >= 0 && !practice ? quickRouteItem(gps, t) : null;
  if (shortcut) items.unshift(shortcut);
  if (shift && seatsFree() > 0)
    waiting
      .filter((w) => w.x === car.x && w.y === car.y)
      .forEach((w) => {
        const n = moves(car.x, car.y, w.dest[0], w.dest[1]),
          sp = spareMoves();
        items.unshift({
          id: "pick" + w.id,
          label: "🙋 Pick up: " + shortName(w.destName) + (practice ? "" : " $" + w.pay),
          sound: "score",
          focus: practice ? "🙋  PICK UP" : "🙋  PICK UP  $" + w.pay,
          say: practice ? "Pick up your passenger. No time limit." : `Pick up. ${w.size.toLowerCase()} fare to ${w.destName}, ${w.pay} dollars, ${n} moves away${sp != null ? ", with " + sp + " spare" : ""}.`,
          act: () => {
            if (practice) return practicePickup(w);
            const s = pickUp(w);
            spawnWaiting();
            refreshMarkers();
            saveGame();
            if (pendingDares.length) offerDare(s);
            else openJunction(s + " " + (game.guide ? guidance() : "") + " " + takeTips());
          },
        });
      });
  if (shift && shift.nitro > 0) items.push(nitroItem());
  if (targets().length > 1) items.push(targetItem());
  items.push({
    id: "pause",
    label: "⏸ Pause",
    sound: "pause",
    focus: "⏸  PAUSE",
    say: "Pause",
    act: pauseMenu,
  });
  arrows.forEach((a) => (a.visible = false));
  opts.forEach((o) => {
    const a = arrows[o.d];
    a.visible = true;
    a.position.set(car.x * NODE + DX[o.d] * 7, 0.2, car.y * NODE + DZ[o.d] * 7);
    a.rotation.y = (-o.d * Math.PI) / 2;
    a.userData.danger = o.danger;
  });
  const shut = [0, 3, 1, 2]
    .map((r) => (car.d + r) % 4)
    .filter((d) => valid(car.x, car.y, d) && !canGo(car.x, car.y, d))
    .map((d) =>
      relName(d) === "straight on"
        ? "ahead"
        : relName(d) === "turn around"
          ? "behind you"
          : "on your " + relName(d),
    );
  buildRoute();
  updateHud();
  showBar(
    items,
    (
      (speech || (game.guide ? guidance() : "")) +
      (shut.length ? " Road closed " + shut.join(" and ") + "." : "")
    ).trim() || null,
  );
  if (!practice && game.wait && !acc().auto && g >= 0 && !danger(g))
    autoT = setTimeout(() => {
      if (!acc().auto && Scan.index === -1 && !menuOpen() && mode === "play" && !car.moving) drive(g);
    }, game.wait);
}
function nitroItem() {
  return {
    id: "nitro",
    label: nitroArmed ? "🔥 Nitro ON" : "🔥 Nitro (" + shift.nitro + ")",
    sound: "pause",
    focus: nitroArmed ? "🔥  NITRO ON" : "🔥  NITRO",
    say: nitroArmed
      ? "Nitro is on. Your next move goes two blocks. Choose again to turn it off."
      : "Nitro. Go two blocks in one move. " + shift.nitro + " left.",
    act: toggleNitro,
  };
}
function toggleNitro() {
  nitroArmed = !nitroArmed;
  sfx(nitroArmed ? "jump" : "pause", 0.6);
  Voice.speak(nitroArmed ? "Nitro on. Choose a way to go two blocks." : "Nitro off.");
  refreshOptions("nitro");
}
function targetItem() {
  const t = currentTarget();
  return {
    id: "target",
    label: "🎯 Next target",
    sound: "pause",
    focus: "🎯  " + (t ? shortName(t.name).toUpperCase() : "TARGET"),
    say: "Change GPS target. Now: " + (t ? t.name : "none"),
    act: cycleTarget,
  };
}
function cycleTarget() {
  const list = targets();
  const cur = currentTarget();
  const i = list.findIndex((x) => x.ref === (cur && cur.ref));
  const nx = list[(i + 1) % list.length];
  targetPick = nx.ref;
  const m = moves(car.x, car.y, nx.node[0], nx.node[1]);
  Voice.speak(
    nx.kind === "drop"
      ? `Drop off at ${nx.name}, ${m} moves.${nx.ref.patience != null ? " " + urgency(nx.ref) + " spare." : ""}`
      : `${nx.name}, ${nx.ref.pay} dollars to ${nx.ref.destName}. ${m} moves away.`,
  );
  refreshOptions("target");
}
function refreshOptions(keep) {
  openJunction(" ");
  Scan.setItems(Scan.items, keep);
}
function drive(d, quick = null) {
  clearTimeout(autoT);
  const segs = nitroArmed && canGo(car.x + DX[d], car.y + DZ[d], d) ? 2 : 1;
  if (segs === 2) {
    shift.nitro--;
    sfx("jump", 0.8);
  }
  nitroArmed = false;
  turn = { segs, seg: 0, path: [[car.x, car.y]], nitro: segs === 2, speech: [], quick };
  car.d = d;
  car.p = 0;
  car.moving = true;
  segHad = false;
  cops.forEach((c) => {
    c.from = [c.x, c.y];
    c.to = copNext(c);
  });
  if (rival) {
    rival.to = rival.plan >= 0 ? rivalNext() : null;
  }
  cops.forEach((c) => {
    if (c.plan < 0) c.to = null;
  });
  while (intentGroup.children.length) intentGroup.remove(intentGroup.children[0]);
  Scan.close();
  hideArrows();
  $("#bar").classList.add("hide");
  resize();
  setSeg();
}
function setSeg() {
  const gd = goodies[edgeKey(car.x, car.y, car.d)];
  curSeg = gd && !gd.used ? gd : null;
  if (curSeg) curSeg.rev = car.d === 0 || car.d === 3;
}
// called by the render loop when the cab reaches a junction
function reachNode() {
  turn.path.push([car.x, car.y]);
  if (turn.seg + 1 < turn.segs && canGo(car.x, car.y, car.d)) {
    const mid = [car.x, car.y];
    if (cops.some((c) => nodeEq(c.to, mid[0], mid[1]) || (nodeEq(c.from, mid[0], mid[1]) && c.plan < 0))) {
      car.moving = false;
      endTurn();
      return;
    }
    const s = nodeEvents();
    if (s) turn.speech.push(s);
    turn.seg++;
    setSeg();
    return;
  }
  car.moving = false;
  endTurn();
}
function endTurn() {
  cops.forEach((c) => {
    if (c.plan >= 0 && c.to) {
      c.x = c.to[0];
      c.y = c.to[1];
      c.d = c.plan;
    }
    c.p = 0;
    c.moving = false;
    c.plan = -1;
  });
  if (rival) {
    if (rival.plan >= 0 && rival.to) {
      rival.x = rival.to[0];
      rival.y = rival.to[1];
      rival.d = rival.plan;
    }
    rival.p = 0;
    rival.moving = false;
    rival.plan = -1;
  }
  turnNo++;
  const P = turn.path;
  const caught = cops.some(
    (c) =>
      nodeEq([c.x, c.y], car.x, car.y) ||
      P.some(
        (n, k) => k < P.length - 1 && nodeEq(c.from, P[k + 1][0], P[k + 1][1]) && nodeEq(c.to, n[0], n[1]),
      ) ||
      P.slice(1, -1).some((n) => nodeEq([c.x, c.y], n[0], n[1])),
  );
  arrive(caught);
}
function arrive(caught) {
  if (modeKey === 'practice') return practiceArrive();
  const say = [...(turn ? turn.speech : [])];
  const add = (s) => {
    if (s) say.push(s);
  };
  if (caught) {
    add(busted());
    if (mode !== "play") return;
  }
  if (segHad) {
    combo++;
    if (shift) shift.bestCombo = Math.max(shift.bestCombo || 0, combo);
    if (combo >= 2) {
      sfx("combo");
      $("#combo").textContent = "COMBO ×" + Math.min(5, combo);
      add("Combo times " + Math.min(5, combo) + "!");
    }
  } else {
    if (combo >= 2) $("#combo").textContent = "";
    combo = 0;
  }
  Object.values(goodies).forEach((g) => {
    if (g.used && --g.cool <= 0) buildGoodie(edgeKey(g.x, g.y, g.d));
  });
  if (shift) {
    shift.onboard.forEach((p) => {
      if (p.patience != null) p.patience--;
    });
    if (shift.fuel != null) shift.fuel--;
  }
  add(nodeEvents());
  if (shift) add(rivalSteal());
  if (shift) {
    shift.onboard.slice().forEach((p) => {
      if (p.patience != null && p.patience < moves(car.x, car.y, p.dest[0], p.dest[1])) add(walkOut(p));
    });
  }
  if (cops.some((c) => c.chasing) && !(shift && shift.onboard.some((p) => p.getaway))) {
    const nc = nearestCop(true);
    if (nc.n >= 5) {
      evade++;
      if (evade >= 2) add(lostThem());
      else add("The police are losing you. Keep away one more move.");
    } else evade = 0;
  }
  if (shift) {
    topUpPatrols();
    if (rivalActive() && !rival) addRival();
  }
  if (shift && shift.fuel != null) {
    if (shift.fuel <= 0) {
      saveProgress();
      shift.endReason = "fuel";
      ((s) =>
        setTimeout(() => {
          if (shift === s) endShift();
        }, 1800))(shift);
      sfx("bust");
      Voice.speak(say.join(" ") + " Out of fuel! Your shift is over.");
      return;
    }
    if (shift.fuel === 10 || shift.fuel === 5) {
      sfx("urgent", 0.8);
      add(`Fuel low: ${shift.fuel} moves left. Deliver fares to refuel.`);
    }
  }
  if (shift && shift.strikes >= MAX_STRIKES) {
    shift.endReason = "strikes";
    saveProgress();
    ((s) =>
      setTimeout(() => {
        if (shift === s) endShift();
      }, 1800))(shift);
    Voice.speak(say.join(" ") + " Three strikes. Your shift is over.");
    return;
  }
  if (shift) spawnWaiting();
  if (targetPick && !targets().some((t) => t.ref === targetPick)) targetPick = null;
  planCops();
  refreshMarkers();
  saveGame();
  if (shift && shift.onboard.some((p) => urgency(p) <= 1)) sfx("urgent", 0.8);
  // Drain queued tips once; a new event or tutorial must be heard at a junction.
  const tips = takeTips();
  if (!caught && !tips && continueQuickRoute(say)) return;
  const quickFeedback = turn && turn.quick ? "GPS shortcut ended. " : "";
  const speech = quickFeedback + say.join(" ") + " " + (game.guide ? guidance() : "") + " " + tips;
  if (pendingDares.length) offerDare(speech);
  else openJunction(speech);
}
function nodeEvents() {
  if (!shift) {
    return "";
  }
  const say = [];
  shift.onboard.forEach((p) => {
    if (p.dare && p.dare.type === "visit" && nodeEq(p.dare.node, car.x, car.y) && p.dare.have < 1) {
      p.dare.have = 1;
      sfx("combo");
      say.push("Dare done! You drove past " + p.dare.place + ".");
    }
  });
  shift.onboard.filter((p) => nodeEq(p.dest, car.x, car.y)).forEach((p) => say.push(dropOff(p)));
  waiting
    .filter((w) => w.x === car.x && w.y === car.y)
    .forEach((w) => {
      say.push(
        seatsFree() > 0
          ? `Someone here wants a cab: ${w.size.toLowerCase()} fare to ${w.destName}, ${w.pay} dollars.`
          : "Someone here wants a cab, but you are full.",
      );
    });
  return say.join(" ");
}
const DARES = [
  { type: "ramp", need: 2, text: "Hit two stunt ramps before you drop me off.", kinds: ["ramp"] },
  { type: "coins", need: 10, text: "Grab ten coins before you drop me off.", kinds: ["coins"] },
  {
    type: "smash",
    need: 2,
    text: "Smash two lots of crates or cones before you drop me off. The police might notice!",
    kinds: ["boxes", "cones"],
  },
  { type: "visit", need: 1, text: "Drive past {L} on the way.", kinds: [] },
];
function pickUp(w) {
  scene.remove(w.g);
  waiting = waiting.filter((x) => x !== w);
  if (targetPick === w) targetPick = null;
  const hide = landmarkNode(level, "HO"),
    getaway = game.cops > 0 && hide && rand() < 0.12 + 0.04 * shift.level && !nodeEq(hide, car.x, car.y);
  const p = { dest: w.dest, destName: w.destName, pay: w.pay, getaway, dare: null, size: w.size };
  if (getaway) {
    p.dest = hide;
    p.destName = "the Hideout";
    p.pay = Math.round(
      (60 + moves(car.x, car.y, hide[0], hide[1]) * 20 + 250) * (1 + 0.12 * (shift.level - 1)),
    );
  }
  if (game.nav) p.pay = Math.round(p.pay * 1.5);
  const sp = spareMoves();
  p.patience = sp == null ? null : moves(car.x, car.y, p.dest[0], p.dest[1]) + sp;
  shift.onboard.push(p);
  sfx("score");
  banner("Fare!", shortName(p.destName));
  tip(
    "pickup",
    "Your cab has three seats. Each passenger gives you a number of moves. If they run out, they walk out and you get a strike. You can pick up more people on the way, but plan the order you drop them off.",
  );
  if (!seatsFree()) tip("full", "Your cab is full. Drop someone off before you pick up anyone else.");
  const line = getaway
    ? "Drive! The cops are after me! Get me to the Hideout!"
    : cap(PICKUP_LINES[Math.floor(rand() * PICKUP_LINES.length)].replace("{d}", p.destName));
  if (getaway) {
    heat = Math.max(heat, 3);
    startChase(2 + (game.cops === 2 && shift.level >= 6 ? 1 : 0));
    tip(
      "getaway",
      "Getaway passengers bring the police. Red arrows show where each police car will move next, and a road marked police danger will get you caught.",
    );
  } else if (rand() < 0.4) {
    const opts = DARES.filter((D) =>
      D.type === "visit"
        ? ["PZ", "MU", "HO"].some((c) => {
            const n = landmarkNode(level, c);
            return n && !nodeEq(n, p.dest[0], p.dest[1]);
          })
        : Object.values(goodies).some((g) => D.kinds.includes(g.item)),
    );
    if (opts.length) {
      const D = opts[Math.floor(rand() * opts.length)];
      const dare = { type: D.type, need: D.need, have: 0, text: D.text };
      if (D.type === "visit") {
        const lm = ["PZ", "MU", "HO"]
          .map((c) => [c, landmarkNode(level, c)])
          .filter(([c, n]) => n && !nodeEq(n, p.dest[0], p.dest[1]));
        const [c, n] = lm[Math.floor(rand() * lm.length)];
        dare.node = n;
        dare.place = { PZ: "Pizza Palace", MU: "the City Museum", HO: "the Hideout" }[c];
        dare.text = D.text.replace("{L}", dare.place);
      }
      pendingDares.push({ p, dare });
    }
  }
  return line + (p.patience != null ? ` You have ${p.patience} moves.` : "");
}
function dareGoal(dare) {
  switch (dare.type) {
    case "ramp": return "Hit two stunt ramps";
    case "coins": return "Collect ten coins";
    case "smash": return "Smash two lots of crates or cones";
    case "visit": return "Drive past " + (["Pizza Palace", "the City Museum", "the Hideout"].includes(dare.place) ? dare.place : "the landmark");
    default: return "Complete the dare";
  }
}
function dareStatus(dare) {
  return dareGoal(dare) + " · " + Math.min(dare.have, dare.need) + "/" + dare.need;
}
function offerDare(carry) {
  const { p, dare } = pendingDares[0];
  tip(
    "dare",
    "A dare is optional. Accept it, and the passenger pays double if you do it, or half if you do not. Say no and you get the normal fare.",
  );
  const goal = dareGoal(dare);
  const challenge = "Passenger dare: " + dare.text + " Complete it for double the base fare. If you accept but fail, you get half the base fare. Decline for the normal fare.";
  const extra = [carry, takeTips()].filter(Boolean).join(" ");
  const items = [
    {
      id: "no",
      label: "❌ No thanks — normal fare",
      say: "No thanks. Keep the normal fare.",
      act: () => {
        pendingDares.shift();
        saveGame();
        next("Dare declined. Normal fare.");
      },
    },
    {
      id: "yes",
      label: "✅ Accept the dare — " + goal,
      say: "Accept the dare. " + dare.text + " Double base fare if completed, half if not.",
      act: () => {
        pendingDares.shift();
        p.dare = dare;
        sfx("combo");
        updateHud();
        saveGame();
        next("Dare accepted. " + goal + " before dropping off the passenger.");
      },
    },
    {
      id: "repeat",
      label: "🔊 Hear dare again",
      say: "Hear dare again",
      act: () => Voice.speak(challenge),
    },
  ];
  const next = feedback => (pendingDares.length ? offerDare(feedback) : openJunction([feedback, game.guide ? guidance() : ""].filter(Boolean).join(" ")));
  updateHud();
  showBar(items, [challenge, extra].filter(Boolean).join(" "), challenge);
}
function dareProgress(kind) {
  if (!shift) return;
  shift.onboard.forEach((p, i) => {
    const D = p.dare;
    if (!D || D.have >= D.need) return;
    const def = DARES.find((x) => x.type === D.type);
    if (!def.kinds.includes(kind)) return;
    D.have++;
    if (D.have >= D.need) {
      sfx("combo");
      setTimeout(() => Voice.speak("Dare complete for passenger " + (i + 1) + "!"), 700);
    }
  });
}
function dropOff(p) {
  shift.onboard = shift.onboard.filter((x) => x !== p);
  if (targetPick === p) targetPick = null;
  let pay = p.pay,
    note = "";
  if (p.dare) {
    if (p.dare.have >= p.dare.need) {
      pay *= 2;
      note = " Dare complete, double fare!";
      shift.daresWon = (shift.daresWon || 0) + 1;
    } else {
      pay = Math.round(pay / 2);
      note = " You failed the dare, so half fare.";
      shift.daresLost = (shift.daresLost || 0) + 1;
    }
  }
  const speedy = p.patience != null ? Math.max(0, p.patience - 0) * 10 : 0;
  pay += speedy;
  const others = shift.onboard.length,
    pool = others ? Math.round(pay * 0.25 * others) : 0;
  pay += pool;
  if (pool) note += ` Carpool bonus, plus ${pool}.`;
  shift.streak = (shift.streak || 0) + 1;
  shift.bestStreak = Math.max(shift.bestStreak || 0, shift.streak);
  const sb = shift.streak >= 2 ? Math.round(pay * 0.1 * Math.min(5, shift.streak - 1)) : 0;
  pay += sb;
  if (sb) note += ` Streak of ${shift.streak}, plus ${sb}.`;
  if (others)
    tip(
      "carpool",
      "Carpool bonus! Every other passenger still in the cab adds a quarter to the fare. Carry more people at once for bigger fares.",
    );
  if (shift.fuel != null) {
    const gain = 3 + Math.max(0, p.patience == null ? 2 : p.patience);
    shift.fuel = Math.min(60, shift.fuel + gain);
    note += ` Plus ${gain} fuel.`;
    tip(
      "fuel",
      "Your cab uses one fuel every move. Each drop-off refuels it, and quick deliveries refuel more. Run out and the shift ends.",
    );
  }
  earn(pay);
  shift.delivered++;
  sfx("win");
  burst(car.x * NODE, 3, car.y * NODE, [0xffd23f, 0xff4fa3, 0x2ad1c9, 0xffffff], 50, 14);
  banner("Fare paid", "+$" + pay);
  let s = THANKS[Math.floor(rand() * THANKS.length)] + note + ` Plus ${pay} dollars.`;
  if (p.getaway && !shift.onboard.some((x) => x.getaway) && heat >= 3) {
    heat = 0;
    calmCops();
    s += " The heat is off.";
  } else if (heat > 0) {
    heat--;
    if (heat < 3 && cops.some((c) => c.chasing) && !shift.onboard.some((x) => x.getaway)) {
      calmCops();
      s += " The police lose interest.";
    }
  }
  if (shift.onboard.length < SEATS) spawnWaiting(true);
  const lv = 1 + Math.floor(shift.delivered / 3);
  if (lv > shift.level) {
    shift.level = lv;
    shift.nitro = Math.min(3, shift.nitro + 1);
    rollRoadworks();
    sfx("rank");
    banner("Level " + lv, "The city gets busier");
    tip(
      "level",
      "Each level brings more roadworks, less patience and, later on, police patrols. You also get a nitro, up to three.",
    );
    s += ` Level ${lv}! The city gets busier: more roadworks and less patience. You get an extra nitro.`;
  }
  return s;
}
function walkOut(p) {
  shift.onboard = shift.onboard.filter((x) => x !== p);
  if (targetPick === p) targetPick = null;
  shift.strikes++;
  shift.walks = (shift.walks || 0) + 1;
  sfx("bust");
  banner("Strike " + shift.strikes, "A passenger walked out");
  const lost = shift.streak >= 2;
  shift.streak = 0;
  return (
    `That is it, I will walk! A passenger going to ${p.destName} ran out of patience. Strike ${shift.strikes}.` +
    (lost ? " Your streak is over." : "")
  );
}
function busted() {
  const lost = shift ? shift.onboard.length : 0;
  clearCops();
  heat = 0;
  if (shift) shift.busts = (shift.busts || 0) + 1;
  cash = Math.max(0, cash - 100);
  if (shift) {
    shift.onboard = [];
    shift.strikes++;
    shift.streak = 0;
  }
  sfx("bust");
  banner("Busted", shift ? "Strike " + shift.strikes : "Fined $100");
  saveProgress();
  return (
    "Busted! The police caught you. " +
    (lost ? "Your passengers ran off without paying. " : "") +
    "You lost 100 dollars." +
    (shift ? " Strike " + shift.strikes + "." : "")
  );
}
function lostThem() {
  calmCops();
  heat = 0;
  earn(75);
  sfx("win");
  banner("You lost them!", "+$75");
  return "You lost the police! Plus 75 dollars.";
}
function collect(kind, amount) {
  if (testing) return;
  const m = 1 + Math.min(4, combo) * 0.5,
    onb = shift ? Math.max(1, shift.onboard.length) : 1,
    v = Math.round(amount * m * onb);
  if (shift) shift.tips = (shift.tips || 0) + v;
  segHad = true;
  earn(v);
  dareProgress(kind);
  const NM = { coins: "Cash grab", ramp: "Crazy jump", boxes: "Crazy smash", cones: "Crazy smash" };
  if (kind !== "coins")
    Voice.speak(NM[kind] + "! Plus " + v + (onb > 1 ? ", with " + onb + " passengers cheering" : ""));
  if ((kind === "boxes" || kind === "cones") && game.cops) {
    heat++;
    updateHud();
    if (heat >= 3 && !cops.length) {
      startChase(2);
      setTimeout(
        () =>
          Voice.speak(
            "Wanted! All that smashing got the police after you. Stay five moves away from them for two turns to lose them, or deliver fares to cool things down.",
          ),
        1500,
      );
    } else if (heat > 3 && cops.length) startChase(cops.length + 1);
  }
}
function endShift() {
  const s = shift;
  if (!s) return;
  const daily = modeKey === "daily";
  const key = daily ? "daily:" + todayStr() + ":" + game.diff : level.id + ":" + game.diff;
  const best = records[key] || 0,
    rec = s.earned > best;
  if (rec) {
    records[key] = s.earned;
    store("switchcity-records", records);
  }
  try {
    localStorage.removeItem("switchcity-game3");
  } catch (e) {}
  shift = null;
  clearWaiting();
  clearCops();
  clearRival();
  refreshMarkers();
  const sum =
    (s.endReason === "fuel" ? "Out of fuel. " : "") +
    `Shift over. You delivered ${s.delivered} fares, reached level ${s.level}, and earned ${s.earned} dollars, including ${s.tips || 0} in tips. Dares won ${s.daresWon || 0}, lost ${s.daresLost || 0}. Walk-outs ${s.walks || 0}, busts ${s.busts || 0}. Best combo: ${s.bestCombo || 0}. Best streak: ${s.bestStreak || 0}.` +
    (s.stolen ? ` The rival stole ${s.stolen} fare${s.stolen > 1 ? "s" : ""}.` : "") +
    (rec ? " New record!" : best ? ` Your record is ${best} dollars.` : "");
  sfx("rank");
  showMenu(
    rec ? "New record!" : "Shift over",
    `$${s.earned} earned   ${s.delivered} fares   Level ${s.level}` +
      (best && !rec ? `   Record $${best}` : ""),
    [
      { id: "again", label: "🚕  Another shift", say: "Another shift", act: shiftMenu },
      { id: "menu", label: "🏠  Main Menu", say: "Main menu", act: titleMenu },
    ],
    sum,
  );
}

/* ---------- roadworks ---------- */
function clearRoadworks() {
  closed = new Set();
  bfsCache.clear();
  if (workGroup) {
    scene.remove(workGroup);
    workGroup = null;
  }
}
function rollRoadworks(list) {
  clearRoadworks();
  const n = Math.min(10, WORKS[game.diff] + (shift ? shift.level - 1 : 0));
  const all = [];
  for (let x = 0; x < G; x++)
    for (let y = 0; y < G; y++)
      [1, 2].forEach((d) => {
        if (valid(x, y, d) && !level.segs[x + "," + y + "," + d]) all.push(x + "," + y + "," + d);
      });
  if (list) closed = new Set(list);
  else
    for (let tries = 0; tries < 60; tries++) {
      closed = new Set();
      bfsCache.clear();
      const pool = all.filter((k) => {
        const [x, y] = k.split(",").map(Number);
        return Math.abs(x - car.x) + Math.abs(y - car.y) > 1;
      });
      while (closed.size < n && pool.length) closed.add(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
      if (connected()) break;
    }
  bfsCache.clear();
  workGroup = new THREE.Group();
  scene.add(workGroup);
  closed.forEach((k) => {
    const [x, y, d] = k.split(",").map(Number);
    const cx = (x + DX[d] / 2) * NODE,
      cz = (y + DZ[d] / 2) * NODE;
    [-1, 1].forEach((s) => {
      const bar = new THREE.Group();
      const board = box(ROAD - 0.6, 0.6, 0.25, std(0xffffff));
      board.position.y = 1.3;
      bar.add(board);
      for (let k2 = -2; k2 <= 2; k2 += 2) {
        const st = box(0.9, 0.62, 0.27, std(0xe8261b));
        st.position.set(k2 * 1.1, 1.3, 0);
        bar.add(st);
      }
      [-1, 1].forEach((q) => {
        const leg = box(0.15, 1.3, 0.15, MAT.dark);
        leg.position.set(q * (ROAD / 2 - 0.6), 0.65, 0);
        bar.add(leg);
      });
      const lamp = glow(0xffa020, 3);
      lamp.position.set(0, 2.1, 0);
      bar.add(lamp);
      bar.position.set(cx + (d === 2 ? 0 : s * 2.5), 0, cz + (d === 1 ? 0 : s * 2.5));
      bar.rotation.y = d === 1 ? Math.PI / 2 : 0;
      workGroup.add(bar);
    });
    const sg = labelSprite("ROAD CLOSED", "#ffffff", "#e8261b", 0.55);
    sg.position.set(cx, 5, cz);
    workGroup.add(sg);
  });
}

/* ---------- HUD ---------- */
function updateHud() {
  $("#cash").textContent = "$" + cash.toLocaleString();
  mm.style.visibility = mode === "editor" ? "hidden" : "visible";
  const mt = $("#missionText"),
    top = $("#modeName");
  if (modeKey === 'practice' && mode === 'play' && shift) {
    top.textContent = 'DRIVING PRACTICE · ' + (shift.onboard.length ? '3 / 3' : waiting.some(w => nodeEq([w.x,w.y],car.x,car.y)) ? '2 / 3' : '1 / 3');
    mt.textContent = practiceInstruction();
  } else if (mode === "editor") {
    top.innerHTML = '<span class="chip">CITY EDITOR</span>';
    mt.innerHTML = '<div class="seat"><b>' + level.name + "</b></div>";
  } else if (!shift) {
    top.innerHTML =
      '<span class="chip">CRUISE</span><span class="chip ghost">' + (level ? level.name : "") + "</span>";
    mt.innerHTML = '<div class="seat"><b>🪙 ' + roamCoins + " coins</b></div>";
  } else {
    const strikes = [0, 1, 2]
      .map((i) => `<i class="strike${i < shift.strikes ? " on" : ""}">✖</i>`)
      .join("");
    const fuel =
      shift.fuel != null
        ? `<span class="fuel" title="Fuel"><span style="width:${Math.max(0, Math.min(100, (shift.fuel / 60) * 100))}%" class="${shift.fuel <= 10 ? "low" : ""}"></span><em>⛽ ${shift.fuel}</em></span>`
        : "";
    top.innerHTML = `<span class="chip lv">LEVEL ${shift.level}</span><span class="strikes">${strikes}</span>${fuel}<span class="chip">🔥 ${shift.nitro}</span><span class="chip money">$${shift.earned.toLocaleString()}</span>`;
    const sp = Math.max(1, spareMoves() || 1);
    const cards = shift.onboard.map((p, i) => {
      const u = urgency(p),
        D = p.dare,
        pct = p.patience == null ? 100 : Math.max(0, Math.min(100, (u / Math.max(sp, 1)) * 100));
      const cls = p.patience == null ? "ok" : u <= 1 ? "bad" : u <= 2 ? "warn" : "ok";
      return (
        `<div class="seat ${cls}"><span class="num">${i + 1}</span><b>${shortName(p.destName)}</b>${p.getaway ? '<span class="tagx red">🚨 GETAWAY</span>' : ""}${D ? `<span class="tagx">🎲 ${dareStatus(D)}</span>` : ""}` +
        (p.patience != null
          ? `<span class="pbar"><span style="width:${pct}%"></span></span><span class="spare">${u} spare</span>`
          : "") +
        "</div>"
      );
    });
    for (let i = shift.onboard.length; i < SEATS; i++)
      cards.push(`<div class="seat empty"><span class="num">${i + 1}</span>Empty seat</div>`);
    mt.innerHTML = cards.join("");
  }
  const hot = Math.max(heat, cops.some((c) => c.chasing) ? 3 : 0);
  $("#stars").textContent =
    game.cops && mode === "play" && hot
      ? "★".repeat(Math.min(5, hot)) + "☆".repeat(Math.max(0, 5 - hot))
      : "";
}

/* ---------- save / resume ---------- */
function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}
function saveGame() {
  if (modeKey === 'practice' || testing || mode !== "play") return;
  saveProgress();
  store("switchcity-game3", {
    modeKey,
    levelId: level.id,
    ...(level.builtin ? {} : { citySnapshot: JSON.parse(JSON.stringify(level)) }),
    car: { x: car.x, y: car.y, d: car.d },
    shift,
    heat,
    turnNo,
    waiting: waiting.map(({ g, icon, ...w }) => w),
    rival: rival ? { x: rival.x, y: rival.y, d: rival.d } : null,
    cops: cops.map((c) => ({ x: c.x, y: c.y, d: c.d, chasing: c.chasing })),
    closed: [...closed],
  });
}
function savedGame() {
  return load("switchcity-game3", null);
}

/* ---------- minimap ---------- */
function drawMini() {
  if (mode !== "play") return;
  const s = mm.width,
    pad = 26,
    k = (s - pad * 2) / EXT,
    P = (v) => pad + v * k;
  mx.clearRect(0, 0, s, s);
  mx.fillStyle = "#251a45";
  mx.fillRect(0, 0, s, s);
  mx.strokeStyle = "#6b5f99";
  mx.lineWidth = 9;
  for (let n = 0; n < G; n++) {
    mx.beginPath();
    mx.moveTo(P(n * NODE), 0);
    mx.lineTo(P(n * NODE), s);
    mx.moveTo(0, P(n * NODE));
    mx.lineTo(s, P(n * NODE));
    mx.stroke();
  }
  closed.forEach((key) => {
    const [x, y, d] = key.split(",").map(Number);
    const px = P((x + DX[d] / 2) * NODE),
      py = P((y + DZ[d] / 2) * NODE);
    mx.strokeStyle = "#ff2a2a";
    mx.lineWidth = 7;
    mx.beginPath();
    mx.moveTo(px - 11, py - 11);
    mx.lineTo(px + 11, py + 11);
    mx.moveTo(px + 11, py - 11);
    mx.lineTo(px - 11, py + 11);
    mx.stroke();
  });
  Object.values(goodies).forEach((g) => {
    if (g.used) return;
    mx.fillStyle = g.item === "coins" ? "#ffd23f" : g.item === "ramp" ? "#2ad1c9" : "#ff8a3c";
    mx.beginPath();
    mx.arc(P((g.x + DX[g.d] / 2) * NODE), P((g.y + DZ[g.d] / 2) * NODE), 6, 0, 7);
    mx.fill();
  });
  const r = game.nav ? [] : routeNodes();
  if (r.length > 1) {
    mx.strokeStyle = "#ff4fa3";
    mx.lineWidth = 9;
    mx.beginPath();
    r.forEach(([x, y], i) => (i ? mx.lineTo(P(x * NODE), P(y * NODE)) : mx.moveTo(P(x * NODE), P(y * NODE))));
    mx.stroke();
  }
  mx.font = "bold 22px sans-serif";
  mx.textAlign = "center";
  mx.textBaseline = "middle";
  waiting.forEach((w) => {
    mx.fillStyle = "#" + w.col.toString(16).padStart(6, "0");
    mx.strokeStyle = "#fff";
    mx.lineWidth = 4;
    mx.beginPath();
    mx.arc(P(w.x * NODE), P(w.y * NODE), 17, 0, 7);
    mx.fill();
    mx.stroke();
    mx.fillStyle = "#1d1238";
    mx.fillText(w.size[0], P(w.x * NODE), P(w.y * NODE) + 1);
  });
  if (shift)
    shift.onboard.forEach((p, i) => {
      mx.fillStyle = "#ffd23f";
      mx.strokeStyle = "#1d1238";
      mx.lineWidth = 4;
      mx.beginPath();
      mx.rect(P(p.dest[0] * NODE) - 17, P(p.dest[1] * NODE) - 17, 34, 34);
      mx.fill();
      mx.stroke();
      mx.fillStyle = "#1d1238";
      mx.fillText(String(i + 1), P(p.dest[0] * NODE), P(p.dest[1] * NODE) + 1);
    });
  cops.forEach((c) => {
    const p = pos(c);
    if (!c.moving && c.plan >= 0) {
      mx.strokeStyle = "#ff2a40";
      mx.lineWidth = 6;
      mx.beginPath();
      mx.moveTo(P(c.x * NODE), P(c.y * NODE));
      mx.lineTo(P((c.x + DX[c.plan]) * NODE), P((c.y + DZ[c.plan]) * NODE));
      mx.stroke();
    }
    mx.fillStyle = "#2266ff";
    mx.strokeStyle = "#ff2a40";
    mx.lineWidth = 5;
    mx.beginPath();
    mx.arc(P(p[0]), P(p[1]), 13, 0, 7);
    mx.fill();
    mx.stroke();
  });
  const p = pos(car);
  mx.save();
  mx.translate(P(p[0]), P(p[1]));
  mx.rotate(-car.ang);
  mx.fillStyle = "#fff";
  mx.strokeStyle = "#1d1238";
  mx.lineWidth = 4;
  mx.beginPath();
  mx.moveTo(0, -22);
  mx.lineTo(16, 16);
  mx.lineTo(-16, 16);
  mx.closePath();
  mx.fill();
  mx.stroke();
  mx.restore();
}

/* ---------- render loop ---------- */
let lt = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lt) / 1000);
  lt = now;
  let siren = 0,
    rate = 0;
  if (mode === "play") {
    if (car.moving && !menuOpen()) {
      const sp = SPEEDS[game.speed] * dt * (turn && turn.nitro ? 1.9 : 1);
      car.p += sp;
      rate = (turn && turn.nitro) || jump ? 1 : 0.6;
      if (!RM) npcs.forEach((n) => stepWalker(n, sp * 0.8, wander));
      segmentEvents();
      const tp = turn ? Math.min(1, (turn.seg + Math.min(1, car.p)) / turn.segs) : 0;
      cops.forEach((c) => {
        if (c.plan >= 0 && c.to) {
          c.moving = true;
          c.d = c.plan;
          c.p = tp;
        }
      });
      if (rival && rival.plan >= 0 && rival.to) {
        rival.moving = true;
        rival.d = rival.plan;
        rival.p = tp;
      }
      if (turn && turn.nitro && !RM && Math.random() < 0.5) {
        const [x, z] = pos(car);
        burst(x - DX[car.d] * 2.5, 0.6, z - DZ[car.d] * 2.5, [0xff8a20, 0xffd23f], 1, 2, 0.6);
      }
      if (car.p >= 1) {
        car.x += DX[car.d];
        car.y += DZ[car.d];
        car.p = 0;
        jump = null;
        reachNode();
      }
    }
    if (cops.length) {
      const a = pos(car);
      const dmin = Math.min(
        ...cops.map((c) => {
          const b = pos(c);
          return Math.hypot(a[0] - b[0], a[1] - b[1]);
        }),
      );
      siren = Math.max(0, 1 - dmin / 90);
    }
  } else if (!RM) npcs.forEach((n) => stepWalker(n, dt * 0.3, wander));
  ease(car, dt);
  npcs.forEach((n) => ease(n, dt));
  cops.forEach((c) => ease(c, dt));
  if (rival && rivalMesh) {
    ease(rival, dt);
    place(rivalMesh, rival);
  }
  if (playerMesh) {
    place(playerMesh, car);
    const body = playerMesh.userData.body;
    if (jump && curSeg) {
      const f = Math.min(1, Math.max(0, (car.p - 0.38) / 0.42));
      playerMesh.position.y = Math.sin(Math.PI * f) * (RM ? 0 : 7);
      body.rotation.x = RM ? 0 : -f * Math.PI * 2;
    } else {
      body.rotation.x = 0;
    }
    const [x, z] = pos(car);
    playerGlow.position.set(x, 1.4 + playerMesh.position.y, z);
  }
  npcs.forEach((n, i) => {
    place(npcMeshes[i], n);
    if (!RM) npcMeshes[i].userData.wheels.forEach((w) => (w.rotation.x -= dt * 6));
  });
  const flip = game.flash && !RM ? ((now / 500) | 0) % 2 : 0;
  cops.forEach((c, i) => {
    const m = copMeshes[i];
    if (!m) return;
    place(m, c);
    const u = m.userData;
    u.red.color.setHex(flip ? 0x2266ff : 0xff2244);
    u.blue.color.setHex(flip ? 0xff2244 : 0x2266ff);
    u.rg.material.color.setHex(flip ? 0x2266ff : 0xff2244);
    u.bg.material.color.setHex(flip ? 0xff2244 : 0x2266ff);
  });
  peds.forEach((p) => {
    p.t += RM ? 0 : p.sp * dt;
    const [x, z, a] = pedPos(p);
    p.m.position.set(x, 0.3, z);
    p.m.rotation.y = a;
    const s = RM ? 0 : Math.sin(now / 160 + p.t * 50) * 0.5;
    const u = p.m.userData;
    u.l1.rotation.x = s;
    u.l2.rotation.x = -s;
    u.a1.rotation.x = -s;
    u.a2.rotation.x = s;
  });
  waiting.forEach((w, i) => {
    if (!w.g) return;
    const near = camera.position.distanceTo(w.g.position) < 32;
    w.g.children.forEach((c) => {
      if (c.isSprite) c.visible = !near;
    });
    if (!RM) {
      w.icon.position.y = 5.2 + Math.sin(now / 400 + i) * 0.5;
      const u = w.g.children[0].userData;
      u.a1.rotation.x = Math.PI + Math.sin(now / 200 + i) * 0.4;
    }
  });
  if (!RM) {
    spinners.forEach(([m, s]) => (m.rotation.y += dt * s));
    if (museumDuck) museumDuck.rotation.y = now / 2200;
    blinkers.forEach((b) => (b.visible = ((now / 700) | 0) % 2 === 0));
    Object.values(goodies).forEach((g) => {
      if (g.item === "coins") g.parts.forEach((pt) => (pt.m.rotation.y = now / 400));
    });
  }
  if (hl.visible) hl.material.opacity = RM ? 0.45 : 0.35 + Math.sin(now / 250) * 0.15;
  if (mode === "play" && !car.moving && Scan.isActive() && !menuOpen()) {
    const cur = Scan.items[Scan.index];
    Object.values(arrowLabels).forEach((s) => (s.visible = false));
    arrows.forEach((a, d) => {
      if (!a.visible) return;
      const on = cur && cur.d === d,
        dg = a.userData.danger;
      a.material.color.setHex(on ? 0xffd23f : dg ? 0xff3040 : 0xffffff);
      a.material.emissive.setHex(on ? 0xffa000 : dg ? 0x800000 : 0xffffff);
      a.material.opacity = on ? 1 : 0.55;
      const sc = on ? 2.1 : 1.3;
      a.scale.set(sc, on ? 2.5 : 1, sc);
      a.position.y = on && !RM ? 0.3 + Math.abs(Math.sin(now / 350)) * 0.7 : 0.2;
    });
    if (cur && cur.d !== undefined && Scan.braked) {
      brakeRing.visible = true;
      brakeRing.position.set(arrows[cur.d].position.x, 0.1, arrows[cur.d].position.z);
    } else brakeRing.visible = false;
  }
  updateParticles(dt);
  updateLoops({ engineOn: mode === "play" && !menuOpen(), rate, siren });
  if (!RM && ((now / 2500) | 0) !== loop.tl) {
    loop.tl = (now / 2500) | 0;
    setLights(loop.tl);
  }
  updateCamera(dt, now);
  renderFrame();
  drawMini();
  requestAnimationFrame(loop);
}
