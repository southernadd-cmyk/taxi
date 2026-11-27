const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const source = fs.readFileSync(path.join(__dirname,"../js/input-scanning-voice.js"),"utf8");
const prefix = source.split("/* ======================= choice scanner")[0];
async function run() {
  let audio, utterance, nativeCalls=0, hubCalls=0, saved={};
  let fail=false, hang=false;
  class Audio {
    constructor(url) { this.url=url; this.paused=false; audio=this; }
    play() { if(fail) return Promise.reject(Error("blocked")); if(!hang) this.onplaying?.(); return Promise.resolve(); }
    pause() { this.paused=true; }
  }
  const voices=[{name:"American",lang:"en-US",localService:true},{name:"British",lang:"en-GB",localService:true}];
  const synth={getVoices:()=>voices,cancel(){},speak(u){nativeCalls++;utterance=u;u.onstart?.();}};
  const win={Audio,speechSynthesis:synth,fetch:async()=>({ok:true,json:async()=>({clips:{Back:"0123456789abcdef.mp3",Pause:"abcdef0123456789.mp3"}})})};
  const Voice=new Function("window","localStorage","speechSynthesis","SpeechSynthesisUtterance",prefix+"\nreturn Voice;")(win,{getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v},synth,function(text){this.text=text});
  for(let i=0;i<8;i++)await Promise.resolve();
  assert.equal(Voice.name(),"Emma (recorded)");
  const first=Voice.speak("Back");assert.equal(nativeCalls,0);assert.ok(audio.url.endsWith("0123456789abcdef.mp3"));
  const old=audio;const second=Voice.speak("Pause");assert.equal(await first,"cancelled");assert.ok(old.paused);
  audio.onended();assert.equal(await second,"ended");
  const dynamic=Voice.speak("You have 12 dollars");assert.equal(utterance.voice.name,"British");utterance.onend();assert.equal(await dynamic,"ended");
  fail=true;const rejected=Voice.speak("Back");for(let i=0;i<5;i++)await Promise.resolve();utterance.onend();assert.equal(await rejected,"ended");fail=false;
  hang=true;const slow=Voice.speak("Back");await new Promise(r=>setTimeout(r,850));utterance.onend();assert.equal(await slow,"ended");hang=false;
  const disabled=Voice.speak("Back");Voice.toggle();assert.equal(await disabled,"disabled");assert.ok(audio.paused);Voice.toggle();
  Voice.cycle();assert.equal(Voice.name(),"American");const chosen=Voice.speak("Back");assert.equal(utterance.voice.name,"American");utterance.onend();assert.equal(await chosen,"ended");
  win.NarbeVoiceManager={getSettings:()=>({ttsEnabled:true}),speak(){hubCalls++;return {finished:Promise.resolve({reason:"end"})}}};
  assert.equal(await Voice.speak("Back"),"ended");assert.equal(hubCalls,1);
  console.log("Recorded voice: playback, cancellation, dynamic fallback, rejected playback, startup timeout, mute, explicit voice and Hub delegation passed");
}
run().catch(e=>{console.error(e);process.exitCode=1});
