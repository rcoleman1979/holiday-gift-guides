const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=process.env.SITE_ROOT||process.cwd(),script=fs.readFileSync(process.env.GOATCOUNTER_SCRIPT,'utf8');
 const browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 async function run(init){
  const context=await browser.newContext();
  if(init) await context.addInitScript(init);
  let counts=0,requests=[];
  const page=await context.newPage();
  await page.route('**/*',async r=>{
   const u=new URL(r.request().url());requests.push(u.href);
   if(u.hostname==='gc.zgo.at')return r.fulfill({contentType:'application/javascript',body:script});
   if(u.hostname==='pykkd.goatcounter.com'){counts++;return r.fulfill({status:200,contentType:'image/gif',body:Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64')});}
   if(u.hostname!=='pykkd.com')return r.abort();
   let file=path.join(root,decodeURIComponent(u.pathname));if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
   return r.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':undefined});
  });
  await page.goto('https://pykkd.com/');
  await page.waitForTimeout(1500);
  return {context,page,getCounts:()=>counts,requests};
 }
 const def=await run();
 assert.ok(await def.page.locator('script[data-goatcounter="https://pykkd.goatcounter.com/count"]').count());
 assert.equal(await def.page.locator('#pk-privacy').count(),0);
 await def.page.waitForFunction(()=>window.goatcounter&&window.goatcounter.count);
 assert.ok(def.getCounts()>=1,'Actual GoatCounter should attempt count by default');
 assert.ok(!def.requests.some(x=>/mailerlite|fonts.googleapis/.test(x)));
 await def.page.screenshot({path:'/workspace/rakuten-review/privacy-homepage.png',fullPage:false});
 await def.context.close();

 const gpc=await run(()=>Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true}));
 await gpc.page.waitForFunction(()=>window.goatcounter&&window.goatcounter.no_onload===true);
 assert.equal(gpc.getCounts(),0,'GPC must skip the GoatCounter count');
 await gpc.context.close();

 const dnt=await run(()=>Object.defineProperty(navigator,'doNotTrack',{get:()=>'1'}));
 await dnt.page.waitForFunction(()=>window.goatcounter&&window.goatcounter.no_onload===true);
 assert.equal(dnt.getCounts(),0,'Do Not Track must skip the GoatCounter count');
 await dnt.context.close();

 await browser.close();console.log('PASS: actual downloaded GoatCounter counts by default with no consent UI; DNT and GPC skip the count; count requests intercepted, never sent');
})().catch(e=>{console.error(e);process.exit(1)});
