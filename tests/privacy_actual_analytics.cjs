const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=process.env.SITE_ROOT||process.cwd(),script=fs.readFileSync(process.env.GOATCOUNTER_SCRIPT,'utf8');
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext();let counts=0,requests=[];
 const page=await context.newPage();
 await page.route('**/*',async r=>{
  const u=new URL(r.request().url());requests.push(u.href);
  if(u.hostname==='gc.zgo.at')return r.fulfill({contentType:'application/javascript',body:script});
  if(u.hostname==='pykkd.goatcounter.com'){counts++;return r.fulfill({status:200,contentType:'image/gif',body:Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64')});}
  if(u.hostname!=='pykkd.com')return r.abort();
  let file=path.join(root,decodeURIComponent(u.pathname));if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  return r.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':undefined});
 });
 await page.goto('https://pykkd.com/');assert.equal(counts,0);
 await page.locator('[data-choice=yes]').click();await page.waitForFunction(()=>window.goatcounter&&window.goatcounter.count);
 await page.waitForTimeout(1500);assert.ok(counts>=1,'Actual GoatCounter should attempt count after consent');
 await page.locator('footer [data-pk-settings]').click();await Promise.all([page.waitForNavigation(),page.locator('[data-choice=no]').click()]);
 let n=counts;await page.waitForTimeout(750);assert.equal(counts,n);assert.equal(await page.evaluate(()=>typeof window.goatcounter),'undefined');
 assert.ok(!requests.some(x=>/mailerlite|fonts.googleapis/.test(x)));
 await page.screenshot({path:'/workspace/rakuten-review/privacy-homepage.png',fullPage:false});
 await context.close();await browser.close();console.log('PASS: actual downloaded GoatCounter executes only after allowance; withdrawal unloads; count requests intercepted, never sent');
})().catch(e=>{console.error(e);process.exit(1)});
