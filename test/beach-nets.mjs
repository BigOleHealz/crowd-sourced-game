import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {courts}=await import('../public/beach-layout.js');
const {groundHeight,stepPlayer}=await import('../public/world.js');
const {driveRover}=await import('../public/rover.js');
for(const [i,{x,z}] of courts.entries())for(const sign of [-1,1]){
  const world=newExpedition(),y=groundHeight(x,z);
  let feet={x,y,z:z-2*sign,grounded:true,vy:0};
  for(let t=0;t<40;t++)feet=stepPlayer(feet,{x:0,z:sign},1/30,world.hp,world);
  assert((feet.z-z)*sign>1,'walk through intact fabric');
  const r=world.rover;Object.assign(r,{x,y,z:z-4*sign,yaw:sign<0?0:Math.PI,speed:6,driver:1});
  for(let t=0;t<40;t++)driveRover(world,{throttle:1},1/30);
  assert((r.z-z)*sign>2);
  assert.equal(world.doors.nets[i],sign);
  assert.equal(world.doors.nets[1-i],undefined);
  assert.equal(newExpedition().doors.nets,undefined);
}
console.log('PASS both beach courts in either direction on foot and in a vehicle, independent persistent collapse and world reset.');
