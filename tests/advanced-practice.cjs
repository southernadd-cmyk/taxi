const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const src=fs.readFileSync(path.join(__dirname,"../js/practice.js"),"utf8");
function advancedTests(src,assert){
 const a=new Function(src+`
 const B=8,DX=[0,1,0,-1],DZ=[-1,0,1,0],car={},scene={remove(){}};
 let shift,modeKey="practice",waiting=[],level,cops=[],heat=0,evade=0,camSnap,menu,spoken,builds=[],caughtDistance=5;
 function makeLevel(){return {segs:{},blocks:Array(64).fill("H")}}
 function clearRoadworks(){} function enterPlay(k,i,l){level=l;waiting=[];cops=[]}
 function clearRival(){} function clearCops(){cops=[];evade=0}
 function addCop(){const c={};cops.push(c);return c}
 function planCops(){cops.forEach(c=>c.plan=1)}
 function nearestCop(){return {n:caughtDistance}}
 function copNext(c){return [c.x+DX[c.plan],c.y+DZ[c.plan]]}
 function danger(d){return d===3} function canGo(x,y,d){return true}
 function makeWaitingVisual(w){w.g={}}
 function refreshMarkers(){} function hideArrows(){} function sfx(){} function banner(){}
 function openJunction(s){spoken=s} function showMenu(title,sub,items,speech){menu={title,sub,items,speech}}
 function toMenuScene(){} function titleMenu(){} function shiftMenu(){} function settingsMenu(){} function exitGame(){}
 function buildGoodie(k){builds.push(k)}
 function moves(x,y,tx,ty){return Math.abs(x-tx)+Math.abs(y-ty)}
 function routeDir(x,y,tx,ty){return x<tx?1:x>tx?3:y<ty?2:y>ty?0:-1}
 function relName(d){return ["straight on","right","turn around","left"][(d-car.d+4)%4]}
 function nodeEq(a,x,y){return a&&a[0]===x&&a[1]===y}
 return {startAdvancedPractice,advancedTarget,practiceCollect,practicePoliceDirection,practicePickup,practicePause,
 arrive(x,y,caught=false){car.x=x;car.y=y;practiceArrive(caught)},distance(n){caughtDistance=n},state(){return {shift,waiting,level,cops,car,evade,menu,spoken,builds,heat}}};
 `)();
 let n=0;const eq=(x,y)=>{assert.equal(x,y);n++};
 a.startAdvancedPractice("carpool");eq(a.state().waiting.length,2);eq(a.advancedTarget().ref.id,"practice-a");
 a.practicePickup(a.state().waiting[1]);eq(a.state().shift.onboard.length,0);
 a.practicePickup(a.state().waiting[0]);eq(a.advancedTarget().ref.id,"practice-b");a.arrive(5,5);eq(a.state().shift.onboard.length,1);
 a.practicePickup(a.state().waiting[0]);eq(a.state().shift.onboard.length,2);eq(a.advancedTarget().ref.practiceId,"practice-a");
 a.arrive(5,5);eq(a.state().shift.practice.poolBonus,25);eq(a.state().shift.onboard.length,1);a.arrive(6,6);eq(a.state().menu.title,"Challenge complete!");eq(a.state().shift.delivered,2);
 a.state().menu.items[0].act();eq(a.state().waiting.length,2);eq(a.state().shift.practice.stage,0);
 a.startAdvancedPractice("stunts");eq(a.state().level.segs["4,4,1"],"coins");a.practiceCollect("ramp");eq(a.state().shift.practice.hits,0);
 for(let i=0;i<5;i++)a.practiceCollect("coins");a.arrive(5,4);eq(a.state().shift.practice.stage,1);eq(a.state().level.segs["5,4,1"],"ramp");
 a.practiceCollect("ramp");a.arrive(6,4);eq(a.state().level.segs["6,4,2"],"boxes");a.practiceCollect("boxes");a.arrive(6,5);eq(a.state().menu.title,"Challenge complete!");
 a.startAdvancedPractice("police");eq(a.state().cops.length,1);eq(a.state().heat,3);eq(a.practicePoliceDirection()!==3,true);
 a.arrive(3,4,true);eq(a.state().shift.practice.stage,0);eq(a.state().shift.strikes,0);
 a.arrive(5,4);eq(a.state().shift.practice.stage,1);eq(a.state().evade,0);
 a.distance(5);a.arrive(5,4);eq(a.state().evade,1);a.distance(4);a.arrive(6,4);eq(a.state().evade,0);
 a.distance(5);a.arrive(5,4);a.arrive(6,4,true);eq(a.state().evade,0);eq(a.state().shift.practice.stage,1);
 a.arrive(5,4);a.arrive(6,4);eq(a.state().menu.title,"Challenge complete!");eq(a.state().cops.length,0);eq(a.state().heat,0);eq(a.state().shift.earned,0);
 return n;
}
console.log("Advanced practice: "+advancedTests(src,assert)+" checks passed.");
