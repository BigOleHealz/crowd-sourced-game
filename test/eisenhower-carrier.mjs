import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {MAP,stepPlayer,solidTopAt,travelBounds,flightBounds,insideTravelArea,groundHeight,blocked}=await import('../public/world.js');
const {newExpedition,fly}=await import('../public/expedition.js');
const {stepBoat}=await import('../public/patrol-boats.js');
const {stepJet}=await import('../public/jet.js');
const {sweepRoad,roadContact}=await import('../public/road-contact.js');
const {militaryIsland,militaryFence}=await import('../public/military-island.js');
const {eisenhowerCarrier,carrierDeckTop,carrierHullContains,carrierHullSections,carrierRamp,carrierRampHeight,carrierRampSegments,carrierRampSupportRows,carrierRampRailBlocked,carrierRampRailSides,carrierRampTurnGuard}=await import('../public/eisenhower-carrier-layout.js');

const scale=eisenhowerCarrier.length/1061.7968;
const beam=293.8955*scale;
const shoreGap=militaryIsland.west-(eisenhowerCarrier.x+beam/2);
assert(shoreGap>18 && shoreGap<24,'clear water separates the flight deck from the island coast');
assert(eisenhowerCarrier.x-beam/2>travelBounds.west+30,'boats can sail around the west side');
assert(eisenhowerCarrier.z-eisenhowerCarrier.length/2>travelBounds.north);
assert(eisenhowerCarrier.z+eisenhowerCarrier.length/2<travelBounds.south);
for(const x of [-350,-262])for(const z of [-390,-90])
  assert(insideTravelArea(x,z),'water beside the full carrier stays within the playable chart');
assert(flightBounds.north<eisenhowerCarrier.z-eisenhowerCarrier.length/2-100,
  'aircraft have approach room beyond the carrier bow');
assert(carrierDeckTop-MAP.waterY>12 && carrierDeckTop-MAP.waterY<17,'deck remains above a realistic waterline');
assert(MAP.waterY-(MAP.waterY+(3.9625-eisenhowerCarrier.waterlineModelY)*scale)>9,'lower hull has a visible draft');

// A landing on the overhanging flight deck must not leave only the player's
// head above the texture, even where the narrow waterline hull does not reach.
for(const x of [eisenhowerCarrier.x,carrierRamp.deck.x]){
  let p={x,z:eisenhowerCarrier.z,y:carrierDeckTop+2,vy:-4,grounded:false};
  for(let i=0;i<90;i++)p=stepPlayer(p,{},1/30,{}, {doors:{}});
  assert(p.grounded && Math.abs(p.y-carrierDeckTop)<.01,'player stands on the visible deck');
}
assert(groundHeight(eisenhowerCarrier.x+30,eisenhowerCarrier.z,carrierDeckTop+2)<MAP.waterY,
  'empty water outside the visible flight deck has no invisible walking floor');
assert(solidTopAt(eisenhowerCarrier.x,eisenhowerCarrier.z,{},0,MAP.waterY+2)>MAP.waterY+5,
  'waterline hull still blocks boats');
assert(groundHeight(eisenhowerCarrier.x+33,eisenhowerCarrier.z,MAP.waterY+2)<MAP.waterY-2,
  'water remains beneath the flight-deck overhang');
// The island Humvee fits under the level gangway at its fence opening.
// Collision must use the road under the deck instead of treating the deck as
// a sudden terrain step when the vehicle enters its footprint.
{
  const world=newExpedition();
  for(const [x,dx] of [[-240,-9],[-249,9]]){
    const humvee={...world.rover,x,z:carrierRamp.turn.z,y:.8,yaw:Math.PI/2};
    assert.equal(sweepRoad(world,humvee,dx,0).fraction,1,
      'Humvee drives beneath the gangway in either direction');
  }
  const humvee={...world.rover,x:-247,z:-275,y:.8,yaw:Math.PI/2};
  assert(roadContact(world,humvee.x,humvee.z,humvee.yaw,humvee.x-.2,humvee.z,humvee)?.object?.fenceId,
    'visible military fence still blocks the Humvee');
  const lowDeck={...humvee,x:carrierRamp.shore.x,z:-285,y:.8,yaw:0};
  assert.equal(roadContact(world,lowDeck.x,lowDeck.z,0,lowDeck.x,lowDeck.z-.2,lowDeck)?.object,'carrier-gangway',
    'Humvee cannot drive through a section with insufficient overhead clearance');
  const post=carrierRampSupportRows[1].posts[1];
  const atPost={...humvee,x:post.x,z:post.z,y:.8,yaw:0};
  assert.equal(roadContact(world,post.x,post.z,0,post.x-.2,post.z,atPost)?.object,post,
    'visible gangway support still blocks the Humvee');
}
const gateZ=carrierRamp.turn.z;
assert(!militaryFence.some(b=>Math.abs(b.x+246)<.1 && Math.abs(b.z-gateZ)<b.d/2+2),
  'the west fence has an opening at the gangway');
