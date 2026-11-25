import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {waterfront}=await import('../public/brickell-map.js');
const {travelBounds,groundHeight}=await import('../public/world.js');
const {resortLevels,grandTopAt}=await import('../public/grand-resort-layout.js');
const {falls,shorePads}=await import('../public/palma-site.js');
const passage=[[-238,15],[-166,19],[-114,30],[-102,36],[-100,56],[-96.5,69],[-86,80],[-82.1,95.8],[-74,108],[-64,111],[-54,111],[-37,111],[-28,102],[-27.5,88],[-25,84],[-13,84]];
for(let i=1;i<passage.length;i++){
  const [ax,az]=passage[i-1],[bx,bz]=passage[i];
  for(let s=0;s<=50;s++){
    const x=ax+(bx-ax)*s/50,z=az+(bz-az)*s/50;
    for(const dx of [-1.3,0,1.3])for(const dz of [-2.7,0,2.7]){
      assert(waterfront(x+dx,z+dz));assert(x+dx>travelBounds.west && z+dz<travelBounds.south);
    }
  }
}
assert.equal(shorePads[0].west,-91);
for(const [x,z] of [[-60,71],[-18,68]]){
  assert.equal(waterfront(x,z),false,'casino foundation occupies the water gap');
  assert.equal(groundHeight(x,z,.8),.8,'foundation and walking support share a top');
}
assert.ok(Math.abs(groundHeight(-55,98,.8)-.32)<1e-6);
assert.equal(groundHeight(-55,96,.8),.8);
assert.equal(grandTopAt(-71.35,61,0,2),-Infinity);
assert(resortLevels[0].parts.some(p=>p.kind==='stage'&&p.z>falls[0]&&p.z<falls[1]));
assert.equal(resortLevels[0].parts.filter(p=>p.kind==='chair').length,32);
assert.equal(resortLevels[0].parts.filter(p=>p.kind==='basin'&&falls.includes(p.z)).length,2);
console.log('PASS boat envelope across the three views, two quays, tender berth, clear cross street and paired stage basins.');
