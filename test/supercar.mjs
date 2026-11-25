import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,fire}=await import('../public/expedition.js');
const {newLife}=await import('../public/rivals.js');
const {parkedRover,driveRover,interactRover,damageRover,recoverRover,nearestVehicle,drivenRoad}=await import('../public/rover.js');
const {supercarLayout}=await import('../public/supercar-layout.js');
const {roadCabin}=await import('../public/road-cabin.js');
const {onLantern}=await import('../public/lantern-point.js');
const {groundHeight}=await import('../public/world.js');
const {vehicleContact}=await import('../public/vehicle-contact.js');

const dt=1/30;
function tick(world,kind,throttle,steer,ticks){
  for(let i=0;i<ticks;i++)driveRover(world,{throttle,steer},dt,undefined,kind);
}

const world=newExpedition(), car=world.supercar, pickup=world.rover;
const cabin=roadCabin(car);
assert(cabin.seat[1]+(1.525+.32)*cabin.scale<supercarLayout.roof-.08,
  'the seated head has clearance below the coupe roof');
assert(cabin.seat[1]+.975*cabin.scale>cabin.floorY+.12,
  'the lowered seat still keeps the hips above the footwell');
assert(onLantern(car.x,car.z),'Cheetah starts on Lantern Point');
const player={id:1,inputs:[],life:newLife(0,false),fireReady:0,weapon:1,
  state:{x:car.x+1.65,z:car.z,y:groundHeight(car.x+1.65,car.z),grounded:true}};
const visitor={id:2,inputs:[],state:{...player.state}};
assert.equal(nearestVehicle(world,player.state),'supercar');
interactRover(world,player,'supercar');
interactRover(world,visitor,'supercar');
assert.equal(car.driver,player.id);
assert.equal(drivenRoad(world,player.id),car);
assert.equal(drivenRoad(world,visitor.id),null);
assert.equal(car.gunner,undefined);
assert.equal(pickup.driver,null);
fire(world,player,{aimYaw:0,aimPitch:0},1,new Map([[player.id,player]]),[]);
assert.equal(world.bullets.length,0,'a seated Cheetah driver has no weapon to fire');
tick(world,'supercar',1,0,1);
assert(car.exhaust>0 && car.exhaust<=.30);
tick(world,'supercar',1,0,29);
assert(car.speed>13 && car.speed<15);
tick(world,'supercar',1,0,30);
assert(car.speed>25 && car.hp===supercarLayout.maxHp);
assert(car.exhaust>0,'the upshift triggered another pulse');
tick(world,'supercar',1,0,30);
assert.equal(car.speed,supercarLayout.maxSpeed);
assert.equal(car.x,supercarLayout.pad.x);
assert.equal(car.hp,supercarLayout.maxHp);
assert.deepEqual(pickup,parkedRover(),'accelerating the car leaves the mission pickup untouched');

const comparison=newExpedition();
comparison.rover.driver=1;
tick(comparison,'rover',1,0,30);
assert(comparison.rover.speed>7 && comparison.rover.speed<8);
tick(comparison,'rover',1,0,60);
assert.equal(comparison.rover.speed,16);
assert.equal(comparison.rover.hp,250);

// Brake from fast street speed before continuing into a controlled corner.
const corner=newExpedition();
corner.supercar.driver=1;
tick(corner,'supercar',1,0,52);
const beforeBrake=corner.supercar.z;
let brakeTicks=0;
while(corner.supercar.speed>.1 && brakeTicks++<30)tick(corner,'supercar',-1,0,1);
assert(brakeTicks<26 && beforeBrake-corner.supercar.z<10);
tick(corner,'supercar',1,1,25);
assert(corner.supercar.yaw>.48 && corner.supercar.x>supercarLayout.pad.x);
assert.equal(corner.supercar.hp,supercarLayout.maxHp);

const close=newExpedition(), moving=close.supercar;
Object.assign(moving,{x:close.rover.x,z:10,yaw:Math.PI,driver:1});
tick(close,'supercar',1,0,65);
assert(moving.z <= close.rover.z-supercarLayout.halfLength-1.68+1e-3);
assert(moving.hp<supercarLayout.maxHp,'the two separate bodies cannot overlap at speed');

interactRover(world,player,'supercar');
assert.equal(car.driver,null);
assert.equal(car.exhaust,0);
assert.equal(car.speed,0);
assert.equal(vehicleContact(player.state.x,player.state.y,player.state.z,world,true).depth,0);
interactRover(world,player,'supercar');
assert.equal(car.driver,1);
damageRover(world,car.hp,new Map([[player.id,player]]),'supercar');
assert(car.wrecked && car.driver===null);
for(let i=0;i<180;i++)recoverRover(world,dt,'supercar');
assert.equal(world.supercar.hp,supercarLayout.maxHp);
assert.deepEqual({x:world.supercar.x,z:world.supercar.z},supercarLayout.pad,'wreck recovery returns to the estate');
assert.deepEqual(world.rover,parkedRover());
console.log('PASS Cheetah single-seat entry/exit, unarmed use, 30 vs 16 m/s, independent pickup, rapid braking, cornering, physical collision, exhaust, and recovery.');
