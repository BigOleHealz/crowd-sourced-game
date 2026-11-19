import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {storefrontFaces,brokenSpan,breakFrontage,retailRoom,stepRetailDoors}=await import('../public/frontage-glass.js');
const {stepPlayer,blocked,groundHeight,buildingTopAt}=await import('../public/world.js');
const {shopFloor}=await import('../public/street-shop-layout.js');
const shops=storefrontFaces.filter(f=>f.entry),dt=1/30;
assert.equal(new Set(shops.map(f=>f.name)).size,35);
for(const f of shops){
  const world=newExpedition(),s=f.side,door=f.entry;
  let p={x:f.x+s*1.25,z:door.z,y:.8,grounded:true,vy:0};
  const move=(x,z,n)=>{for(let i=0;i<n;i++){
    stepRetailDoors(world.doors,[p],dt);p=stepPlayer(p,{x,z},dt,world.hp,world);
  }};
  assert(blocked(f.x,.84,door.z,world.hp,world.doors),f.name+' shut');
  move(-s,0,13);move(0,0,6);
  assert.equal(retailRoom(p.x,p.y,p.z)?.id,f.id,f.name+' entrance');
  assert((f.x-p.x)*s>.55,f.name+' navigable vestibule');assert.equal(p.y,shopFloor);
  assert.equal(groundHeight(p.x,p.z),shopFloor);
  const startZ=p.z;move(0,-s,17);move(0,0,5);
  assert(Math.abs(p.z-startZ)>1.80,f.name+' window aisle');
  move(0,s,17);move(0,0,5);assert(Math.abs(p.z-startZ)<.16,f.name+' return through aisle');
  move(s,0,29);move(0,0,5);
  assert((p.x-f.x)*s>1.05,f.name+' exit');
  for(let i=0;i<40;i++)stepRetailDoors(world.doors,[],dt);
  assert.equal(world.doors.retail?.[f.id],undefined);
  const [lo,hi]=f.spans[Math.floor(f.spans.length/2)];
  assert(blocked(f.x,shopFloor,(lo+hi)/2,world.hp,world.doors),f.name+' intact glass');
  assert(buildingTopAt(f.x-s*.65,door.z)>.8+3.8,f.name+' roof');
  assert(f.fixtures.some(box=>box.bottom<1.85 && box.top>1.25 && blocked(box.x,shopFloor,box.z,world.hp,world.doors)),f.name+' furniture');
  assert(breakFrontage(world.doors,f.panes[door.bayIndex],{yaw:-s*Math.PI/2,z:door.z}));
  assert(brokenSpan(f,world.doors.broken[f.id],door.z,.32));
  assert(!blocked(f.x,shopFloor,door.z,world.hp,world.doors),f.name+' broken door opening');
}
console.log('PASS all 35 named shops: solid closed doors and glass, automatic entry, lateral browsing, exit, closure, furniture, floor, roof and broken door opening on both orientations.');
