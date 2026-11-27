/* ======================= screens ======================= */
const menuOpen = () => !$("#menu").classList.contains("hide");
function showMenu(title, sub, items, speech, keepId) {
  clearTimeout(autoT);
  $("#menu").classList.remove("hide");
  $("#bar").classList.add("hide");
  $("#focus").classList.add("hide");
  $("#menuTitle").textContent = title;
  $("#menuSub").textContent = sub;
  hints();
  Scan.open(items, $("#menuList"), speech, keepId);
}
function confirmChoice(title, detail, actionLabel, onConfirm, onCancel) {
  showMenu(title, detail, [
    { id: "cancel", label: "⬅️ Cancel", say: "Cancel. Keep things as they are.", act: onCancel },
    { id: "confirm", label: actionLabel, say: actionLabel, act: onConfirm },
  ], title + ". " + detail);
}
function startNewShift(k, levelId, back) {
  if (!savedGame()) return start(k, levelId);
  confirmChoice("Replace saved ride?", "Starting a new ride replaces the saved ride. Your money and records are kept.",
    "Start new ride", () => start(k, levelId), back);
}
function hideMenu() {
  $("#menu").classList.add("hide");
}
function showBar(items, speech, detail = "") {
  const prompt = $("#choicePrompt");
  if (prompt) {
    prompt.textContent = detail;
    prompt.classList.toggle("hide", !detail);
  }
  $("#bar").classList.remove("hide");
  hints();
  Scan.open(items, $("#opts"), speech);
  resize();
}
function exitGame() {
  Voice.speak("Exit game");
  if (window.parent !== window && window.NarbeScanManager) {
    Scan.close();
    window.NarbeScanManager?.resetInputState?.();
    window.SafeAudio?.stopAll?.();
    try {
      window.parent.postMessage({ action: "focusBackButton" }, location.origin);
    } catch (e) {}
    return;
  }
  showMenu(
    "Exit Game",
    "You can close this tab now. Your progress is saved.",
    [{ id: "back", label: "⬅️  Back to Main Menu", say: "Back to main menu", act: titleMenu }],
    "You can close this tab now. Your progress is saved.",
  );
}
function toMenuScene() {
  if (modeKey === 'practice') { shift = null; modeKey = 'shift'; }
  resetMenuStyle();
  clearRoadworks();
  mode = "menu";
  testing = false;
  $("#hud").classList.add("hide");
  setPlayerVisible(false);
  hideEditorMarks();
  clearWaiting();
}
function titleMenu(keepId) {
  toMenuScene();
  resetArmed = false;
  const items = [];
  const sg = savedGame();
  if (sg && MODES[sg.modeKey])
    items.push({
      id: "continue",
      label: "▶️  Continue " + (sg.modeKey === "cruise" ? "cruising" : "your shift"),
      say: "Continue where you left off",
      act: () => resume(sg),
    });
  items.push(
    { id: "practice", label: "🚕  Learn to drive", say: "Learn to drive. Practise a fare with no pressure.", act: startPractice },
    {
      id: "shift",
      label: "🚕  Start a shift",
      say: "Start a taxi shift. Carry passengers, dodge the police.",
      act: shiftMenu,
    },
    {
      id: "cruise",
      label: "🌴  Cruise",
      say: "Cruise. Drive anywhere, no fares, collect coins.",
      act: () => cityMenu("cruise"),
    },
    {
      id: "garage",
      label: "🎨  Paint shop",
      say: "Paint shop. Buy new colours for your cab.",
      act: openGarage,
    },
    { id: "editor", label: "🏗️  City editor", say: "City editor. Build your own city.", act: editorMenu },
    { id: "how", label: "❓  How to Play", say: "How to play", act: () => howTo(titleMenu) },
    { id: "settings", label: "⚙️  Settings", say: "Settings", act: () => settingsMenu(() => titleMenu("settings")) },
    { id: "credits", label: "📜  Credits", say: "Credits", act: creditsMenu },
    { id: "exit", label: "🚪  Exit Game", say: "Exit game", act: exitGame },
  );
  showMenu("Switch Cab", `${rankOf(earned)}   $${cash}`, items, "Switch Cab. Main menu.", keepId);
}
function shiftMenu(keepId) {
  showMenu(
    "Taxi shift",
    "Three strikes and your shift is over.",
    [
      {
        id: "shift",
        label: "🚕  Shift: choose a city",
        say: "Taxi shift. Choose a city.",
        act: () => cityMenu("shift"),
      },
      {
        id: "daily",
        label: "📅  Daily challenge",
        say:
          "Daily challenge. The same city and fares for everyone today." +
          (records["daily:" + todayStr() + ":" + game.diff]
            ? " Your best today is " + records["daily:" + todayStr() + ":" + game.diff] + " dollars."
            : ""),
        act: () => startNewShift("daily", null, () => shiftMenu("daily")),
      },
      { id: "back", label: "⬅️  Back", say: "Back", act: () => titleMenu("shift") },
    ],
    "Taxi shift", keepId,
  );
}
function cityMenu(k, keepId) {
  const items = allLevels().map((l) => {
    const rec = k === "shift" ? records[l.id + ":" + game.diff] : 0;
    return {
      id: "lv" + l.id,
      label:
        (l.builtin ? "🌆  " : "⭐  ") +
        l.name +
        "  (" +
        PALETTES[l.theme].name +
        ")" +
        (rec ? "   🏆 $" + rec : ""),
      say: l.name + ", " + PALETTES[l.theme].name + (rec ? ". Your record is " + rec + " dollars" : ""),
      act: () => startNewShift(k, l.id, () => cityMenu(k, 'lv' + l.id)),
    };
  });
  items.push({ id: "back", label: "⬅️  Back", say: "Back", act: k === "shift" ? () => shiftMenu("shift") : () => titleMenu("cruise") });
  showMenu("Choose a city", "", items, "Choose a city", keepId);
}
const HOW =
  "You drive a taxi with three seats. The game moves in turns: every time you choose a way at a junction, your cab moves one block, every police car moves one block, and every passenger loses one move of patience. Nothing is timed. People waiting for a cab are labelled long, medium or short. Pick up to three, then plan the best order to drop them off. If a passenger runs out of patience, they walk out, and that is a strike. Three strikes ends your shift. Your cab also uses one fuel every move, and each drop-off refuels it, more for quick deliveries. On Relaxed there is no fuel limit. From level 3, patrol cars drive around the city. Get within a few moves of one and it spots you and gives chase. Police show their next move with red arrows, and a road marked police danger, with an alarm sound, will get you caught. Stay five moves away from every chasing car for two turns to lose them. Chasing cars sometimes stop to wait, which is your chance. Coins, ramps and crates earn tips, bigger with more passengers on board. Passengers may offer a dare for double pay. When you drop someone off, every other passenger still in the cab adds a quarter to the fare, and fares in a row without a strike build a streak. From level 2 a rival cab races you for waiting fares, with purple arrows showing its next move. Nitro moves you two blocks in one turn. Every three fares the city gets busier. Your cab also uses one fuel every move. Each drop-off refuels it, more for quick deliveries, so you cannot just hide from the police forever. Run out and the shift ends.";
