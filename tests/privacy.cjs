const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 let checks=0;
 async function setup(gpc=false,js=true){
  const context=await browser.newContext({javaScriptEnabled:js});
  if(gpc) await context.addInitScript(()=>Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true}));
  let requests=[],errors=[];
  const page=await context.newPage(); page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.route(/https:\/\/(gc.zgo.at|pykkd.goatcounter.com)\//,r=>r.fulfill({contentType:'application/javascript',body:'window.testAnalyticsLoaded=true;'}));
  return {context,page,requests,errors};
 }
 const external = urls=>urls.filter(u=>!u.startsWith(BASE)&&!u.startsWith('data:'));
 for(const path of ['/','/disclosure/','/blog/gifts-for-campers-under-50/']){
  const t=await setup();await t.page.goto(BASE+path);await t.page.waitForTimeout(250);
  assert.deepEqual(external(t.requests),[],path+' must not contact third parties');
  assert.equal(await t.page.locator('#pk-privacy').isVisible(),true);checks++;
  await t.page.locator('[data-choice=no]').click();await t.page.reload();
  assert.equal(await t.page.locator('#pk-privacy').isVisible(),false);assert.deepEqual(external(t.requests),[]);checks++;
  await t.page.locator('footer [data-pk-settings]').click();await t.page.locator('[data-choice=yes]').click();
  await t.page.waitForFunction(()=>window.testAnalyticsLoaded===true);checks++;
  await t.page.locator('footer [data-pk-settings]').click();
  await Promise.all([t.page.waitForNavigation(),t.page.locator('[data-choice=no]').click()]);
  assert.equal(await t.page.evaluate(()=>window.testAnalyticsLoaded),undefined);
  const n=t.requests.length;await t.page.reload();await t.page.waitForTimeout(150);
  assert.deepEqual(external(t.requests.slice(n)),[]);assert.deepEqual(t.errors,[]);checks++;
  await t.context.close();
 }
 let t=await setup();await t.page.goto(BASE+'/');await t.page.locator('[data-choice=no]').click();
 await t.page.locator('[data-pk-open]').first().click();assert.equal(await t.page.locator('#pk-pop').isVisible(),true);
 assert.equal(await t.page.locator('#pk-pop a[href*="preview.mailerlite.io"]').count(),1);
 assert.deepEqual(external(t.requests),[]);await t.page.keyboard.press('Escape');checks++;
 await t.context.close();
 t=await setup(true);await t.page.goto(BASE+'/');
 await t.page.evaluate(()=>localStorage.setItem('pk_privacy_v1',JSON.stringify({version:1,analytics:true,at:Date.now()})));await t.page.reload();
 assert.deepEqual(external(t.requests),[]);await t.page.locator('footer [data-pk-settings]').click();
 assert.equal(await t.page.locator('[data-choice=yes]').isDisabled(),true);
 assert.ok(await t.page.locator('a[href*="amazon.com"][href*="tag="]').count());
 assert.equal(await t.page.locator('a[data-pk-affiliate-href]').count(),0);checks++;
 await t.context.close();
 t=await setup();await t.page.goto(BASE+'/');await t.page.evaluate(()=>localStorage.setItem('pk_privacy_v1',JSON.stringify({version:1,analytics:true,at:1})));await t.page.reload();assert.deepEqual(external(t.requests),[]);checks++;await t.context.close();
 t=await setup(false,false);await t.page.goto(BASE+'/newsletter/');assert.ok(await t.page.locator('a[href*="preview.mailerlite.io"]').count());assert.deepEqual(external(t.requests),[]);checks++;await t.context.close();
 // Inspect the actual provider form, but never fill or submit it.
 t=await setup();await t.page.goto('https://preview.mailerlite.io/preview/2744558/forms/202421660617278565');
 assert.equal(await t.page.locator('input[name="fields[email]"]').count(),1);assert.equal(await t.page.locator('form[action*="/subscribe"]').count(),1);checks++;await t.context.close();
 await browser.close();console.log('PASS: '+checks+' privacy/network/browser assertions; no subscription submitted');
})().catch(e=>{console.error(e);process.exit(1)});
