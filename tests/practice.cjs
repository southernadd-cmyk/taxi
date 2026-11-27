const fs=require("node:fs"),path=require("node:path");
function testPractice(p,t,m,s,c,city,h){
 let n=0;const assert=(v,msg)=>{if(!v)throw Error(msg);n++};
 const geo=city.slice(0,city.indexOf("/* ======================= themes"));
 const save=t.slice(t.indexOf("function saveGame()"),t.indexOf("function savedGame()"));
 const menu=m.slice(m.indexOf("function toMenuScene()"),m.indexOf("function titleMenu()"));
 const a=new Function("matchMedia",geo+`
 let modeKey="shift",mode="menu",shift=null,waiting=[],car={},writes=0,cash=900,earned=2000,level,menu,spoken,testing=false;
 function makeLevel(id,name,theme){return {id,name,theme,segs:{a:"coins"},blocks:Array(64).fill("H")}}
 function clearRoadworks(){closed.clear()} function enterPlay(k,id,lv){modeKey=k;mode="play";waiting=[];level=lv}
 function clearRival(){} function makeWaitingVisual(w){w.g={}} const scene={remove(){}};
 function refreshMarkers(){} function openJunction(s){spoken=s} function sfx(){} function banner(){} function hideArrows(){}
 function showMenu(title,sub,items,speech){menu={title,sub,items,speech}} function hideMenu(){menu=null}
 function settingsMenu(back){menu={back}} function titleMenu(){toMenuScene()} function shiftMenu(){menu={title:"Real shift"}}
 function exitGame(){} const Voice={speak(s){spoken=s}}; function saveProgress(){writes++} function store(){writes++}
 function resetMenuStyle(){} const $=()=>({classList:{add(){}}});function setPlayerVisible(){} function hideEditorMarks(){} function clearWaiting(){waiting=[]}
 const REL=["straight on","right","turn around","left"];function relName(d){return REL[(d-car.d+4)%4]}
 function nodeEq(a,x,y){return a&&a[0]===x&&a[1]===y}
 ${save}
 ${menu}
 ${p}
 return {startPractice,practicePickup,practicePause,saveGame,step(d){if(!canGo(car.x,car.y,d))throw Error("invalid");car.x+=DX[d];car.y+=DZ[d];car.d=d;practiceArrive()},state(){return {modeKey,mode,shift,waiting,car,level,menu,spoken,writes,cash,earned,closed}}};
 `)(()=>({matches:false}));
 a.startPractice();let v=a.state();assert(v.modeKey==="practice"&&v.shift.fuel===null&&v.shift.nitro===0,"no fuel or nitro");assert(Object.keys(v.level.segs).length===0&&v.closed.size===0,"no hazards");assert(v.waiting.length===1&&v.spoken.includes("Step 1")&&v.spoken.includes("straight on"),"initial guidance");a.saveGame();assert(a.state().writes===0,"practice save inert");
 a.step(1);assert(a.state().spoken.includes("Step 1")&&a.state().waiting.length===1,"wrong turn safe");a.step(3);a.step(2);assert(a.state().spoken.includes("Step 2"),"arrive at passenger");a.practicePause();v=a.state();assert(v.menu.title==="Practice paused"&&v.menu.items.some(x=>x.id==="exit"),"pause reachable");v.menu.items.find(x=>x.id==="continue").act();assert(a.state().spoken.includes("Step 2"),"resume task");
 a.practicePickup(a.state().waiting[0]);v=a.state();assert(v.shift.onboard.length===1&&v.shift.onboard[0].patience===null&&v.waiting.length===0&&v.spoken.includes("Step 3"),"pickup unlimited patience");a.step(0);assert(a.state().shift.onboard.length===1,"detour safe");a.step(2);a.step(1);v=a.state();assert(v.menu.title==="Fare complete!"&&v.shift.delivered===1&&v.shift.onboard.length===0,"delivery complete");assert(v.writes===0&&v.cash===900&&v.earned===2000,"money untouched");v.menu.items.find(x=>x.id==="again").act();assert(a.state().waiting.length===1&&a.state().car.x===4&&a.state().car.y===4,"replay");a.practicePause();a.state().menu.items.find(x=>x.id==="back").act();assert(a.state().mode==="menu"&&a.state().modeKey==="shift"&&a.state().shift===null,"exit clears state");
 assert(t.includes("if (!practice && game.wait")&&t.includes("game.nav && !practice ? -1 : g"),"GPS forced and auto drive disabled");assert(t.includes("if (practice) return practicePickup(w);")&&t.includes("if (modeKey === 'practice') return practiceArrive();"),"real pickup and arrival hook");assert(s.includes("if (modeKey === 'practice') return practicePause();"),"real pause hook");assert(c.includes("game.nav && modeKey !== 'practice'"),"route visible");assert(h.includes('src="js/practice.js"')&&h.indexOf('src="js/practice.js"')<h.indexOf('src="js/city-editor-and-camera.js"'),"load order");return n;
}
console.log(`${testPractice(...["js/practice.js","js/turns-carpool-police.js","js/menus.js","js/shift.js","js/city-editor-and-camera.js","js/city.js","index.html"].map(p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8")))} practice assertions passed`);
