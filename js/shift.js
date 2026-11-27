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
  items.push({ id: "exit", label: "🚪  Exit Game", say: "Exit game", act: exitGame });
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
  enterPlay(sg.modeKey, sg.levelId);
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
