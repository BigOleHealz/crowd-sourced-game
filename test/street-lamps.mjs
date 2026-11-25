import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,advanceRounds}=await import('../public/expedition.js');
const {streetLamps}=await import('../public/street-lamps.js');
const {driveRover}=await import('../public/rover.js');
const p=streetLamps[0],w=newExpedition();
for(let i=0;i<3;i++){
  w.bullets.push({x:p.x,y:2,z:p.z+1,vx:0,vy:0,vz:-56,weapon:1,age:0,id:800+i,shooter:8,left:10});
  advanceRounds(w,new Map(),[],i);
}
assert.equal(w.doors.lamps[0],0);
const v=newExpedition(),r=v.rover;
Object.assign(r,{x:p.x-.2,y:.8,z:p.z+7,yaw:0,speed:7,driver:1});
for(let i=0;i<62;i++){
  const upright=v.doors.lamps?.[0]!==0,hp=r.hp;
  driveRover(v,{throttle:1},1/30);
  if(upright && v.doors.lamps?.[0]===0)assert.equal(hp-r.hp,1,'lamp strike');
}
assert.equal(v.doors.lamps[0],0);assert(r.z<p.z-2 && !r.wrecked);
assert(!newExpedition().doors.lamps);
console.log('PASS streetlamp HP, game rounds, pickup clearance, fresh world.');
