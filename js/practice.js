/* A real, repeatable three-step practice fare, isolated from paid shifts. */
function practiceCity(kind = 'basic') {
  const city = makeLevel("practice", "Driving Practice", "beach", 31);
  city.segs = {};
  city.blocks[5 * B + 5] = "P";
  if (kind === "carpool") city.blocks[6 * B + 6] = "S";
  if (kind === "stunts") city.segs["4,4,1"] = "coins";
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
  if (shift.practice) return advancedInstruction();
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
  if (shift.practice) return advancedPickup(w);
  scene.remove(w.g);
  waiting = waiting.filter(x => x !== w);
  shift.onboard.push({ dest: w.dest, destName: w.destName, pay: w.pay, patience: null, getaway: false, dare: null, size: w.size });
  sfx("score");
  banner("Passenger on board", "The park");
  refreshMarkers();
  practiceJunction("Passenger on board. The park, please.");
}
function practiceArrive(caught = false) {
  if (shift.practice) return advancedArrive(caught);
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
      { id: "status", label: "🔊 Game information", say: "Game information", act: () => gameStatusMenu(() => practicePause("status")) },
      { id: "help", label: "🔊  Hear instructions", say: "Hear instructions", act: () => Voice.speak(practiceInstruction()) },
      { id: "settings", label: "⚙️  Settings", say: "Settings", act: () => settingsMenu(() => practicePause("settings")) },
      { id: "restart", label: "🔄  Restart practice", say: "Restart practice", act: () => shift.practice ? startAdvancedPractice(shift.practice.kind) : startPractice() },
      { id: "back", label: "🏠  Main menu", say: "Main menu", act: titleMenu },
      { id: "exit", label: "🚪  Exit game", say: "Exit game", act: exitGame },
    ], "Practice paused.", keepId);
}

