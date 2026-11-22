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
const {shadeSpots,courts}=await import('../public/beach-layout.js');
for(const [i,{x,z}] of shadeSpots.entries()){
  // Sports intersections must remain unobstructed. Drive from the access road
  // toward the shore, hitting the canopy pole and both chair frames.
  for(const court of courts)assert(Math.abs(x-court.x)>5.5 || Math.abs(z-court.z)>9.5);
  const world=newExpedition(),r=world.rover;
  Object.assign(r,{x:x-6,z,y:groundHeight(x-6,z),yaw:Math.PI/2,speed:8,driver:1});
  for(let n=0;n<65;n++)driveRover(world,{throttle:1},1/30);
  for(const id of ['parasol-'+i,'lounger-'+i+'--1','lounger-'+i+'-1'])assert(world.doors.beachWood?.[id],id);
  assert(r.x>x+3,'truck clears the furniture');
}
console.log('PASS pickup through both rescue stands, both signs, all beach shades and loungers, cleared footprints and replacement world.');
