import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,reportVehicleWreck}=await import('../public/expedition.js');
const {driveRover,recoverRover,nearestVehicle}=await import('../public/rover.js');
const {stepTank}=await import('../public/tank.js');
const {groundHeight}=await import('../public/world.js');
const {stepCityTraffic,parkedTrafficCar}=await import('../public/city-traffic.js');
const dt=1/30;

function position(car,x,z){
  Object.assign(car,{x,z,y:groundHeight(x,z),yaw:Math.PI/2,driver:1});
}

{
  const world=newExpedition(),car=world.rover;
  position(car,62,-218);
  for(let i=0;i<90 && car.x<64.5;i++)driveRover(world,{throttle:.23},dt);
  assert(car.wading && !car.sinking);
  reportVehicleWreck(world,car,'rover','road',1);
  assert.equal(world.shots.at(-1).weapon,'roadSplash');
  for(let i=0;i<160 && car.wading;i++)driveRover(world,{throttle:-.7},dt);
  assert(!car.wading && car.driver===1 && car.hp===car.maxHp);
  reportVehicleWreck(world,car,'rover','road',2);
  assert.equal(world.shots.length,1,'one splash for this crossing');
}

for(const kind of ['rover','supercar','tank','sedan']){
  const world=newExpedition();
  const car=kind==='sedan'?parkedTrafficCar('squad-car','sedan',55,-218,Math.PI/2):world[kind];
  if(kind==='sedan')world.traffic=[car];
  position(car,55,-218);
  const crew=new Map([[1,{inputs:[],life:{hp:100}}]]);
  if(kind==='rover'){car.gunner=2;crew.set(2,{inputs:[],life:{hp:100}});}
  let lastY=car.y;
  for(let tick=0;tick<210 && !car.sinking;tick++){
    if(kind==='tank')stepTank(world,{throttle:1},dt,crew);
    else driveRover(world,{throttle:1},dt,crew,car.kind??kind);
    reportVehicleWreck(world,car,kind,'road',tick);
    assert(Math.abs(car.y-lastY)<.85,'continuous surface entry');
    lastY=car.y;
  }
  assert(car.sinking && car.driver===null && !car.wrecked,kind);
  assert.equal(car.hp,car.maxHp);
  for(const p of crew.values()){assert(p.state.swimming);assert.equal(p.life.hp,100);}
  assert.equal(world.shots.length,1);
  assert.equal(world.shots[0].weapon,'roadSplash');
  if(kind==='rover')assert.notEqual(nearestVehicle(world,{...car,grounded:true}),'rover');
  for(let i=0;i<255;i++){
    if(kind==='tank')stepTank(world,{},dt,crew);
    else if(kind==='sedan')stepCityTraffic(world,new Map(),[],dt,i);
    else recoverRover(world,dt,kind);
    if(i===50)assert(car.y<lastY,'chassis settles below the surface');
  }
  const recovered=kind==='sedan'?world.traffic[0]:world[kind];
  assert(!recovered.sinking && !recovered.wrecked && recovered.y>0,'returns to a dry bay');
}
