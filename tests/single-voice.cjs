const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root=path.join(__dirname,"..");
const source=fs.readFileSync(path.join(root,"js/input-scanning-voice.js"),"utf8").split("/* ======================= choice scanner")[0];
assert.ok(!fs.readFileSync(path.join(root,"index.html"),"utf8").includes('src="js/voice-pack.js'),"no partial voice pack loaded");
async function run(){
  let utterance, calls=[], hubCalls=[], saved={"switchcity-voice":JSON.stringify({tts:true,voice:"__kokoro_emma__"})};
  let voices=[{name:"US",lang:"en-US",localService:true},{name:"British",lang:"en-GB",localService:true},{name:"British Natural",lang:"en-GB",localService:false}];
  const synth={getVoices:()=>voices,cancel(){},speak(u){utterance=u;calls.push([u.text,u.voice?.name]);u.onstart?.();}};
  const win={speechSynthesis:synth,Audio:class {constructor(){throw Error("partial recording must not be used");}},SwitchCabRecordedClips:{Settings:"aac17d5a33e06d1d.mp3"}};
  const storage={getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v};
  const make=()=>new Function("window","localStorage","speechSynthesis","SpeechSynthesisUtterance",source+"\nreturn Voice;")(win,storage,synth,function(text){this.text=text});
  const V=make();
  assert.equal(JSON.parse(saved["switchcity-voice"]).voice,"");
  assert.equal(V.name(),"British Natural");
  const phrases=["Switch Cab. Main menu.","Settings","Start a taxi shift. Carry passengers, dodge the police.","Choose a city","You have 12 dollars","Settings. Speech and sound. Voice, spoken directions, music and sounds."];
  for(const p of phrases){const done=V.speak(p);utterance.onend();assert.equal(await done,"ended");}
  assert.deepEqual(calls,phrases.map(p=>[p,"British Natural"]),"all static, dynamic and previously recorded phrases use one voice");
  voices=[voices[0],voices[1],{name:"Another Natural",lang:"en-GB",localService:true},voices[2]];
  const next=V.speak("Back");utterance.onend();await next;assert.equal(calls.at(-1)[1],"British Natural","voice list updates do not switch the session voice");
  V.cycle();assert.equal(V.name(),"US");const reload=make();assert.equal(reload.name(),"US","explicit choice survives reload");
  const chosen=reload.speak("Settings");utterance.onend();await chosen;assert.equal(calls.at(-1)[1],"US");
  const muted=reload.speak("Back");reload.toggle();assert.equal(await muted,"disabled");assert.equal(await reload.speak("Settings"),"disabled");
  const count=calls.length;let enabled=true;
  win.NarbeVoiceManager={getSettings:()=>({ttsEnabled:enabled}),getCurrentVoice:()=>({name:"Hub Voice"}),speak(t){hubCalls.push(t);return {finished:Promise.resolve({reason:"end"})}},cycleVoice(){hubCalls.push("cycle")},toggleTTS(){enabled=!enabled}};
  const hub=make();assert.equal(hub.name(),"Hub Voice");
  for(const p of phrases)assert.equal(await hub.speak(p),"ended");
  hub.cycle();hub.toggle();assert.equal(await hub.speak("Back"),"disabled");
  assert.equal(calls.length,count,"Hub never calls standalone speech engine");
  assert.deepEqual(hubCalls,[...phrases,"cycle"]);
  console.log("Single voice: menu titles, options, dynamic speech, preference migration, persistence, mute and Hub delegation passed");
}
run().catch(e=>{console.error(e);process.exitCode=1});
