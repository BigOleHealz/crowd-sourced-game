import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {viewPitch,zenith}=await import('../public/view-pitch.js');
const {turretPitch,vehicleById}=await import('../public/mounts.js');
const {newExpedition,fire,fireTurret,launchMissile}=await import('../public/expedition.js');
const {newLife}=await import('../public/rivals.js');

assert.equal(viewPitch(3),zenith);assert.equal(viewPitch(-2),-.95);assert.equal(viewPitch(0),0);
function checkVertical(round){
  assert(round.vy>0);
  assert(Math.hypot(round.vx,round.vz)<1e-10);
}
for(const weapon of [1,2,3]){
  const w=newExpedition(),p={id:1,weapon,state:{x:2,y:2,z:1},life:newLife(0,false),fireReady:0};
  fire(w,p,{aimYaw:.72,aimPitch:viewPitch(2.3)},1);
  checkVertical(w.bullets[0]);
}
for(const kind of ['rover','heli','bay-rhib','key-rhib']){
  const w=newExpedition(),v=vehicleById(w,kind);
  Object.assign(v,{gunner:2,turretYaw:-1.2,turretPitch:turretPitch(2.8),yaw:.42});
  const player={id:2,state:{},life:newLife(0,false)};
  fireTurret(w,kind,player,2);
  assert(w.bullets.length>0);w.bullets.forEach(checkVertical);
  if(kind==='heli'){
    v.pilot=1;
    launchMissile(w,kind,{id:1,life:newLife(0,false)},2);
    assert.equal(w.missiles[0].yaw,v.yaw);
    assert.equal(w.missiles[0].pitch,v.pitch??0);
  }
}
console.log('PASS zenith for three personal game weapons, all four turret stations and helicopter-heading launchers');
