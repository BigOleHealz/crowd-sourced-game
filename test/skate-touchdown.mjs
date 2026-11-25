import assert from 'node:assert/strict';
import {Scene} from 'three';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {stepPlayer,groundHeight}=await import('../public/world.js');
const {parkRides,parkRails}=await import('../public/skate-park.js');
const {takeRide}=await import('../public/street-rides.js');
const {wheelContactPose,recordWheelContact,wheelContactSounds,wheelLandingBuffer}=await import('../public/skate-touchdown.js');
const {createRangerRig}=await import('../public/ranger-pose.js');
const {riderPose,streetRideView}=await import('../public/street-ride-view.js');
const dt=1/30;
for(const kind of ['board','bike']){
  const world={rides:parkRides(groundHeight)},item=world.rides.find(r=>r.kind===kind),p={id:1,state:{grounded:true}};
  takeRide(item,p);
  const avatar=createRangerRig(),hits=[];
  let maxBend=0,restKnee,impactPitch,settledPitch,prev;
  for(let tick=1;tick<72;tick++){
    p.state=stepPlayer(p.state,{jump:tick===4},dt,{},world);
    const pose=wheelContactPose(p.state);riderPose(avatar,p.state);
    if(tick===2)restKnee=avatar.limbs[0].knee.rotation.x;
    const land=p.state.ride.landing;
    if(land){
      if(land.age===0)impactPitch=pose.pitch;
      maxBend=Math.max(maxBend,restKnee-avatar.limbs[0].knee.rotation.x);
    }
    recordWheelContact(item,p.state,tick);
    const current=JSON.parse(JSON.stringify(world.rides));
    wheelContactSounds(prev,current,tick,(_,event)=>hits.push(event.tick));
    wheelContactSounds(current,current,tick,()=>assert.fail('duplicate sound'));
    prev=current;settledPitch=pose.pitch;
  }
  assert.equal(hits.length,1);assert(impactPitch>settledPitch+.08);assert(maxBend>.3);
  const floor=groundHeight(p.state.x,p.state.z),pose=wheelContactPose(p.state);
  assert(Math.abs(pose.y-floor)<.02,'wheels come to rest on the surface');
}

{
  const world={rides:parkRides(groundHeight)},item=world.rides[0],player={id:2,state:{grounded:true}};
  takeRide(item,player);player.state.ride.speed=3;
  const scene=new Scene(),show=streetRideView(scene),avatar=createRangerRig();
  for(let i=0;i<17;i++){
    player.state=stepPlayer(player.state,{jump:i===0,steer:i>=5?1:0},dt,{},world);
    const remote={...player.state,id:player.id};
    show([item],{id:1},[remote],dt);riderPose(avatar,remote);
    assert(Math.abs(scene.children[0].rotation.y+remote.ride.yaw)<.001);
    assert(Math.abs(avatar.root.rotation.y+remote.ride.yaw-1.30)<.001);
  }
  assert(player.state.grounded && player.state.ride.reverse);
  const pose=wheelContactPose(player.state);
  const forward=wheelContactPose({...player.state,ride:{...player.state.ride,reverse:false}});
  assert(pose.pitch<forward.pitch-.16 && pose.y===forward.y);
}
// Enter a second, elevated rail by popping an ollie on the flat of the funbox.
let caught=false;
for(const popZ of [-168.8,-169.4,-169.9,-170.4,-171]){
  const world={rides:parkRides(groundHeight)},board=world.rides[0],p={id:1,state:{grounded:true}};
  Object.assign(board,{x:parkRails[1].x,z:-160,y:groundHeight(parkRails[1].x,-160)});
  takeRide(board,p);let popped=false;
  for(let i=0;i<150;i++){
    const jump=!popped && p.state.z<popZ;
    popped ||= jump;p.state=stepPlayer(p.state,{throttle:1,jump},dt,{},world);
    if(p.state.ride.grind==='box-rail'){caught=true;break;}
  }
}
assert(caught);
const ctx={sampleRate:24000,createBuffer(_,n){const a=new Float32Array(n);return {getChannelData:()=>a};}};
assert.notDeepEqual(wheelLandingBuffer(ctx,true).getChannelData(0),wheelLandingBuffer(ctx,false).getChannelData(0));
console.log('Bicycle and board flex knees, set down wheels and play one distinct sound per touchdown. The funbox rail is reachable with an ollie.');
