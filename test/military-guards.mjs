import assert from 'node:assert/strict';
import test from 'node:test';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newRivals}=await import('../public/rivals.js');
const {insideMilitary,militaryBarriers}=await import('../public/military-island.js');
const {usePlayerScan}=await import('../public/player-scan.js');

test('military guards patrol the island without entering hangar barriers',()=>{
  const guards=newRivals().filter(actor=>actor.id.startsWith('military-guard-'));
  assert.equal(guards.length,3);
  assert.equal(usePlayerScan(guards[0],new Map([['army',true]])),'army');
  for(const guard of guards){
    assert.equal(guard.sidewalk,null);
    for(const [x,z] of guard.route.points){
      assert.ok(insideMilitary(x,z),`${guard.id} left the island`);
      for(const barrier of militaryBarriers){
        const clearX=Math.abs(x-barrier.x)>barrier.w/2+.35;
        const clearZ=Math.abs(z-barrier.z)>barrier.d/2+.35;
        assert.ok(clearX || clearZ,`${guard.id} enters a barrier at ${x}, ${z}`);
      }
    }
  }
});