function howTo(back) {
  showMenu(
    "How to Play",
    HOW,
    [
      { id: "practice", label: "🚕  Practise a fare", say: "Practise a fare", act: startPractice },
      { id: "again", label: "🔊  Hear it again", say: "Hear it again", act: () => Voice.speak(HOW) },
      {
        id: "sounds",
        label: "🎵  Hear the direction sounds",
        say: "Hear the direction sounds",
        act: demoSounds,
      },
      { id: "back", label: "⬅️  Back", say: "Back", act: back },
    ],
    HOW,
  );
}
function demoSounds() {
  const seq = [
    ["straight", "Straight on"],
    ["left", "Turn left"],
    ["right", "Turn right"],
    ["around", "Turn around"],
    ["gps", "GPS way"],
  ];
  let p = Promise.resolve();
  seq.forEach(([s, t]) => {
    p = p
      .then(() => {
        sfx(s);
        return new Promise((r) => setTimeout(r, 500));
      })
      .then(() => Voice.speak(t))
      .then(() => new Promise((r) => setTimeout(r, 300)));
  });
}
const CREDITS =
  "Taxi model by maregajavier, licensed CC BY 4.0.\nCity buildings, trees and lamps: Modular City Environment by Spicy_EJ, licensed CC BY 4.0.\nBoth from Sketchfab. Changes: resized, split into parts and recoloured.";
function creditsMenu() {
  showMenu(
    "Credits",
    CREDITS,
    [{ id: "back", label: "⬅️  Back", say: "Back", act: titleMenu }],
    CREDITS.replace(/\n/g, " "),
  );
}
function garageItems() {
  const items = LIVERIES.map(([name, col, price], i) => {
    const own = garage.owned.includes(i),
      armed = false;
    if (own)
      return {
        id: "l" + i,
        label: (garage.livery === i ? "✅  " : "🎨  ") + name + (garage.livery === i ? " (on your cab)" : ""),
        say: name + (garage.livery === i ? ", on your cab now" : ", choose to paint your cab"),
        act: () => {
          garage.livery = i;
          saveProgress();
          showGarageCar();
          Voice.speak("Painted " + name);
          garageRefresh("l" + i);
        },
      };
    return {
      id: "l" + i,
      label: (armed ? "💰  Choose again to buy " : "🔒  ") + name + "  $" + price,
      say: armed
        ? "Choose again to buy " + name + " for " + price + " dollars"
        : name + ", costs " + price + " dollars",
      act: () => {
        if (cash < price) {
          Voice.speak("You need " + (price - cash) + " more dollars for " + name);
          sfx("bust", 0.5);
          return;
        }
        confirmChoice("Buy " + name + "?", "This costs " + price + " dollars.", "Buy " + name,
          () => {
            if (cash < price) return openGarage("l" + i);
            cash -= price;
            garage.owned.push(i);
            garage.livery = i;
            saveProgress();
            sfx("cash");
            sfx("win");
            openGarage("l" + i);
          }, () => openGarage("l" + i));

      },
    };
  });
  items.push({
    id: "back",
    label: "⬅️  Back",
    say: "Back",
    act: () => {
      buyArmed = null;
      titleMenu("garage");
    },
  });
  return items;
}
function garageRefresh(id) {
  if (buyArmed !== null && id !== "l" + buyArmed) buyArmed = null;
  $("#menuSub").textContent = `You have $${cash}`;
  Scan.setItems(garageItems(), id);
}
function showGarageCar() {
  if (playerMesh) scene.remove(playerMesh);
  playerMesh = makeTaxi(LIVERIES[garage.livery][1]);
  scene.add(playerMesh);
  Object.assign(car, { x: 4, y: 4, d: 1, p: 0, moving: false, ang: -Math.PI / 2 });
  playerMesh.visible = true;
}
function openGarage(keepId) {
  buyArmed = null;
  mode = "garage";
  showMenu("Paint shop", `You have $${cash}`, garageItems(), "Paint shop. You have " + cash + " dollars.", keepId);
  showGarageCar();
  $("#menu").style.background =
    "linear-gradient(90deg,rgba(10,6,24,.95) 0,rgba(10,6,24,.85) 45%,rgba(10,6,24,0) 75%)";
  $("#menu").style.alignItems = "flex-start";
}
