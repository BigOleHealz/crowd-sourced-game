import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,fire,advanceRounds}=await import('../public/expedition.js');
const {newCityTraffic,stepCityTraffic,driveTrafficCar}=await import('../public/city-traffic.js');
const {newRivals,newLife}=await import('../public/rivals.js');
const {civilianProfiles}=await import('../public/civilian-fleet.js');
const {damageRover,driveRover}=await import('../public/rover.js');
const {wheelsFor,flatWheelDrop,flatMobility}=await import('../public/road-wheel-layout.js');
const {stanceMuzzleHeight}=await import('../public/world.js');
const dt=1/30;
function shot(world,car,side,z,height){
  const c=Math.cos(car.yaw),s=Math.sin(car.yaw);
  const local=(x,y,z)=>({x:car.x+c*x-s*z,y:car.y+y,z:car.z+s*x+c*z});
  const state=local(side*5,0,z),target=local(side*civilianProfiles[car.model].bodyWidth,height,z);
  const dx=target.x-state.x,dz=target.z-state.z;
  const player={id:71,weapon:1,life:newLife(0),fireReady:0,state,inputs:[]};
  const players=new Map([[player.id,player]]);
  fire(world,player,{aimYaw:Math.atan2(dx,-dz),aimPitch:Math.atan2(target.y-state.y-stanceMuzzleHeight(state),Math.hypot(dx,dz))},50,players,[]);
  for(let t=0;t<6;t++)advanceRounds(world,players,[],50+t);
}
for(const model of Object.keys(civilianProfiles)){
  const w=newExpedition(),cars=newCityTraffic(),car=cars.find(c=>c.model===model);
  w.traffic=[car];const npcs=newRivals(),players=new Map(),profile=civilianProfiles[model];
  const home={x:car.x,y:car.y,z:car.z,yaw:car.yaw};
  Object.assign(car,{x:0,y:120,z:0,yaw:.37});
  for(const [i,[x,z]] of wheelsFor(car).entries()){
    car.yaw=i*.72;
    if(i===2){car.driver=2;car.npcDriver=null;}
    shot(w,car,Math.sign(x),z,profile.tire);
    assert.equal(car.flatTires,(1<<(i+1))-1,model+' wheel '+i);
    assert.equal(car.hp,car.maxHp);
    shot(w,car,Math.sign(x),z,profile.tire);
    assert.equal(car.flatTires,(1<<(i+1))-1);
  }
  shot(w,car,-1,0,.62);
  assert.equal(car.hp,car.maxHp-25);
  Object.assign(car,home,{speed:0,lateralSpeed:0});
  driveTrafficCar(w,car,{throttle:1},dt,players);
  assert(Math.abs(car.speed-profile.driveForce/profile.mass*flatMobility(car)*dt)<.01);
  assert(car.suspension.wheels.every(h=>Math.abs(h+flatWheelDrop)<.02));
  damageRover(w,car.hp,players,car.id);
  for(let i=0;i<220;i++)stepCityTraffic(w,players,npcs,dt);
  assert.equal(car.wrecked,false);assert.equal(car.hp,car.maxHp);assert.equal(car.flatTires,0);
  const ai=newExpedition();ai.traffic=newCityTraffic().filter(c=>c.model===model);
  const lead=ai.traffic[0];lead.flatTires=15;
  for(let t=0;t<20;t++)stepCityTraffic(ai,players,npcs,dt);
  assert(lead.speed<=profile.cruise*flatMobility(lead)+.001);
}
// Hit the rear bumper of an unoccupied car with the pickup. Both panels
// and both health meters react once, even with throttle held into contact.
for(const model of Object.keys(civilianProfiles)){
  const w=newExpedition(),r=w.rover,car=newCityTraffic().find(c=>c.model===model);
  w.traffic=[car];
  Object.assign(car,{x:0,z:-190,y:.7,yaw:0,npcDriver:null,speed:0});
  Object.assign(r,{x:0,z:-185,y:.7,yaw:0,driver:1,speed:12});
  for(let i=0;i<120;i++)driveRover(w,{throttle:.75},dt);
  const initial=[r.hp,car.hp];
  assert(r.hp<r.maxHp && r.bodyDamage.front>0);assert(car.hp<car.maxHp && car.bodyDamage.rear>0);
  for(let i=0;i<120;i++)driveRover(w,{throttle:.75},dt);
  assert.deepEqual([r.hp,car.hp],initial);
}
console.log('PASS all four exposed civilian tires before/after takeover, chassis hits, driver and AI handling, recovery, and two-sided road impacts.');
