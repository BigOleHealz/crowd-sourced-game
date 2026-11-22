import assert from 'node:assert/strict';
import {barMenu,beachClubAction,clubDeck,loungeSeats,pourTicks,glassTicks,updateBeachVisit,useBeachClub} from '../public/beach-club.js';
import {beachClubCast} from '../public/beach-club-cast.js';
import {beachClubLoop} from '../public/beach-club-music.js';

process.env.PINEWATCH_MAP='brickell';
const {groundHeight,buildingTopAt,stepPlayer}=await import('../public/world.js');
const {landmarkGuide}=await import('../public/landmark-navigation.js');
assert(landmarkGuide('Harbor Key Beach Club'));
function guest(id,x,z){
  return {id,state:{x,z,y:groundHeight(x,z),grounded:true,vy:0},life:{hp:100}};
}
const a=guest(1,44.3,barMenu[0].z),b=guest(2,44.3,barMenu[1].z),players=new Map([[1,a],[2,b]]);
assert.equal(a.state.y,clubDeck.y);
assert(buildingTopAt(43.35,-204.55,.1,2.5)>1.9);
assert.equal(beachClubAction({...a.state,grounded:false}),null);
useBeachClub(a,'punch',0,players);assert.equal(a.beachOrder,undefined);
useBeachClub(a,'lime',0,players);useBeachClub(b,'punch',1,players);
assert.deepEqual(a.beachOrder,{drink:'lime',tick:0});assert.equal(b.beachOrder.tick,pourTicks);
assert(beachClubCast(a.state,[a,b],5).some(p=>p.name==='Marisol' && p.pouring));
updateBeachVisit(a,null,glassTicks);assert.equal(a.beachOrder,undefined);
assert.equal(beachClubCast({x:0,z:0},[],2).length,0);
const dancers=beachClubCast(a.state,[],0).filter(p=>p.beachRole==='dance');
assert(dancers.length>=4 && dancers.every(p=>beachClubAction(p)==='dance'));
a.state=guest(1,50,-204.5).state;
useBeachClub(a,'dance',201,players);assert.equal(a.beachPose,'dance');
updateBeachVisit(a,{x:1},202);assert.equal(a.beachPose,undefined);
for(const player of [a,b])player.state=guest(player.id,loungeSeats[0].x+.88,loungeSeats[0].z).state;
useBeachClub(a,'seat0',300,players);useBeachClub(b,'seat0',300,players);
assert.equal(a.beachPose,'seat0');assert.equal(b.beachPose,undefined);
useBeachClub(a,'seat0',301,players);useBeachClub(b,'seat0',302,players);assert.equal(b.beachPose,'seat0');
// Walk the public approach onto the dance deck and along the open shoreline.
for(const [x,z,target] of [[38,-201.92,52],[57,-204,59]]){
  let feet=guest(1,x,z).state;
  for(let i=0;i<120 && feet.x<target;i++)feet=stepPlayer(feet,{x:1,z:0,yaw:0},1/30,{},{});
  assert(feet.x>=target,'walk blocked at '+feet.x);
}
const music=beachClubLoop({createBuffer:(_,n)=>({samples:new Float32Array(n),getChannelData(){return this.samples;}})});
assert(music.samples.every(Number.isFinite) && music.samples.some(v=>v>.2));
console.log('PASS Harbor Key approach, shoreline, club fixtures, two queued drinks, party, seating, movement exit and music');
