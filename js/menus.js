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
function showBar(items, speech, keep, feedback) {
  $("#bar").classList.remove("hide");
  hints();
  Scan.open(items, $("#opts"), speech, keep, feedback);
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
    ["Relaxed: no fuel limit, police or impatient passengers.", "Normal: three strikes and your shift is over.", "Tough: tighter fares and faster rivals."][game.diff],
    [
      {
        id: "shift",
        label: "🚕  Shift: choose a city",
        say: "Taxi shift. Choose a city.",
        act: () => cityMenu("shift"),
      },
      {
        id: "difficulty", label: "Difficulty: " + ["Relaxed","Normal","Tough"][game.diff],
        say: "Difficulty: " + ["Relaxed","Normal","Tough"][game.diff] + ". Choose to change.",
        act: () => { game.diff = (game.diff + 1) % 3; saveGameSettings(); shiftMenu("difficulty"); },
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
const HELP_TOPICS = [
  ["Driving", "Choose a direction at each junction. The cab waits while you decide. GPS marks a suggested route. There is no need to rush."],
  ["Passengers", "Collect up to three passengers. Follow GPS to their destinations. In Normal and Tough modes, watch each passenger's remaining moves and your fuel."],
  ["Police and rivals", "Normal and Tough shifts have police and a rival cab. Avoid roads marked police danger. Stay five moves away from pursuing police for two turns to escape. Cruise and Relaxed have no police."],
  ["Tips and dares", "Coins, ramps and crates earn tips. Accept a passenger's optional dare for double fare if completed, or half fare if missed. Nitro moves two blocks."],
  ["Progress", "Earn money, unlock paint colours and beat your records. Cruise has no fail state. You can pause at every junction and return to the main menu."],
];
function howTo(back) {
  showMenu("How to play", "Choose a short topic, or practise a fare.", [
    {id:"practice",label:"🚕 Practise a fare",say:"Practise a fare",act:startPractice},
    ...HELP_TOPICS.map(([label,detail],j)=>({id:"help"+j,label,say:label,act:()=>showMenu(label,detail,[
      {id:"again",label:"Hear again",say:"Hear again",act:()=>Voice.speak(detail)},
      {id:"back",label:"Back to topics",say:"Back to topics",act:()=>howTo(back)}
    ],detail)})),
    {id:"sounds",label:"Hear direction sounds",say:"Hear direction sounds",act:()=>soundMenu(()=>howTo(back))},
    {id:"back",label:"Back",say:"Back",act:back}
  ],"How to play. Choose a topic or practise a fare.");
}
function soundMenu(back) {
  const seq=[["straight","Straight on"],["left","Turn left"],["right","Turn right"],["around","Turn around"],["gps","GPS way"]];
  showMenu("Direction sounds","Choose a sound to hear it.",[
    ...seq.map(([id,label])=>({id,label,say:label,act:()=>{sfx(id);Voice.speak(label)}})),
    {id:"back",label:"Back",say:"Back",act:back}
  ],"Direction sounds");
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
