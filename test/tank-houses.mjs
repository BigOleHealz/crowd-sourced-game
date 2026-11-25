import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {homes}=await import('../public/residential-sites.js');
const {stepTank}=await import('../public/tank.js');
const {groundHeight,MAP,solidTopAt}=await import('../public/world.js');
const {collapseSoundCues}=await import('../public/collapse-sound-cues.js');

function ram(b,dir){
  const world=newExpedition(),tank=world.tank,z=b.z;
  const x=b.x-dir*(b.w/2+4.5);
  const roof=()=>solidTopAt(b.x,z,world.hp,0,Infinity,world.doors);
  const originalRoof=roof();
  const occupant={id:1,team:1,life:{hp:100},state:{x,z,y:.8}};
  Object.assign(tank,{x,z,y:groundHeight(x,z,1),yaw:dir*Math.PI/2,driver:1});
  let fall;
  for(let tick=0;tick<480;tick++){
    world.simTick=tick;
    stepTank(world,{throttle:1},1/30,new Map([[1,occupant]]));
    fall??=world.doors.structureFalls?.find(e=>e.home);
  }
  assert.equal(occupant.life.hp,100);
  assert.equal(tank.hp,750);
  return {world,tank,roof:roof(),originalRoof,fall};
}

for(const home of homes)for(const dir of home.id==='club-salon'?[-1]:[-1,1]){
  const {world,roof,originalRoof,fall}=ram(home.parts[0],dir);
  assert(world.doors.houseRuins?.[home.id],home.id+' collapses when rammed');
  assert.equal(fall?.home,home.id);
  assert(roof<originalRoof-1,home.id+' roof is gone after collapse');
  assert(!world.doors.tankWallCuts?.length,'no narrow wall cuts remain instead of a collapse');
  assert(collapseSoundCues(fall,MAP.buildings).length>1,'impact and falling concrete have audio cues');
  assert(world.doors.houseRuins[home.id].direction,'late joiners receive the collapse direction');
}

const tower=MAP.buildings.find(b=>b.towerId!=null);
for(const dir of [-1,1]){
  const {world,tank,roof,originalRoof}=ram(tower,dir);
  assert.equal(tank.speed,0,'skyscraper concrete stops the tank');
  assert.equal(roof,originalRoof,'skyscraper roof and structure stay intact');
  assert(world.doors.glassSeq>0,'skyscraper glass shatters on contact');
  assert(!world.doors.tankWallCuts?.length,'concrete wall is never cut');
  assert(!world.doors.collapsedTowers?.length);
}
console.log('PASS tank collapses houses with impact and concrete cues, shatters tower glazing, and stops at structural concrete.');
