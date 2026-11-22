import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {garageBase,garageUpper}=await import('../public/resort-parking.js');
const {groundHeight,stepPlayer}=await import('../public/world.js');
const {driveRover}=await import('../public/rover.js');
const {newExpedition}=await import('../public/expedition.js');
const w=newExpedition(),car=w.rover,dt=1/30;
Object.assign(car,{driver:1,x:-66,z:61,y:.70,yaw:-Math.PI/2});
function travel(x,z){
  car.speed=0;car.lateralSpeed=0;car.yaw=Math.atan2(x-car.x,car.z-z);
  let last=car.y;
  for(let i=0;i<260 && Math.hypot(x-car.x,z-car.z)>.19;i++){
    driveRover(w,{throttle:1},dt);
    car.speed=Math.min(3,car.speed);
    assert(Math.abs(last-car.y)<.18,'no height pop at floor transition');last=car.y;
  }
  assert(Math.hypot(x-car.x,z-car.z)<.22,JSON.stringify({x,z,car}));
  assert.equal(car.hp,car.maxHp);
}
travel(-87.5,61);travel(-87.5,34.8);assert.equal(car.y,garageUpper);
travel(-78.0,34.8);travel(-78.0,41.4);assert.equal(car.y,garageUpper);
travel(-78.0,34.8);travel(-87.5,34.8);travel(-87.5,61);
travel(-79,61);travel(-79,46.5);assert.equal(car.y,garageBase);
assert.equal(groundHeight(car.x,car.z,car.y+1.7,w.doors),garageBase);
let walker={x:car.x+.98,y:car.y,z:car.z,vy:0,grounded:true};
for(let i=0;i<75 && walker.x< -72.75;i++)walker=stepPlayer(walker,{x:1,z:0},dt,w.hp,w);
assert(walker.x> -72.8,'walk from lower parking to casino side entrance');
console.log('PASS pickup enters from avenue, ascends P2, parks, descends, parks P1 and occupant reaches lobby threshold.');
