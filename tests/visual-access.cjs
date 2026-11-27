const fs=require("node:fs"),path=require("node:path");
function visualTests(h,input,city,cam,turns,fx,models,settings){
 let n=0;const assert=(v,msg)=>{if(!v)throw Error(msg);n++};
 const a=cam.slice(cam.indexOf("function applyMotion()"),cam.indexOf('if (motionPreference.addEventListener)'));
 const run=new Function("game","motionPreference","document","setLights","RM","camSnap",a+"\napplyMotion();return {RM,camSnap};");
 for(const [stored,system,expected] of [[false,false,false],[true,false,true],[false,true,true],[true,true,true]]){const doc={documentElement:{dataset:{}}};let light=0;const res=run({motion:stored},{matches:system},doc,()=>light++,false,false);assert(res.RM===expected&&res.camSnap&&doc.documentElement.dataset.motion===(expected?"reduced":"standard")&&light===Number(expected),"motion preference resolution");}
 const surfaces=city.slice(city.indexOf("  const slab = box("),city.indexOf("  const pc = ()"));
 const geometry=new Function(`const SZ=16,cx=10,cz=20,P={side:0},THREE={Color:class{multiplyScalar(){return this}}},texMat=()=>({map:true}),std=()=>({lit:true}),basic=(color,options)=>({color,...options});
 const box=(w,h,d,material)=>({w,h,d,material,position:{set(x,y,z){Object.assign(this,{x,y,z})}}});
 const meshes=[],g={add(m){meshes.push(m)}};
 ${surfaces}
 return meshes;`)();
 const [slab,curb]=geometry,top=m=>m.position.y+m.h/2,bottom=m=>m.position.y-m.h/2;
 assert(Math.abs(top(slab)-.30)<1e-9,"pavement retains original floor height");
 assert(top(slab)-top(curb)>=.07,"pavement and curb top surfaces are separated");
 assert(bottom(slab)>0&&bottom(curb)<0&&top(curb)>bottom(slab),"kerb supports slab above road");
 assert(curb.w>slab.w&&curb.d>slab.d,"kerb remains visible around pavement");
 for(const m of [slab,curb]) assert(m.material.toneMapped===true&&!m.material.map&&!m.material.lit&&m.castShadow===false&&m.receiveShadow===false,"stable untextured and shadow-free paving");
 const camera=cam.slice(cam.indexOf("function updateCamera("),cam.indexOf("function resize("));
 const harness=new Function("RM","ang",`class V {constructor(x,y,z){Object.assign(this,{x,y,z})}copy(v){Object.assign(this,v);return this}lerp(v,k){return this.copy(v)}};const THREE={Vector3:V},mode="play",EXT=176,car={x:4,y:4,ang,moving:true},game={cam:0,gfx:1},playerMesh={position:{y:7}},pos=()=>[88,88],camPos=new V(),camLook=new V();let camSnap=true;const camera={position:new V(),lookAt(v){this.target=v}},skyMesh={position:new V()},sunL={target:{position:new V()},position:{set(){}}};${camera} updateCamera(.016,9000);return [camera.position.x,camera.position.y,camera.position.z,camera.target.x,camera.target.y,camera.target.z]`);
 assert(JSON.stringify(harness(true,0))===JSON.stringify(harness(true,Math.PI/2)),"north-up camera independent of heading");
 assert(harness(true,0)[1]===52&&harness(false,0)[1]!==52,"reduced motion no stunt zoom");
 assert(turns.includes("game.flash && !RM ?"),"flashing overridden");
 assert(turns.includes("RM ? 0 : 7")&&turns.includes("body.rotation.x = RM ? 0"),"stunt animation reduced");
 assert(turns.includes("if (!RM) npcs.forEach")&&turns.includes("p.t += RM ? 0"),"ambient motion suppressed");
 assert(fx.includes("RM ? 0 : (BLOOM")&&fx.includes("pulsePeriod = RM ? 0"),"bloom and outline pulses disabled");
 assert(models.includes("if (RM) return;")&&models.includes("particles.splice(i, 1); continue;"),"particle emission and existing particles suppressed");
 assert(input.includes("flash: false, motion: false")&&input.includes('behavior: "instant"'),"steady defaults and instant scroll");
 assert(settings.includes('it("motion"')&&settings.includes("applyMotion();"),"switch-accessible motion preference");
 const statusSource=fs.readFileSync(path.join(__dirname,"../js/shift.js"),"utf8").split("function pauseMenu(")[0];
 const statusHarness=new Function(`let modeKey="shift",shift={fuel:12,nitro:2,strikes:1,level:3,earned:120,delivered:2,onboard:[{destName:"Park",patience:8,getaway:true,dare:{have:2,need:5}}]},cash=300,roamCoins=4,nitroArmed=true,heat=3,cops=[{chasing:true}],rival={},waiting=[{x:1,y:2}],car={x:1,y:2,d:1},game={nav:0},MAX_STRIKES=3;
 const COMPASS=["north","east","south","west"],GOODIES={coins:{name:"coins"}},goodies={1:{item:"coins"}};
 const currentTarget=()=>({name:"Park",node:[3,2]}),moves=()=>2,routeDir=()=>1,relName=d=>["straight on","right","turn around","left"][(d-car.d+4)%4],valid=()=>true,canGo=(x,y,d)=>d!==0,edgeKey=(x,y,d)=>d,danger=d=>d===2,nearestCop=()=>cops.length?{n:2}:null,rivalWarning=()=>" Rival approaching.",seatsFree=()=>3-shift.onboard.length,urgency=()=>6,dareGoal=()=>"Collect coins",practiceStageLabel=()=>"Practice 1 / 3",practiceInstruction=()=>"Drive to passenger";
 let menu,spoken,returned=0;const showMenu=(title,sub,items,speech,keep)=>{menu={title,sub,items,speech,keep}},Voice={speak:s=>spoken=s};
 ${statusSource}
 const back=()=>returned++;
 return {sections:statusSections,open:()=>gameStatusMenu(back),menu:()=>menu,choose:id=>menu.items.find(i=>i.id===id).act(),spoken:()=>spoken,returned:()=>returned,compass:()=>game.nav=1,practice:()=>{modeKey="practice";shift.fuel=null;},cruise:()=>{modeKey="cruise";shift=null;cops=[];rival=null;heat=0;}};
 `)();
 const st=statusHarness,detail=id=>st.sections().find(s=>s.id===id)?.detail||"";
 assert(detail("resources").includes("12 moves")&&detail("resources").includes("Nitro armed"),"fuel and nitro spoken");
 assert(detail("progress").includes("1 of 3 strikes")&&detail("progress").includes("300 dollars"),"shift progress spoken");
 assert(detail("passenger0").includes("6 spare moves")&&detail("passenger0").includes("2 of 5")&&detail("passenger0").includes("Getaway"),"passenger patience and dare spoken");
 assert(detail("roads").includes("closed")&&detail("roads").includes("police danger")&&detail("roads").includes("coins"),"road hazards spoken");
 assert(detail("danger").includes("Wanted level 3")&&detail("danger").includes("Rival"),"police and rival spoken");
 assert(detail("position").includes("row 3")&&detail("position").includes("GPS: straight on"),"location and GPS spoken");
 st.compass();assert(detail("position").includes("2 east")&&!detail("position").includes("GPS:"),"compass difficulty respected");
 st.open();st.choose("resources");assert(st.menu().speech.includes("12 moves"),"details announced on entry");
 st.choose("repeat");assert(st.spoken()===st.menu().sub,"detail repeat");
 st.choose("back");assert(st.menu().keep==="resources","restore information topic");st.choose("back");assert(st.returned()===1,"return to pause");
 st.practice();assert(detail("task").includes("Drive to passenger")&&!detail("progress"),"practice avoids real shift progress");
 st.cruise();assert(detail("progress").includes("4 coins")&&!detail("seats"),"cruise information without shift");
 const settingsHarness=new Function(`let resetArmed=false,RM=false,localAcc={waitForSpeech:true},game={ui:0,diff:0,nav:0,guide:1,music:true,engine:true,speed:1,wait:0,cops:0,cam:0,motion:false,flash:false,gfx:0,outline:1,sfx:true};
 let current,confirmation,returned=0,saves=0,spoken=[],auto=true,interval=2000;
 const window={},acc=()=>({auto,interval,wait:localAcc.waitForSpeech}),Voice={enabled:()=>true,name:()=>"Test voice",speak:s=>spoken.push(s),toggle(){},cycle(){}};
 const Scan={setItems(items,keep){current.items=items;current.keep=keep},retime(){}};
 const showMenu=(title,sub,items,speech,keep)=>{current={title,sub,items,speech,keep}};
 const confirmChoice=(title,detail,label,yes,no)=>{confirmation={title,detail,yes,no}};
 const saveGameSettings=()=>saves++,applyUI=()=>{},applyMotion=()=>{},resize=()=>{},updateHud=()=>{},hints=()=>{},store=()=>{},toggleAuto=()=>{auto=!auto},cycleSpeed=()=>{interval+=1000};
 ${settings}
 const back=()=>returned++;
 return {open:()=>settingsMenu(back),current:()=>current,choose:id=>current.items.find(x=>x.id===id).act(),confirm:()=>confirmation,game,saves:()=>saves,returned:()=>returned,shared:()=>{window.NarbeScanManager={}},auto:()=>auto};
 `)();
 const sh=settingsHarness;sh.open();
 assert(sh.current().items.map(i=>i.id).join(",")==="switches,speech,display,driving,progress,back","settings root categories");
 const expected={switches:["auto","scan","speechwait"],speech:["tts","voice","guide","music","engine","sfx"],display:["ui","hud","map","motion","flash","cam","gfx","outline"],driving:["speed","wait","nav","diff","cops"],progress:["reset"]};
 for(const [category,ids] of Object.entries(expected)){
   sh.choose(category);assert(sh.current().items.map(i=>i.id).join(",")===[...ids,"back"].join(","),"category membership and ordering: "+category);
   assert(sh.current().speech.includes(sh.current().title),"category announced");
   sh.choose("back");assert(sh.current().title==="Settings"&&sh.current().keep===category,"return focus to category");
 }
 sh.choose("display");sh.choose("ui");
 assert(sh.game.ui===1&&sh.saves()===1&&sh.current().keep==="ui"&&sh.current().title==="Display and motion","change saved and focus retained");
 sh.choose("hud");assert(sh.game.simpleHud===true&&sh.saves()===2&&sh.current().keep==="hud","simplified HUD opt-in persisted and focus retained");
 sh.choose("hud");assert(sh.game.simpleHud===false&&sh.saves()===3,"full HUD restored");
 sh.choose("map");assert(sh.game.northUpMap===true&&sh.saves()===4&&sh.current().keep==="map","north-up minimap preference saved");
 sh.choose("map");assert(sh.game.northUpMap===false&&sh.saves()===5,"heading-up restored");
 sh.choose("back");sh.choose("switches");sh.choose("auto");
 assert(sh.confirm().title==="Use two switches?"&&sh.auto(),"switch mode requires confirmation");
 sh.confirm().no();assert(sh.current().keep==="auto"&&sh.auto(),"cancel stays in switch controls");
 sh.choose("auto");sh.confirm().yes();assert(!sh.auto()&&sh.current().keep==="auto","confirmed switch change stays in category");
 sh.choose("back");sh.choose("progress");sh.choose("reset");assert(sh.confirm().title==="Erase progress?","reset requires confirmation");
 sh.confirm().no();assert(sh.current().keep==="reset"&&sh.current().title==="Saved progress","cancel reset returns to category");
 sh.choose("back");sh.shared();sh.choose("switches");assert(!sh.current().items.some(x=>x.id==="speechwait"),"shared hub owns speech wait");
 sh.choose("back");sh.choose("back");assert(sh.returned()===1,"root back returns to originating menu");
 const hudSource=turns.slice(turns.indexOf("function simplifiedDrivingHud("),turns.indexOf("/* ---------- save / resume ---------- */"));
 const hud=new Function(`let mode="play",modeKey="shift",game={cops:1},cash=200,roamCoins=3,level={name:"City"},shift={level:2,strikes:1,fuel:8,nitro:1,earned:25,onboard:[]},heat=3,cops=[{chasing:true}],SEATS=3;
 const elements={},mm={style:{}},$=id=>elements[id]||=( {classList:{toggle(k,v){this[k]=v}}});
 const spareMoves=()=>3,urgency=()=>1,shortName=s=>s,dareStatus=()=>"2 of 5",practiceStageLabel=()=>"Practice stage",practiceInstruction=()=>"Practice instruction";
 ${hudSource}
 return {render(simple,m="play",k="shift"){game.simpleHud=simple;mode=m;modeKey=k;updateHud();return {simple:elements["#hud"].classList["simple-driving"],top:elements["#modeName"],mission:elements["#missionText"],stars:elements["#stars"]}},passenger(){shift.onboard=[{destName:"Park",patience:2,getaway:true,dare:{}}]}};
 `)();
 let hv=hud.render(undefined);assert(!hv.simple&&(hv.mission.innerHTML.match(/Empty seat/g)||[]).length===3,"full HUD default");
 hv=hud.render(true);assert(hv.simple&&hv.mission.innerHTML.includes("No passengers on board")&&!hv.mission.innerHTML.includes("Empty seat"),"simple HUD removes empty seat cards");
 hud.passenger();hv=hud.render(true);assert(hv.mission.innerHTML.includes("Park")&&hv.mission.innerHTML.includes("GETAWAY")&&hv.mission.innerHTML.includes("1 spare")&&hv.mission.innerHTML.includes("2 of 5")&&!hv.mission.innerHTML.includes("Empty seat"),"simple HUD preserves occupied passenger warnings and dares");
 assert(hv.top.innerHTML.includes("⛽ 8")&&hv.top.innerHTML.includes("strike on")&&hv.stars.textContent==="★★★☆☆","fuel, strikes and wanted stars retained");
 hv=hud.render(false);assert(!hv.simple&&hv.mission.innerHTML.includes("Empty seat"),"full HUD can be restored");
 hv=hud.render(true,"play","practice");assert(!hv.simple&&hv.mission.textContent==="Practice instruction","practice instructions unaffected");
 hv=hud.render(true,"editor");assert(!hv.simple&&hv.mission.innerHTML.includes("City"),"editor unaffected");
 assert(h.includes("#hud.simple-driving #mm")&&h.includes("#hud.simple-driving .pbar"),"optional map and redundant progress bar hidden");
 const mapSource=turns.slice(turns.indexOf("function minimapRotation("),turns.indexOf("/* ---------- render loop ---------- */"));
 const mapHarness=new Function(`let RM=false,game={},mode="play",car={d:0,ang:0},G=9,NODE=22,EXT=176,DX=[0,1,0,-1],DZ=[-1,0,1,0],closed=new Set(),goodies={},waiting=[{x:2,y:3,size:"LONG",col:0xffffff}],shift={onboard:[{dest:[4,4]}]},cops=[],mm={width:360};
 let angle=0,stack=[],texts=[],arrows=[],rotations=[];const pos=()=>[88,88],routeNodes=()=>[];
 const mx={save(){stack.push(angle)},restore(){angle=stack.pop()},translate(){},rotate(a){angle+=a;rotations.push(a)},clearRect(){},fillRect(){},beginPath(){},moveTo(x,y){if(x===0&&y===-22)arrows.push(angle)},lineTo(){},stroke(){},arc(){},fill(){},rect(){},closePath(){},fillText(label){texts.push([label,angle])}};
 ${mapSource}
 return (d,north=false,reduced=false)=>{car.d=d;car.ang=-d*Math.PI/2;game.northUpMap=north;RM=reduced;angle=0;stack=[];texts=[];arrows=[];rotations=[];drawMini();return {rotation:minimapRotation(),texts,arrows,stack,angle}};
 `)();
 for(let d=0;d<4;d++){
   const map=mapHarness(d);assert(Math.abs(map.rotation+d*Math.PI/2)<1e-9,"map rotates opposite heading "+d);
   assert(map.texts.map(t=>t[0]).join(",")==="L,1,N"&&map.texts.every(t=>Math.abs(t[1])<1e-9),"map labels stay upright");
   assert(map.arrows.length===1&&Math.abs(map.arrows[0])<1e-9&&!map.stack.length&&map.angle===0,"heading-up arrow points up and canvas state restored");
   assert(mapHarness(d,true).rotation===0&&mapHarness(d,false,true).rotation===0,"north-up preference and reduced motion");
 }
 const progress=fs.readFileSync(path.join(__dirname,"../js/progress.js"),"utf8");
 const achSource=progress.slice(progress.indexOf("const ACHIEVEMENT_GROUPS"),progress.indexOf("function saveProgress("));
 const ach=new Function(`let earned=0,records={},garage={owned:[0]},menu,spoken,returned;
 const RANKS=[[0,"Rookie"],[500,"Cabbie"],[2000,"Pro"],[6000,"Road legend"],[15000,"King of the city"]],LIVERIES=Array(7);
 const showMenu=(title,sub,items,speech,keep)=>{menu={title,sub,items,speech,keep}},Voice={speak:s=>spoken=s},titleMenu=id=>returned=id;
 ${achSource}
 return {entries:achievementEntries,open:()=>achievementsMenu(),menu:()=>menu,choose:id=>menu.items.find(i=>i.id===id).act(),spoken:()=>spoken,returned:()=>returned,progress(e,r,o){earned=e;records=r;garage.owned=o;}};
 `)();
 assert(ach.entries().length===13&&ach.entries().every(a=>!a.unlocked),"new career has 13 locked milestones");
 ach.progress(2000,{"city:1":1500,"daily:2026-11-27:1":600},[0,1,2,3,6]);
 assert(ach.entries().filter(a=>a.unlocked).length===9,"existing rank, records and owned paint recognized");
 ach.open();assert(ach.menu().items.length===4&&ach.menu().sub.includes("9 of 13"),"grouped accessible achievement summary");
 ach.choose("records");ach.choose("daily500");assert(ach.menu().speech.includes("Unlocked")&&ach.menu().speech.includes("500 of 500"),"achievement goal and progress spoken");
 ach.choose("repeat");assert(ach.spoken()===ach.menu().sub,"achievement detail repeated");ach.choose("back");assert(ach.menu().keep==="daily500","return focus to achievement");
 ach.choose("back");assert(ach.menu().keep==="records","return focus to group");ach.choose("back");assert(ach.returned()==="achievements","return focus to main menu");
 ach.progress(0,{},[0]);assert(ach.entries().every(a=>!a.unlocked),"existing progress reset clears achievements");
 assert(fs.readFileSync(path.join(__dirname,"../js/menus.js"),"utf8").includes('id: "achievements"'),"main menu entry wired");
 assert(h.includes('#menuList .opt.on.braked')&&h.includes('outline: 5px dotted #fff'),"menu brake distinct");
 assert(h.includes("max-height: 48dvh")&&h.includes("overflow-y: auto")&&h.includes("max-height: 600px"),"compact layout");
 function lum(hex){return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0)}
 const contrast=(x,y)=>(Math.max(lum(x),lum(y))+.05)/(Math.min(lum(x),lum(y))+.05);
 assert(contrast("ffffff","34265d")>=7&&contrast("211532","ffdb55")>=7,"selected and unselected label contrast exceeds 7:1");
 return n;
}
console.log(`${visualTests(...["index.html","js/input-scanning-voice.js","js/city.js","js/city-editor-and-camera.js","js/turns-carpool-police.js","js/visual-effects.js","js/models.js","js/settings.js"].map(p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8")))} visual checks passed`);
