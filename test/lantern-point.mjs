import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {harbor,cityGround}=await import('../public/brickell-map.js');
const {beach}=await import('../public/beach-layout.js');
const {ferrySlip,slipHeight,onLantern,lanternLocation}=await import('../public/lantern-point.js');
const {lanternBuildings}=await import('../public/lantern-buildings-layout.js');
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
  assert(blocked(b.x,.8,b.z,world.hp));
  for(const dx of [-b.w/2,b.w/2])for(const dz of [-b.d/2,b.d/2])assert(onLantern(b.x+dx,b.z+dz));
}
const car=world.rover;
Object.assign(car,{x:2.4,z:-254,y:.7,yaw:0,driver:1});
function drive(x,z){
  for(let tick=0;tick<2500;tick++){
    const dx=x-car.x,dz=z-car.z,dist=Math.hypot(dx,dz);
    if(dist<.35 && car.speed<.05)return;
    const a=Math.atan2(dx,-dz)-car.yaw,e=Math.atan2(Math.sin(a),Math.cos(a));
    driveRover(world,{throttle:Number(dist>.26 && Math.abs(e)<.31 && car.speed<Math.min(10,dist*2.4)),
      steer:dist>.26?Math.max(-1,Math.min(1,e*4)):0},dt);
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
assert(skipper.state.x>-57 && skipper.state.grounded && skipper.state.y===.8,'walk up from the pier to the market quay');
let wader={x:ferrySlip.east+1,z:-400,y:MAP.waterY-.72,swimming:true};
for(let i=0;i<160;i++)wader=stepPlayer(wader,{x:-1},dt,world.hp,world);
assert(wader.x<ferrySlip.west && wader.grounded && !wader.swimming);
assert.equal(cityGround(70,-400),slipHeight(70));
assert.equal(lanternLocation(0,-316),'Lantern Bridge');
assert.equal(lanternLocation(-26,-390),'Lantern Point');
assert.equal(lanternLocation(80,-416),'Biscayne Bay');
console.log('PASS Lantern Point dry/standable square metres',JSON.stringify({harborKey:old,lanternPoint:added}),
  'two bridge levels, market buildings, connected street circuit, shore ramp');
