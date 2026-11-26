import assert from 'node:assert/strict';
import {beach,beachIsland,beachTerrain,onBeachTerrain,onRockShore,onSandShore,sandHeight} from '../public/beach-layout.js';
import {brickellMap,cityGround,coastalBedHeight,harborShoreBedHeight} from '../public/brickell-map.js';

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
assert(onBeachTerrain(32,beach.north-6) && onBeachTerrain(32,beach.south+6),
  'shore terrain wraps around both west harbor corners');
assert(!onBeachTerrain(32,(beach.north+beach.south)/2),
  'sand does not cover the harbor deck');
const islandMidZ=(beachIsland.north+beachIsland.south)/2;
assert(onBeachTerrain(beachIsland.west-6,islandMidZ),
  'shore terrain runs along the entire west island shore');
assert(onBeachTerrain(-20,beachIsland.north-6) && onBeachTerrain(-20,beachIsland.south+6),
  'shore terrain runs along both island ends');
assert(onRockShore(beachIsland.west-6,islandMidZ) && !onSandShore(beachIsland.west-6,islandMidZ),
  'the west island bank is rock rather than sand');
for(const z of [beachIsland.north-4,beachIsland.south+4]){
  assert(onRockShore(beachIsland.east-.1,z) && onSandShore(beachIsland.east,z),
    'rocks run along the island end to the west edge of the sand beach');
}
assert(!onBeachTerrain(0,beachIsland.north-6) && !onBeachTerrain(0,beachIsland.south+6),
  'bridge channels remain open through the shore apron');
assert(!onBeachTerrain(-20,islandMidZ),'island interior stays uncovered');
for(const x of [-74,-61,-20,26,32,38,44,60,76,88]){
  assert(coastalBedHeight(x,beachTerrain.north)<brickellMap.waterY-1,
    `north side bank ends above water at ${x}`);
  assert(coastalBedHeight(x,beachTerrain.south)<brickellMap.waterY-1,
    `south side bank ends above water at ${x}`);
}
assert(coastalBedHeight(beachTerrain.west,islandMidZ)<brickellMap.waterY-1,
  'west shore apron ends below water');
assert(coastalBedHeight(beachIsland.west,islandMidZ)>coastalBedHeight(beachIsland.west-6,islandMidZ),
  'west island shore slopes toward the water');
assert(Math.abs(cityGround(beachIsland.west-6,islandMidZ)-harborShoreBedHeight(beachIsland.west-6,islandMidZ))<1e-6,
  'west shore walking collision follows the visible rock bank');
const bankX=44,bankZ=beach.north-4;
assert(coastalBedHeight(bankX,beach.north)>coastalBedHeight(bankX,bankZ),
  'beach side slopes down toward the water');
assert(Math.abs(cityGround(bankX,bankZ)-coastalBedHeight(bankX,bankZ))<1e-6,
  'walking collision follows the visible side bank');
assert(cityGround(bankX,bankZ,brickellMap.waterY)<coastalBedHeight(bankX,bankZ)-1,
  'boats keep the deeper surveyed bed below the bank');
for(const z of [beach.north-4,beach.south+4]){
  assert(Math.abs(cityGround(32,z)-harborShoreBedHeight(32,z))<1e-6,
    'west corner bank has solid walking collision');
  assert(cityGround(32,z,brickellMap.waterY)<coastalBedHeight(32,z)-1,
    'boats retain clearance beside the west corner bank');
}
