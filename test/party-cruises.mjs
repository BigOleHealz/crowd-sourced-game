import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {partyFleet,stepBoat,interactBoat,nearBoat,damageBoat}=await import('../public/patrol-boats.js');
const {marinaModel}=await import('../public/marina-fleet-layout.js');
const {cityGround}=await import('../public/brickell-map.js');
const world=newExpedition(),fleet=partyFleet();
world.boats.push(...fleet);
const distance=fleet.map(()=>0),names=new Set(fleet.map(b=>b.name));
assert.equal(names.size,6);
for(let t=0;t<2400;t++){
  for(const [i,b] of fleet.entries()){
    const x=b.x,z=b.z;
    stepBoat(world,b,null,.05,new Map());
    distance[i]+=Math.hypot(b.x-x,b.z-z);
    assert(b.speed>.01 && cityGround(b.x,b.z)<b.y-1,'Cruise clears the shore and berth traffic');
    assert(Math.hypot(b.x-x,b.z-z)<.25,'Continuous cruise position');
  }
}
assert(distance.every(v=>v>360),'Every yacht completes multiple circuits in its own bay');
const b=fleet[0],model=marinaModel(b);
for(let t=0;t<900 && b.speed>2.8;t++)stepBoat(world,b,null,.05,new Map());
const p={id:202,state:{x:b.x+Math.cos(b.yaw)*(model.halfWidth+.6),
  z:b.z+Math.sin(b.yaw)*(model.halfWidth+.6),y:b.y-.72,swimming:true}};
assert.equal(nearBoat(world,p.state)?.id,b.id);
interactBoat(world,b,p);assert.equal(b.driver,p.id);assert.equal(b.cruising,false);
const start={...b};
for(let t=0;t<20;t++)stepBoat(world,b,{throttle:1,steer:.2},.05,new Map());
assert(Math.hypot(b.x-start.x,b.z-start.z)>1);
interactBoat(world,b,p);assert.equal(b.driver,null);assert(p.state.swimming);
damageBoat(world,b,b.maxHp,new Map());
for(let t=0;t<125;t++)stepBoat(world,b,null,.05,new Map());
assert(!b.wrecked && b.cruising);
console.log('Six party skippers circumnavigate deep water, yield the helm, and restart after a wreck.');
