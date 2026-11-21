import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {driveRover}=await import('../public/rover.js');
const {galleryPlans,galleryTopAt,galleryVehicleRects}=await import('../public/gallery-lobbies.js');
const {stepFurniture,fallenTop}=await import('../public/shop-furniture.js');

let count=0;
for(const plan of galleryPlans)for(const entry of plan.ends){
  for(const kind of ['sofa','table','console']){
    const p=entry[kind].piece;
    assert(p);assert.equal(p.floor,.824);count++;
  }
  assert.equal(entry.shelf.piece,undefined);
}
assert.equal(count,123);
for(const index of [3,4,5])for(const side of [-1,1])for(const target of ['table','console']){
  const p=galleryPlans[index],e=p.ends.find(f=>f.side===side),world=newExpedition(),r=world.rover;
  Object.assign(r,{driver:1,x:e[target].x,y:.8,z:e.z+side*4,yaw:side<0?Math.PI:0,speed:8});
  for(let n=0;n<80;n++){driveRover(world,{throttle:1},1/30);stepFurniture(world.doors,1/30);}
  const f=world.doors.furniture?.[e[target].piece.id];
  assert(f,'impacted '+index+' '+side+' '+target);assert.equal(f.phase,1);
  assert(Object.keys(world.doors.brokenPanes).length===1);
  if(target==='table')assert.equal(world.doors.furniture[e.sofa.piece.id].phase,1);
  assert(!galleryVehicleRects(p.b,world.doors).includes(e[target]));
  assert(galleryVehicleRects(p.b,world.doors).includes(e.shelf));
  const piece=e[target].piece;
  const x=piece.x+f.dx*(f.shift+piece.height/2),z=piece.z+f.dz*(f.shift+piece.height/2);
  assert(galleryTopAt(p.b,x,z,0,2.0,22,world.doors)>=fallenTop(piece,f,x,z,0));
}
console.log('PASS 123 movable gallery pieces, 12 pickup drives through actual glass, opposing sides, retained masonry and shelving, persistent floor bounds');
