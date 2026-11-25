import assert from 'node:assert/strict';
import {beach,beachTerrain,onBeachTerrain,sandHeight} from '../public/beach-layout.js';
import {brickellMap,cityGround,coastalBedHeight} from '../public/brickell-map.js';

// Beach and reef meshes meet on the same two-metre vertex grid.
for(let z=beach.north;z<=beach.south;z+=8){
  for(let x=beach.west;x<=beach.east;x+=2){
    assert(Math.abs(coastalBedHeight(x,z)-sandHeight(x,z))<1e-6,
      `beach and seabed separate at ${x}, ${z}`);
  }
  let previous=coastalBedHeight(beach.east,z);
  for(let x=beach.east+2;x<=beach.east+12;x+=2){
    const next=coastalBedHeight(x,z);
    assert(Math.abs(next-previous)<1.6,`shore drops abruptly at ${x}, ${z}`);
    previous=next;
  }
}

assert(onBeachTerrain(44,beach.north-6) && onBeachTerrain(44,beach.south+6));
for(const x of [38,44,60,76,88]){
  assert(coastalBedHeight(x,beachTerrain.north)<brickellMap.waterY-1,
    `north side bank ends above water at ${x}`);
  assert(coastalBedHeight(x,beachTerrain.south)<brickellMap.waterY-1,
    `south side bank ends above water at ${x}`);
}
const bankX=44,bankZ=beach.north-4;
assert(coastalBedHeight(bankX,beach.north)>coastalBedHeight(bankX,bankZ),
  'beach side slopes down toward the water');
assert(Math.abs(cityGround(bankX,bankZ)-coastalBedHeight(bankX,bankZ))<1e-6,
  'walking collision follows the visible side bank');
assert(cityGround(bankX,bankZ,brickellMap.waterY)<coastalBedHeight(bankX,bankZ)-1,
  'boats keep the deeper surveyed bed below the bank');
