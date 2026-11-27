// Capture actual Switch Cab screens; no changes to game source or saved player data.
const {chromium}=require("playwright");
const fs=require("node:fs");
const assert=require("node:assert/strict");
(async()=>{
  const browser=await chromium.launch({args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"]});
  const out="docs/screenshots";
  fs.mkdirSync(out,{recursive:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:"reduce"});
    await page.addInitScript(()=>{
      localStorage.setItem("switchcity-access",JSON.stringify({autoScan:false,scanInterval:2000,waitForSpeech:false}));
      localStorage.setItem("switchcity-voice",JSON.stringify({tts:false}));
      localStorage.setItem("switchcity-settings",JSON.stringify({gfx:1,motion:true,sfx:false,music:false,engine:false}));
    });
    const load=async()=>{
      await page.goto("http://127.0.0.1:8000/",{waitUntil:"domcontentloaded"});
      await page.locator("#menuList button").first().waitFor({timeout:90000});
      assert.equal(await page.locator("#noGL").isVisible(),false,"WebGL required");
    };
    const menu=name=>page.locator("#menuList").getByRole("button",{name,exact:false}).first().click({timeout:30000});
    const snap=async(name)=>{
      await page.evaluate(()=>document.fonts.ready);
      await page.waitForTimeout(1000);
      await page.screenshot({path:out+"/"+name+".png",timeout:30000});
      assert.ok(fs.statSync(out+"/"+name+".png").size>20000,"capture unexpectedly small: "+name);
    };
    await load();
    await snap("main-menu");
    await menu("Start a taxi shift");await menu("Taxi shift. Choose a city");
    await page.locator("#menuList button").first().click({timeout:30000});
    await page.locator("#opts button").first().waitFor({timeout:90000});
    await snap("driving");
    await load();await menu("City editor");await menu("Start from a copy of");
    await page.locator("#opts button").first().waitFor({timeout:90000});
    await snap("city-editor");
    await load();await menu("Settings");
    await page.locator("#menuTitle").filter({hasText:"Settings"}).waitFor();
    await snap("settings");
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
