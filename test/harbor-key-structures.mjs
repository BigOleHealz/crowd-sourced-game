import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {beachHut,harborHouses}=await import('../public/harbor-key-structures.js');
const {buildingTopAt,blocked,groundHeight,stepPlayer}=await import('../public/world.js');
const {galleryPlans}=await import('../public/gallery-lobbies.js');
const {storefrontFaces}=await import('../public/frontage-glass.js');

const hut=beachHut;
assert.equal(groundHeight(hut.x,hut.z),hut.deckY);
assert.equal(buildingTopAt(hut.x,hut.z),hut.canopy.top);
assert(!blocked(hut.x,hut.deckY,hut.z,{}),'the canopy leaves standing headroom');
for(const post of hut.posts)assert(blocked(post.x,hut.deckY,post.z,{}),'posts have physical supports');
for(const bench of hut.benches)assert(blocked(bench.x,hut.deckY,bench.z,{}),'the bench stops a standing player');
for(const heading of [-1,1]){
  const x=hut.x-heading*(hut.w/2+1);
  let walker={x,y:groundHeight(x,hut.z),z:hut.z,vy:0,grounded:true};
  let steppedOnDeck=false;
  for(let i=0;i<65;i++){
    walker=stepPlayer(walker,{x:heading,z:0},1/30,{});
    if(Math.abs(walker.x-hut.x)<.5)steppedOnDeck ||= walker.grounded && walker.y===hut.deckY;
  }
  assert(steppedOnDeck && (walker.x-hut.x)*heading>hut.w/2,'crosses the shelter from either open side');
}

for(const house of harborHouses){
  assert.equal(storefrontFaces.filter(face=>face.building===house && face.entry).length,2);
  assert.equal(galleryPlans.find(plan=>plan.b===house).ends.length,2);
  assert.equal(buildingTopAt(house.x,house.z),house.base+house.eave+house.rise);
  assert.equal(buildingTopAt(house.x,house.z+house.d/2),house.base+house.eave);
}
console.log('PASS Harbor Key roof slopes, retained retail and gallery plans, and open beach shade with solid posts and seating.');
