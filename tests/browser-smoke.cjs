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
      const button=page.locator(scope+" .opt.on").filter({has:page.locator("text="+label)});
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
    assert.deepEqual(errors,[],"uncaught browser errors");
    await page.screenshot({path:"browser-smoke.png"});
    console.log("Browser smoke: Enter-only practice, city edit/save/test/reload passed.");
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
