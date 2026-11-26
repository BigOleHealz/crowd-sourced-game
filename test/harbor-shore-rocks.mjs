import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {harborShoreRocks,harborShoreBedHeight,coastalBedHeight}=await import('../public/brickell-map.js');
const {groundHeight,stepPlayer,MAP}=await import('../public/world.js');

assert(harborShoreRocks.rocks.length>200,'the west, north, and south rock rows remain populated');
for(const rock of harborShoreRocks.rocks){
  const bed=harborShoreBedHeight(rock.x,rock.z);
  assert(bed>MAP.waterY,'visible shore rocks sit on an exposed bank');
  assert(groundHeight(rock.x,rock.z)>bed+.3,'every rendered stone has a walkable top');
}
for(const [x,z,axis,sign] of [
  [-60.5,-210,'x',-1],[-55.7,-279.5,'z',-1],[-55.7,-152.5,'z',1],
]){
  let player={x,z,y:.8,vy:0,grounded:true},highest=player.y;
  for(let tick=0;tick<75;tick++){
    player=stepPlayer(player,{[axis]:sign},1/30,{}, {doors:{}});
    highest=Math.max(highest,player.y);
  }
  assert(highest>.9,'walking from the island climbs a rock without jumping');
  assert(!player.swimming,'the rock bank remains above water along the walking route');
}
const sample=harborShoreRocks.rocks.find(rock=>rock.x<-69 && rock.z>-220 && rock.z<-200);
assert(sample);
assert(groundHeight(sample.x,sample.z,MAP.waterY)<MAP.waterY,
  'boat-depth probes retain water below the raised walking bank');
assert(coastalBedHeight(sample.x,sample.z)<MAP.waterY,
  'the original submerged channel remains under the visible rock bank');
console.log('PASS Harbor Key shore boulders share visible walking support with the military rocks');
