import assert from 'node:assert/strict';
import * as THREE from 'three';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {urbanShoreRocks,coastalBedHeight}=await import('../public/brickell-map.js');
const {groundHeight,stepPlayer,MAP}=await import('../public/world.js');
const {addShoreBoulders}=await import('../public/shore-rock-view.js');
const {rockPileOverlapsBridge}=await import('../public/shore-rock-piles.js');
const {bridges}=await import('../public/brickell-map.js');
const {militaryBridge}=await import('../public/military-island.js');
const {ferrySlip,marketPiers}=await import('../public/lantern-point.js');

assert(urbanShoreRocks.rocks.filter(r=>r.z>-100).length>80,'Brickell has a continuous rock shore');
assert(urbanShoreRocks.rocks.filter(r=>r.z<-350).length>80,'Lantern Point has a continuous rock shore');
const scene=new THREE.Scene();
const mesh=addShoreBoulders(scene,urbanShoreRocks,'Urban shore boulders');
assert.equal(mesh.count,urbanShoreRocks.rocks.length,'rendering uses every collision rock');
for(const rock of urbanShoreRocks.rocks){
  assert(groundHeight(rock.x,rock.z)>coastalBedHeight(rock.x,rock.z)+.3,
    'every visible boulder has a walkable top');
  assert(groundHeight(rock.x,rock.z,MAP.waterY)<MAP.waterY,
    'boats retain the surveyed channel beneath the rock');
  assert(![...bridges,militaryBridge,ferrySlip,...marketPiers].some(rect=>
    rockPileOverlapsBridge(rock.x,rock.z,rock.radius*1.15,rect)),
    'rock footprints leave bridge and dock approaches clear');
}
for(const [x,z,dir] of [[-75.5,0,-1],[-69.5,-398.5,-1],[66.5,-430.1,1]]){
  let walker={x,z,y:.8,vy:0,grounded:true},highest=walker.y;
  for(let tick=0;tick<34;tick++){
    walker=stepPlayer(walker,{x:dir},1/30,{}, {doors:{}});
    highest=Math.max(highest,walker.y);
  }
  assert(highest>1,'walking from Brickell or Lantern Point climbs the rocks without jumping');
}
console.log('PASS Brickell and Lantern Point boulders render and support walking');
