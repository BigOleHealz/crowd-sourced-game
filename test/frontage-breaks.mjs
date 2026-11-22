import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {driveRover}=await import('../public/rover.js');
const {storefrontFaces,breakFrontage,brokenSpan}=await import('../public/frontage-glass.js');
const dt=1/30;
assert.equal(storefrontFaces.length,32);
for(const f of storefrontFaces){
  const i=Math.floor(f.spans.length/2);
  const z=f.spans[i][0],world=newExpedition(),r=world.rover;
  Object.assign(r,{yaw:-f.side*Math.PI/2,z});
  assert(breakFrontage(world.doors,f.panes[i],r));
  assert(brokenSpan(f,world.doors.broken[f.id],z,.34));
  assert.equal(Object.keys(world.doors.broken).length,1);
}
for(const z of [11.45,12.12]){
  const world=newExpedition(),r=world.rover;
  Object.assign(r,{x:-4,z,y:.8,driver:1,yaw:-Math.PI/2,speed:11});
  for(let tick=0;tick<25;tick++)driveRover(world,{throttle:1},dt);
  assert(world.doors.broken?.[9],'glass removed on impact');
  assert(r.x< -9.75,'chassis x '+r.x+' after break at '+z);
  assert(r.hp>0&&r.hp<250);
  assert.equal(newExpedition().doors.broken,undefined);
}
console.log('PASS 32 frontage masks, adjacent panes at mullion, actual vehicle entry, collision and reset.');
