import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,launchMissile,fireTurret,dropJetBomb,fireTank}=await import('../public/expedition.js');
const {fuelVehicle,fuelSites,fuelSiteFor,refuelVehicle,stepVehicleFuel}=await import('../public/vehicle-fuel.js');
const {parkedTrafficCar}=await import('../public/city-traffic.js');
const {groundHeight}=await import('../public/world.js');
const w=newExpedition(), driver=5, crew=8;
const car=parkedTrafficCar('squad-sedan','sedan',-18,-206);
w.traffic=[car];car.driver=driver;car.speed=12;
assert.equal(fuelVehicle(w,driver),car);
for(let i=0;i<300;i++)stepVehicleFuel(w,1/30);
assert.equal(car.fuel,98.4,'ten seconds at cruise');
assert.equal(refuelVehicle(w,driver),false,'remote requests cannot fill a car');
const road=fuelSites.find(s=>s.kind==='road');
Object.assign(car,{x:road.x,y:groundHeight(road.x,road.z),z:road.z});
assert.equal(refuelVehicle(w,driver),false,'pump requires a stopped vehicle');
car.speed=0;
assert.equal(refuelVehicle(w,crew),false);
assert(!refuelVehicle(w,driver),'button cannot bypass pump time');
for(let i=0;i<6;i++)stepVehicleFuel(w,1/30);
assert.equal(car.fuel,99.4,'partial fill while stopped with no button press');
for(let i=0;i<10;i++)stepVehicleFuel(w,1/30);
assert.equal(car.fuel,100);
car.driver=null;
for(let i=0;i<300;i++)stepVehicleFuel(w,1/30);
assert.equal(car.fuel,100,'parked car');
car.fuel=.1;car.driver=crew;car.speed=15;
for(let i=0;i<90;i++)stepVehicleFuel(w,1/30);
assert.equal(car.fuel,0);
assert.equal(fuelVehicle(w,crew),car,'same tank after driver change');
car.speed=0;
stepVehicleFuel(w,1);
assert.equal(car.fuel,5,'empty car starts refilling automatically');
car.x+=20;
stepVehicleFuel(w,1);
assert.equal(car.fuel,5,'leaving the pump stops the fill');

const air=fuelSites.find(s=>s.kind==='air'),marine=fuelSites.find(s=>s.kind==='marine');
for(const craft of [w.heli,w.jet]){
  Object.assign(craft,{fuel:0,pilot:driver,x:air.x,z:air.z,y:groundHeight(air.x,air.z),grounded:false});
  assert(!fuelSiteFor(w,craft),'airborne');
  craft.grounded=true;assert(refuelVehicle(w,driver));craft.pilot=null;
}
for(const hull of [...w.boats,w.yacht]){
  Object.assign(hull,{fuel:0,driver,x:marine.x,z:marine.z-9});
  assert(refuelVehicle(w,driver));assert.equal(hull.fuel,100);hull.driver=null;
}
w.tank.fuel=0;w.tank.driver=driver;w.tank.x=road.x;w.tank.y=car.y;w.tank.z=road.z;
w.doors.fires={'pelican-fuel':{stage:'burning'}};
stepVehicleFuel(w,1);assert.equal(w.tank.fuel,0,'burning station');
delete w.doors.fires;
for(let i=0;i<600;i++)stepVehicleFuel(w,1/30);
assert.equal(w.tank.fuel,100,'twenty seconds for a full tank');

const player={id:driver,life:{hp:100}};
Object.assign(w.rover,{fuel:0,driver,gunner:driver});
Object.assign(w.jet,{fuel:0,pilot:driver,grounded:false});
Object.assign(w.tank,{fuel:0,driver});
launchMissile(w,'rover',player,15);dropJetBomb(w,player,15);fireTank(w,player,15);
fireTurret(w,'rover',player,15,new Map(),[]);
assert(!w.shots.length);
console.log('PASS finite tank, occupancy, station range and speed, empty refill, aircraft landing, marine berth, inert mounts');
