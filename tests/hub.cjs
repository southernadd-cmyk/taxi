const fs=require("node:fs"),path=require("node:path");
async function hubTests(input,bridge,manager,choice){
 let n=0;const assert=(v,m)=>{if(!v)throw Error(m);n++};
 let now=10000,seq=0,settings,settingsChange,guard,activity,spoken=[],picks=[];const timers=new Map(),els=new Map(),listeners={};
 const mk=()=>({children:[],className:"",classList:{toggle(){},remove(){},add(){}},set innerHTML(v){this.children=[]},setAttribute(){},addEventListener(n,f){this.click=f},appendChild(x){this.children.push(x)},querySelector(){return null},scrollIntoView(){}});
 const $=s=>{if(!els.has(s))els.set(s,mk());return els.get(s)};
 const set=(f,ms)=>{timers.set(++seq,{f,at:now+ms});return seq},clear=id=>timers.delete(id);
 const flush=async()=>{for(let j=0;j<8;j++)await Promise.resolve()};
 const advance=async ms=>{const end=now+ms;await flush();while(true){const a=[...timers].filter(([k,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!a)break;now=a[1].at;timers.delete(a[0]);a[1].f();await flush()}now=end;await flush()};
 const add=(name,fn)=>(listeners[name]??=[]).push(fn);
 let ticket;
 const window={NarbePlatform:{settings:{open({normalize,onChange}){settings=normalize({autoScan:true,waitForSpeech:true});settingsChange=onChange;return {readCached:()=>settings,save(v){settings=v;onChange(v);return v}}}},input:{capture(fn){guard=fn}},lifecycle:{onActivity(fn){activity=fn;return()=>{}}}},NarbeVoiceManager:{getSettings:()=>({ttsEnabled:true}),speak(label){if(ticket)ticket.cancel();spoken.push(label);let resolve;const p=new Promise(r=>resolve=r);ticket={finished:p,finish:()=>resolve({started:true,reason:"end"}),cancel:()=>resolve({started:true,reason:"cancelled"})};return ticket}}};
 const document={hidden:false,createElement:mk,addEventListener:add};
 const api=new Function("window","document","localStorage","performance","Date","addEventListener","setTimeout","clearTimeout","setInterval","clearInterval","$","sfx","scanFocus","HOLD_MS",choice+"\n"+manager+"\nconst NarbeScanManager=window.NarbeScanManager;\n"+input+"\n"+bridge+"\nreturn {installHubScan, get Scan(){return Scan}, Voice};")(window,document,{getItem:()=>null,setItem(){}},{now:()=>now},{now:()=>now},add,set,clear,set,clear,$,()=>{},()=>{},800);
 assert(api.installHubScan(),"canonical bridge installed");const scan=api.Scan,M=window.NarbeScanManager;
 const items=["a","b"].map(id=>({id,label:id,act:()=>picks.push(id)}));scan.open(items,$("host"),"Main menu");
 assert(scan.index===-1&&spoken.at(-1)==="Main menu","root starts blank with owned title");await advance(4000);assert(scan.index===-1,"speech holds title");ticket.finish();await advance(1999);assert(scan.index===-1,"full interval");await advance(1);assert(scan.index===0&&spoken.at(-1)==="a","first item");
 scan.enterDown();await advance(8000);assert(scan.index===0&&picks.length===0,"held Enter freezes");scan.enterUp();assert(picks.join()==="a","release chooses once");ticket.finish();await advance(2000);assert(scan.index===1,"resumes");
 scan.enterDown();scan.open(items,$("host"),"New");scan.enterUp();assert(picks.join()==="a","stale release ignored");
 M.updateSettings({autoScan:false});scan.spaceDown();scan.spaceUp();assert(scan.index===0,"step Space advances");scan.enterDown();scan.enterUp();assert(picks.join()==="a,a","manual selection");
 scan.enterGroup(items,$("host"),()=>picks.push("back"),"b");assert(scan.index===1,"restore group item");scan.spaceDown();scan.spaceUp();assert(scan.index===-1&&spoken.at(-1)==="Back","group Back stop");scan.enterDown();scan.enterUp();assert(picks.at(-1)==="back","group Back works");
 scan.open(items,$("host"),null,"b");assert(scan.index===1,"restore root");M.updateSettings({autoScan:true,waitForSpeech:false,parking:"chosen"});scan.open(items,$("host"),null);scan.enterDown();scan.enterUp();assert(scan.index===-1,"park chosen blank");await advance(6000);assert(scan.index===-1,"parking stops");scan.enterDown();scan.enterUp();assert(scan.index===0&&picks.at(-1)==="back","resume not select");
 scan.close();assert(!scan.isActive(),"close releases ownership");
 return n;
}
const shared=process.argv[2];if(!shared)throw Error("Usage: node tests/hub.cjs /path/to/bennyshub/shared");
hubTests(...["js/input-scanning-voice.js","js/hub-scan.js"].map(p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8")),...["scan-manager.js","choice-scan.js"].map(p=>fs.readFileSync(path.join(shared,p),"utf8"))).then(n=>console.log(`${n} Hub checks passed`)).catch(e=>{console.error(e);process.exitCode=1});
