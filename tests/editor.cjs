const fs=require("node:fs"),path=require("node:path");
function editorTests(e,city,shift,progress,turns){
 let n=0;const assert=(v,m)=>{if(!v)throw Error(m);n++};
 const src=e.slice(e.indexOf("function nextName()"),e.indexOf("function openEditor("));
 const save=e.slice(e.indexOf("function saveCity()"),e.indexOf("function leaveEditor()"));
 const grid=city.slice(0,city.indexOf("/* ======================= themes"));
 const a=new Function("matchMedia",grid+`
 let level,ed={dirty:true},storage=[],fail=false,spoken="";
 const BLOCKS={Z:{},T:{},P:{},MU:{unique:true},PZ:{unique:true},HO:{unique:true}};
 const PALETTES={neon:{},beach:{},night:{}},GOODIES={coins:{},ramp:{},boxes:{},cones:{}};
 const localStorage={setItem(k,v){if(fail)throw Error("quota");storage=JSON.parse(v)}};
 const customLevels=()=>JSON.parse(JSON.stringify(storage)),Voice={speak(s){spoken=s}},sfx=()=>{};
 ${src}
 ${save}
 return {blankLevel,validateCity,saveCity,newCityId,persistCities,customLevels,nextName,draft(v){level=v;ed.dirty=true},fail(v){fail=v},get state(){return {level,ed,spoken}}};
 `)(()=>({matches:false}));
 const b=a.blankLevel();assert(b.blocks.length===64&&b.start.join()==="4,4","blank city grid");assert(!!a.validateCity(b),"blank validates");
 for(const change of [{blocks:["Z"]},{blocks:Array(64).fill("BAD")},{theme:"unknown"},{start:[9,0]},{start:[1.5,0]},{segs:{"8,8,1":"coins"}},{segs:{"1,2,0":"ramp"}},{segs:{"1,2,1":"bad"}},{blocks:Array(64).fill("MU")}])assert(a.validateCity({...b,...change})===null,"invalid data rejected");
 const good=a.validateCity({...b,name:"<script>alert(1)</script>",segs:{"1,2,1":"ramp"}});assert(good&&!/[<>]/.test(good.name)&&good.segs["1,2,1"]==="ramp","safe name and valid road");
 a.draft(b);a.state.ed.undo=[{}];assert(a.saveCity()&&a.customLevels().length===1&&!a.state.ed.dirty&&!a.state.ed.undo.length,"first save assigns ID and clears undo");const id=a.state.level.id;
 b.blocks[0]="P";a.draft(b);assert(a.saveCity()&&a.customLevels().length===1&&a.customLevels()[0].id===id&&a.customLevels()[0].blocks[0]==="P","edit overwrites same city");
 a.fail(true);b.blocks[0]="T";a.draft(b);a.state.ed.undo=[{}];assert(!a.saveCity()&&a.state.ed.dirty&&a.state.ed.undo.length===1&&a.customLevels()[0].blocks[0]==="P","failed save keeps previous saved city, undo and dirty draft");a.fail(false);
 const b2=a.blankLevel();assert(b2.name!==b.name,"new name unique");a.draft(b2);assert(a.saveCity()&&a.customLevels().length===2&&a.state.level.id!==id,"second city unique");
 assert(e.includes("ed.draft = JSON.parse(JSON.stringify(level))")&&shift.includes("buildLevel(ed.draft)"),"test drive retains draft");
 assert(progress.includes('if (testing || modeKey === "practice") return;')&&turns.includes("if (testing) return;")&&turns.includes("|| testing || mode !=="),"test drive no reward or save");assert(shift.includes("if (testing) clearRoadworks();"),"test drive no random roadworks");
 assert(e.includes("if (saveCity()) editorMenu()"),"failed save cannot leave editor");assert(e.includes("const l = validateCity(dec(s));"),"import validation wired");
 return n;
}
console.log(`${editorTests(...["js/city-editor-and-camera.js","js/city.js","js/shift.js","js/progress.js","js/turns-carpool-police.js"].map(p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8")))} editor checks passed`);
