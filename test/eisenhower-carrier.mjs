import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {MAP,stepPlayer,solidTopAt,travelBounds,groundHeight}=await import('../public/world.js');
const {militaryIsland}=await import('../public/military-island.js');
const {eisenhowerCarrier,carrierDeckTop,carrierHullContains}=await import('../public/eisenhower-carrier-layout.js');

const scale=eisenhowerCarrier.length/1061.7968;
const beam=293.8955*scale;
assert(eisenhowerCarrier.x+beam/2<militaryIsland.west-30,'visible deck stays west of the base with a water channel');
assert(eisenhowerCarrier.x-beam/2>travelBounds.west+30,'boats can sail around the west side');
assert(eisenhowerCarrier.z-eisenhowerCarrier.length/2>travelBounds.north);
assert(eisenhowerCarrier.z+eisenhowerCarrier.length/2<travelBounds.south);
assert(carrierDeckTop-MAP.waterY>12 && carrierDeckTop-MAP.waterY<17,'deck remains above a realistic waterline');
assert(MAP.waterY-(MAP.waterY+(3.9625-eisenhowerCarrier.waterlineModelY)*scale)>9,'lower hull has a visible draft');

// A landing on the overhanging flight deck must not leave only the player's
// head above the texture, even where the narrow waterline hull does not reach.
for(const x of [eisenhowerCarrier.x,eisenhowerCarrier.x+30]){
  assert(x===eisenhowerCarrier.x || !carrierHullContains(x,eisenhowerCarrier.z));
  let p={x,z:eisenhowerCarrier.z,y:carrierDeckTop+2,vy:-4,grounded:false};
  for(let i=0;i<90;i++)p=stepPlayer(p,{},1/30,{}, {doors:{}});
  assert(p.grounded && Math.abs(p.y-carrierDeckTop)<.01,'player stands on the visible deck');
}
assert(solidTopAt(eisenhowerCarrier.x,eisenhowerCarrier.z,{},0,MAP.waterY+2)>MAP.waterY+5,
  'waterline hull still blocks boats');
assert(groundHeight(eisenhowerCarrier.x+55,eisenhowerCarrier.z)<MAP.waterY-2,
  'the channel beside the ship remains open water');
console.log('PASS west-of-base placement, hull draft and flight-deck support');
