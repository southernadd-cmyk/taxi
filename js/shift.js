// Read-only spoken status. Keep it behind Pause so ordinary driving scans
// do not gain an additional stop. Each detail can be heard again on demand.
function statusSections() {
  const practice = modeKey === "practice";
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
  const here = "Junction row " + (car.y + 1) + ", column " + (car.x + 1) + ". Facing " + COMPASS[car.d] + ".";
  const target = currentTarget();
  let destination = "No GPS target.";
  if (target) {
    const n = moves(car.x, car.y, ...target.node);
    destination = target.name + ". " + (n === 0 ? "You are here." : n >= 1e9 ? "No open route." : plural(n, "move") + " away.");
    if (n > 0 && n < 1e9) {
      if (game.nav && !practice) {
        const dx = target.node[0] - car.x, dy = target.node[1] - car.y;
        destination += " " + [dx && Math.abs(dx) + " " + (dx > 0 ? "east" : "west"), dy && Math.abs(dy) + " " + (dy > 0 ? "south" : "north")].filter(Boolean).join(" and ") + ".";
      } else {
        const d = routeDir(car.x, car.y, ...target.node, car.d);
        if (d >= 0) destination += " GPS: " + relName(d) + ".";
      }
    }
  }
  const roads = [0, 3, 1, 2].map(r => (car.d + r) % 4).filter(d => valid(car.x, car.y, d)).map(d => {
    const name = relName(d);
    if (!canGo(car.x, car.y, d)) return name + ": closed";
    const gd = goodies[edgeKey(car.x, car.y, d)];
    return name + ": " + [danger(d) ? "police danger" : "open", gd && !gd.used ? GOODIES[gd.item]?.name : ""].filter(Boolean).join(", ");
  }).join(". ") + ".";
  const nearest = nearestCop();
  const hot = Math.min(5, Math.max(heat, cops.some(c => c.chasing) ? 3 : 0));
  const police = nearest ? plural(cops.length, "police car") + ". Nearest " + plural(nearest.n, "move") + " away. " + (cops.some(c => c.chasing) ? "Police are chasing you." : "Not being chased.") : "No police cars nearby.";
  const rivalInfo = rival ? " Rival cab active." + rivalWarning() : " No rival cab.";
  const result = [
    { id:"position", label:"Location and GPS", detail:here + " " + destination },
    { id:"roads", label:"Roads and hazards", detail:roads },
    { id:"danger", label:"Police and rival", detail:police + " Wanted level " + hot + " of 5." + rivalInfo },
  ];
  if (practice) result.unshift({id:"task",label:"Practice instructions",detail:practiceStageLabel().replace(" / ", " of ") + ". " + practiceInstruction()});
  else if (shift) result.unshift(
    {id:"resources",label:"Fuel and nitro",detail:(shift.fuel == null ? "Unlimited fuel." : "Fuel: " + plural(shift.fuel,"move") + " left.") + " Nitro: " + shift.nitro + " left. " + (nitroArmed ? "Nitro armed." : "Nitro not armed.")},
    {id:"progress",label:"Money and shift progress",detail:"Level " + shift.level + ". " + shift.strikes + " of " + MAX_STRIKES + " strikes. " + plural(shift.delivered,"fare") + " delivered. " + shift.earned + " dollars earned this shift. Balance " + cash + " dollars."}
  );
  else result.unshift({id:"progress",label:"Cruise progress",detail:plural(roamCoins,"coin") + " collected. Balance " + cash + " dollars."});
  if (shift) {
    result.push({id:"seats",label:"Passenger seats",detail:plural(shift.onboard.length,"passenger") + " on board. " + plural(seatsFree(),"empty seat") + ". " + plural(waiting.filter(w=>w.x===car.x&&w.y===car.y).length,"passenger") + " waiting here."});
    shift.onboard.forEach((p,i)=>{
      const spare = p.patience == null ? "No time limit." : plural(urgency(p),"spare move") + ".";
      const dare = p.dare ? " Dare: " + dareGoal(p.dare) + ". " + Math.min(p.dare.have,p.dare.need) + " of " + p.dare.need + " complete." : "";
      result.push({id:"passenger"+i,label:"Passenger "+(i+1),detail:p.destName + ". " + spare + (p.getaway ? " Getaway passenger." : "") + dare});
    });
  }
  return result;
}
function gameStatusMenu(back, keepId) {
  const items = statusSections().map(section=>({
    id:section.id,label:section.label,say:section.label,
    act:()=>gameStatusDetail(back,section.id),
  }));
  items.push({id:"back",label:"⬅️ Back",say:"Back to pause menu",act:back});
  showMenu("Game information","Choose information to hear. No turns or fuel are used.",items,"Game information. Choose a topic.",keepId);
}
function gameStatusDetail(back,id) {
  const section=statusSections().find(s=>s.id===id);
  if(!section)return gameStatusMenu(back);
  showMenu(section.label,section.detail,[
    {id:"repeat",label:"🔊 Hear again",say:"Hear again",act:()=>Voice.speak(section.detail)},
    {id:"back",label:"⬅️ Back",say:"Back to game information",act:()=>gameStatusMenu(back,id)}
  ],section.detail);
}
function pauseMenu(keepId) {
  if (modeKey === 'practice') return practicePause(keepId);
  restartArmed = false;
  clearTimeout(autoT);
  $("#bar").classList.add("hide");
  hideArrows();
  const items = [
    {
      id: "continue",
      label: "▶️  Continue",
      say: "Continue",
      act: () => {
        hideMenu();
        openJunction(game.guide ? guidance() : "");
      },
    },
    { id: "status", label: "🔊 Game information", say: "Game information. Hear fuel, passengers, directions and hazards.", act: () => gameStatusMenu(() => pauseMenu("status")) },
    {
      id: "help",
      label: "💬  Help",
      say: "Help",
      act: () => Voice.speak(guidance(true) || "Cruise around. Listen for coins and ramps at each junction."),
    },
    { id: "settings", label: "⚙️  Settings", say: "Settings", act: () => settingsMenu(() => pauseMenu("settings")) },
  ];
  if (shift) {
    items.splice(1, 0, {
      id: "restart", label: "🔄 Restart shift", say: "Restart shift",
      act: () => confirmChoice("Restart shift?", "Your current shift will be lost.", "Restart shift",
        () => { hideMenu(); start(modeKey, level.id); }, () => pauseMenu("restart")),
    });
  }
  if (testing)
    items.push({
      id: "editor",
      label: "🏗️  Back to editor",
      say: "Back to the editor",
      act: () => {
        testing = false;
        clearWaiting();
        clearCops();
        clearRoadworks();
        if (ed?.draft) { buildLevel(ed.draft); spawnTraffic(); delete ed.draft; }
        editRoot({ keep: "test" });
      },
    });
  else
    items.push({
      id: "menu",
      label: "🏠  Main Menu",
      say: "Main menu. Your shift is saved.",
      act: titleMenu,
    });
  items.push({ id: "exit", label: "🚪  Exit Game", say: "Exit game",
    act: () => {
      if (testing && ed?.dirty) confirmChoice("Leave test drive?", "Unsaved city changes will be lost if you exit.", "Exit game", exitGame, () => pauseMenu("exit"));
      else exitGame();
    } });
  showMenu(
    "Paused",
    shift
      ? `Level ${shift.level}   Strikes ${shift.strikes} of ${MAX_STRIKES}   $${shift.earned} earned`
      : "Your cab is parked and waiting.",
    items,
    "Paused", keepId,
  );
}
function resetMenuStyle() {
  $("#menu").style.background = "";
  $("#menu").style.alignItems = "";
}
function setPlayerVisible(v) {
  if (playerMesh) playerMesh.visible = v;
  playerGlow.visible = v;
  beacon.visible = v;
  routeGroup.visible = v;
  intentGroup.visible = v;
  if (!v) {
    hideArrows();
    clearCops();
    clearRival();
  }
}
function enterPlay(k, levelId, lvObj) {
  resetMenuStyle();
  modeKey = k;
  mode = "play";
  hideMenu();
  if (lvObj) {
    buildLevel(lvObj);
    spawnTraffic();
  } else {
    buildLevel(findLevel(levelId));
    spawnTraffic();
  }
  $("#hud").classList.remove("hide");
  clearCops();
  clearWaiting();
  combo = 0;
  roamCoins = 0;
  heat = 0;
  evade = 0;
  turnNo = 0;
  nitroArmed = false;
  pendingDares = [];
  targetPick = null;
  $("#combo").textContent = "";
  if (playerMesh) scene.remove(playerMesh);
  playerMesh = makeTaxi(LIVERIES[garage.livery][1]);
  scene.add(playerMesh);
  setPlayerVisible(true);
  camSnap = true;
}
function dailySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
function start(k, levelId, lvObj) {
  const daily = k === "daily";
  if (daily) {
    levelId = BUILTIN[dailySeed() % BUILTIN.length].id;
    rand = rng(dailySeed());
  } else rand = Math.random;
  enterPlay(k, levelId, lvObj);
  Object.assign(car, { x: level.start[0], y: level.start[1], d: 2, p: 0, moving: false, ang: -Math.PI });
  shift =
    k === "cruise"
      ? null
      : {
          fuel: game.diff === 0 ? null : 40,
          onboard: [],
          strikes: 0,
          nitro: 2,
          level: 1,
          delivered: 0,
          earned: 0,
          bestCombo: 0,
        };
  if (testing) clearRoadworks(); else rollRoadworks();
  spawnWaiting();
  topUpPatrols();
  planCops();
  refreshMarkers();
  saveGame();
  if (shift) {
    banner(daily ? "Daily challenge" : "Shift start", "Three strikes and you are out");
    openJunction(
      (daily ? "Daily challenge. Everyone gets the same city and fares today. " : "Your shift starts now. ") +
        "Your cab has three seats. Collect passengers, drop them off before they lose patience, and keep away from the police. Three strikes or an empty fuel tank ends the shift. " +
        guidance(),
    );
  } else {
    banner(testing ? "Test drive" : "Cruise", "Drive anywhere");
    openJunction(testing ? "Test drive. No money or penalties. Pause to return to your city." : "Cruise the city. Listen for coins, ramps and crates.");
  }
}
function resume(sg) {
  rand = Math.random;
  enterPlay(sg.modeKey, sg.levelId, sg.citySnapshot || null);
  Object.assign(car, {
    x: sg.car.x,
    y: sg.car.y,
    d: sg.car.d,
    p: 0,
    moving: false,
    ang: (-sg.car.d * Math.PI) / 2,
  });
  shift = sg.shift;
  heat = sg.heat || 0;
  turnNo = sg.turnNo || 0;
  rollRoadworks(sg.closed);
  (sg.waiting || []).forEach((w) => {
    makeWaitingVisual(w);
    waiting.push(w);
  });
  if (sg.rival && rivalActive()) {
    addRival();
    if (rival) {
      rival.x = sg.rival.x;
      rival.y = sg.rival.y;
      rival.d = sg.rival.d;
      rival.ang = (-rival.d * Math.PI) / 2;
    }
  }
  (sg.cops || []).forEach((c) => {
    cops.push({
      x: c.x,
      y: c.y,
      d: c.d,
      p: 0,
      moving: false,
      ang: (-c.d * Math.PI) / 2,
      plan: -1,
      chasing: c.chasing !== false,
    });
    const m = makeSedan(0, "police");
    scene.add(m);
    copMeshes.push(m);
  });
  spawnWaiting();
  planCops();
  refreshMarkers();
  banner("Welcome back", shift ? "Level " + shift.level : "Cruise");
  openJunction("Welcome back. " + guidance(true));
}
