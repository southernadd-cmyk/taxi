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
// Achievements use the existing saved progress, not a second save system.
const ACHIEVEMENT_GROUPS = [
  {id:"career",name:"Career ranks"},
  {id:"records",name:"Shift and daily records"},
  {id:"paint",name:"Paint collection"},
];
function achievementEntries() {
  const scores = Object.entries(records).filter(([key,value])=>Number.isFinite(value)&&value>0);
  const best = Math.max(0,...scores.map(([,value])=>value));
  const daily = Math.max(0,...scores.filter(([key])=>key.startsWith("daily:")).map(([,value])=>value));
  const colours = garage.owned.filter((id,i,a)=>Number.isInteger(id)&&id>=0&&id<LIVERIES.length&&a.indexOf(id)===i).length;
  const entry=(group,id,name,goal,value,unit,requirement)=>({group,id,name,goal,value,unit,requirement,unlocked:value>=goal});
  return [
    ...RANKS.slice(1).map(([goal,name],i)=>entry("career","rank"+i,name,goal,earned,"dollars earned","Earn "+goal+" dollars over your career.")),
    ...[[500,"Good shift"],[1500,"Busy cab"],[3000,"Record breaker"]].map(([goal,name],i)=>entry("records","record"+i,name,goal,best,"dollars","Earn "+goal+" dollars in a single completed shift or daily challenge.")),
    entry("records","daily","Daily driver",1,daily>0?1:0,"daily record","Finish a daily challenge with a positive score."),
    entry("records","daily500","Daily high flyer",500,daily,"dollars","Earn 500 dollars in a completed daily challenge."),
    entry("paint","paint2","Fresh coat",2,colours,"colours","Own two cab colours, including the original yellow."),
    entry("paint","paint4","Colour collector",4,colours,"colours","Own four cab colours."),
    entry("paint","gold","Golden cab",1,garage.owned.includes(6)?1:0,"gold paint","Buy the solid gold cab colour."),
    entry("paint","all","Full paint shop",LIVERIES.length,colours,"colours","Own every cab colour."),
  ];
}
function achievementDetail(a) {
  return (a.unlocked?"Unlocked. ":"Not yet unlocked. ")+a.requirement+" Progress: "+Math.min(a.value,a.goal)+" of "+a.goal+" "+a.unit+".";
}
function achievementsMenu(keepId) {
  const all=achievementEntries(), count=all.filter(a=>a.unlocked).length;
  const items=ACHIEVEMENT_GROUPS.map(g=>{
    const entries=all.filter(a=>a.group===g.id),n=entries.filter(a=>a.unlocked).length;
    return {id:g.id,label:g.name+" ("+n+"/"+entries.length+")",say:g.name+". "+n+" of "+entries.length+" unlocked.",act:()=>achievementGroup(g.id)};
  });
  items.push({id:"back",label:"⬅️ Back",say:"Back to main menu",act:()=>titleMenu("achievements")});
  const summary=count+" of "+all.length+" achievements unlocked.";
  showMenu("Achievements",summary,items,"Achievements. "+summary,keepId);
}
function achievementGroup(id,keepId) {
  const g=ACHIEVEMENT_GROUPS.find(g=>g.id===id);
  const entries=achievementEntries().filter(a=>a.group===id);
  const items=entries.map(a=>({
    id:a.id,label:(a.unlocked?"✅ ":"🔒 ")+a.name,
    say:a.name+". "+(a.unlocked?"Unlocked.":"Not yet unlocked."),
    act:()=>achievementScreen(id,a.id)
  }));
  items.push({id:"back",label:"⬅️ Back",say:"Back to achievements",act:()=>achievementsMenu(id)});
  const summary=entries.filter(a=>a.unlocked).length+" of "+entries.length+" unlocked.";
  showMenu(g.name,summary,items,g.name+". "+summary,keepId);
}
function achievementScreen(group,id) {
  const a=achievementEntries().find(a=>a.id===id);
  const detail=achievementDetail(a);
  showMenu(a.name,detail,[
    {id:"repeat",label:"🔊 Hear again",say:"Hear again",act:()=>Voice.speak(detail)},
    {id:"back",label:"⬅️ Back",say:"Back to "+ACHIEVEMENT_GROUPS.find(g=>g.id===group).name,act:()=>achievementGroup(group,id)},
  ],a.name+". "+detail);
}
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
