const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"]});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:800},reducedMotion:"reduce"});
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
      game.nav=0; game.diff=0; heat=0; nitroArmed=false;
      clearRoadworks(); Object.assign(car,{x:1,y:1,d:1,ang:-Math.PI/2});
      for(let x=1;x<4;x++) delete goodies[edgeKey(x,1,1)];
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
    await page.waitForFunction(()=>!car.moving && car.x===4 && car.y===1 && turnNo===window.quickStartTurn+3,{},{timeout:30000});
    await page.locator("#opts").getByRole("button",{name:/Pick up/}).waitFor({timeout:10000});
    assert.equal(await page.evaluate(()=>shift.fuel),37);
    assert.equal(await page.locator("#opts").getByRole("button",{name:/Pick up/}).count(),1);
    assert.deepEqual(errors,[],"uncaught browser errors");
    await page.screenshot({path:"browser-smoke.png"});
    console.log("Browser smoke: Enter-only practice, city edit/save/test/reload passed.");
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
