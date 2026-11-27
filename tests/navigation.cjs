const fs=require("node:fs"),path=require("node:path");
function navigationTests(input,menus,settings,shift,editor){
 let n=0;const assert=(v,m)=>{if(!v)throw Error(m);n++};
 let created=0,choices=[],picked=[],now=0;
 const make=()=>({className:"",textContent:"",set innerHTML(v){this.children=[]},children:[],classList:{toggle(){},add(){},remove(){}},setAttribute(){},addEventListener(k,fn){this.click=fn},appendChild(b){this.children.push(b)},querySelector(){return null}});
 const host=make(), status=make(), $=()=>status;
 const api=new Function("window","document","localStorage","performance","addEventListener","setTimeout","clearTimeout","setInterval","clearInterval","$","sfx","scanFocus","HOLD_MS",input+"\nreturn Scan;")({}, {createElement(){created++;return make()},addEventListener(){}},{getItem:()=>JSON.stringify({autoScan:false}),setItem(){}},{now:()=>now},()=>{},()=>1,()=>{},()=>1,()=>{},$,()=>{},()=>{},800);
 const items=["a","b","c"].map(id=>({id,label:id,act:()=>picked.push(id)}));
 api.open([...items,{id:"x",disabled:true},{id:"y",hidden:true}],host);assert(api.items.length===3&&api.index===-1,"blank and disabled hidden skipped");
 api.spaceUp();let button=host.children[0];api.spaceUp();assert(host.children[0]===button&&created===3,"DOM buttons stable during scan");
 api.setItems([items[2],items[1],items[0]]);assert(api.items[api.index].id==="b","reorder retains identity");button.click();assert(picked.length===0,"stale click ignored");
 api.setItems([items[2],items[0]]);assert(api.index===-1,"removed selection clears safely");api.enterDown();api.enterUp();assert(!picked.length,"blank inert");
 api.open(items,host,null,"b");assert(api.items[api.index].id==="b","parent restore");
 api.enterGroup(items,host,()=>picked.push("back"),"c");api.spaceUp();api.enterDown();api.enterUp();assert(picked[0]==="back","nested Back");
 let modal,confirmed=0,cancelled=0,started=0,save=true;
 const section=menus.slice(menus.indexOf("function confirmChoice"),menus.indexOf("function hideMenu"));
 const a=new Function("showMenu","savedGame","start",section+"\nreturn {confirmChoice,startNewShift};")((title,detail,items)=>modal={title,detail,items},()=>save,()=>started++);
 a.confirmChoice("Erase?", "Details","Erase",()=>confirmed++,()=>cancelled++);assert(modal.items[0].id==="cancel"&&modal.items[1].id==="confirm"&&confirmed===0,"separate confirmation cancel first");modal.items[0].act();assert(cancelled===1&&confirmed===0,"cancel harmless");modal.items[1].act();assert(confirmed===1,"explicit confirm");
 a.startNewShift("shift","x",()=>cancelled++);assert(started===0&&modal.title==="Replace saved ride?","existing save protected");modal.items[0].act();assert(started===0,"cancel preserves ride");modal.items[1].act();assert(started===1,"confirm starts ride");save=false;a.startNewShift("shift","x",()=>{});assert(started===2,"no extra confirmation without save");
 assert(settings.includes('confirmChoice("Use two switches?"')&&settings.includes('garage.owned = [0]')&&settings.includes('shift = null;'),"auto scan warning and reset schema");
 assert(shift.includes('confirmChoice("Restart shift?"')&&editor.includes('confirmChoice("Delete " + l.name')&&editor.includes('confirmChoice("Discard changes?"')&&menus.includes('confirmChoice("Buy " + name'),"destructive actions use confirmations");return n;
}
console.log(`${navigationTests(...["js/input-scanning-voice.js","js/menus.js","js/settings.js","js/shift.js","js/city-editor-and-camera.js"].map(p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8")))} navigation checks passed`);
