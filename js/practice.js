/* A real, repeatable three-step practice fare, isolated from paid shifts. */
function practiceCity() {
  const city = makeLevel("practice", "Driving Practice", "beach", 31);
  city.segs = {};
  city.blocks[5 * B + 5] = "P";
  return city;
}
function startPractice() {
  clearRoadworks();
  enterPlay("practice", null, practiceCity());
  clearRival();
  shift = { fuel: null, onboard: [], strikes: 0, nitro: 0, level: 1, delivered: 0, earned: 0 };
  Object.assign(car, { x: 4, y: 4, d: 2, p: 0, moving: false, ang: -Math.PI });
  const w = { id: "practice-passenger", x: 4, y: 5, dest: [5, 5], destName: "the park", dist: 1, pay: 58, col: 0x3ccf6a, size: "SHORT" };
  makeWaitingVisual(w);
  waiting.push(w);
  refreshMarkers();
  practiceJunction("Welcome to driving practice. No rush. No penalties.");
}
function practiceInstruction() {
  if (!shift) return "";
  if (shift.delivered) return "Practice complete. Your passenger has arrived.";
  const w = waiting[0];
  if (w && car.x === w.x && car.y === w.y) return "Step 2. Choose Pick up to let your passenger in.";
  const dest = shift.onboard.length ? shift.onboard[0].dest : w?.dest && [w.x, w.y];
  const d = dest ? routeDir(car.x, car.y, dest[0], dest[1], car.d) : -1;
  const name = d >= 0 ? relName(d) : "the GPS way";
  const instruction = shift.onboard.length ? "Step 3. Take your passenger to the park." : "Step 1. Drive to your passenger.";
  return instruction + " Choose " + name + ", marked GPS.";
}
function practiceJunction(prefix = "") {
  const speech = [prefix, practiceInstruction()].filter(Boolean).join(" ");
  openJunction(speech);
}
function practicePickup(w) {
  if (modeKey !== "practice" || !waiting.includes(w)) return;
  scene.remove(w.g);
  waiting = waiting.filter(x => x !== w);
  shift.onboard.push({ dest: w.dest, destName: w.destName, pay: w.pay, patience: null, getaway: false, dare: null, size: w.size });
  sfx("score");
  banner("Passenger on board", "The park");
  refreshMarkers();
  practiceJunction("Passenger on board. The park, please.");
}
function practiceArrive() {
  if (shift.onboard.some(p => nodeEq(p.dest, car.x, car.y))) {
    shift.onboard = [];
    shift.delivered = 1;
    refreshMarkers();
    hideArrows();
    sfx("win");
    showMenu("Fare complete!", "You drove, picked up a passenger and delivered them. Practice does not change your money or saved shift.",
      [
        { id: "again", label: "🚕  Practise again", say: "Practise again", act: startPractice },
        { id: "shift", label: "▶️  Start a real shift", say: "Start a real shift", act: () => { toMenuScene(); shiftMenu(); } },
        { id: "back", label: "🏠  Main menu", say: "Main menu", act: titleMenu },
      ], "Fare complete! You delivered your first passenger. Well done.");
    return;
  }
  refreshMarkers();
  practiceJunction();
}
function practicePause(keepId) {
  hideArrows();
  showMenu("Practice paused", "Your cab is waiting.",
    [
      { id: "continue", label: "▶️  Continue", say: "Continue", act: () => { hideMenu(); practiceJunction(); } },
      { id: "help", label: "🔊  Hear instructions", say: "Hear instructions", act: () => Voice.speak(practiceInstruction()) },
      { id: "settings", label: "⚙️  Settings", say: "Settings", act: () => settingsMenu(() => practicePause("settings")) },
      { id: "restart", label: "🔄  Restart practice", say: "Restart practice", act: startPractice },
      { id: "back", label: "🏠  Main menu", say: "Main menu", act: titleMenu },
      { id: "exit", label: "🚪  Exit game", say: "Exit game", act: exitGame },
    ], "Practice paused.", keepId);
}
