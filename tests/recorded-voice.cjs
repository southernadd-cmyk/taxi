const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const source = fs.readFileSync(path.join(__dirname,"../js/input-scanning-voice.js"),"utf8");
const prefix = source.split("/* ======================= choice scanner")[0];
const root = path.join(__dirname,"..");
const pack = {};
new Function("window", fs.readFileSync(path.join(root,"js/voice-pack.js"),"utf8"))(pack);
const manifest = JSON.parse(fs.readFileSync(path.join(root,"assets/voice/manifest.json"),"utf8")).clips;
assert.deepEqual(pack.SwitchCabRecordedClips,manifest,"synchronous pack matches generated manifest");
assert.equal(Object.keys(manifest).length,JSON.parse(fs.readFileSync(path.join(root,"tools/voice-phrases.json"),"utf8")).length);
for (const file of Object.values(manifest)) assert.ok(fs.statSync(path.join(root,"assets/voice",file)).size>1000,"missing recorded audio "+file);
assert.ok(fs.readFileSync(path.join(root,"index.html"),"utf8").indexOf('src="js/voice-pack.js') < fs.readFileSync(path.join(root,"index.html"),"utf8").indexOf('src="js/input-scanning-voice.js'),"pack loads first");
async function run() {
  let audio, utterance, nativeCalls=0, hubCalls=0, saved={};
  let fail=false, hang=false;
  class Audio {
    constructor() { this.src=""; this.paused=true; audio=this; }
    play() { this.paused=false; if(fail) return Promise.reject(Error("blocked")); if(!hang) this.onplaying?.(); return Promise.resolve(); }
    pause() { this.paused=true; }
  }
  const voices=[{name:"American",lang:"en-US",localService:true},{name:"British",lang:"en-GB",localService:true}];
  const synth={getVoices:()=>voices,cancel(){},speak(u){nativeCalls++;utterance=u;u.onstart?.();}};
  const win={Audio,speechSynthesis:synth,SwitchCabRecordedClips:pack.SwitchCabRecordedClips};
  const Voice=new Function("window","localStorage","speechSynthesis","SpeechSynthesisUtterance",prefix+"\nreturn Voice;")(win,{getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v},synth,function(text){this.text=text});
  assert.equal(Voice.name(),"Emma (recorded)","recorded voice available immediately without fetch");
  const first=Voice.speak("Back");assert.equal(nativeCalls,0);assert.ok(audio.src.endsWith(manifest.Back));
  const old=audio;const second=Voice.speak("Pause");assert.equal(await first,"cancelled");assert.equal(audio,old,"media element reused");assert.ok(audio.src.endsWith(manifest.Pause));
  audio.onended();assert.equal(await second,"ended");
  const dynamic=Voice.speak("You have 12 dollars");assert.equal(utterance.voice.name,"British");utterance.onend();assert.equal(await dynamic,"ended");
  fail=true;const rejected=Voice.speak("Back");for(let i=0;i<5;i++)await Promise.resolve();utterance.onend();assert.equal(await rejected,"ended");fail=false;
  hang=true;const slow=Voice.speak("Back");await new Promise(r=>setTimeout(r,1650));utterance.onend();assert.equal(await slow,"ended");hang=false;
  const disabled=Voice.speak("Back");Voice.toggle();assert.equal(await disabled,"disabled");assert.ok(audio.paused);Voice.toggle();
  Voice.cycle();assert.equal(Voice.name(),"American");const chosen=Voice.speak("Back");assert.equal(utterance.voice.name,"American");utterance.onend();assert.equal(await chosen,"ended");
  win.NarbeVoiceManager={getSettings:()=>({ttsEnabled:true}),speak(){hubCalls++;return {finished:Promise.resolve({reason:"end"})}}};
  assert.equal(await Voice.speak("Back"),"ended");assert.equal(hubCalls,1);
  assert.match(fs.readFileSync(path.join(root,"js/settings.js"),"utf8"),/Voice\.cycle\(\);\s*\/\/[^\n]*\n\s*Voice\.speak\(/,"preview occurs inside selection gesture");
  console.log("Recorded voice: playback, cancellation, dynamic fallback, rejected playback, startup timeout, mute, explicit voice and Hub delegation passed");
}
run().catch(e=>{console.error(e);process.exitCode=1});