/* Optional, deterministic challenges. Progress is held only in the practice shift. */
const PRACTICE_CHALLENGES = {
  carpool: { name: "Carpool practice", description: "Pick up two passengers, then deliver them in turn." },
  stunts: { name: "Stunt practice", description: "Collect five coins, jump a ramp, and smash crates." },
  police: { name: "Police evasion practice", description: "Read a police warning, then keep your distance for two turns." }
};
const STUNT_STEPS = [
  {kind:"coins", key:"4,4,1", a:[4,4], b:[5,4], need:5, name:"Collect five coins"},
  {kind:"ramp", key:"5,4,1", a:[5,4], b:[6,4], need:1, name:"Drive over the stunt ramp"},
  {kind:"boxes", key:"6,4,2", a:[6,4], b:[6,5], need:1, name:"Drive through the crates"}
];
function advancedPracticeMenu() {
  toMenuScene();
  showMenu("Practice challenges", "Choose a challenge. No money, strikes or saved shifts are affected.",
    [...Object.entries(PRACTICE_CHALLENGES).map(([kind,c])=>({id:kind,label:c.name,say:c.name+". "+c.description,act:()=>startAdvancedPractice(kind)})),
    {id:"back",label:"⬅️ Back",say:"Back",act:()=>titleMenu("advancedPractice")}],
    "Practice challenges. Choose carpool, stunts or police evasion. No penalties.");
}
function practicePassenger(id,x,y,dest,destName) {
  const w={id,x,y,dest,destName,dist:moves(x,y,...dest),pay:0,col:0x3ccf6a,size:"SHORT"};
  makeWaitingVisual(w);waiting.push(w);
}
function startAdvancedPractice(kind) {
  if (!PRACTICE_CHALLENGES[kind]) return advancedPracticeMenu();
  clearRoadworks();
  enterPlay("practice",null,practiceCity(kind));
  clearRival();
  shift={fuel:null,onboard:[],strikes:0,nitro:0,level:1,delivered:0,earned:0,practice:{kind,stage:0,hits:0,poolBonus:0}};
  Object.assign(car,{x:4,y:4,d:kind==="carpool"?2:1,p:0,moving:false,ang:kind==="carpool"?-Math.PI:-Math.PI/2});
  if(kind==="carpool"){
    practicePassenger("practice-a",4,5,[5,5],"the park");
    practicePassenger("practice-b",4,6,[6,6],"the shops");
  } else if(kind==="police") {
    practicePoliceSetup(false);
  }
  refreshMarkers();
  practiceJunction(PRACTICE_CHALLENGES[kind].description+" No rush and no penalties.");
}
function practicePoliceSetup(distanceStage) {
  clearCops();
  Object.assign(car,{x:4,y:4,d:1,p:0,moving:false,ang:-Math.PI/2});
  camSnap=true;
  const cop=addCop();
  if(!cop) return;
  Object.assign(cop,{x:distanceStage?0:3,y:distanceStage?3:4,d:1,ang:-Math.PI/2,chasing:true});
  // Reset the checkpoint turn clock so the warning matches the real chase plan.
  heat=3;evade=0;turnNo=0;
  planCops();
}
function practiceStageLabel() {
  const p=shift?.practice;
  if(!p) return "DRIVING PRACTICE · "+(shift.onboard.length?"3 / 3":waiting.some(w=>nodeEq([w.x,w.y],car.x,car.y))?"2 / 3":"1 / 3");
  return PRACTICE_CHALLENGES[p.kind].name.toUpperCase()+" · "+Math.min(p.stage+1,p.kind==="carpool"?4:p.kind==="stunts"?3:2)+" / "+(p.kind==="carpool"?4:p.kind==="stunts"?3:2);
}
function advancedTarget() {
  const p=shift.practice;
  if(p.kind==="carpool") {
    const w=waiting.find(w=>w.id==="practice-"+(p.stage===0?"a":"b"));
    if(p.stage<2&&w) return {kind:"pick",ref:w,node:[w.x,w.y],name:"passenger "+(p.stage+1)};
    const passenger=shift.onboard.find(q=>q.practiceId==="practice-"+(p.stage===2?"a":"b"))||shift.onboard[0];
    return passenger?{kind:"drop",ref:passenger,node:passenger.dest,name:passenger.destName}:null;
  }
  if(p.kind==="stunts"){
    const s=STUNT_STEPS[p.stage];if(!s)return null;
    const atA=nodeEq(s.a,car.x,car.y),atB=nodeEq(s.b,car.x,car.y);
    const node=atA?s.b:atB?s.a:moves(car.x,car.y,...s.a)<=moves(car.x,car.y,...s.b)?s.a:s.b;
    return {kind:"practice",ref:s,node,name:s.name};
  }
  return null;
}
function practicePoliceDirection() {
  if(shift?.practice?.kind!=="police")return -1;
  const options=[0,1,2,3].filter(d=>canGo(car.x,car.y,d)&&!danger(d));
  const score=d=>Math.min(...cops.map(c=>moves(car.x+DX[d],car.y+DZ[d],...copNext(c))));
  return options.sort((a,b)=>score(b)-score(a)||Number(b===car.d)-Number(a===car.d))[0]??-1;
}
function advancedInstruction() {
  const p=shift.practice;
  if(p.done)return "Challenge complete!";
  if(p.kind==="police"){
    const d=practicePoliceDirection();
    return (p.stage===0?"Step 1. Avoid the road marked police danger.":"Step 2. Keep at least five blocks away for two turns. "+evade+" of 2 safe turns.")+
      (d>=0?" Suggested safe direction: "+relName(d)+", marked GPS.":" Choose another road.");
  }
  const target=advancedTarget();
  if(p.kind==="carpool"&&target?.kind==="pick"&&nodeEq(target.node,car.x,car.y))
    return "Step "+(p.stage+1)+". Choose Pick up passenger "+(p.stage+1)+".";
  const d=target?routeDir(car.x,car.y,...target.node,car.d):-1;
  const hint=d>=0?" Choose "+relName(d)+", marked GPS.":"";
  if(p.kind==="carpool")return "Step "+(p.stage+1)+". "+["Drive to passenger one.","Collect passenger two before dropping anyone off.","Deliver passenger one for a carpool bonus.","Deliver the remaining passenger."][p.stage]+hint;
  const s=STUNT_STEPS[p.stage];
  return "Step "+(p.stage+1)+". "+s.name+". "+p.hits+" of "+s.need+" complete."+hint;
}
function advancedPickup(w) {
  const p=shift.practice;
  if(p.kind!=="carpool"||p.stage>1||w.id!=="practice-"+(p.stage===0?"a":"b")){
    practiceJunction("Follow the current step first.");return;
  }
  scene.remove(w.g);waiting=waiting.filter(x=>x!==w);
  shift.onboard.push({practiceId:w.id,dest:w.dest,destName:w.destName,pay:100,patience:null,getaway:false,dare:null,size:w.size});
  p.stage++;sfx("score");refreshMarkers();
  practiceJunction("Passenger on board. "+shift.onboard.length+" passengers in the cab.");
}
function practiceCollect(kind) {
  const p=shift?.practice;
  if(!p||p.kind!=="stunts"||p.done)return;
  const step=STUNT_STEPS[p.stage];
  if(kind===step.kind)p.hits=Math.min(step.need,p.hits+1);
}
function advancedArrive(caught) {
  const p=shift.practice;
  if(p.kind==="carpool"){
    if(p.stage<2&&shift.onboard.some(q=>nodeEq(q.dest,car.x,car.y))){
      practiceJunction("Keep your first passenger on board while you pick up the second.");return;
    }
    if(p.stage>=2){
      const q=shift.onboard.find(q=>q.practiceId==="practice-"+(p.stage===2?"a":"b")&&nodeEq(q.dest,car.x,car.y));
      if(q){
        shift.onboard=shift.onboard.filter(x=>x!==q);shift.delivered++;
        if(p.stage===2)p.poolBonus=Math.round(q.pay*.25*shift.onboard.length);
        p.stage++;
        if(p.stage===4)return finishAdvancedPractice("Two passengers delivered. You earned a simulated "+p.poolBonus+" dollar carpool bonus.");
        refreshMarkers();practiceJunction("First passenger delivered. Carpool bonus: "+p.poolBonus+" practice dollars.");return;
      }
    }
  } else if(p.kind==="stunts"){
    if(p.hits>=STUNT_STEPS[p.stage].need){
      p.stage++;p.hits=0;
      if(p.stage===3)return finishAdvancedPractice("Five coins collected, a ramp jumped and crates smashed.");
      const next=STUNT_STEPS[p.stage];level.segs[next.key]=next.kind;buildGoodie(next.key);
      refreshMarkers();practiceJunction("Step complete!");return;
    }
  } else if(p.kind==="police"){
    if(caught){
      practicePoliceSetup(p.stage===1);
      refreshMarkers();practiceJunction("The police caught you. No penalty. Try this step again.");return;
    }
    if(p.stage===0){
      p.stage=1;practicePoliceSetup(true);
      refreshMarkers();practiceJunction("Safe road chosen! Next checkpoint: lose the police by keeping your distance.");return;
    }
    const nc=nearestCop(true);
    if(nc&&nc.n>=5)evade++;else evade=0;
    if(evade>=2){clearCops();heat=0;return finishAdvancedPractice("You avoided danger and stayed five blocks away for two turns.");}
    planCops();
  }
  refreshMarkers();practiceJunction();
}
function finishAdvancedPractice(summary) {
  const p=shift.practice;p.done=true;
  hideArrows();refreshMarkers();sfx("win");
  showMenu("Challenge complete!",summary+" No money or saved shift has changed.",[
    {id:"again",label:"🔄 Practise again",say:"Practise again",act:()=>startAdvancedPractice(p.kind)},
    {id:"challenges",label:"More challenges",say:"More challenges",act:advancedPracticeMenu},
    {id:"back",label:"🏠 Main menu",say:"Main menu",act:titleMenu}
  ],"Challenge complete! "+summary);
}
