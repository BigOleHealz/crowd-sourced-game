import {approachPoint} from './helpers/rover-route.mjs';
import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {harbor,cityGround}=await import('../public/brickell-map.js');
const {beach}=await import('../public/beach-layout.js');
const {ferrySlip,slipHeight,onLantern,lanternLocation}=await import('../public/lantern-point.js');
const {lanternBuildings,limestoneBase,berthing}=await import('../public/lantern-buildings-layout.js');
const {MAP,groundHeight,blocked,stepPlayer}=await import('../public/world.js');
const {newExpedition}=await import('../public/expedition.js');
const {driveRover}=await import('../public/rover.js');
const {stepBoat,interactBoat}=await import('../public/patrol-boats.js');
const world=newExpedition(),dt=1/30;

// Survey dry land and standable ground at equal one-metre cell centres. Exclude
// bridges so both shores are compared under the same rule.
function survey(w,e,n,s){
  let dry=0,walkable=0;
  for(let x=w+.5;x<e;x++)for(let z=n+.5;z<s;z++){
    const y=groundHeight(x,z);
    if(y<=MAP.waterY)continue;
    dry++;
    if(!blocked(x,y,z,world.hp,world.doors))walkable++;
  }
  return {dry,walkable};
}
const old=survey(harbor.west,beach.east,harbor.north,harbor.south),added=survey(-70,78,-481,-352);
for(const k of ['dry','walkable'])assert(Math.abs(added[k]/old[k]-1)<.12);
for(const b of lanternBuildings){
  if(b===limestoneBase)assert.equal(blocked(b.x,.8,b.z,world.hp),false);
  else assert(blocked(b.x-b.w/2,.8,b.z,world.hp));
  for(const dx of [-b.w/2,b.w/2])for(const dz of [-b.d/2,b.d/2])assert(onLantern(b.x+dx,b.z+dz));
}
// Both pool terraces, the club loggia and Solana's shore landing are pedestrian destinations.
function pedestrianRoute(waypoints){
  let [x,z]=waypoints[0];
  let p={x,z,y:groundHeight(x,z),grounded:true};
  for(const [tx,tz] of waypoints.slice(1)){
    const length=Math.hypot(tx-p.x,tz-p.z);
    for(let step=0;step<length*11+40 && Math.hypot(tx-p.x,tz-p.z)>.19;step++){
      const dx=tx-p.x,dz=tz-p.z,remain=Math.hypot(dx,dz);
      p=stepPlayer(p,{x:dx/remain,z:dz/remain},dt,world.hp,world);
      assert(!p.swimming);
    }
    assert(Math.hypot(tx-p.x,tz-p.z)<.30,'pedestrian route stopped at '+[p.x,p.z]+' en route to '+[tx,tz]);
  }
}
const gangway=berthing.gangway;
pedestrianRoute([[2,-370],[64.8,-370],[64.8,gangway.z],[gangway.x,gangway.z],[67.5,gangway.z],[59,gangway.z],[49,-374.5]]);
pedestrianRoute([[-25,-370],[-25,-382.5],[-31.6,-382.5],[-31.6,-398.5]]);
pedestrianRoute([[25,-419],[25,-425.2],[15.2,-425.2],[15.2,-435.3],[34,-435.3]]);
pedestrianRoute([[25,-378],[25,-381.2],[21.7,-381.2],[21.7,-388],[30,-388]]);
for(const x of [69.25,75.4,81.5])for(let z=-384;z<=-321;z+=1){
  assert(groundHeight(x,z)<-1.39,'Solana castoff water depth');
  assert(!blocked(x,-.14,z,world.hp),'unobstructed freeboard');
}
for(const z of [-389,-388,-387,-386])assert(groundHeight(75.4,z)<-1.39,'stern ladder swim approach');
const car=world.rover;
Object.assign(car,{x:2.4,z:-254,y:.7,yaw:0,driver:1});
function drive(x,z){
  for(let tick=0;tick<2500;tick++){
    const dx=x-car.x,dz=z-car.z,dist=Math.hypot(dx,dz);
    if(dist<.35 && car.speed<.05)return;
    driveRover(world,approachPoint(car,x,z,10),dt);
    assert.equal(car.hp,250);assert(car.y>.6);
  }
  assert.fail('rover blocked from '+[x,z]+' at '+[car.x,car.z]);
}
for(const [x,z] of [[2.4,-316],[2.4,-370],[2.4,-466],[-49,-466],[-49,-419],[49,-419],[49,-370],[-49,-370],[-49,-466],[0,-466],[0,-254]])drive(x,z);
for(const sign of [-1,1]){
  const boat=world.boats[1];Object.assign(boat,{x:-17*sign,z:-316,yaw:sign*Math.PI/2,speed:0,driver:1});
  for(let i=0;i<210 && sign*boat.x<17;i++)stepBoat(world,boat,{throttle:1},dt,new Map());
  assert(sign*boat.x>16.9 && boat.hp===300);
}
const ferry=world.boats[1],skipper={id:1,state:{}};
Object.assign(ferry,{x:-81,z:-434.4,yaw:Math.PI/2,speed:0,driver:1});
for(let tick=0;tick<300 && ferry.x< -67;tick++)stepBoat(world,ferry,{throttle:Number(ferry.speed<3)},dt);
assert(ferry.x>= -67);
for(let tick=0;tick<120 && ferry.speed>0;tick++)stepBoat(world,ferry,{throttle:0},dt);
assert.equal(ferry.hp,300);
interactBoat(world,ferry,skipper);
assert(skipper.state.grounded && skipper.state.y===.58,'step straight from the RHIB to the floating finger');
for(let i=0;i<100 && skipper.state.x< -56;i++)skipper.state=stepPlayer(skipper.state,{x:1},dt,world.hp,world);
assert(skipper.state.x>-57 && skipper.state.grounded && skipper.state.y===.8,'walk up from the pier to the marina quay');
let wader={x:ferrySlip.east+1,z:-400,y:MAP.waterY-.72,swimming:true};
for(let i=0;i<160;i++)wader=stepPlayer(wader,{x:-1},dt,world.hp,world);
assert(wader.x<ferrySlip.west && wader.grounded && !wader.swimming);
assert.equal(cityGround(70,-400),slipHeight(70));
assert.equal(lanternLocation(0,-316),'Lantern Bridge');
assert.equal(lanternLocation(-26,-390),'Lantern Point');
assert.equal(lanternLocation(80,-416),'Biscayne Bay');
console.log('PASS Lantern Point dry/standable square metres',JSON.stringify({harborKey:old,lanternPoint:added}),
  'estate terraces, club loggia, Solana gangway and castoff, two bridge levels, connected streets, shore ramp');
