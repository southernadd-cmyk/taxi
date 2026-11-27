/* ======================= progress ======================= */
if (game.guide === undefined) game.guide = 1;
if (game.diff === undefined) game.diff = 1;
if (game.nav === undefined) game.nav = 0;
const records = load("switchcity-records", {});
const SPARE = [null, 5, 2],
  WORKS = [2, 4, 5];
const LIVERIES = [
  ["Classic yellow", 0xf5a20a, 0],
  ["Hot pink", 0xff4fa3, 400],
  ["Ocean teal", 0x16b8b0, 800],
  ["Royal purple", 0x6a4cff, 1500],
  ["Midnight", 0x1e2a44, 2500],
  ["Fire red", 0xe0261b, 4000],
  ["Solid gold", 0xffc933, 10000],
];
const garage = Object.assign({ owned: [0], livery: 0 }, load("switchcity-garage2", {}));
let earned = +load("switchcity-earned", 0) || 0;
const RANKS = [
  [0, "Rookie"],
  [500, "Cabbie"],
  [2000, "Pro"],
  [6000, "Road legend"],
  [15000, "King of the city"],
];
const rankOf = (e) => RANKS.filter((r) => e >= r[0]).pop()[1];
function saveProgress() {
  store("switchcity-cash", cash);
  store("switchcity-earned", earned);
  store("switchcity-garage2", garage);
}
function earn(n) {
  if (testing || modeKey === "practice") return;
  const before = rankOf(earned);
  cash += n;
  earned += n;
  if (shift) shift.earned += n;
  saveProgress();
  updateHud();
  const after = rankOf(earned);
  if (after !== before)
    setTimeout(() => {
      banner("Promoted!", after);
      sfx("rank");
      Voice.speak("Promoted! You are now " + (/^[AEIOU]/i.test(after) ? "an " : "a ") + after + ".");
    }, 1500);
}
function applyUI() {
  document.documentElement.dataset.ui = game.ui;
  setTimeout(resize, 50);
}
