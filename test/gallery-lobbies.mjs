import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {stepPlayer,groundHeight,buildingTopAt}=await import('../public/world.js');
const {galleryPlans,galleryLobbies,galleryPanes,galleryFloor,galleryRoomAt,galleryVehicleRects}=await import('../public/gallery-lobbies.js');
assert.equal(galleryPlans.length,18);assert.equal(galleryLobbies.length,30);assert.equal(galleryPanes.length,72);
assert.equal(new Set(galleryPanes.map(p=>p.id)).size,72);
const {stepHotelDoors}=await import('../public/maravela-hotel.js');
let entrances=0,windows=0;
function walk(x,z,heading,distance,doors={}) {
  let p={x,y:groundHeight(x,z),z,grounded:true,vy:0};
  for(let j=0;j<Math.ceil(distance/4.6*30)+4;j++){stepHotelDoors(doors,[p],1/30);p=stepPlayer(p,{x:0,z:heading},1/30,{}, {doors});}
  return p;
}
for(const plan of galleryPlans){
  for(const front of plan.ends){
    const {side,x,z}=front,start=z+side*1.05;
    const inside=walk(x,start,-side,3.3);
    assert(galleryRoomAt(inside.x,inside.y,inside.z));
    assert.equal(inside.y,galleryFloor);
    const back=walk(x,inside.z,side,4.5);
    assert(side*(back.z-z)>.5 && !galleryRoomAt(x,back.y,back.z));
    assert.equal(buildingTopAt(x,z,0,galleryFloor+1.72,plan.hotel?{hotel:{city:1,quay:1}}:{}),-Infinity);
    assert(buildingTopAt(x,z,0,6.5)>6.5);
    assert(buildingTopAt(front.sofa.x,front.sofa.z,0,galleryFloor+1.72)>=front.sofa.bottom+front.sofa.h-.01);
    if(plan.rooms[0].shared) {
      const traverse=walk(x,start,-side,plan.b.d+3.4);
      assert(-side*(traverse.z-z)>plan.b.d+.2);
    }
    for(const pane of plan.panes.filter(p=>p.side===side)){
      const p=walk(pane.x,start,-side,2.55);
      assert(side*(p.z-z)>-.15,'fixed glass must stop the player');
      const doors={brokenPanes:{[pane.id]:true}};
      assert.equal(buildingTopAt(pane.x,pane.z,0,galleryFloor+1.7,doors),-Infinity);
      assert(!galleryVehicleRects(plan.b,doors).some(r=>r.id===pane.id));
      windows++;
    }
    entrances++;
  }
}
console.log('PASS',entrances,'gallery doors,',windows,'display panes, deep rooms, shared through-lobbies, furnishing collision and upper floors.');
