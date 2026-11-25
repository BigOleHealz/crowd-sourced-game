import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {doorwayProximity}=await import('../public/doorway-camera.js');
for(const [z,side] of [[-49,1],[-57,-1]]){
  assert(doorwayProximity(-16,.7,z+side*1.1)>.40);
  assert(doorwayProximity(-16,.824,z-side*.5)>.70);
  assert.equal(doorwayProximity(-16,.7,z+side*2.1),0);
  assert.equal(doorwayProximity(-14,.7,z+side*.4),0);
}
console.log('PASS shoulder framing covers both sides of each hotel door and clears the adjacent wall.');
