import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {stepPatrolCruisers}=await import('../public/patrol-cruisers.js');
const {vehicleContact}=await import('../public/vehicle-contact.js');
const {roadUsers,gapAhead}=await import('../public/lane-clearance.js');
const suspect={id:9,state:{x:2.15,z:-102,y:.7},life:{hp:100}};
const players=new Map([[9,suspect]]),world={doors:{}};
const officer={id:'officer-88',targetId:9,life:{hp:100},state:{...suspect.state}};
const [car]=stepPatrolCruisers(world,[officer],players,0);
assert(car && car.npcDriver);
const blocked={id:'parked-van',model:'van',x:car.x,z:car.z-9,y:car.y,yaw:car.yaw,speed:0};
world.traffic=[blocked];
for(let t=1;t<270;t++){
  stepPatrolCruisers(world,[officer],players,t);
  assert(car.z>blocked.z+3,'never drive through the van ahead');
}
assert(!car.npcDriver && !officer.cruiserId);
assert(vehicleContact(car.x,car.y+.1,car.z,world,true).depth>0,'parked cruiser has a solid body');
const {vehicles,actors}=roadUsers(world,players,[officer]);
assert(vehicles.includes(car) && actors.includes(officer));
const following={...car,z:car.z+7};
assert(gapAhead(following,[],[car])<4,'following sedans see the marked cruiser');
console.log('PASS roadblock braking, timed dismount, pedestrian body contact and reciprocal traffic clearance');
