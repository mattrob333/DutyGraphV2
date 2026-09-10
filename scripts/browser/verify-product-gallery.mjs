import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const base=process.argv[2]||'http://127.0.0.1:4317';
await mkdir('work',{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
const checks=[],errors=[];
const check=(v,label)=>{assert.ok(v,label);checks.push(label)};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/landing/');
 const gallery=page.locator('.product-gallery');
 await gallery.scrollIntoViewIfNeeded();
 check(await gallery.getByRole('tab').count()===4,'four product views');
 check(await page.locator('#view-tab-0').getAttribute('aria-selected')==='true','Work Map is first and selected');
 check(await page.locator('#view-panel-0 img').evaluate(i=>i.complete&&i.naturalWidth===1626),'actual Work Map screenshot loads');
 check((await page.locator('#gallery-caption').innerText()).startsWith('Select a business stage'),'initial caption matches');
 await page.locator('#view-tab-0').focus();
 await page.keyboard.press('End');
 check(await page.locator('#view-tab-3').getAttribute('aria-selected')==='true','keyboard reaches fourth view');
 check(await page.locator('#gallery-count').innerText()==='04 / 04','counter includes fourth view');
 check((await page.locator('#gallery-announcement').innerText()).startsWith('4 of 4.'),'accessible announcement uses correct total');
 await page.getByRole('button',{name:'Next product view',exact:true}).click();
 check(await page.locator('#view-tab-0').getAttribute('aria-selected')==='true','next wraps to Work Map');
 for(let i=0;i<4;i++){
   await page.locator('#view-tab-'+i).click();
   const img=page.locator('#view-panel-'+i+' img');await img.evaluate(i=>i.decode());
   check(await img.evaluate(i=>i.naturalWidth>0),'gallery image '+i+' loads');
 }
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1080});
  await page.locator('#view-tab-0').click();await gallery.scrollIntoViewIfNeeded();
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page overflow at '+width);
  const b=await page.locator('#view-panel-0 .screen-link').boundingBox(),img=await page.locator('#view-panel-0 img').boundingBox();
  check(img.x>=b.x&&img.x+img.width<=b.x+b.width+1,'full map fits at '+width);
  await gallery.screenshot({path:'work/website-workmap-'+width+'.png'});
  await page.locator('#view-panel-0 .screen-link').click();
  check(await page.locator('#image-dialog').evaluate(d=>d.open),'full-size image opens at '+width);
  check((await page.locator('#expanded-image').getAttribute('src')).endsWith('company-work-map.png'),'zoom shows new map at '+width);
  await page.keyboard.press('Escape');
 }
 check(errors.length===0,'no page errors');
 await writeFile('work/website-workmap-check.json',JSON.stringify({base,checks,errors},null,2));
 console.log(JSON.stringify({base,checks:checks.length,errors}));
}finally{await browser.close()}
