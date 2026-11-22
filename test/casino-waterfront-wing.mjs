import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {wingFloor,wingGallery,wingRoof,wingEntrances}=await import('../public/waterfront-wing.js');
const {groundHeight,stepPlayer,blocked}=await import('../public/world.js');
const {acousticSpace}=await import('../public/acoustic-space.js');
const {roomAtFeet,interiorCeiling}=await import('../public/building-interiors.js');
const {newExpedition}=await import('../public/expedition.js');
const {roadContact}=await import('../public/road-contact.js');
const w=newExpedition(),dt=1/60;
let player={x:-67,z:61,y:.70,grounded:true};
function walk(x,z,expectedY){
  for(let t=0;t<900;t++){
    const dx=x-player.x,dz=z-player.z,d=Math.hypot(dx,dz);
    if(d<.04)break;
    const previous=player.y;
    const amount=Math.min(1,d*4);
    player=stepPlayer(player,{x:amount*dx/d,z:amount*dz/d},dt,w.hp,w);
    assert(player.grounded,'No fall on route to '+[x,z]+' at '+[player.x,player.y,player.z]);
    assert(Math.abs(player.y-previous)<.18,'No snap on a threshold or stair');
  }
  assert(Math.hypot(player.x-x,player.z-z)<.05,'Blocked going to '+[x,z]+' at '+[player.x,player.y,player.z]);
  if(expectedY!=null)assert(Math.abs(player.y-expectedY)<.02);
}
walk(-69,wingEntrances.avenue.z);walk(-74,wingEntrances.avenue.z,wingFloor);
assert.equal(roomAtFeet(player,w.doors).label,'Aurora Waterfront Salon');
assert.equal(acousticSpace(player,w).id,'casino');
walk(-80.4,58.75);walk(-80.4,52.3);walk(-84.4,52.3);
walk(-84.4,51.24,wingFloor);walk(-84.4,46.6);walk(-84.4,41.5,wingGallery);
walk(-80.4,41.5,wingGallery);walk(-80.4,35.6,wingGallery);
assert.equal(roomAtFeet(player,w.doors).label,'Aurora Waterfront Salon · Gallery');
assert.equal(interiorCeiling(player,w.doors),9.05);
walk(-80.4,41.45);walk(-84.4,41.45);walk(-84.4,51.24,wingFloor);
walk(-84.4,52.30);walk(-80.4,52.30);walk(-80.4,35.6,wingFloor);
assert.equal(interiorCeiling(player,w.doors),wingGallery-.22,'lower gallery has its own ceiling');
walk(-80.4,46.5);walk(-70,46.5,wingFloor);
assert.equal(roomAtFeet(player,w.doors).label,'Lantern Club Casino');
walk(-80.4,46.5);walk(-80.4,63,wingFloor);walk(-69,63,.70);
assert(!roomAtFeet(player,w.doors));
assert.equal(groundHeight(-88,44,2.3,w.doors),wingFloor,'former vehicle ramp is now level gaming space');
assert.equal(groundHeight(-88,44,Infinity,w.doors),wingRoof);
assert(blocked(-90.62,wingFloor,40,w.hp,w.doors),'west glazing has collision');
assert(blocked(-85.75,wingFloor,35.2,w.hp,w.doors),'floor furnishings are solid');
const pickup=w.rover;
Object.assign(pickup,{x:-72.8,z:61,y:.70,yaw:-Math.PI/2});
assert(roadContact(w,-74,61,pickup.yaw,pickup.x,pickup.z,pickup),'street vehicles stop before the waterfront gaming floor');
console.log('PASS both public entrances, linked casino lobby, separate gallery and lower gaming routes, stair ascent/descent, vehicle boundary, camera headroom and room audio.');
