const fs = require("node:fs");
const path = require("node:path");
function testScanner(source) {
  let passed=0;
  const assert=(ok,msg)=>{if(!ok)throw Error(msg);passed++};
  function boot(saved={}) {
    let now=0,id=0;const timers=new Map(), handlers={}, els=new Map(), storage=new Map(Object.entries(saved));
    if (!storage.has("switchcity-access")) storage.set("switchcity-access", JSON.stringify({waitForSpeech:false}));
    const make=()=>({innerHTML:"",className:"",classList:{toggle(){},add(){},remove(){}},setAttribute(){},addEventListener(){},appendChild(){},querySelector(){return null}});
    const $=s=>{if(!els.has(s))els.set(s,make());return els.get(s)};
    const add=(name,fn)=>(handlers[name]??=[]).push(fn);
    const timer=(fn,ms,repeat=false)=>{timers.set(++id,{fn,at:now+ms,repeat:repeat?ms:0});return id};
    const clear=i=>timers.delete(i);
    const advance=ms=>{const end=now+ms;while(true){const a=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!a)break;const [k,t]=a;now=t.at;if(t.repeat)t.at+=t.repeat;else timers.delete(k);t.fn()}now=end};
    const document={hidden:false,createElement:make,addEventListener:add};
    const emit=(name,props={})=>{const e={prevented:false,preventDefault(){this.prevented=true},target:{closest:()=>null},...props};(handlers[name]||[]).forEach(fn=>fn(e));return e};
    const api=new Function("window","document","localStorage","performance","addEventListener","setTimeout","clearTimeout","setInterval","clearInterval","$","sfx","scanFocus","HOLD_MS",source+"\nreturn {Scan,acc,toggleAuto};")({},document,{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},{now:()=>now},add,(f,m)=>timer(f,m),clear,(f,m)=>timer(f,m,true),clear,$,()=>{},()=>{},800);
    let picks=[];const items=["a","b","c"].map(id=>({id,label:id,act:()=>picks.push(id)}));const open=()=>api.Scan.open(items,$("host"));const key=(name,down,extra={})=>emit(down?"keydown":"keyup",{key:name==="Space"?" ":name,code:name,...extra});
    return {...api,advance,emit,key,open,picks,items,$};
  }
  let a=boot();assert(a.acc().auto,"standalone defaults to one switch");a.open();assert(a.Scan.index===-1,"fresh screen blank");a.key("Enter",true);a.advance(5000);a.key("Enter",false);assert(a.picks.length===0&&a.Scan.index===-1,"hold on blank inert");a.advance(2000);assert(a.Scan.index===0,"scan resumes");a.key("Enter",true);a.advance(6000);a.key("Enter",true,{repeat:true});assert(a.Scan.index===0&&a.picks.length===0,"held Enter freezes without activation");a.key("Enter",false);assert(a.picks.join()==="a","release selects intended choice once");a.advance(2000);assert(a.Scan.index===1,"scan resumes after release");a.key("Enter",true);a.open();a.advance(2100);a.key("Enter",false);assert(a.picks.length===1,"stale release cannot select in new menu");a.key("Enter",true);a.advance(400);a.emit("blur");a.key("Enter",false);assert(a.picks.length===1,"blur cancels held selection");a.advance(2000);assert(a.Scan.index===1,"scan resumes after cancellation");a.key("Enter",true);a.advance(10);a.key("Enter",false);assert(a.picks.join()==="a,b","brief tap works");
  a.Scan.close();assert(!a.key("Space",true).prevented&&!a.key("Enter",false).prevented,"inactive editor owns native input");
  a=boot({"switchcity-access":JSON.stringify({autoScan:false,waitForSpeech:false})});assert(!a.acc().auto,"saved two switch setting retained");a.open();a.key("Space",true);a.key("Space",false);assert(a.Scan.index===0,"manual short Space moves");a.advance(100);a.key("Enter",true);a.key("Enter",false);assert(a.picks.join()==="a","manual Enter release selects");a.advance(100);a.key("Space",true);a.advance(800);a.key("Space",false);assert(a.Scan.index===-1,"long Space reverse retained");
  a=boot();a.open();a.advance(2000);a.key("Enter",true);a.advance(200);a.key("Space",true);a.key("Space",false);a.key("Enter",false);assert(a.picks.join()==="a","overlapping Space cannot change held Enter target");
  a=boot();a.open();const edit={target:{closest:()=>({})}};assert(!a.key("Space",true,edit).prevented&&!a.key("Space",false,edit).prevented,"text fields retain typing");
  return passed;
}
console.log(`${testScanner(fs.readFileSync(path.join(__dirname, "../js/input-scanning-voice.js"), "utf8"))} switch-input assertions passed`);
