const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 let checks=0;
 async function setup({gpc=false,dnt=false,js=true}={}){
  const context=await browser.newContext({javaScriptEnabled:js});
  if(gpc) await context.addInitScript(()=>Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true}));
  if(dnt) await context.addInitScript(()=>Object.defineProperty(navigator,'doNotTrack',{get:()=>'1'}));
  let requests=[],errors=[];
  const page=await context.newPage(); page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.route(/https?:\/\/(gc\.zgo\.at|pykkd\.goatcounter\.com)\//,r=>r.fulfill({contentType:'application/javascript',body:'window.testAnalyticsLoaded=true;'}));
  return {context,page,requests,errors};
 }
 const external = urls=>urls.filter(u=>!u.startsWith(BASE)&&!u.startsWith('data:'));
 const otherVendors = urls=>external(urls).filter(u=>!/gc\.zgo\.at|pykkd\.goatcounter\.com/.test(u));
 for(const path of ['/','/disclosure/','/blog/gifts-for-campers-under-50/']){
  const t=await setup();await t.page.goto(BASE+path);await t.page.waitForTimeout(250);
  assert.deepEqual(otherVendors(t.requests),[],path+' must not contact vendors other than GoatCounter');
  assert.equal(await t.page.locator('#pk-privacy').count(),0);
  assert.equal(await t.page.locator('[data-pk-settings]').count(),0);
  assert.ok(await t.page.locator('script[data-goatcounter="https://pykkd.goatcounter.com/count"]').count(),path+' must include GoatCounter tag');
  await t.page.waitForFunction(()=>window.testAnalyticsLoaded===true);
  assert.deepEqual(t.errors,[]);checks++;
  await t.context.close();
 }
 let t=await setup();await t.page.goto(BASE+'/');
 await t.page.locator('[data-pk-open]').first().click();assert.equal(await t.page.locator('#pk-pop').isVisible(),true);
 assert.equal(await t.page.locator('#pk-pop a[href*="preview.mailerlite.io"]').count(),1);
 assert.deepEqual(otherVendors(t.requests),[]);await t.page.keyboard.press('Escape');checks++;
 await t.context.close();
 t=await setup({gpc:true});await t.page.goto(BASE+'/');
 assert.equal(await t.page.locator('#pk-privacy').count(),0);
 assert.ok(await t.page.locator('a[href*="amazon.com"][href*="tag="]').count());
 assert.equal(await t.page.locator('a[data-pk-affiliate-href]').count(),0);checks++;
 await t.context.close();
 t=await setup({js:false});await t.page.goto(BASE+'/newsletter/');assert.ok(await t.page.locator('a[href*="preview.mailerlite.io"]').count());assert.deepEqual(otherVendors(t.requests),[]);checks++;await t.context.close();
 // Inspect the actual provider form, but never fill or submit it.
 t=await setup();await t.page.goto('https://preview.mailerlite.io/preview/2744558/forms/202421660617278565');
 assert.equal(await t.page.locator('input[name="fields[email]"]').count(),1);assert.equal(await t.page.locator('form[action*="/subscribe"]').count(),1);checks++;await t.context.close();
 await browser.close();console.log('PASS: '+checks+' privacy/network/browser assertions; GoatCounter loads by default with no consent UI; no subscription submitted');
})().catch(e=>{console.error(e);process.exit(1)});
