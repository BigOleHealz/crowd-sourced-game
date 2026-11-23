import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {stepTank}=await import('../public/tank.js');
const {breakRoadObstacle}=await import('../public/road-obstacle-damage.js');
const {storefrontFaces}=await import('../public/frontage-glass.js');
const {doorX}=await import('../public/storefront-layout.js');
const {tankHull}=await import('../public/tank-layout.js');
const {stepFurniture}=await import('../public/shop-furniture.js');
const {MAP,BREAKABLES}=await import('../public/world.js');
const dt=1/30,face=storefrontFaces.find(f=>f.showcase);
function drive(w,throttle,ticks){
  for(let i=0;i<ticks;i++){
    stepTank(w,{throttle},dt);
    stepFurniture(w.doors,dt);
  }
}
for(const throttle of [1,-1]){
  const world=newExpedition(),t=world.tank,charged=[];
  world.rules={brokenPane:(team,where,id)=>charged.push(id)};
  Object.assign(t,{x:-5,y:.8,z:6.56,yaw:-throttle*Math.PI/2,driver:1});
  drive(world,throttle,270);
  assert(t.x+tankHull.halfLength<doorX,'entire chassis entered the café');
  assert(t.x-tankHull.halfLength>=-15.671,'fixed rear banquette stops the tracks');
  assert.equal(t.speed,0);
  assert.equal(world.doors.broken[face.id],(1<<4)|(1<<5),'the chassis clears both sides of the adjacent mullion');
  assert(Object.values(world.doors.furniture).filter(f=>f.phase===1).length>=3,'table and chairs topple');
  assert.equal(new Set(charged).size,2);assert.equal(charged.length,2);
  const impacts=world.doors.glassSeq;
  drive(world,-throttle,210);
  assert(t.x-tankHull.halfLength>doorX,'entire chassis returned through opening');
  assert.equal(world.doors.glassSeq,impacts,'no repeat impact or billing on the way back');
  assert.equal(t.hp,750);
}
const world=newExpedition(),t=world.tank;
Object.assign(t,{x:-4,y:.8,z:14.46,yaw:-Math.PI/2,driver:1});
drive(world,1,115);
assert(t.x>doorX+tankHull.halfLength,'the concrete door pier remains solid');
const crate=BREAKABLES.find(p=>p.id==='switchback');
Object.assign(t,{x:crate.x,y:.7,z:crate.z+4,yaw:0,driver:1,speed:0});
drive(world,1,90);
assert.equal(world.hp[crate.id],0);assert(t.z<crate.z);
const lamp=MAP.barriers.find(p=>p.lamp!=null);
const looseFooting={sillPaneId:'clearance-test',x:0,z:0};
for(const object of [lamp,looseFooting,{woodId:'beach-test'},{net:1}]){
  assert(breakRoadObstacle(world,t,object,0,-.04,.04));
  assert(!breakRoadObstacle(world,t,object,0,-.04,.04),'resweep only after a real state change');
}
assert(!breakRoadObstacle(world,t,MAP.trees[0],0,-7,7));
console.log('PASS tank enters Mangle Café in forward and reverse, clears the glass, mullion, loose tables and chairs, exits through the same opening, and leaves fixed structures standing.');
