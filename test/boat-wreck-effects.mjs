import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,reportVehicleWreck}=await import('../public/expedition.js');
const {damageBoat,stepBoat}=await import('../public/patrol-boats.js');
const {liveShots}=await import('../public/shot-events.js');
const w=newExpedition(),players=new Map(),watch=liveShots([]);
for(const boat of w.boats){
  const state={id:42,state:{x:boat.x,y:boat.y,z:boat.z},life:{hp:100},inputs:[]};
  players.set(42,state);boat.driver=42;
  damageBoat(w,boat,boat.maxHp,players);reportVehicleWreck(w,boat,boat.id,'water',5);
  const hit=watch(w.shots).at(-1);assert.equal(hit.source,boat.id);assert.equal(hit.weapon,'vehicleWreck');
  assert.equal(state.life.hp,100);assert.equal(boat.driver,null);
  reportVehicleWreck(w,boat,boat.id,'water',6);assert.deepEqual(watch(w.shots),[]);
  assert.deepEqual(liveShots(w.shots)(w.shots),[]);
  for(let i=0;i<179;i++)stepBoat(w,boat,null,1/30,players);assert(boat.wrecked);
  stepBoat(w,boat,null,1/30,players);assert(!boat.wrecked);assert.equal(boat.hp,boat.maxHp);
  reportVehicleWreck(w,boat,boat.id,'water',185);
  damageBoat(w,boat,boat.maxHp,players);reportVehicleWreck(w,boat,boat.id,'water',186);
  assert(watch(w.shots).at(-1).id>hit.id);
}
console.log('PASS boat wreck events, ejection, zero extra damage, late observer, duplicate, six-second recovery and later destruction for patrol and civilian boats.');
