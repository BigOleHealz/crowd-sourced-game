import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,fire,advanceMissiles}=await import('../public/expedition.js');
const {newLife,healthView}=await import('../public/rivals.js');
function launch(hp,shield=false){
  const world=newExpedition();
  const shooter={id:1,weapon:4,state:{x:0,y:100,z:20},life:newLife(0,false),fireReady:0};
  const target={id:2,state:{x:0,y:100,z:8},yaw:0,life:{...newLife(0,shield),hp},score:{kills:0,deaths:0}};
  const players=new Map([[1,shooter],[2,target]]);
  fire(world,shooter,{aimYaw:0,aimPitch:0},1,players,[]);
  for(let tick=2;tick<40 && world.missiles.length;tick++)advanceMissiles(world,players,[],tick);
  return {view:healthView(target,40),debris:world.shots.filter(s=>s.weapon==='bodyBlast')};
}
const lethal=launch(100);
assert.equal(lethal.view.dead,true);
assert.equal(lethal.view.deathKind,'blast');
assert.equal(lethal.debris.length,1);
assert.equal(lethal.debris[0].to.z,8);
for(const result of [launch(900),launch(100,true)]){
  assert.equal(result.view.dead,false);
  assert.equal(result.view.deathKind,undefined);
  assert.equal(result.debris.length,0);
}
assert.equal(healthView({life:newLife(120)},130).deathKind,undefined);
console.log('Lethal missile emits a single burst. Surviving, shielded and respawned players retain their models.');
