import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
if(process.env.LAG_REFERENCE_DIR)registerHooks({load(url,context,next){
 const result=next(url,context),name=url.split('/').at(-1);
 if(['brickell-map.js','shore-rock-piles.js'].includes(name))return {...result,source:readFileSync(process.env.LAG_REFERENCE_DIR+'/'+name,'utf8')};
 return result;
}});
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,fireTurret,advanceRounds}=await import('../public/expedition.js');
const {newLife}=await import('../public/rivals.js');
const w=newExpedition();w.heli.gunner=1;w.heli.turretYaw=0;w.heli.turretPitch=.7;
const p={id:1,state:{...w.heli},life:newLife(0,false)},players=new Map([[1,p]]),times=[];
const hash=createHash('sha256');
for(let tick=0;tick<900;tick++){
 const start=performance.now();fireTurret(w,'heli',p,tick,players,[]);advanceRounds(w,players,[],tick);
 if(tick>=100)times.push(performance.now()-start);
 hash.update(JSON.stringify(w.bullets));w.shots.length=0;
}
times.sort((a,b)=>a-b);
console.log(JSON.stringify({reference:!!process.env.LAG_REFERENCE_DIR,mean:times.reduce((a,b)=>a+b,0)/times.length,p50:times[400],p95:times[760],trajectoryHash:hash.digest('hex')}));
