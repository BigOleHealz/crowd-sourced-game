import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {bridges}=await import('../public/brickell-map.js');
const {newExpedition}=await import('../public/expedition.js');
const {driveRover}=await import('../public/rover.js');
const {updateRoadPose}=await import('../public/bridge-driving.js');
const {driverPrediction}=await import('../public/driver-prediction.js');
const {groundHeight}=await import('../public/world.js');
for(const b of bridges){
  const mid=(b.north+b.south)/2;
  for(const z of [mid-16,mid,mid+16]){
    const grade=Math.abs(b.height(z+.5,'road')-2*b.height(z,'road')+b.height(z-.5,'road'));
    assert(grade<.025,'smooth crest and hinge transition');
  }
  const w=newExpedition(),v=w.supercar,cmd={throttle:1},dt=1/30;
  Object.assign(v,{x:2.2,z:b.south+.45,y:.70,yaw:0,speed:30,driver:2});
  let furthestPitch=0;
  for(let tick=0;tick<160 && v.z>b.north-.5;tick++){
    const replay=driverPrediction(w,2);
    assert(replay,JSON.stringify({tick,car:v}));
    replay.step(cmd,dt);
    driveRover(w,cmd,dt,null,'supercar');updateRoadPose(w,v,dt);
    const pose=replay.pose(1);
    assert(Math.abs(pose.y-v.y)<.001,'driver view at actual elevation');
    assert(Math.abs(pose.suspension.pitch-v.suspension.pitch)<.03,'driver banks with road');
    furthestPitch=Math.max(furthestPitch,Math.abs(pose.suspension.pitch));
    assert(!v.bridgeFlight && !v.landingSound,'a continuous descent is not a series of landings');
    assert(Math.abs(v.y-groundHeight(v.x,v.z,Infinity,w.doors))<.01);
  }
  assert(v.z<b.north && v.hp===v.maxHp && furthestPitch>.10);
}
console.log('PASS both closed decks, both hinges and crest, local driver interpolation and continuous full-speed descent.');
