import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {groundHeight,stepPlayer}=await import('../public/world.js');
const {parkRides,parkRails,skateParkFloor,skatePark:park}=await import('../public/skate-park.js');
const {landmarkGuide}=await import('../public/landmark-navigation.js');
const {takeRide,parkRide}=await import('../public/street-rides.js');
const {beachBarriers,courts}=await import('../public/beach-layout.js');
assert(landmarkGuide(park.name));
for(const b of beachBarriers)assert(b.x+b.w/2<park.west || b.x-b.w/2>park.east || b.z+b.d/2<park.north || b.z-b.d/2>park.south);
for(const c of courts)assert(c.z+8<park.north);
assert.equal(skateParkFloor(68,-166),undefined);
function lap(kind,flatBar=true,jumpOff=false,stepping=false){
  const world={rides:parkRides(groundHeight)},item=world.rides.find(i=>i.kind===kind);
  if(!flatBar)item.x=41.38;else item.x=45.05;
  const player={id:7,state:{...item,grounded:true}};
  takeRide(item,player);let grind,exit,crest=0;
  for(let tick=0;tick<165;tick++){
    const pre=player.state;
    player.state=stepPlayer(pre,{throttle:1,jump:jumpOff && !!grind && pre.z< -168 && !exit},1/30,{},world);
    const {ride,x,y,z}=player.state;crest=Math.max(crest,y);
    if(ride.grind && !grind){
      assert.equal(ride.grind,'flat-bar');grind={tick,z};assert(Math.abs(x-parkRails[0].x)<.001);
    }
    if(pre.ride.grind && !ride.grind && !exit){
      exit={tick,z,speed:ride.speed};assert(ride.speed>=pre.ride.speed-.1 && player.state.vz< -3);
      if(jumpOff)assert(player.state.vy>0);else assert(z<parkRails[0].north);
    }
    if(stepping && z<-170 && player.state.grounded){
      parkRide(world,player);assert(!player.state.ride && item.rider==null);return;
    }
    if(z<-177.5)break;
  }
  if(flatBar){assert(grind && exit);assert(player.state.z<exit.z-2);}
  else assert(crest>park.y+.67,'The funbox carries wheels to its crest');
  return {kind,grind,exit};
}
for(const kind of ['board','bike']){
  console.log(lap(kind));lap(kind,false);lap(kind,true,true);lap(kind,false,false,true);
}
