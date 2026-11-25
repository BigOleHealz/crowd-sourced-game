import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,fire,advanceThrowables}=await import('../public/expedition.js');
const {arcadeMolotov,throwableLimit}=await import('../public/arcade-molotov.js');
const {touchLayout}=await import('../public/touch-controls.js');
const {groundHeight}=await import('../public/world.js');

function setup(){
  const world=newExpedition();
  const state={x:-32,z:-226,y:groundHeight(-32,-226),grounded:true};
  const p={id:1,team:1,weapon:6,state,life:{hp:100},fireReady:0};
  return {world,p,players:new Map([[p.id,p]])};
}
function run(world,players,start){
  for(let i=0;i<111 && world.throwables;i++)advanceThrowables(world,players,[],start+i);
}
{
  const {world,p,players}=setup(),input={aimYaw:0,aimPitch:-.13};
  fire(world,p,input,10,players,[]);
  assert.equal(p.fireReady,10+arcadeMolotov.cooldown);
  fire(world,p,input,11,players,[]);
  assert.equal(world.throwables.length,1);
  const start=world.throwables[0],y=start.y;
  advanceThrowables(world,players,[],10);
  assert(start.y>y && start.z<p.state.z,'capsule arcs up and forward');
  assert.deepEqual(JSON.parse(JSON.stringify(world)).throwables[0],start,'late join sees an airborne item');
  run(world,players,11);
  assert.equal(world.throwables,undefined);
  assert.equal(world.doors.fires?.['harbor-0']?.stage,'burning');
  assert.equal(world.doors.fires['harbor-0'].team,1);
  assert.equal(world.shots.filter(s=>s.weapon==='molotov').length,1,'one contact and retained visual event');
}
{
  const {world,p,players}=setup();
  Object.assign(world.rover,{x:-32,y:.8,z:-228.7,yaw:0});
  fire(world,p,{aimYaw:0,aimPitch:-.13},0,players,[]);
  run(world,players,0);
  assert(!world.doors.fires,'first solid contact shields the house');
  assert.equal(world.rover.hp,250);
  Object.assign(p.state,{x:90,z:-90,y:2,swimming:false});
  fire(world,p,{aimYaw:0,aimPitch:-1.1},100,players,[]);run(world,players,100);
  assert.equal(world.shots.at(-1).water,true);
}
{
  const {world,p,players}=setup();
  for(let i=0;i<throwableLimit+3;i++){p.fireReady=0;fire(world,p,{aimPitch:0,aimYaw:0},1,players,[]);}
  assert.equal(world.throwables.length,throwableLimit);
  assert(touchLayout({role:'foot',active:true,throwable:true,canAim:true}).quick.some(([k,label])=>k==='KeyF'&&label==='Throw'));
}
console.log('PASS arc, cooldown, authoritative first contact, authored fire, late join, water, cap and touch throw action');
