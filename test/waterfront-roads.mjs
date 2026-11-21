import {approachPoint} from './helpers/rover-route.mjs';
import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {streetPlan,roadway,cityGround,harbor,coast,causeway,within}=await import('../public/brickell-map.js');
const {verges}=await import('../public/waterfront-roads.js');
const {blocked}=await import('../public/world.js');
const {newExpedition}=await import('../public/expedition.js');
const {driveRover}=await import('../public/rover.js');
const {roadContact}=await import('../public/road-contact.js');

function drive(world,x,z) {
  const r=world.rover;
  for(let i=0;i<1800;i++) {
    const dx=x-r.x,dz=z-r.z,dist=Math.hypot(dx,dz);
    driveRover(world,approachPoint(r,x,z,8),1/30,new Map());
    assert(roadway(r.x,r.z) && r.y>.6,'wheels remain on dry pavement');
    assert.equal(r.hp,250,'dry turn without hitting a roadside obstruction');
    if(dist<.32 && r.speed<.05)return;
  }
  assert.fail('Unable to reach waypoint '+JSON.stringify({x,z,rover:world.rover}));
}

for(const e of streetPlan.ends) {
  const world=newExpedition(),r=world.rover;
  const point=(forward,side)=>[e.x+e.dx*forward-e.dz*side,e.z+e.dz*forward+e.dx*side];
  const [x,z]=point(-9,-2.75),yaw=Math.atan2(e.dx,-e.dz);
  Object.assign(r,{x,z,y:.70,yaw,driver:1});
  drive(world,...point(-5.65,-2.75));
  // Approach on one side, keep full lock at walking pace and return on
  // the other side of the actual paved turning head.
  let closest=-Infinity;
  for(let i=0;;i++){
    const delta=r.yaw-yaw,turned=Math.atan2(Math.sin(delta),Math.cos(delta));
    if(turned>Math.PI-.08)break;
    assert(i<300,'complete rolling turn at '+[e.x,e.z]);
    driveRover(world,{throttle:Number(r.speed<1.75),steer:1},1/30,new Map());
    closest=Math.max(closest,(r.x-e.x)*e.dx+(r.z-e.z)*e.dz);
    assert(roadway(r.x,r.z) && r.y>.6);
    assert.equal(r.hp,250);
  }
  assert(closest>-3.7,'enter the turning head before coming back');
  assert((r.z-e.z)*e.dx-(r.x-e.x)*e.dz>2,'finish the turn on the opposite side');
  drive(world,...point(-10,2.75));
  const [cx,cz]=point(-.75,0);
  assert(roadContact(world,cx,cz,yaw,x,z),'the front curb stops the pickup');
  assert.equal(cityGround(...point(1.1,0)),.80,'dry pedestrian buffer beyond curb');
}
assert.equal(streetPlan.ends.length,13);
const hp=newExpedition().hp;
for(let x=39;x<=42.7;x+=.15)assert(!blocked(x,cityGround(x,22.3),22.3,hp),'pedestrian berth approach');
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
