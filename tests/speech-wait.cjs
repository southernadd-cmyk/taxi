const fs = require("node:fs");
const path = require("node:path");
async function testSpeech(source) {
 let n=0;const assert=(ok,msg)=>{if(!ok)throw Error(msg);n++};
 let now=0,id=0,utterance,started=true;const timers=new Map(),els=new Map();
 const make=()=>({innerHTML:"",classList:{toggle(){},add(){},remove(){}},setAttribute(){},addEventListener(){},appendChild(){},querySelector(){return null}});
 const $=s=>{if(!els.has(s))els.set(s,make());return els.get(s)};
 const add=()=>{};const set=(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id};const clear=i=>timers.delete(i);
 const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve()};
 const advance=async ms=>{const end=now+ms;await flush();while(true){const a=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!a)break;const [k,t]=a;now=t.at;timers.delete(k);t.fn();await flush()}now=end;await flush()};
 const synth={getVoices:()=>[],cancel(){},speak(u){utterance=u;if(started)u.onstart()}};
 const api=new Function("window","document","localStorage","performance","addEventListener","setTimeout","clearTimeout","setInterval","clearInterval","$","sfx","scanFocus","HOLD_MS","speechSynthesis","SpeechSynthesisUtterance",source+"\nreturn {Scan,Voice,acc};")({speechSynthesis:synth},{createElement:make,addEventListener:add},{getItem:()=>null,setItem(){}},{now:()=>now},add,set,clear,set,clear,$,()=>{},()=>{},800,synth,function(text){this.text=text});
 const {Scan,Voice,acc}=api;let picked=0;const items=[{id:"a",label:"First choice",act:()=>picked++},{id:"b",label:"Second choice",act:()=>picked++}];
 assert(acc().wait,"standalone speech wait default");
 Scan.open(items,$("host"),"Welcome to Switch Cab. Choose an option.");
 await advance(300);assert(Scan.index===-1,"title speech holds blank");utterance.onend();await advance(1999);assert(Scan.index===-1,"full interval after title");await advance(1);assert(Scan.index===0,"first choice after interval");
 await advance(400);assert(Scan.index===0,"label speech holds selection");utterance.onend();await advance(1999);assert(Scan.index===0,"full interval after label");await advance(1);assert(Scan.index===1,"next label after interval");
 Scan.enterDown();Scan.enterUp();assert(picked===1,"selection allowed during speech");Scan.close();
 const p=Voice.speak("An old label");const q=Voice.speak("New label");assert(await p==="cancelled","old label resolves on cancellation");utterance.onerror();assert(await q==="error","speech error resolves");
 started=false;const failed=Voice.speak("Native startup fails");await advance(1000);assert(await failed==="error","native startup failure bounded");
 started=true;const timeout=Voice.speak("x".repeat(300));await advance(10000);assert(await timeout==="timeout","long speech bounded");
 const disabled=Voice.speak("Speak then disable");Voice.toggle();assert(await disabled==="disabled","disabling speech clears wait");assert(await Voice.speak("Muted")==="disabled","muted speech resolves immediately");
 return n;
}
testSpeech(fs.readFileSync(path.join(__dirname, "../js/input-scanning-voice.js"), "utf8")).then(n=>console.log(`${n} speech assertions passed`)).catch(e=>{console.error(e);process.exitCode=1});
