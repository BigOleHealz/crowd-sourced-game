import assert from 'node:assert/strict';

process.env.PINEWATCH_MAP='brickell';
const {stepPlayer,buildingTopAt}=await import('../public/world.js');
const {casinoSeat,casinoName,nearBlackjack}=await import('../public/casino-layout.js');
const {landmarkGuide}=await import('../public/landmark-navigation.js');
const {roomAtFeet,interiorCeiling}=await import('../public/building-interiors.js');
const {acousticSpace}=await import('../public/acoustic-space.js');
const world={doors:{}};
function walkTo(player,x,z){
  for(let i=0;i<300;i++){
    const dx=x-player.x,dz=z-player.z,d=Math.hypot(dx,dz);
    if(d<.15)return player;
    player=stepPlayer(player,{x:dx/d,z:dz/d},1/30,{},world);
  }
  assert.fail('Could not reach '+[x,z]+' from '+[player.x,player.z]);
}
const {grandStoryY}=await import('../public/grand-resort-layout.js');
let p={x:-55,y:.70,z:61,vx:0,vy:0,vz:0,grounded:true};
const guide=landmarkGuide(casinoName);
assert.deepEqual(guide(0,15,0).goal,[-55,55.8]);
p=walkTo(p,-55,50);
assert.equal(roomAtFeet(p,world.doors).label,casinoName);
assert.equal(interiorCeiling(p,world.doors),grandStoryY(5));
assert.equal(acousticSpace(p,world).id,'casino');
p=walkTo(p,casinoSeat.x,casinoSeat.z+.65);
assert(nearBlackjack(p));
p=walkTo(p,casinoSeat.x,46);
p=walkTo(p,-45,46);
assert.equal(roomAtFeet(p,world.doors),undefined);
assert(!nearBlackjack({grounded:true,x:33.5,y:1.07,z:-393.15}));
for(const [x,z] of [[-72,43],[-46,50],[-60,55],[-58,39]]){
  assert(buildingTopAt(x,z,.15,2.4,{})>5,'Physical wall at '+[x,z]);
}
// The north hotel's south lobby shares a passage with the main hall.
let hotel={x:-61,y:.824,z:36.5,vx:0,vy:0,vz:0,grounded:true};
hotel=walkTo(hotel,-61,40.2);
assert.equal(roomAtFeet(hotel,world.doors).label,casinoName);
console.log('Southwest landmark, south and east entrances, indoor camera, table approach and outer walls passed.');
