const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const src=fs.readFileSync(path.join(__dirname,"../js/turns-carpool-police.js"),"utf8");
function quickTests(source,assert){
 const code=source.slice(source.indexOf("function quickRouteAllowed("),source.indexOf("function openJunction("));
 const api=new Function(code+`
 const DX=[0,1,0,-1],DZ=[-1,0,1,0],car={x:0,y:0,d:1};
 let mode="play",modeKey="shift",shift={fuel:40,onboard:[]},game={nav:0},testing=false,nitroArmed=false,heat=0,cops=[],rival=null,pendingDares=[],waiting=[],goodies={},blocked=[],turn=null,drives=[];
 const ref={}, targetObj={ref,node:[3,0]};
 function currentTarget(){return targetObj}
 function urgency(p){return p.patience==null?99:p.patience-moves(car.x,car.y,...p.dest)}
 function moves(x,y,tx,ty){return Math.abs(x-tx)+Math.abs(y-ty)}
 function routeDir(x,y,tx,ty,d){return x<tx?1:x>tx?3:y<ty?2:y>ty?0:-1}
 function edgeKey(x,y,d){return [x,y,d].join(",")}
 function canGo(x,y,d){return !blocked.includes(edgeKey(x,y,d))}
 function nodeEq(a,x,y){return !!a&&a[0]===x&&a[1]===y}
 function relName(){return "straight on"}
 const DIRWORD={"straight on":["Straight","","go"]};
 function drive(d,quick){drives.push({d,quick});turn={quick}}
 function openJunction(){drives.push("stop")}
 return {quickRouteAllowed,quickRouteLength,quickRouteItem,continueQuickRoute,drives,car,ref,targetObj,
 configure(p){({mode=mode,modeKey=modeKey,shift=shift,game=game,testing=testing,nitroArmed=nitroArmed,heat=heat,cops=cops,rival=rival,pendingDares=pendingDares,waiting=waiting,goodies=goodies,blocked=blocked,turn=turn}=p)},
 reset(){mode="play";modeKey="shift";shift={fuel:40,onboard:[]};game={nav:0};testing=false;nitroArmed=false;heat=0;cops=[];rival=null;pendingDares=[];waiting=[];goodies={};blocked=[];turn=null;car.x=0;car.y=0;targetObj.node=[3,0];targetObj.ref=ref;drives.length=0}
 };
 `)();
 let checks=0;const eq=(a,b)=>{assert.equal(a,b);checks++};
 eq(api.quickRouteLength(1,[3,0]),3);eq(api.quickRouteLength(1,[2,0]),2);eq(api.quickRouteLength(1,[1,0]),1);
 eq(api.quickRouteLength(1,[5,0]),3);eq(api.quickRouteLength(1,[1,2]),1);
 for(const patch of [{modeKey:"practice"},{modeKey:"daily"},{modeKey:"cruise"},{mode:"menu"},{testing:true},{game:{nav:1}},{nitroArmed:true},{cops:[{}]},{rival:{}},{heat:1},{pendingDares:[{}]},{shift:{fuel:10,onboard:[]}},{shift:{fuel:40,onboard:[{dest:[3,0],dare:{}}]}},{shift:{fuel:40,onboard:[{dest:[3,0],patience:4}]}}]){
   api.reset();api.configure(patch);eq(api.quickRouteLength(1,[3,0]),0);
 }
 api.reset();api.configure({waiting:[{x:1,y:0}]});eq(api.quickRouteLength(1,[3,0]),1);
 api.reset();api.configure({waiting:[{x:0,y:0}]});eq(api.quickRouteLength(1,[3,0]),0);
 api.reset();api.configure({blocked:["1,0,1"]});eq(api.quickRouteLength(1,[3,0]),1);
 api.reset();api.configure({goodies:{"1,0,1":{used:true}}});eq(api.quickRouteLength(1,[3,0]),1);
 api.reset();api.configure({shift:{fuel:12,onboard:[]}});eq(api.quickRouteLength(1,[3,0]),2);
 api.reset();api.configure({shift:{fuel:40,onboard:[{dest:[2,0],patience:null}]}});eq(api.quickRouteLength(1,[3,0]),2);
 api.reset();const item=api.quickRouteItem(1,[3,0]);eq(item.id,"quickRoute");item.act();eq(api.drives[0].quick.remaining,2);
 api.car.x=1;eq(api.continueQuickRoute([]),true);eq(api.drives[1].quick.remaining,1);
 api.car.x=2;eq(api.continueQuickRoute([]),true);eq(api.drives[2].quick.remaining,0);
 api.car.x=3;eq(api.continueQuickRoute([]),false);eq(api.drives.length,3);
 for(const patch of [{cops:[{}]},{waiting:[{x:1,y:0}]},{pendingDares:[{}]},{blocked:["1,0,1"]},{goodies:{"1,0,1":{}}},{shift:{fuel:10,onboard:[]}}]){
   api.reset();api.quickRouteItem(1,[3,0]).act();api.car.x=1;api.configure(patch);eq(api.continueQuickRoute([]),false);
 }
 api.reset();api.quickRouteItem(1,[3,0]).act();api.car.x=1;eq(api.continueQuickRoute(["New event"]),false);
 api.reset();api.quickRouteItem(1,[3,0]).act();api.car.x=1;api.targetObj.ref={};eq(api.continueQuickRoute([]),false);
 api.reset();let stale=api.quickRouteItem(1,[3,0]);api.configure({heat:1});stale.act();eq(api.drives[0],"stop");
 return checks;
}
console.log("Quick journeys: "+quickTests(src,assert)+" checks passed.");
