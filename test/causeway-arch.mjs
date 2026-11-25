import {seabedHeight} from '../public/reef-channel.js';
import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {causeway}=await import('../public/brickell-map.js');
const {groundHeight,MAP,blocked,stepPlayer}=await import('../public/world.js');
const {newExpedition}=await import('../public/expedition.js');
const {interactBoat,stepBoat}=await import('../public/patrol-boats.js');
const {interactRover,driveRover}=await import('../public/rover.js');
const world=newExpedition(), mid=(causeway.north+causeway.south)/2, dt=1/30;
const boat=world.boats[0], driver={id:1,state:{x:42.7,y:.8,z:14,grounded:true}};
interactBoat(world,boat,driver);
assert.equal(boat.driver,driver.id);

function crossChannel(z, direction) {
  Object.assign(boat,{x:-16*direction,z,yaw:direction*Math.PI/2,speed:0});
  for(let i=0;i<150 && boat.x*direction<16;i++)stepBoat(world,boat,{throttle:1},dt);
}
for(const direction of [-1,1]){
  crossChannel(mid+direction*12,direction);
  assert(boat.x*direction>=16 && boat.hp===boat.maxHp,'entire RHIB clears the opening');
}
crossChannel(mid+22,1);
assert(boat.x<-6 && boat.hp<boat.maxHp,'solid haunch stops the bow before the hull center enters');

for(const z of [mid-12,mid,mid+12]){
  assert(causeway.height(z,'soffit')-MAP.waterY>3.7);
  assert.equal(groundHeight(0,z,MAP.waterY+2.5),seabedHeight(0,z));
  assert.equal(groundHeight(0,z),causeway.height(z,'road'));
  assert(blocked(5.85,groundHeight(5.85,z),z,world.hp),'parapet blocks the road edge');
}
let swimmer={x:-10,z:mid,y:MAP.waterY-.72,swimming:true};
for(let i=0;i<220;i++)swimmer=stepPlayer(swimmer,{x:1},dt,world.hp);
assert(swimmer.x>10 && swimmer.swimming && swimmer.y<MAP.waterY);

const rover=world.rover;
Object.assign(rover,{x:-2.5,z:-54,y:groundHeight(-2.5,-54),yaw:0});
driver.state={x:-2,z:-54,y:rover.y,grounded:true};
interactRover(world,driver);
assert.equal(rover.driver,driver.id);
let highest=0;
for(let i=0;i<360 && rover.z>causeway.north-5;i++){
  driveRover(world,{throttle:1},dt);
  highest=Math.max(highest,rover.y);
}
assert(highest>6.49 && rover.z<causeway.north-5 && rover.y===.70 && rover.hp===rover.maxHp);
console.log('PASS: RHIB both directions, low arch collision, swimmer, parapets and rover shore to shore.');
