const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"]});
  let page;
  try {
    page = await browser.newPage({viewport:{width:1024,height:640},reducedMotion:"reduce"});
    const errors = [];
    page.on("pageerror",e=>errors.push(e.message));
    await page.addInitScript(()=>{
      if(!localStorage.getItem("switchcity-access")) localStorage.setItem("switchcity-access",JSON.stringify({autoScan:true,scanInterval:1000,waitForSpeech:false}));
      localStorage.setItem("switchcity-voice",JSON.stringify({tts:false}));
      localStorage.setItem("switchcity-settings",JSON.stringify({gfx:0,motion:true,speed:2,sfx:false,music:false,engine:false}));
    });
    await page.goto(process.env.TEST_URL || "http://127.0.0.1:8000/", {waitUntil:"domcontentloaded"});
    const click = async (scope,name) => page.locator(scope).getByRole("button",{name,exact:false}).first().click({timeout:30000});
    const menu = name=>click("#menuList",name);
    const opt = name=>click("#opts",name);
    await page.locator("#menuList button").first().waitFor({timeout:90000});
    assert.equal(await page.locator("#noGL").isVisible(),false,"WebGL required");
    // Test-only speedup through real animation and normal arrival logic.
    const accelerateDrive=()=>page.evaluate(()=>{SPEEDS[2]=3;});
    await accelerateDrive();
    // New standalone session: complete practice with only Enter presses.
    const select = async (label,scope) => {
      const button=page.locator(scope+" .opt.on").filter({hasText:label});
      await button.waitFor({timeout:35000});
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
    };
    await select("Learn to drive","#menuList");
    await select("GPS","#opts");
    await select("Pick up","#opts");
    await select("GPS","#opts");
    await page.locator("#menuTitle").filter({hasText:"Fare complete!"}).waitFor({timeout:30000});
    assert.equal(await page.evaluate(()=>localStorage.getItem("switchcity-game3")),null);
    await menu("Main menu");
    await menu("City editor");
    await menu("New empty city");
    await opt("Change a block"); await opt("Row 8"); await opt("Block 8"); await opt("Park");
    await page.locator("#editorBack").click(); await page.locator("#editorBack").click();
    await opt("Set where the cab starts");await opt("Row 9");await opt("Junction 9");
    await opt("Save city");
    const city = await page.evaluate(()=>JSON.parse(localStorage.getItem("switchcity-levels"))[0]);
    assert.equal(city.blocks[63],"P"); assert.deepEqual(city.start,[8,8]);
    await opt("Test drive");
    await opt("Pause");await menu("Back to the editor");
    await opt("Done. Leave the editor");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.locator("#menuList button").first().waitFor({timeout:90000});
    await accelerateDrive();
    await menu("City editor");await menu("Edit "+city.name);
    assert.equal(await page.evaluate(()=>level.blocks[63]),"P");
    assert.deepEqual(await page.evaluate(()=>level.start),[8,8]);
    // Trigger a known dare without relying on random passenger offers.
    await opt("Done. Leave the editor");
    await page.locator("#menuList").getByRole("button",{name:"Back",exact:true}).click();
    await menu("Start a taxi shift");
    await menu("Taxi shift. Choose a city");
    await page.locator("#menuList button").first().click();
    await page.evaluate(()=>{
      const passenger={dest:[4,4],destName:"the park",pay:100,patience:null,dare:null};
      shift.onboard=[passenger];
      pendingDares=[{p:passenger,dare:{type:"coins",need:10,have:0,text:"Grab ten coins before you drop me off."}}];
      offerDare("Passenger pickup.");
    });
    assert.match(await page.locator("#choicePrompt").innerText(),/Grab ten coins.*double.*half/i);
    await opt("Hear dare again");
    assert.equal(await page.locator("#choicePrompt").isVisible(),true);
    await opt("Accept the dare");
    assert.equal(await page.locator("#choicePrompt").isVisible(),false);
    assert.match(await page.locator("#missionText").innerText(),/Collect ten coins.*0\/10/);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("switchcity-game3")).shift.onboard[0].dare.type),"coins");
    // Authorise a three-block route in an empty corridor; every block must
    // consume a normal turn and fuel, then return control at the destination.
    const fixture=await page.evaluate(()=>{
      shift.onboard=[]; clearWaiting(); clearCops(); clearRival();
      game.nav=0; game.diff=0; game.cops=0; heat=0; nitroArmed=false;
      shift.level=1; pendingDares=[]; combo=0; rand=rng(1729);
      clearRoadworks(); Object.assign(car,{x:1,y:1,d:1,p:0,moving:false,ang:-Math.PI/2});
      // Isolate the corridor from random events and stale scenery.
      for(const key of Object.keys(goodies)){
        city.remove(goodies[key].g); delete goodies[key];
      }
      // Preserve the real animation/arrival path but avoid software-WebGL
      // frame rate making three ordinary blocks exceed the wall-clock budget.
      window.quickOriginalSpeed=SPEEDS[game.speed];
      SPEEDS[game.speed]=2.4;
      const w={id:"quick-test",x:4,y:1,dest:[6,6],destName:"the park",pay:100,size:"SHORT",col:0x3ccf6a};
      makeWaitingVisual(w);waiting.push(w);targetPick=w;shift.fuel=40;
      // Keep deterministic waiting passengers so no spawn can interrupt.
      while(waiting.length<WANT_WAITING){const i=waiting.length;const other={id:"other"+i,x:8,y:i,dest:[6,6],destName:"the park",pay:100,size:"SHORT",col:0x3ccf6a};makeWaitingVisual(other);waiting.push(other);}
      takeTips(); openJunction("Quick journey test.");
      window.quickStartTurn=turnNo;
      return {length:quickRouteLength(1,[4,1]),items:Scan.items.map(i=>({id:i.id,say:i.say}))};
    });
    assert.equal(fixture.length,3,JSON.stringify(fixture));
    assert.equal(fixture.items[0].id,"quickRoute",JSON.stringify(fixture));
    await page.locator("#opts").getByRole("button",{name:/^GPS shortcut\. straight on, 3 blocks/i}).click({timeout:10000});
    await page.waitForFunction(()=>!car.moving && turnNo>window.quickStartTurn,{},{timeout:30000});
    const arrived=await page.evaluate(()=>{
      SPEEDS[game.speed]=window.quickOriginalSpeed;
      return {x:car.x,y:car.y,turns:turnNo-window.quickStartTurn,fuel:shift.fuel};
    });
    assert.deepEqual(arrived,{x:4,y:1,turns:3,fuel:37},"GPS shortcut must complete all three normal turns");
    await page.locator("#opts").getByRole("button",{name:/Pick up/}).waitFor({timeout:10000});
    assert.equal(await page.evaluate(()=>shift.fuel),37);
    assert.equal(await page.locator("#opts").getByRole("button",{name:/Pick up/}).count(),1);
    // The three optional challenges use real driving and pickups.
    const saved=await page.evaluate(()=>JSON.stringify([localStorage.getItem("switchcity-game3"),localStorage.getItem("switchcity-cash"),localStorage.getItem("switchcity-earned")]));
    await opt("Pause"); await menu("Main menu");
    await menu("Practice challenges"); await menu("Carpool practice");
    const gps=async()=>{await opt("GPS way");await page.waitForFunction(()=>!car.moving&&Scan.items.length>0,{},{timeout:30000})};
    await gps();await opt("Pick up your passenger");await gps();await opt("Pick up your passenger");
    assert.equal(await page.evaluate(()=>shift.onboard.length),2);
    for(let i=0;i<3;i++)await gps();
    // From passenger two's junction, the first drop is two moves, second two.
    if(await page.locator("#menuTitle").innerText()!=="Challenge complete!")await gps();
    await page.locator("#menuTitle").filter({hasText:"Challenge complete!"}).waitFor({timeout:30000});
    await menu("More challenges");await menu("Stunt practice");
    await gps();await gps();await gps();
    await page.locator("#menuTitle").filter({hasText:"Challenge complete!"}).waitFor({timeout:30000});
    await menu("More challenges");await menu("Police evasion practice");
    assert.ok(await page.locator("#opts").getByRole("button",{name:/police danger/i}).count());
    await gps();await gps();await gps();
    await page.locator("#menuTitle").filter({hasText:"Challenge complete!"}).waitFor({timeout:30000});
    assert.equal(await page.evaluate(()=>JSON.stringify([localStorage.getItem("switchcity-game3"),localStorage.getItem("switchcity-cash"),localStorage.getItem("switchcity-earned")])),saved);
    assert.deepEqual(errors,[],"uncaught browser errors");
    await page.screenshot({path:"browser-smoke.png"});
    console.log("Browser smoke: Enter-only practice, city edit/save/test/reload passed.");
  } catch(e) {
    if(page){
      try {
        console.error("Browser state:",JSON.stringify(await page.evaluate(()=>({
          mode:typeof mode==="undefined"?null:mode,
          modeKey:typeof modeKey==="undefined"?null:modeKey,
          car:typeof car==="undefined"?null:car,
          turnNo:typeof turnNo==="undefined"?null:turnNo,
          quickStartTurn:window.quickStartTurn,
          quick:typeof turn==="undefined"||!turn?.quick?null:{d:turn.quick.d,remaining:turn.quick.remaining,destination:turn.quick.destination},
          fuel:typeof shift==="undefined"?null:shift?.fuel,
          menu:document.querySelector("#menuTitle")?.textContent,
          choices:document.querySelector("#opts")?.innerText
        }))));
      } catch(diagnosticError){ console.error("State capture failed:",diagnosticError.message); }
      try {await page.screenshot({path:"browser-smoke.png",timeout:5000});} catch(diagnosticError){ console.error("Screenshot failed:",diagnosticError.message); }
    }
    throw e;
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
