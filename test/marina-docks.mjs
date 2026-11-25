import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {dockHeight,marinaFingers}=await import('../public/marina-docks.js');
const {waterfront}=await import('../public/brickell-map.js');
const {groundHeight,stepPlayer}=await import('../public/world.js');
const {landmarkGuide}=await import('../public/landmark-navigation.js');
const destination=landmarkGuide('East Quay Guest Docks');
assert.equal(destination(66,-419,0).cue,'Arrived');
let state={x:54,y:groundHeight(54,-419),z:-419,grounded:true};
function walkTo(x,z){
  for(let t=0;t<700;t++){
    const dx=x-state.x,dz=z-state.z,dist=Math.hypot(dx,dz);if(dist<.15)return;
    state=stepPlayer(state,{x:dx/dist,z:dz/dist},1/30);
    assert(state.grounded && !state.swimming,'Deck is continuous underfoot');
  }
  assert.fail('Incomplete dock walk to '+[x,z]+' from '+[state.x,state.z]);
}
walkTo(71.5,-419);
for(const pier of marinaFingers){
  walkTo(71.5,pier.z);walkTo(88.6,pier.z);
  for(const sign of [-1,1]){
    assert.equal(dockHeight(82,pier.z+sign*.92),.56);
    assert(waterfront(82,pier.z+sign*3.1));
    assert(groundHeight(82,pier.z+sign*3.1)<-.8);
  }
  walkTo(71.5,pier.z);
}
walkTo(71.5,-419);walkTo(55,-419);
console.log('Passed East Quay road-to-dock round trip, three accessible finger piers and six deep-water slips.');
