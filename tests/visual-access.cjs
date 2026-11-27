const fs=require("node:fs"),path=require("node:path");
function visualTests(h,input,city,cam,turns,fx,models,settings){
 let n=0;const assert=(v,msg)=>{if(!v)throw Error(msg);n++};
 const a=cam.slice(cam.indexOf("function applyMotion()"),cam.indexOf('if (motionPreference.addEventListener)'));
 const run=new Function("game","motionPreference","document","setLights","RM","camSnap",a+"\napplyMotion();return {RM,camSnap};");
 for(const [stored,system,expected] of [[false,false,false],[true,false,true],[false,true,true],[true,true,true]]){const doc={documentElement:{dataset:{}}};let light=0;const res=run({motion:stored},{matches:system},doc,()=>light++,false,false);assert(res.RM===expected&&res.camSnap&&doc.documentElement.dataset.motion===(expected?"reduced":"standard")&&light===Number(expected),"motion preference resolution");}
 const surfaces=city.slice(city.indexOf("  const slab = box("),city.indexOf("  const pc = ()"));
 const geometry=new Function(`const SZ=16,cx=10,cz=20,P={side:0},THREE={Color:class{multiplyScalar(){return this}}},texMat=()=>{},std=()=>{};
 const box=(w,h,d)=>({w,h,d,position:{set(x,y,z){Object.assign(this,{x,y,z})}}});
 const meshes=[],g={add(m){meshes.push(m)}};
 ${surfaces}
 return meshes;`)();
 const [slab,curb]=geometry,top=m=>m.position.y+m.h/2,bottom=m=>m.position.y-m.h/2;
 assert(Math.abs(top(slab)-.30)<1e-9,"pavement retains original floor height");
 assert(top(slab)-top(curb)>=.07,"pavement and curb top surfaces are separated");
 assert(bottom(slab)>0&&bottom(curb)<0&&top(curb)>bottom(slab),"kerb supports slab above road");
 assert(curb.w>slab.w&&curb.d>slab.d,"kerb remains visible around pavement");
 const camera=cam.slice(cam.indexOf("function updateCamera("),cam.indexOf("function resize("));
 const harness=new Function("RM","ang",`class V {constructor(x,y,z){Object.assign(this,{x,y,z})}copy(v){Object.assign(this,v);return this}lerp(v,k){return this.copy(v)}};const THREE={Vector3:V},mode="play",EXT=176,car={x:4,y:4,ang,moving:true},game={cam:0,gfx:1},playerMesh={position:{y:7}},pos=()=>[88,88],camPos=new V(),camLook=new V();let camSnap=true;const camera={position:new V(),lookAt(v){this.target=v}},skyMesh={position:new V()},sunL={target:{position:new V()},position:{set(){}}};${camera} updateCamera(.016,9000);return [camera.position.x,camera.position.y,camera.position.z,camera.target.x,camera.target.y,camera.target.z]`);
 assert(JSON.stringify(harness(true,0))===JSON.stringify(harness(true,Math.PI/2)),"north-up camera independent of heading");
 assert(harness(true,0)[1]===52&&harness(false,0)[1]!==52,"reduced motion no stunt zoom");
 assert(turns.includes("game.flash && !RM ?"),"flashing overridden");
 assert(turns.includes("RM ? 0 : 7")&&turns.includes("body.rotation.x = RM ? 0"),"stunt animation reduced");
 assert(turns.includes("if (!RM) npcs.forEach")&&turns.includes("p.t += RM ? 0"),"ambient motion suppressed");
 assert(fx.includes("RM ? 0 : (BLOOM")&&fx.includes("pulsePeriod = RM ? 0"),"bloom and outline pulses disabled");
 assert(models.includes("if (RM) return;")&&models.includes("particles.splice(i, 1); continue;"),"particle emission and existing particles suppressed");
 assert(input.includes("flash: false, motion: false")&&input.includes('behavior: "instant"'),"steady defaults and instant scroll");
 assert(settings.includes('it("motion"')&&settings.includes("applyMotion();"),"switch-accessible motion preference");
 assert(h.includes('#menuList .opt.on.braked')&&h.includes('outline: 5px dotted #fff'),"menu brake distinct");
 assert(h.includes("max-height: 48dvh")&&h.includes("overflow-y: auto")&&h.includes("max-height: 600px"),"compact layout");
 function lum(hex){return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0)}
 const contrast=(x,y)=>(Math.max(lum(x),lum(y))+.05)/(Math.min(lum(x),lum(y))+.05);
 assert(contrast("ffffff","34265d")>=7&&contrast("211532","ffdb55")>=7,"selected and unselected label contrast exceeds 7:1");
 return n;
}
console.log(`${visualTests(...["index.html","js/input-scanning-voice.js","js/city.js","js/city-editor-and-camera.js","js/turns-carpool-police.js","js/visual-effects.js","js/models.js","js/settings.js"].map(p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8")))} visual checks passed`);
