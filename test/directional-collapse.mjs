import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {MAP,stanceBodyHeight}=await import('../public/world.js');
const {rubbleHeight,breachTower}=await import('../public/tower-damage.js');
const {collapsePlan,piecePose,stepStructuralFalls}=await import('../public/structural-collapse.js');
const {damageDirection}=await import('../public/collapse-direction.js');
const building=MAP.buildings.find(b=>b.towerId===0);
function collapse(side){
  const doors={};
  function breach(col,row,story){assert.notEqual(breachTower([building],doors,{
    x:building.x+building.w*((col+.5)/4-.5),z:building.z+building.d*((row+.5)/4-.5),y:2+story*4}),null);}
  for(let row=0;row<4;row++)breach(side<0?0:3,row,2);
  for(let row=0;row<4;row++)for(let col=0;col<4;col++)breach(col,row,0);
  return doors;
}
for(const side of [-1,1]){
  const doors=collapse(side),event=doors.structureFalls[0];
  assert.deepEqual(event.direction,{x:side,z:0});
  const plan=collapsePlan(event,MAP.buildings),replay=collapsePlan(structuredClone(event),MAP.buildings);
  assert.deepEqual(plan,replay);
  const roof=plan.pieces.filter(p=>p.type==='slab').sort((a,b)=>b.low-a.low)[0];
  const at=piecePose(roof,roof.land,{});assert((at.x-roof.x)*side>5);assert(at.yx*side>.2);
  const outside={state:{x:plan.east+1,y:.8,z:building.z},life:{hp:100,immuneUntil:0}};
  for(let t=0;t<300;t++)stepStructuralFalls(doors,MAP.buildings,new Map([[1,outside]]),t,a=>{a.life.hp=0;return true;},stanceBodyHeight);
  assert.equal(outside.life.hp,100);assert(!doors.structureFalls);
  const late=JSON.parse(JSON.stringify(doors)),height=x=>rubbleHeight(building,building.x+x,building.z,late);
  assert(height(side*building.w*.16)>height(-side*building.w*.16));
}
assert.deepEqual(damageDirection([{x:1,z:0},{x:-1,z:0}]),{x:1,z:0});
assert.deepEqual(damageDirection([]),{x:0,z:1});
console.log('PASS opposite impact patterns produce opposite tilts, section travel and settled heaps, stable across snapshots');
