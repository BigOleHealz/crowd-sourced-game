import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,advanceMissiles,tracePulse}=await import('../public/expedition.js');
const {MAP}=await import('../public/world.js');
for(const b of MAP.buildings.filter(b=>b.towerId!=null)){
  const w=newExpedition(), from={x:b.x-b.w/2-2.8,y:14,z:b.z-2};
  const dir={x:1,y:0,z:0};
  function shoot(id){
    w.missiles.push({...from,id,source:'rover',shooter:9,yaw:Math.PI/2,pitch:0,remaining:60});
    for(let tick=0;w.missiles.length && tick<60;tick++)advanceMissiles(w,new Map(),[],tick);
  }
  shoot(1);
  assert.equal(w.doors.towerBreaches?.length,1,'first strike on tower '+b.towerId);
  const lateJoin=JSON.parse(JSON.stringify(w));
  const opening=tracePulse(lateJoin,[],from,dir,b.w/2+1,false,'rover');
  assert(!opening.blocked && !opening.hitKind,'clear first bay');
  shoot(2);
  assert.equal(w.doors.towerBreaches.length,2,'next bay takes the second hit');
  const neighbor=tracePulse(w,[],{...from,y:10},dir,b.w,false,'rover');
  assert(neighbor.blocked || neighbor.hitKind==='glass','next band intact');
}
console.log('PASS localized first and second missile impacts on all Brickell towers and replicated collision');
