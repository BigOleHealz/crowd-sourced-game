import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,advanceRounds}=await import('../public/expedition.js');
const {wheelsFor,flatWheelDrop}=await import('../public/road-wheel-layout.js');
const {stepSuspension}=await import('../public/road-suspension.js');
const {driveRover}=await import('../public/rover.js');
const {roverRoundContact}=await import('../public/rounds.js');
const world=newExpedition(),car=world.supercar,dt=1/30;
car.y=100;
for(const [i,[side,z]] of wheelsFor(car).entries()){
  car.yaw=i*.8;
  const c=Math.cos(car.yaw),s=Math.sin(car.yaw),x=side+Math.sign(side)*1.4;
  const dir={x:-Math.sign(side)*c*2.2,y:0,z:-Math.sign(side)*s*2.2};
  const from={x:car.x+x*c-z*s,y:car.y+.35,z:car.z+z*c+x*s};
  assert.equal(roverRoundContact(car,from,dir)?.wheel,i);
  world.bullets=[{...from,id:i,weapon:1,shooter:1,vx:dir.x*30,vy:0,vz:dir.z*30,left:20,age:0}];
  advanceRounds(world,new Map(),[],i);
  assert.equal(car.flatTires,(1<<(i+1))-1);
  assert.equal(car.hp,190);
}
for(let i=0;i<100;i++)stepSuspension(car,dt,()=>100);
assert(car.suspension.wheels.every(h=>Math.abs(h+flatWheelDrop)<.002));
const intact=newExpedition(),flat=newExpedition();flat.supercar.flatTires=15;
for(const w of [intact,flat]){
  w.supercar.driver=1;
  for(let n=0;n<30;n++)driveRover(w,{throttle:1},dt,undefined,'supercar');
}
assert(intact.supercar.speed>flat.supercar.speed*2);
const prior=intact.supercar.speed;
driveRover(intact,{throttle:0,steer:1},dt,undefined,'supercar');
assert(intact.supercar.speed>0 && intact.supercar.speed<prior && Math.abs(intact.supercar.lateralSpeed)>.05);
console.log('PASS GT wheel targeting from four angles, flats, suspension, mobility, coasting and retained lateral velocity.');
