import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newRivals,updateRival,rivalView,damageActor}=await import('../public/rivals.js');
const {newExpedition}=await import('../public/expedition.js');
const {MAP,groundHeight}=await import('../public/world.js');
const people=newRivals(),world=newExpedition();
assert.equal(people.length,20);
assert.deepEqual(people.slice(0,2).map(p=>[p.id,p.name]),[['rival-fern','Fern'],['rival-rowan','Rowan']]);
assert.equal(new Set(people.map(p=>p.id)).size,20);
assert.equal(people.filter(p=>p.state.z<-150).length,8);
for(const p of people){
  const [x,z]=p.route.points[0],others=people.filter(q=>q!==p).map(q=>Math.hypot(x-q.route.points[0][0],z-q.route.points[0][1]));
  assert(Math.min(...others)>12,p.name+' starts away from other residents');
  const visited=new Set();
  for(let t=0;t<(p.route.crossing?5400:2600);t++){
    visited.add(p.next);updateRival(p,t,1/30,world.hp,world);
    assert(p.state.grounded && !p.state.swimming && groundHeight(p.state.x,p.state.z)>MAP.waterY);
    // A blocked or unreachable waypoint cannot produce a full loop.
    if(visited.size===p.route.points.length && p.next===1 && t>55)break;
  }
  assert.equal(visited.size,p.route.points.length,p.name+' visits every waypoint');
  assert(Math.hypot(p.state.x-x,p.state.z-z)<.14,p.name+' returns to the beginning');
  damageActor(p,100,3000);assert.equal(rivalView(p,3000).dead,true);
  updateRival(p,3090,1/30,world.hp,world);
  assert.equal(p.life.hp,100);assert.equal(p.state.x,x);assert.equal(p.state.z,z);
}
console.log('PASS 20 living Brickell residents, 12 mainland and 8 on Harbor Key, distinct dry circuits, original identities and per-resident respawn');
