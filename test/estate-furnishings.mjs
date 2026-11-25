import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {casaFurniture}=await import('../public/casa-luma.js');
const {mareFurniture}=await import('../public/palazzo-mare.js');
const {breachEstate,estateSolids,furnishingSupported}=await import('../public/estate-damage.js');
const {MAP,blocked}=await import('../public/world.js');
const {ramHouse}=await import('../public/residential-falls.js');

// The mattress in Casa straddles a demolished floor edge. Its full footprint
// goes with its anchor, while the adjacent bedside cabinet remains supported.
for(const [id,furniture,wallZ,a,b] of [
  ['casa',casaFurniture,-384.34,-38.4,-36.1],
  ['mare',mareFurniture,-451,25.3,28.8],
]){
  const bed=furniture.find(p=>p.kind==='bed'),sofa=furniture.find(p=>p.kind==='sofa');
  const guest=furniture.find(p=>p.kind==='planter'),doors={};
  const visible=(p,state)=>furnishingSupported(id,p.x,.80+p.bottom,p.z,state);
  const source=[bed,sofa];
  assert(MAP.barriers.includes(bed) && MAP.barriers.includes(guest));
  assert(blocked(guest.x,.80+guest.bottom,guest.z,{},{}),'planter remains physical');
  assert.deepEqual(estateSolids(source,doors),source);
  assert(breachEstate(doors,{x:a,z:wallZ,y:2.15}));
  assert(visible(bed,doors),'a single hit on a wall leaves the floor and furniture intact');
  assert(breachEstate(doors,{x:b,z:wallZ,y:2.15}));
  for(const state of [doors,structuredClone(doors)]){
    assert(!visible(bed,state) && visible(sofa,state));
    assert.deepEqual(estateSolids(source,state),[sofa],'unanchored furnishings leave no partial collision box');
  }
  if(id==='casa'){
    const side=furniture.find(p=>p.kind==='nightstand');
    assert(visible(side,doors),'adjacent cabinet rests on its own remaining floor');
  }
  assert(visible(bed,{}),'new round restores the original room');
  assert(ramHouse(doors,id,bed.x,bed.z,1,0));
  assert.deepEqual(estateSolids(source,doors),[],'whole-home removal invalidates a prior partial result');
  assert(!visible(sofa,structuredClone(doors)),'whole-home collapse clears earlier surviving pieces for late joiners');
}
console.log('PASS planter contacts and whole-piece removal after local and total residential collapse; peer snapshot, nearby room and round reset');
