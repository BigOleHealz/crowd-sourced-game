import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {groundHeight,stepPlayer,blocked,MAP}=await import('../public/world.js');
const {driveRover}=await import('../public/rover.js');
const {stepBoat}=await import('../public/patrol-boats.js');
const {streets}=await import('../public/brickell-map.js');
const dt=1/30, world=newExpedition(), rover=world.rover;
function drive(x,z,yaw,distance) {
  Object.assign(rover,{driver:1,x,z,y:groundHeight(x,z),yaw,speed:0,lateralSpeed:0});
  for(let i=0;i<600 && Math.hypot(rover.x-x,rover.z-z)<distance;i++)
    driveRover(world,{throttle:1},dt);
  assert(Math.hypot(rover.x-x,rover.z-z)>=distance,`rover stopped at ${rover.x}, ${rover.z}`);
  assert.equal(rover.hp,rover.maxHp);
}
drive(32,-54,0,148);
drive(32,-202,Math.PI,148);
for(const z of streets) {
  drive(35,z,Math.PI/2,24);
  drive(59,z,-Math.PI/2,24);
}
drive(59,streets[0],Math.PI,streets.at(-1)-streets[0]);
assert(blocked(63.1,groundHeight(63.1,14),14,world.hp),'outside rail has collision');

const b=world.boats[0];
Object.assign(b,{driver:1,x:46,z:14,yaw:0});
for(let i=0;i<110;i++)stepBoat(world,b,{throttle:1},dt);
assert(b.z<-13.1 && b.hp===b.maxHp,'patrol boat clears the marina approach');
Object.assign(b,{x:16,z:-112,yaw:Math.PI/2,speed:0});
for(let i=0;i<110;i++)stepBoat(world,b,{throttle:1},dt);
assert(b.x>38 && b.hp===b.maxHp,'patrol boat clears the avenue span');
let swimmer={x:23,z:-112,y:MAP.waterY-.72,vy:0,swimming:true,grounded:false};
for(let i=0;i<170;i++)swimmer=stepPlayer(swimmer,{x:1,z:0},dt,world.hp);
assert(swimmer.x>38 && swimmer.swimming && swimmer.y<MAP.waterY,'swimmer stays under deck');
console.log('PASS: Bayfront Avenue, marina approaches, quay, rails and navigable water below both crossings.');
