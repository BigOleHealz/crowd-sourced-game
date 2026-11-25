import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
if(!process.env.FLIGHT_AREA_TEST){
  for(const map of ['outpost','brickell'])execFileSync(process.execPath,[fileURLToPath(import.meta.url)],{env:{...process.env,FLIGHT_AREA_TEST:'1',GOY_THEFT_AUTO_MAP:map},stdio:'inherit'});
}else{
  const {newExpedition,fly}=await import('../public/expedition.js');
  const {flightBounds:air,travelBounds:land,stepPlayer,MAP}=await import('../public/world.js');
  const {stepJet,leaveJet}=await import('../public/jet.js');
  const w=newExpedition(),dt=1/30,crew=new Map();
  for(const kind of ['jet','heli']){
    const v=w[kind];
    Object.assign(v,{pilot:1,x:land.east-1,y:air.ceiling-1,z:0,yaw:Math.PI/2,grounded:false});
    const cmd={x:1,z:0,lift:1,aimYaw:Math.PI/2,throttle:1,steer:0};
    for(let i=0;i<1000;i++){
      if(kind==='jet')stepJet(w,{...cmd,jetPitch:i<12?1:0},dt,crew);else fly(w,cmd,dt,crew);
    }
    assert.equal(v.y,air.ceiling);assert.equal(v.x,air.east);assert(v.hp>0);
    assert(v.y>Math.max(...MAP.buildings.map(b=>b.base+b.eave+b.rise)));
  }
  const p={};leaveJet(w.jet,p);
  const next=stepPlayer(p.state,{deploy:true},dt,w.hp,w);
  assert.equal(next.parachute,'open');assert(next.x>land.east+50);
  console.log('PASS',process.env.GOY_THEFT_AUTO_MAP,'both aircraft reach the outer flight boundary and ceiling, and bailout preserves position');
}
