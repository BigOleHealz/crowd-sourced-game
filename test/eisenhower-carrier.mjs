import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {MAP,stepPlayer,solidTopAt,travelBounds,groundHeight}=await import('../public/world.js');
const {militaryIsland,militaryFence}=await import('../public/military-island.js');
const {eisenhowerCarrier,carrierDeckTop,carrierHullContains,carrierRamp,carrierRampHeight}=await import('../public/eisenhower-carrier-layout.js');

const scale=eisenhowerCarrier.length/1061.7968;
const beam=293.8955*scale;
const shoreGap=militaryIsland.west-(eisenhowerCarrier.x+beam/2);
assert(shoreGap>18 && shoreGap<24,'clear water separates the flight deck from the island coast');
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
assert(groundHeight(eisenhowerCarrier.x+33,eisenhowerCarrier.z,MAP.waterY+2)<MAP.waterY-2,
  'water remains beneath the flight-deck overhang');
const gateZ=carrierRamp.shore.z+(-246-carrierRamp.shore.x)*
  (carrierRamp.turn.z-carrierRamp.shore.z)/(carrierRamp.turn.x-carrierRamp.shore.x);
assert(!militaryFence.some(b=>Math.abs(b.x+246)<.1 && Math.abs(b.z-gateZ)<b.d/2+2),
  'the west fence has an opening at the gangway');
assert.equal(carrierRampHeight(carrierRamp.shore.x,carrierRamp.shore.z),.8);
assert.equal(carrierRampHeight(carrierRamp.deck.x,carrierRamp.deck.z),carrierDeckTop);
let walker={...carrierRamp.shore,vy:0,grounded:true};
for(const goal of [carrierRamp.turn,carrierRamp.deck,{x:carrierRamp.deck.x-3,z:carrierRamp.deck.z}]){
  for(let i=0;i<700 && Math.hypot(goal.x-walker.x,goal.z-walker.z)>.12;i++){
    const dx=goal.x-walker.x,dz=goal.z-walker.z,length=Math.hypot(dx,dz);
    walker=stepPlayer(walker,{x:dx/length,z:dz/length},1/30,{}, {doors:{}});
    assert(!walker.swimming,'walking up the ramp never drops the player into water');
  }
  assert(Math.hypot(goal.x-walker.x,goal.z-walker.z)<.15,'shore ramp reaches each landing');
}
assert(walker.grounded && Math.abs(walker.y-carrierDeckTop)<.02,'player walks from shore onto flight deck');
console.log('PASS coastside carrier placement, realistic draft, fence gate and walkable flight-deck ramp');
