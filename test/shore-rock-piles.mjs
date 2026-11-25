import assert from 'node:assert/strict';
import {shoreRockPile,rockPileOverlapsBridge} from '../public/shore-rock-piles.js';
import {onRockShore,onSandShore} from '../public/beach-layout.js';
import {bridges} from '../public/brickell-map.js';
import {militaryIsland,militaryDock,militaryBridge,onMilitaryRockShore} from '../public/military-island.js';

const waterY=-.14;
for(const floor of [.8,-.5,-2.8,-4]){
  const pile=shoreRockPile(floor,waterY,.5);
  assert(pile.centerY+pile.height>waterY,
    `rock pile on a ${floor} m shelf must show above the water`);
  assert(pile.centerY-pile.height<floor,
    'rock pile base must remain embedded in the bank');
}
assert(onRockShore(-67,-220));
assert(!onRockShore(62,-220),'the beach stays clear');
assert(onSandShore(78,-220));
assert(onMilitaryRockShore(militaryIsland.west-1,-220));
assert(!onMilitaryRockShore(militaryDock.ramp.west+2,-252),'the military dock stays clear');
for(const bridge of [...bridges,militaryBridge]){
  const west=bridge.walkWest??bridge.west;
  for(const [shore,sign] of [[bridge.north,-1],[bridge.south,1]]){
    const outside=shore+sign*.5;
    assert(rockPileOverlapsBridge(west-.5,outside,1,bridge),
      'a rock beside the bridge wall can still intersect its masonry');
    assert(!rockPileOverlapsBridge(west-2,outside,1,bridge),
      'rocks beyond the pedestrian wall remain on the shore');
  }
}
assert(rockPileOverlapsBridge(militaryBridge.east+.5,-230,1,militaryBridge),
  'Harbor Key rocks at the east approach must be excluded');
