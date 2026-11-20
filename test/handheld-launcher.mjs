import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,fire,advanceMissiles,trackLauncher}=await import('../public/expedition.js');
const {lockStatus,lockVehicle}=await import('../public/handheld-launcher.js');
const {newLife}=await import('../public/rivals.js');
const aim={tracking:true,aimYaw:0,aimPitch:0};
function setup(){
  const world=newExpedition(),p={id:1,weapon:4,state:{x:0,y:100,z:20},life:newLife(0,false),fireReady:0};
  return {world,p,peers:new Map([[1,p]])};
}
for(const key of ['rover','supercar','heli','bay-rhib','key-rhib','superyacht']){
  const {world,p,peers}=setup(),v=lockVehicle(world,key);
  Object.assign(v,{x:0,y:100.6,z:0,yaw:0});
  // Aim through the hull at its own height.
  const input={...aim,aimPitch:key==='superyacht'?.055:0};
  for(let t=0;t<=18;t++)trackLauncher(world,p,input,t,peers,[]);
  assert.deepEqual(lockStatus(p,18),{key,progress:1},key);
  fire(world,p,input,18,peers,[]);assert.equal(world.missiles[0].lock,key);
  v.x+=2;
  advanceMissiles(world,peers,[],19);assert(world.missiles[0].yaw>0);
  const hp=v.hp;
  for(let t=20;t<85 && world.missiles.length;t++)advanceMissiles(world,peers,[],t);
  assert.equal(v.hp,Math.max(0,hp-500),key+' damage');
}
{
  const {world,p,peers}=setup(),v=world.heli;Object.assign(v,{x:0,y:100,z:0});
  const victim={id:2,state:{x:0,y:100,z:8},life:{...newLife(0,false),hp:900},score:{kills:0,deaths:0}};
  peers.set(2,victim);
  for(let t=0;t<20;t++)trackLauncher(world,p,aim,t,peers,[]);
  assert.equal(lockStatus(p,19),null,'person in front of vehicle blocks lock');
  fire(world,p,aim,19,peers,[]);assert.equal(world.missiles[0].lock,undefined);
  for(let t=20;t<50 && world.missiles.length;t++)advanceMissiles(world,peers,[],t);
  assert.equal(victim.life.hp,400,'straight body shot deals 500');
}
{
  const {world,p,peers}=setup();Object.assign(world.heli,{x:0,y:100,z:0});
  for(let t=0;t<=18;t++)trackLauncher(world,p,aim,t,peers,[]);
  trackLauncher(world,p,{...aim,fire:true,aimYaw:Math.PI},19,peers,[]);
  assert.equal(lockStatus(p,19),null,'turning away clears a finished lock on trigger');
  fire(world,p,{...aim,aimYaw:Math.PI},19,peers,[]);assert(!world.missiles[0].lock);
}
console.log('PASS vehicle-only locks, moving-target hits, 500 damage, obstructed and straight shots');
