import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition,advanceMissiles}=await import('../public/expedition.js');
const {groundHeight,solidTopAt,blocked,stepPlayer}=await import('../public/world.js');
const {estateCondition}=await import('../public/estate-damage.js');
const {segmentContact}=await import('../public/rounds.js');
const {roadContact}=await import('../public/road-contact.js');

for(const [kind,a,b,z,facing] of [['rover',-38.4,-36.1,-384.34,0],['heli',11.5,14,-451,Math.PI]]){
  const w=newExpedition(),sign=Math.cos(facing),inside=z-sign*2.18;
  const feet=groundHeight(a,z,2,w.doors);
  const height=(doors,x)=>solidTopAt(x,inside,w.hp,0,20,doors);
  const before=height(w.doors,a),farX=kind==='rover'?-13.7:34;
  const intact=height(w.doors,farX);
  const hitByRound=()=>segmentContact(w,{x:b,y:2.12,z:z+sign*.62},{x:0,y:0,z:-sign*1.24},[],new Map(),()=>{}).hitKind;
  const car=()=>roadContact(w,b,z,z===-451?Math.PI:0,b,z+sign*.2,{y:feet});
  function launchAt(x){
    w.missiles.push({id:1,source:kind,shooter:1,x,y:2.12,z:z+sign*1.57,yaw:facing,remaining:60});
    for(let t=0;t<5 && w.missiles.length;t++)advanceMissiles(w,new Map(),[],t);
    assert.equal(w.missiles.length,0);
  }
  assert(before>4);assert(blocked(a,feet,z,w.hp,w.doors));assert(car());
  assert(['scenery','glass'].includes(hitByRound()));assert(!w.doors.estateBreaches);
  launchAt(a);
  assert(!blocked(a,feet,z,w.hp,w.doors),'single wall bay opens at the impact');
  assert(blocked(b,feet,z,w.hp,w.doors),'adjacent support initially stands');
  assert.equal(height(w.doors,a),before,'roof stays supported after first breach');
  assert.equal(estateCondition(w.doors).falls.length,0);
  launchAt(b);
  const late=JSON.parse(JSON.stringify(w.doors));
  assert.equal(estateCondition(late).falls.length,1);
  assert(height(late,a)<1.09);assert.equal(height(late,farX),intact);
  assert(!blocked(b,feet,z,w.hp,late));assert(!hitByRound());assert(!car());
  let person={x:a,y:before,z:inside,grounded:true,vy:0};
  for(let t=0;t<90;t++)person=stepPlayer(person,{},1/30,w.hp,w);
  assert(person.grounded && person.y<1.10,'upper-floor occupant falls onto surviving ground slab');
  const fresh=newExpedition();assert.equal(height(fresh.doors,a),before);
}
console.log('PASS both missile launchers breach one wall, second support collapses only its bay, roof occupants fall, road and rounds clear the opening, late join and reset');
