import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {nearBoat,interactBoat,stepBoat,nearbyHull,helmFeet,damageBoat}=await import('../public/patrol-boats.js');
const {marinaBerths,marinaModels,marinaModel,marinaHullContains,hullSize}=await import('../public/marina-fleet-layout.js');
const {nextUse}=await import('../public/use-target.js');
const {selectSeat}=await import('../public/seat-selection.js');
const {vehicleContact}=await import('../public/vehicle-contact.js');
const {createRangerRig,poseRig}=await import('../public/ranger-pose.js');
const {trouserSeat}=await import('../public/ranger-surfaces.js');
const {mountPosition}=await import('../public/mounts.js');
const {MAP,groundHeight}=await import('../public/world.js');
const {WakeTrail}=await import('../public/boat-wakes.js');
const {driverPrediction}=await import('../public/driver-prediction.js');
const {Vector3}=await import('three');

const dt=1/30;
const fingers=[-446,-446,-433,-433,-419,-419];
assert.deepEqual(newExpedition({civilianMarina:false}).boats.map(({id})=>id),['bay-rhib','key-rhib','base-rhib-south','base-rhib-north']);
assert.equal(new Set(newExpedition().boats.map(({id})=>id)).size,12);
trouserSeat.computeBoundingBox();
const bottom=.990+trouserSeat.boundingBox.min.y;
const rig=createRangerRig();

for(const [i,site] of marinaBerths.entries()){
  const world=newExpedition();
  const boat=world.boats.find(b=>b.id===site.id),model=marinaModel(boat);
  assert.equal(boat.y,MAP.waterY);
  assert.equal(boat.hp,model.maxHp);
  assert(groundHeight(boat.x,boat.z)<MAP.waterY+model.keel);
  const edge=i<6?fingers[i]+Math.sign(boat.z-fingers[i])*.89:i===6?-441.10:-431.10;
  const y=i<6?.56:groundHeight(boat.x,edge);
  const a={id:1,life:{hp:100},state:{x:boat.x,y,z:edge,grounded:true}};
  const b={...a,id:2,state:{...a.state}};
  const players=new Map([[1,a],[2,b]]);
  let thefts=0;
  world.wanted={session:p=>p?.id,record(id,action){if(id===1 && action==='theft')thefts++;}};
  assert.equal(nearBoat(world,a.state),boat);
  assert.deepEqual(nextUse(world,a.state,a.id),{target:boat.id,role:'drive',label:'Take helm of '+boat.name});
  interactBoat(world,boat,a);
  assert.equal(boat.driver,a.id);assert.equal(thefts,1);
  interactBoat(world,boat,b);
  assert.equal(boat.driver,a.id);assert.equal(boat.gunner,null);
  assert(!selectSeat(world,a,boat.id,2),'cannot obtain a gunner position');
  assert.equal(nextUse(world,helmFeet(boat),a.id).label,'Disembark '+boat.name);

  // The same physical helm is used by the simulated feet and the visible seat/hand contacts.
  const pose={...boat,pitch:.065,roll:-.135};
  poseRig(rig,{grounded:true,swimming:true},dt,pose);
  const {cushion,wheel}=model.helm;
  const cushionCenter=mountPosition(pose,[cushion.x,cushion.y,cushion.z]);
  assert(rig.body.localToWorld(new Vector3(0,bottom,0)).distanceTo(new Vector3(...Object.values(cushionCenter)))<.001);
  for(const {forearm,side} of rig.limbs){
    const rim=mountPosition(pose,[wheel.x+side*wheel.radius*Math.cos(Math.PI/6),
      wheel.y+wheel.radius*.5*Math.cos(wheel.tilt),wheel.z+wheel.radius*.5*Math.sin(wheel.tilt)]);
    assert(forearm.localToWorld(new Vector3(0,-.265,0)).distanceTo(new Vector3(...Object.values(rim)))<.002);
  }
  const outer=mountPosition(boat,[model.halfWidth-.08,.10,0]);
  assert(vehicleContact(outer.x,outer.y,outer.z,world,true).depth>0);
  assert(marinaHullContains(boat,outer.x,outer.y,outer.z));
  const cabin=mountPosition(boat,[0,model.deck+.82,0]);
  assert.equal(marinaHullContains(boat,cabin.x,cabin.y,cabin.z),Boolean(model.roof));
  assert(nearbyHull([boat],null,boat.x,boat.z,boat.yaw+.3,.4,.6));
  assert(!nearbyHull([boat],null,boat.x,boat.z+model.halfWidth+4,boat.yaw,.35,.45));

  const before=boat.x,predict=driverPrediction(world,a.id);
  const direct={throttle:1,steer:0};
  for(let t=0;t<95;t++){predict.step(direct,dt);stepBoat(world,boat,direct,dt,players);}
  assert(Math.abs(boat.x-before)>5,boat.name+' leaves its original berth under power');
  assert(Math.abs(boat.x-predict.pose(1).x)<.001,'prediction agrees with the server hull path');
  assert(Math.sign(boat.x-before)===Math.sign(Math.sin(boat.yaw)));
  const trail=new WakeTrail();trail.step(boat,dt);
  assert.equal(trail.count,1);
  assert.equal(trail.at(0).beam,model.wake.beam);
  assert(Math.abs(trail.at(0).x-(boat.x-model.wake.ahead*Math.sin(boat.yaw)))<.001);
  interactBoat(world,boat,a);
  assert.equal(boat.driver,null);assert(a.state.grounded || a.state.swimming);
  damageBoat(world,boat,10_000,players);
  for(let t=0;t<181;t++)stepBoat(world,boat,null,dt,players);
  assert.equal(boat.wrecked,false);
  assert.deepEqual([boat.x,boat.z,boat.speed],[site.x,site.z,0]);
}

// The longer hulls accelerate and turn gradually, and the steering works astern.
const trials=Object.keys(marinaModels).map(boatModel=>{
  const world=newExpedition();
  const b=world.boats.find(b=>b.boatModel===boatModel);
  Object.assign(b,{x:87,z:-351,yaw:Math.PI,driver:1});
  const input={throttle:1,steer:.25};
  for(let t=0;t<90;t++)stepBoat(world,b,input,dt);
  return {model:boatModel,speed:b.speed,turn:Math.abs(b.yawRate),boat:b,world};
});
for(let i=1;i<trials.length;i++){
  assert(trials[i-1].speed>trials[i].speed);
  assert(trials[i-1].turn>trials[i].turn);
}
for(const {boat,world} of trials){
  for(let t=0;t<210;t++)stepBoat(world,boat,{throttle:-1,steer:.25},dt);
  assert(boat.speed<0 && boat.yawRate<0);
  assert(hullSize(boat).halfLength>2.5);
}
console.log('PASS all eight marina boats, named helm and boarding, exclusive steering, visible seat and wheel contact, hull bounds, prediction, size-scaled wakes, disembark, recovery, and distinct forward and reverse profiles.');
