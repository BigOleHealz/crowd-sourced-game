// Requires Playwright supplied externally; it is not a game dependency.
import {writeFile} from 'node:fs/promises';
import WebSocket from 'ws';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,channel:process.env.LAG_BROWSER_CHANNEL??'chrome'});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const origin=process.env.LAG_HTTP??'http://127.0.0.1:4188';
let gunner,timer;
try{
 await page.goto(origin+'/?map=brickell&perf=1',{waitUntil:'networkidle',timeout:120000});
 await page.waitForFunction(()=>window.gameLag?.export().events.some(e=>e.type==='frame'),null,{timeout:60000});
 gunner=new WebSocket(origin.replace(/^http/,'ws')+'/world?map=brickell');
 await new Promise((resolve,reject)=>{gunner.on('message',data=>{if(JSON.parse(data).type==='welcome')resolve();});gunner.on('error',reject);});
 let seq=0;
 timer=setInterval(()=>gunner.send(JSON.stringify({type:'input',seq:++seq,x:0,z:0,yaw:0,aimYaw:0,aimPitch:.7,fire:process.env.LAG_FIRE==='1'})),1000/30);
 await page.locator('canvas').first().focus();
 await page.evaluate(()=>window.gameLag.mark('measurement-start'));
 for(let i=0;i<6;i++){
   const key=i%2?'s':'w';await page.keyboard.down(key);await page.waitForTimeout(4000);await page.keyboard.up(key);
 }
 const data=await page.evaluate(()=>window.gameLag.export());
 const file=process.env.LAG_OUTPUT??'output/lag/browser.json';await writeFile(file,JSON.stringify({errors,...data}));
 await page.screenshot({path:file.replace('.json','.png')});
 const start=data.events.findLast(e=>e.type==='mark')?.at??0;
 const stats=(type,key)=>{const a=data.events.filter(e=>e.type===type&&e.at>=start).map(e=>e[key]).filter(Number.isFinite).sort((a,b)=>a-b);return {p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
 console.log(JSON.stringify({file,errors,frames:stats('frame','delta'),draw:stats('frame','drawMs'),rtt:stats('rtt','ms'),longTasks:stats('longtask','duration')},null,2));
}finally{clearInterval(timer);gunner?.close();await browser.close();}
