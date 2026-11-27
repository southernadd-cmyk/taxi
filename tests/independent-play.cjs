const fs=require("node:fs"),path=require("node:path");
function qualityChecks(turns,shift,settings,menus,input,sound,editor){
 let n=0;const assert=(v,m)=>{if(!v)throw Error(m);n++};
 const police=turns.slice(turns.indexOf("function policeEnabled()"),turns.indexOf("function calmCops()"));
 const p=new Function("game","shift","testing","modeKey",`let added=0,cops=[],evade=0;const car={moving:true};const copCap=()=>3;const addCop=()=>{added++;cops.push({})};const planCops=()=>{},updateHud=()=>{};${police}\nreturn {enabled:policeEnabled(),chase(){startChase(2);return added}}`);
 for(const [mode,diff,cops,test,active,expected] of [["cruise",1,1,false,false,false],["shift",0,1,false,true,false],["practice",1,1,false,true,false],["shift",1,0,false,true,false],["shift",2,2,true,true,false],["shift",1,1,false,true,true],["daily",2,2,false,true,true]]){
  const a=p({diff,cops},active?{}:null,test,mode);assert(a.enabled===expected&&a.chase()===(expected?2:0),"police gate: "+[mode,diff,cops,test].join("/"));
 }
 assert(turns.includes("getaway = policeEnabled() && hide")&&turns.includes('&& policeEnabled()) {'),"getaway and smash obey same police policy");
 assert(turns.includes("difficulty: game.diff")&&shift.includes("game.diff = sg.difficulty"),"saved ride retains difficulty");
 assert(menus.includes('id: "difficulty"')&&menus.includes("const HELP_TOPICS"),"difficulty and short help accessible");
 assert(settings.includes('["parking","brake","speechwait"]')&&settings.includes("option.disabled = true"),"inapplicable settings skipped");
 assert(input.includes("lastRelease[k] = performance.now()")&&input.includes("performance.now() - brakeAt >= HOLD_MS"),"release cooldown and hold brake");
 assert(sound.includes("Voice.latest === p")&&sound.includes("speaking ? 0.035"),"speech ducking and stale speech guard");
 assert(editor.includes('showMenu("3D graphics unavailable"')&&editor.includes('showMenu("Could not load city"'),"graphics failure has exit");
 return n;
}
console.log(`${qualityChecks(...["js/turns-carpool-police.js","js/shift.js","js/settings.js","js/menus.js","js/input-scanning-voice.js","js/sound.js","js/city-editor-and-camera.js"].map(p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8")))} independent-play checks passed`);
