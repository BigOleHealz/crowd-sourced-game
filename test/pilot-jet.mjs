import assert from 'node:assert/strict';
import {newExpedition,fireTurret,launchMissile,advanceMissiles} from '../public/expedition.js';
import {nearJet,stepJet,leaveJet,damageJet} from '../public/jet.js';
const w=newExpedition(),j=w.jet,p={id:1,life:{hp:100}},other={id:2,life:{hp:100}},players=new Map([[1,p]]);
assert(nearJet(j,j));j.pilot=p.id;assert(!nearJet(j,j));
for(let n=0;n<150;n++){
  stepJet(w,{jetPitch:.8,throttle:1,steer:j.grounded?0:.2,jetRoll:j.grounded?0:-1},1/30,players);
  if(!j.grounded && j.pitch>.1)break;
}
assert(!j.grounded && j.pitch>0 && j.roll<0 && j.yaw>0 && j.speed>8);
const pitch=j.pitch;
stepJet(w,{jetPitch:-.4},1/30,players);
assert(j.pitch<pitch,'moving the cursor down lowers the nose');
const held=j.pitch;
stepJet(w,{jetPitch:0},1/30,players);
assert.equal(j.pitch,held,'centering the cursor holds its attitude');
Object.assign(j,{x:0,y:65,z:0,pitch:0,yaw:0,roll:0,speed:16});
const startZ=j.z,dt=Math.PI/(2*1.6*30);
for(let quarter=1;quarter<=4;quarter++){
  for(let n=0;n<30;n++)stepJet(w,{jetPitch:1},dt,players);
  assert(Math.abs(j.pitch-quarter*Math.PI/2)<1e-8);
  const at={y:j.y,z:j.z};
  stepJet(w,{jetPitch:0},1/30,players);
  if(quarter===1){assert(j.y>at.y);assert(Math.abs(j.z-at.z)<1e-8);}
  if(quarter===2)assert(j.z>at.z,'inverted flight reverses horizontal direction');
  if(quarter===3){assert(j.y<at.y);assert(Math.abs(j.z-at.z)<1e-8);}
}
assert(Math.abs(j.y-65)<.01 && Math.abs(j.z-startZ)<.01 && !j.wrecked);
fireTurret(w,'jet',other,15);launchMissile(w,'jet',other,15);
assert.equal(w.bullets.length+w.missiles.length,0);
fireTurret(w,'jet',p,16);launchMissile(w,'jet',p,16);
assert(w.bullets.length>0);assert.equal(w.missiles.length,1);
const r=w.bullets[0],m=w.missiles[0];
assert.equal(m.pitch,j.pitch);assert.equal(m.yaw,j.yaw);assert(Math.abs(Math.atan2(r.vx,-r.vz)-j.yaw)<1e-6);
launchMissile(w,'jet',p,17);assert.equal(w.missiles.length,1);
const start={x:0,y:100,z:0};
Object.assign(m,start,{yaw:0,pitch:0});
advanceMissiles(w,players,[],18);
assert.equal(m.z,-2,'jet missile travels twice the previous distance per tick');
for(let n=0;n<29;n++)advanceMissiles(w,players,[],19+n);
assert.equal(m.z,-60);assert.equal(w.missiles.length,0,'range stays at 60');
leaveJet(j,p);assert.equal(p.state.parachute,'packed');
damageJet(w,500,players);assert(j.wrecked);
for(let n=0;n<182;n++)stepJet(w,null,1/30,players);
assert(nearJet(w.jet,w.jet));assert.equal(w.jet.hp,500);
console.log('PASS pilot-only independent forward weapons, takeoff, bailout and jet recovery');
