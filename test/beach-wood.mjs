import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {driveRover}=await import('../public/rover.js');
const {groundHeight}=await import('../public/world.js');
for(const [id,x,z] of [['01',53,-176],['02',54,-223],['sign-0',9.72,-198],['sign-1',33,-196.28]]){
  const world=newExpedition(),r=world.rover;
  Object.assign(r,{x,z:z+7,y:groundHeight(x,z+7),yaw:0,speed:8,driver:1});
  for(let n=0;n<65;n++)driveRover(world,{throttle:1},1/30);
  assert(world.doors.beachWood?.[id],id);
  assert(r.z<z-2,id+' cleared');
  if(!id.startsWith('sign'))assert(groundHeight(x,z,Infinity,world.doors)<1.01);
  assert(!newExpedition().doors.beachWood);
}
console.log('PASS pickup through both rescue stands and both signs, cleared footprint, replacement world.');
