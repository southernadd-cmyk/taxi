const fs=require("node:fs"),path=require("node:path");
function editorFlow(e,city){
 let n=0;const assert=(v,m)=>{if(!v)throw Error(m);n++};
 const root=e.slice(e.indexOf("function editRoot("),e.indexOf("function saveCity("));
 const groups=e.slice(e.indexOf("function pickRow("),e.indexOf("// mouse/touch picking"));
 const grid=city.slice(0,city.indexOf("/* ======================= themes"));
 const a=new Function("matchMedia",grid+`
 const BLOCKS={Z:{icon:"Z",name:"Plaza"},P:{icon:"P",name:"Park"},T:{icon:"T",name:"Tower"},MU:{icon:"M",name:"Museum",unique:true}};
 const GOODIES={coins:{icon:"C",name:"Coins"},ramp:{icon:"R",name:"Ramp"}};
 const PALETTES={neon:{name:"Neon"},beach:{name:"Beach"}};
 let level={id:"city",name:"City",theme:"neon",blocks:Array(64).fill("Z"),segs:{},start:[4,4]},ed={dirty:false},mode="editor",testing=false,playerMesh=null;
 let items=[],restore=null,back=null,started=null,rebuilt=[];
 const dummy={visible:true};const playerGlow=dummy,beacon=dummy,routeGroup=dummy;
 function edGroup(list,fn,keep){items=list;back=fn;restore=keep}
 const Scan={open(list){items=list;back=null;restore=null},setItems(list,keep){items=list;restore=keep}};
 const Voice={speak(){}};const $=()=>({classList:{remove(){}}});
 const hideMenu=hideArrows=hideEditorMarks=clearCops=clearWaiting=updateHud=hints=resize=sfx=burst=spawnTraffic=hlAt=()=>{};
 function buildLevel(l){level=JSON.parse(JSON.stringify(l))}
 function buildBlock(i){rebuilt.push(i)}
 function buildGoodie(k){rebuilt.push(k)}
 function start(k,id,l){started={k,id,l};l.blocks[0]="T"}
 function saveCity(){}function leaveEditor(){}
 ${root}
 ${groups}
 return {editRoot,choose(id){const item=items.find(x=>x.id===id);if(!item)throw Error("No "+id);item.act()},back(){back()},state(){return {level,ed,testing,restore,started,items,rebuilt}}};
 `.replace("const hideMenu=hideArrows=hideEditorMarks=clearCops=clearWaiting=updateHud=hints=resize=sfx=burst=spawnTraffic=hlAt=()=>{};","const hideMenu=()=>{},hideArrows=hideMenu,hideEditorMarks=hideMenu,clearCops=hideMenu,clearWaiting=hideMenu,updateHud=hideMenu,hints=hideMenu,resize=hideMenu,sfx=hideMenu,burst=hideMenu,spawnTraffic=hideMenu,hlAt=hideMenu;"))(()=>({matches:false}));
 a.editRoot();assert(a.state().items.some(x=>x.id==="block"),"editor root");
 a.choose("block");assert(a.state().items.length===8,"all block rows reachable");
 a.choose("r7");a.choose("b7");a.choose("tP");assert(a.state().level.blocks[63]==="P"&&a.state().restore==="b7","last block editable and focus restored");
 a.back();assert(a.state().restore==="r7","Back restores row");a.back();assert(a.state().restore==="block","Back restores root choice");
 a.choose("block");a.choose("r0");a.choose("b0");a.choose("tMU");a.choose("b1");a.choose("tMU");assert(a.state().level.blocks[0]==="T"&&a.state().level.blocks[1]==="MU","unique landmark relocated");
 a.back();a.back();a.choose("road");a.choose("r0");a.choose("n0");assert(a.state().items.length===2,"corner only offers valid roads");a.choose("d1");a.choose("gramp");assert(a.state().level.segs["0,0,1"]==="ramp"&&a.state().restore==="d1","road item added and direction restored");
 a.choose("d1");a.choose("gnone");assert(!a.state().level.segs["0,0,1"],"road cleared");a.back();assert(a.state().restore==="n0","Back restores junction");a.back();assert(a.state().restore==="r0","Back restores road row");a.back();assert(a.state().restore==="road","Back restores road choice");
 a.choose("start");a.choose("r8");a.choose("n8");assert(a.state().level.start.join()==="8,8"&&a.state().restore==="start","boundary start set");
 a.choose("theme");assert(a.state().level.theme==="beach"&&a.state().level.blocks[63]==="P","theme retains edits");
 a.choose("test");assert(a.state().testing&&a.state().started.k==="cruise"&&a.state().level.blocks[0]==="T"&&a.state().ed.dirty,"test drive invoked");
 assert(a.state().started.l!==a.state().level,"test receives a separate object");return n;
}
console.log(`${editorFlow(...["js/city-editor-and-camera.js","js/city.js"].map(p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8")))} editor flow checks passed`);
