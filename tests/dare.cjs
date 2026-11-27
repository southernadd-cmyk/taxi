const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const source=fs.readFileSync(path.join(__dirname,"../js/turns-carpool-police.js"),"utf8");
const code=source.slice(source.indexOf("function dareGoal("),source.indexOf("function dareProgress("));
const run=new Function(code+`
let pendingDares=[], shift={onboard:[]}, game={guide:false}, saved=0, bar, spoken=[], junction;
function tip(){} function takeTips(){return "Extra tutorial."} function updateHud(){} function saveGame(){saved++} function sfx(){} function guidance(){return ""}
function showBar(items,speech,detail){bar={items,speech,detail}}
function openJunction(s){junction=s}
const Voice={speak(s){spoken.push(s)}};
return {dareGoal,dareStatus,offer(dare){const p={dare:null};pendingDares=[{p,dare}];shift.onboard=[p];offerDare("Pickup.");return p},get bar(){return bar},get saved(){return saved},get spoken(){return spoken},get junction(){return junction}};
`)();
for(const dare of [{type:"ramp",need:2,have:0,text:"Hit two stunt ramps before you drop me off."},{type:"coins",need:10,have:0,text:"Grab ten coins before you drop me off."},{type:"smash",need:2,have:0,text:"Smash two lots of crates or cones before you drop me off. The police might notice!"},{type:"visit",need:1,have:0,place:"the City Museum",text:"Drive past the City Museum on the way."}]){
 const p=run.offer(dare),{items,speech,detail}=run.bar;
 assert.ok(detail.includes(dare.text));assert.ok(speech.startsWith(detail));assert.match(detail,/double.*half.*normal/i);
 assert.ok(items[1].say.includes(dare.text));assert.ok(items[1].label.includes(run.dareGoal(dare)));
 items[2].act();assert.equal(run.spoken.at(-1),detail);assert.equal(p.dare,null);
 const saved=run.saved;items[1].act();assert.equal(p.dare,dare);assert.equal(run.saved,saved+1);assert.match(run.junction,/Dare accepted/);assert.match(run.dareStatus(dare),new RegExp("0/"+dare.need+"$"));
 const p2=run.offer(dare);run.bar.items[0].act();assert.equal(p2.dare,null);assert.match(run.junction,/normal fare/i);
}
console.log("Dare clarity: all four challenge types, repeat, acceptance, decline and persistence passed.");
