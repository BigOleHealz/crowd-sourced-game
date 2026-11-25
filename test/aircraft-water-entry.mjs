import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,reportVehicleWreck}=await import('../public/expedition.js');
const {fly,recoverHelicopter}=await import('../public/airframe.js');
const {stepJet}=await import('../public/jet.js');
const {MAP}=await import('../public/world.js');
const dt=1/30;

for(const kind of ['heli','jet']){
  const world=newExpedition(),craft=world[kind];
  Object.assign(craft,{x:75,y:MAP.waterY+.51,z:-218,grounded:false,pilot:1});
  if(kind==='jet')Object.assign(craft,{speed:22,pitch:-.4});
  const players=new Map([[1,{id:1,inputs:[],state:{},moving:false,sprint:false}]]);
  for(let n=0;n<30 && !craft.sinking;n++){
    if(kind==='heli')fly(world,{x:0,z:0,lift:-1,aimYaw:0},dt,players);
    else stepJet(world,{throttle:0,jetPitch:0},dt,players);
  }
  assert(craft.wrecked && craft.sinking,`${kind} crashes into deep water`);
  assert(players.get(1).state.swimming,`${kind} pilot exits swimming`);
  assert.equal(craft.sinking.surface,MAP.waterY);
  reportVehicleWreck(world,craft,kind,'water',1);
  assert.deepEqual(world.shots.map(s=>s.weapon),['roadSplash'],`${kind} splashes without an explosion`);
  assert(world.shots[0].power>=.72);
  reportVehicleWreck(world,craft,kind,'water',2);
  assert.equal(world.shots.length,1,'one splash per impact');
  const impactY=craft.y;
  for(let n=0;n<60;n++){
    if(kind==='heli')recoverHelicopter(world,dt,players);
    else stepJet(world,null,dt,players);
  }
  assert(craft.y<impactY-1,`${kind} visibly sinks`);
  for(let n=0;n<210;n++){
    if(kind==='heli')recoverHelicopter(world,dt,players);
    else stepJet(world,null,dt,players);
  }
  assert.notEqual(world[kind],craft,`${kind} returns after recovery`);
}
{
  const world=newExpedition(),jet=world.jet;
  Object.assign(jet,{x:75,y:MAP.waterY+.1,z:-218,grounded:true,speed:8,pilot:1});
  const players=new Map([[1,{id:1,state:{},inputs:[]}]]);
  stepJet(world,{throttle:1},dt,players);
  assert(jet.sinking && jet.wrecked,'taxiing off shore enters the water');
  assert(players.get(1).state.swimming);
}
{
  const world=newExpedition(),heli=world.heli;
  Object.assign(heli,{x:75,y:MAP.waterY+.67,z:-218,grounded:false,abandonedFor:2});
  for(let n=0;n<30 && !heli.sinking;n++)recoverHelicopter(world,dt,new Map());
  assert(heli.sinking && heli.wrecked,'abandoned helicopter also hits water');
}
console.log('PASS aircraft water splash, sinking and recovery');
