import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {stepPlayer,groundHeight}=await import('../public/world.js');
const {parkRides,parkRails}=await import('../public/skate-park.js');
const {takeRide}=await import('../public/street-rides.js');
const {wheelContactPose,recordWheelContact,wheelContactSounds,wheelLandingBuffer}=await import('../public/skate-touchdown.js');
const {createRangerRig}=await import('../public/ranger-pose.js');
const {riderPose}=await import('../public/street-ride-view.js');
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