assert.equal(carrierRampHeight(carrierRamp.shore.x,carrierRamp.shore.z),.8);
assert.equal(carrierRampHeight(carrierRamp.deck.x,carrierRamp.deck.z),carrierDeckTop);
assert(carrierRamp.deck.x<eisenhowerCarrier.x+15,'gangway overlaps the visible flight deck');
for(const offset of [-1,0,1]){
  let p={x:carrierRamp.shore.x+offset,z:carrierRamp.shore.z,y:.8,vy:0,grounded:true};
  for(let tick=0;tick<600 && p.z<carrierRamp.turn.z-.15;tick++){
    p=stepPlayer(p,{z:1},1/30,{}, {doors:{}});
    assert(!p.swimming,'straight approach stays on the gangway');
  }
  assert(p.z>=carrierRamp.turn.z-.15 && Math.abs(p.y-carrierDeckTop)<.02,
    'walking forward reaches the level landing across the gangway width');
  for(let tick=0;tick<600 && p.z>carrierRamp.shore.z+.15;tick++)
    p=stepPlayer(p,{z:-1},1/30,{}, {doors:{}});
  assert(p.z<=carrierRamp.shore.z+.15,'walking backward reaches shore again');
}
let walker={...carrierRamp.shore,vy:0,grounded:true};
for(const goal of [carrierRamp.riseEnd,carrierRamp.turn,carrierRamp.deck,{x:carrierRamp.deck.x-3,z:carrierRamp.deck.z}]){
  for(let i=0;i<700 && Math.hypot(goal.x-walker.x,goal.z-walker.z)>.12;i++){
    const dx=goal.x-walker.x,dz=goal.z-walker.z,length=Math.hypot(dx,dz);
    walker=stepPlayer(walker,{x:dx/length,z:dz/length},1/30,{}, {doors:{}});
    assert(!walker.swimming,'walking up the ramp never drops the player into water');
  }
  assert(Math.hypot(goal.x-walker.x,goal.z-walker.z)<.15,'shore ramp reaches each landing');
}
assert(walker.grounded && Math.abs(walker.y-carrierDeckTop)<.02,'player walks from shore onto flight deck');
assert(carrierRampRailBlocked(carrierRamp.turn.x,carrierDeckTop,carrierRampTurnGuard.z),
  'the exposed outer edge of the turn has a guardrail');
assert(!carrierRampRailBlocked(carrierRamp.turn.x-1,carrierDeckTop,carrierRamp.turn.z),
  'the westward walking turn remains open');
// The visible side plating is solid to swimmers at the surface and underwater.
for(const section of carrierHullSections)for(const side of [-1,1])for(const depth of [.4,2]){
  const edge=section.x+side*section.w/2;
  let swimmer={x:edge+side*7,z:section.z,y:-depth,vy:0,grounded:false,swimming:true,swimDepth:depth};
  for(let tick=0;tick<150;tick++)
    swimmer=stepPlayer(swimmer,{x:-side},1/30,{}, {doors:{}});
  assert(!carrierHullContains(swimmer.x,swimmer.z,.1),
    'the swimmer cannot pass through the carrier side');
  assert(Math.abs(swimmer.x-edge)<1.2,'the hull collision tracks the visible side');
}
for(const x of [-350,-262]){
  const world=newExpedition(),boat=world.boats[1];
  Object.assign(boat,{x,z:-112,yaw:0,driver:1});
  for(let tick=0;tick<1100;tick++)stepBoat(world,boat,{throttle:1},1/30,new Map());
  assert(boat.z<-390 && boat.hp>0,'a boat can cruise the full length of either carrier side');
}
for(const kind of ['jet','heli']){
  const world=newExpedition(),aircraft=world[kind];
  Object.assign(aircraft,{x:eisenhowerCarrier.x,z:-80,y:60,yaw:0,pilot:1,grounded:false});
  for(let tick=0;tick<600;tick++){
    if(kind==='jet')stepJet(world,{throttle:1,steer:0,jetPitch:0},1/30,new Map());
    else fly(world,{x:0,z:-1,lift:1,throttle:1,steer:0,aimYaw:0},1/30,new Map());
  }
  assert(aircraft.z<-390 && aircraft.y>carrierDeckTop+10 && aircraft.hp>0,
    'a flyable aircraft passes the carrier with room for an approach');
}
// The hull must stay below the deck all the way along the runway. Its old
// seabed-relative height created an invisible wall across several sections.
for(const start of [-104,-358]){
  let runner={x:eisenhowerCarrier.x,z:start,y:carrierDeckTop,vy:0,grounded:true};
  const target=start===-104?-358:-104,sign=Math.sign(target-start);
  for(let i=0;i<2000 && Math.abs(target-runner.z)>.2;i++){
    runner=stepPlayer(runner,{z:sign},1/30,{}, {doors:{}});
    assert(runner.grounded && Math.abs(runner.y-carrierDeckTop)<.02,
      'the entire carrier runway remains walkable');
  }
  assert(Math.abs(target-runner.z)<.2,'the player reaches the far end of the flight deck');
}
for(const [segment,[a,b]] of carrierRampSegments.entries()){
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),sideX=-dz/length,sideZ=dx/length;
  const middle={x:(a.x+b.x)/2,z:(a.z+b.z)/2,y:(a.y+b.y)/2};
  for(const side of carrierRampRailSides(segment)){
    const railX=middle.x+sideX*side*carrierRamp.width/2;
    const railZ=middle.z+sideZ*side*carrierRamp.width/2;
    assert(carrierRampRailBlocked(railX,middle.y,railZ));
    assert(!carrierRampRailBlocked(railX,middle.y-2,railZ),'water traffic below the rail stays clear');
    assert(blocked(railX,middle.y,railZ,{},{}),'the server and client movement probe meet the rail');
    let p={x:middle.x+sideX*side*.7,z:middle.z+sideZ*side*.7,y:middle.y,vy:0,grounded:true};
    for(let i=0;i<45;i++)p=stepPlayer(p,{x:sideX*side,z:sideZ*side},1/30,{}, {doors:{}});
    const outward=(p.x-middle.x)*sideX*side+(p.z-middle.z)*sideZ*side;
    assert(outward<carrierRamp.width/2-.25,'walking sideways stops at each visible rail');
  }
}
console.log('PASS coastside carrier placement, realistic draft, fence gate and walkable flight-deck ramp');
