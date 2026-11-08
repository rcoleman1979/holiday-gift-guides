/* All Amazon navigation is intercepted before network transmission. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const BASE=process.env.BASE_URL||'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 let count=0;
 for(const state of ['unset','declined','gpc']){
  const context=await browser.newContext();let intercepted=[],dialogs=[];
  await context.addInitScript(state=>{
   if(state==='gpc')Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
   if(state==='declined')localStorage.setItem('pk_privacy_v1',JSON.stringify({version:1,analytics:false,at:Date.now()}));
  },state);
  await context.route(url=>/(^|\.)amazon\.[a-z.]+$/.test(url.hostname),r=>{
   if(r.request().isNavigationRequest())intercepted.push(r.request().url());return r.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Intercepted test navigation</title><p>No request was sent to Amazon.</p>'});
  });
  context.on('page',p=>p.on('dialog',async d=>{dialogs.push(d.type());await d.dismiss()}));
  const page=await context.newPage();let vendorRequests=[];
  page.on('request',r=>{if(/goatcounter|mailerlite|fonts.googleapis|fonts.gstatic/.test(r.url()))vendorRequests.push(r.url())});
  async function open(path){
   await page.goto(BASE+path);if(await page.locator('#pk-privacy').isVisible())await page.locator('[data-choice=close]').click();
   if(await page.locator('.disc').count())assert.equal(await page.locator('.disc').textContent(),'As an Amazon Associate I earn from qualifying purchases.');
  }
  async function follow(link,kind='click'){
   const expected=await link.getAttribute('href');assert.equal(new URL(expected).hostname,'www.amazon.com');assert.equal(new URL(expected).searchParams.get('tag'),'killagorillab-20');
   // Offline is a second safety barrier if Chromium misses routing a new target.
   await context.setOffline(true);
   const n=intercepted.length,pending=context.waitForEvent('page');
   if(kind==='keyboard'){await link.focus();await page.keyboard.press('Enter')}
   else await link.click();
   const popup=await pending;await popup.waitForURL(expected);await popup.waitForLoadState();
   assert.equal(intercepted.length,n+1); assert.equal(intercepted[n],expected);assert.deepEqual(dialogs,[]);await popup.close();await context.setOffline(false);count++;
  }
  await open('/');await follow(page.locator('a[href*="amazon.com/dp/"]').first());
  await open('/blog/gifts-for-campers-under-50/');await follow(page.locator('a[href*="amazon.com/dp/"]').first(),'keyboard');
  await open('/anker-gifts/');await follow(page.locator('a[href*="amazon.com/dp/"]').first());
  await open('/');await page.locator('#srch-q').fill('MagSlider');
  const header=page.locator('.srch-r a.az').first();await header.waitFor();assert.equal(await header.textContent(),'Amazon (paid link)');await follow(header);
  await open('/search/?q=MagSlider');const result=page.locator('#search-results a.az').first();await result.waitFor();assert.equal(await result.textContent(),'Amazon (paid link)');await follow(result);
  assert.deepEqual(vendorRequests,[],'No on-site optional vendor requests before an analytics choice');
  await context.close();
 }
 await browser.close();console.log('PASS: '+count+' intercepted one-click Amazon navigation cases (homepage, blog, guide, dynamic header search and search page; unset, declined, GPC; mouse and keyboard; offline fallback blocks any un-routed outbound request). Zero dialogs or real Amazon requests.');
})().catch(e=>{console.error(e);process.exit(1)});
