import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

if(!process.env.RUNWAY_TEST){
  for(const map of ['outpost','brickell'])execFileSync(process.execPath,[fileURLToPath(import.meta.url)],
    {env:{...process.env,RUNWAY_TEST:'1',PINEWATCH_MAP:map},stdio:'inherit'});
}else{
  const {newExpedition}=await import('../public/expedition.js');
  const {stepJet,parkedJet}=await import('../public/jet.js');
  const {CITY,groundHeight}=await import('../public/world.js');
  const {onRunway,rotationSpeed,stallSpeed}=await import('../public/runway-layout.js');
  const w=newExpedition(),j=w.jet,crew=new Map();
  assert(onRunway(j.x,j.z,CITY),'jet parks on its runway');
  assert.equal(j.y,groundHeight(j.x,j.z));
  j.pilot=1;
  for(let n=0;n<65;n++)stepJet(w,{throttle:1,jetPitch:1},1/30,crew);
  assert(j.grounded && j.speed<rotationSpeed,'pitch alone cannot lift a slow jet');
  for(let n=0;n<85 && j.grounded;n++)stepJet(w,{throttle:1,jetPitch:1},1/30,crew);
  assert(!j.grounded && !j.wrecked && j.speed>=rotationSpeed,'runway acceleration permits rotation');
  Object.assign(j,{y:30,speed:stallSpeed-1,pitch:.8});
  const stallY=j.y;
  stepJet(w,{jetPitch:0},1/30,crew);
  assert(j.y<stallY,'low airspeed loses lift even with the nose raised');
  const reset=parkedJet();
  Object.assign(j,reset,{pilot:1,x:CITY?-62:19});
  for(let n=0;n<130;n++)stepJet(w,{throttle:1,jetPitch:1},1/30,crew);
  assert(j.grounded || j.wrecked,'off-runway pitch cannot launch the jet');
  console.log('PASS',process.env.PINEWATCH_MAP,'runway spawn, minimum rotation speed and off-runway gate');
}
