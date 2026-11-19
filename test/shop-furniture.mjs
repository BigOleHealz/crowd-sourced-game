import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {driveRover}=await import('../public/rover.js');
const {cafePieces,storefrontTopAt}=await import('../public/storefront-layout.js');
const {storefrontFaces,visitRoadPodium,retailSurface}=await import('../public/frontage-glass.js');
const {tipFurniture,stepFurniture,fallenTop}=await import('../public/shop-furniture.js');
const {furnitureRanges,updateShopFurniture}=await import('../public/shop-furniture-view.js');
const dt=1/30,face=storefrontFaces[9],world=newExpedition(),r=world.rover;
Object.assign(r,{x:-4,z:9.05,y:.8,driver:1,yaw:-Math.PI/2,speed:9});
for(let i=0;i<100;i++){driveRover(world,{throttle:1},dt);stepFurniture(world.doors,dt);}
const struck=Object.entries(world.doors.furniture);
assert(struck.length>=3,'table and adjacent chairs topple');
assert(struck.some(([id])=>cafePieces.get(id).w>.7));
assert(struck.some(([id])=>cafePieces.get(id).w<.5));
assert(r.x<face.x && r.x>-14,'service counter still stops the truck');
for(const [id,f] of struck){
  const p=cafePieces.get(id);
  assert.equal(f.phase,1);assert.equal(tipFurniture(world.doors,p,12,0),false);
  const x=p.x+f.dx*(f.shift+p.height/2),z=p.z+f.dz*(f.shift+p.height/2);
  assert(fallenTop(p,f,x,z,0)>p.floor);
  assert(storefrontTopAt(x,z,0,2.1,25,world.doors,true)>=fallenTop(p,f,x,z,0));
}
assert.deepEqual(JSON.parse(JSON.stringify(world.doors.furniture)),world.doors.furniture);
assert.equal(newExpedition().doors.furniture,undefined);
const doors={};
for(const face of storefrontFaces.filter(f=>f.entry)){
  for(const p of face.pieces.values()){
    assert(tipFurniture(doors,p,10*face.side,0));
    const f=doors.furniture[p.id],x=p.x+f.dx*(f.shift+p.height/2),z=p.z+f.dz*(f.shift+p.height/2);
    assert(retailSurface(face,x,z,0,2.8,18,doors)>=fallenTop(p,f,x,z,0));
    visitRoadPodium(face.building,p.x,p.z,doors,b=>assert.notEqual(b.piece?.id,p.id));
  }
}
const p={id:'chair',x:0,z:0,w:.4,d:.4,height:.8,floor:0,room:[-2,2,-2,2]};
const scene={},batch={positions:[]},motion=furnitureRanges(scene,[batch]),m=motion.start(p);
batch.positions.push(-.2,0,0,.2,0,0,0,.8,0);motion.end(m);
const attr=values=>({array:new Float32Array(values),addUpdateRange(){}});
const pos=attr(batch.positions),norm=attr([0,1,0,0,1,0,0,1,0]);
const geom={attributes:{position:pos,normal:norm},getAttribute(n){return this.attributes[n];}};
motion.bind([{geometry:geom}]);const original=pos.array.slice(),state={};tipFurniture(state,p,5,0);
stepFurniture(state,.1);updateShopFurniture(scene,state);assert.notDeepEqual(pos.array,original);
const midway=pos.array.slice();stepFurniture(state,.5);updateShopFurniture(scene,state);
assert.notDeepEqual(pos.array,midway);assert(Math.abs(pos.array[4])<1e-6,'lands on floor');
const settled=pos.array.slice();updateShopFurniture(scene,state);assert.deepEqual(pos.array,settled);
updateShopFurniture(scene,{});assert.deepEqual(pos.array,original);
updateShopFurniture(scene,JSON.parse(JSON.stringify(state)));assert.deepEqual(pos.array,settled);
console.log('PASS cafe vehicle sweep, all retail props, retained walls, deterministic floor poses, repeat contact, late join and reset');
