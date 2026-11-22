import assert from 'node:assert/strict';
import {fishPose,fishSchools,fishSpecies} from '../public/reef-fish.js';
import {brickellMap,cityGround} from '../public/brickell-map.js';
import {reefFishView} from '../public/reef-fish-view.js';
import * as THREE from 'three';

const water=brickellMap.waterY;
assert.equal(new Set(fishSchools.map(s=>s.species)).size,3);
for(const school of fishSchools) {
  const species=fishSpecies[school.species];
  assert.ok(species);
  for(let i=0;i<school.count;i++)for(let t=0;t<40;t+=.33){
    const pose=fishPose(school,i,t),y=water-pose.depth;
    assert.ok(y+species.height*pose.scale<water,school.species+' clear of surface');
    assert.ok(y-species.height*pose.scale>cityGround(pose.x,pose.z,water),school.species+' clear of bottom');
  }
}
const scene=new THREE.Scene(),update=reefFishView(scene,water);
update({x:0,y:2,z:15},1000);
assert.ok(scene.children.every(m=>!m.visible));
update({x:84,y:-1,z:-423},1000);
const seen=scene.children.filter(m=>m.visible);
assert.equal(seen.length,2);
assert.equal(seen.reduce((n,m)=>n+m.count,0),16);
const first=Array.from(seen[0].instanceMatrix.array);
update({x:84,y:-1,z:-423},1000);
assert.deepEqual(first,Array.from(seen[0].instanceMatrix.array));
update({x:84,y:-1,z:-423},1030);
assert.notDeepEqual(first,Array.from(seen[0].instanceMatrix.array));
console.log('PASS three distinguishable fish species, all schools submerged in wet navigable water, synchronized positions and culled distant groups.');
