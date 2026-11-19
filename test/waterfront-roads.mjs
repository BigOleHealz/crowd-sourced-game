import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {streetPlan,roadway,cityGround,harbor,coast,causeway,within}=await import('../public/brickell-map.js');
const {verges}=await import('../public/waterfront-roads.js');
const {newExpedition}=await import('../public/expedition.js');
const {driveRover}=await import('../public/rover.js');
const {roadContact}=await import('../public/road-contact.js');

function drive(world,x,z) {
  const r=world.rover;
  for(let i=0;i<1800;i++) {
    const dx=x-r.x,dz=z-r.z,dist=Math.hypot(dx,dz);
    const az=Math.atan2(dx,-dz)-r.yaw,error=Math.atan2(Math.sin(az),Math.cos(az));
    const throttle=dist>.26 && Math.abs(error)<.31 && r.speed<Math.min(8,dist*2.4);
    const steer=dist>.26 ? Math.max(-1,Math.min(1,error*4)) : 0;
    driveRover(world,{throttle:Number(throttle),steer},1/30,new Map());
    assert(roadway(r.x,r.z) && r.y>.6,'wheels remain on dry pavement');
    assert.equal(r.hp,250,'dry turn without hitting a roadside obstruction');
    if(dist<.32 && r.speed<.05)return;
  }
  assert.fail('Unable to reach waypoint '+JSON.stringify({x,z,rover:world.rover}));
}

for(const e of streetPlan.ends) {
  const world=newExpedition(),r=world.rover;
  const point=(forward,side)=>[e.x+e.dx*forward-e.dz*side,e.z+e.dz*forward+e.dx*side];
  const [x,z]=point(-9,0),yaw=Math.atan2(e.dx,-e.dz);
  Object.assign(r,{x,z,y:.70,yaw,driver:1});
  drive(world,...point(-3.7,0));
  drive(world,...point(-3.7,3.1));
  drive(world,...point(-7,1.8));
  drive(world,...point(-9,0));
  const [cx,cz]=point(-.75,0);
  assert(roadContact(world,cx,cz,yaw,x,z),'the front curb stops the pickup');
  assert.equal(cityGround(...point(1.1,0)),.80,'dry pedestrian buffer beyond curb');
}
assert.equal(streetPlan.ends.length,13);
for(const [area,roads] of [[coast,streetPlan.mainland],[harbor,streetPlan.island]]) {
  const plots=verges(area,roads);
  for(let x=area.west+.51;x<area.east;x+=1)for(let z=area.north+.51;z<area.south;z+=1){
    const verge=plots.filter(lot=>within(lot,x,z)).length;
    assert.equal(verge,roadway(x,z)?0:1,'rendered verge matches authoritative terrain');
  }
}
const world=newExpedition();
Object.assign(world.rover,{x:2.5,z:coast.north+4,y:.70,driver:1});
for(const [x,z] of [[2.5,-106],[2.5,-202],[2.5,-262],[-49,-262],[-49,-205],[32,-205],[32,-262],[0,-262],[0,-158]])drive(world,x,z);
assert.equal(cityGround(0,-106),causeway.height(-106,'road'));
assert(cityGround(0,-106,0)<0);
console.log('PASS 13 mainland turning heads, all island junctions and dry loop, visible verges, collision curbs and navigable arched channel.');
