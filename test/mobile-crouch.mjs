import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createRangerRig,poseRig} from '../public/ranger-pose.js';

for(const hz of [30,60,144]){
  const rig=createRangerRig(),state={x:0,y:12,z:0,yaw:0,grounded:true,weapon:1};
  rig.upper.add(...rig.tools);
  function frame(){
    poseRig(rig,state,1/hz);
    rig.root.updateMatrixWorld(true);
  }
  for(let i=0;i<hz;i++)frame();
  const stood=rig.body.position.y;
  state.stance='crouch';frame();
  assert(rig.body.position.y<stood && rig.body.position.y>-.27,'Enter the crouch progressively');
  for(let i=0;i<hz;i++)frame();
  assert(rig.body.position.z>.15 && rig.spine.rotation.x<-.33,'The hips load behind the inclined chest');
  const eye=rig.head.localToWorld(new Vector3(0,.15,0));
  assert(Math.abs(eye.y-state.y-1.20)<.045 && Math.abs(eye.z-state.z)<.09,'Eyes stay inside the crouched head volume');
  const [lead,trail]=rig.limbs;
  assert(trail.foot.forwardOffset-lead.foot.forwardOffset>.35,'The soles form a long stagger');
  assert(Math.abs(lead.knee.rotation.x-trail.knee.rotation.x)>.36,'The two knees bear different loads');
  for(const weapon of [1,2,3,4]){
    state.weapon=weapon;frame();const sidearm=weapon===2;
    for(const {side,forearm} of rig.limbs){
      const hand=forearm.localToWorld(new Vector3(0,-.265,0));
      const grip=rig.tools[weapon-1].localToWorld(new Vector3(side===1?.027:sidearm?-.028:-.036,
        side===1?-.048:sidearm?-.049:.038,side===1?.037:sidearm?.031:-.21));
      assert(hand.distanceTo(grip)<.009,'The palm stays in contact with its grip');
    }
  }
  for(const [vx,vz] of [[0,-2.25],[2.25,0]]){
    const old=[null,null],touched=[0,0];
    let high=-Infinity,low=Infinity,lastPhase=0,cycles=0;
    for(let i=0;i<hz*2;i++){
      state.x+=vx/hz;state.z+=vz/hz;frame();
      if(i<hz/3)continue;
      low=Math.min(low,rig.body.position.y);high=Math.max(high,rig.body.position.y);
      if(rig.gait.phase<lastPhase)cycles++;lastPhase=rig.gait.phase;
      for(const [leg,{foot}] of rig.limbs.entries()){
        if(foot.planted && old[leg])assert(Math.hypot(foot.wx-old[leg].x,foot.wz-old[leg].z)<.002,'Support boot stays over one spot');
        if(foot.planted && !old[leg])touched[leg]++;
        old[leg]=foot.planted?{x:foot.wx,z:foot.wz}:null;
      }
    }
    assert(cycles>=2 && touched.every(n=>n>=2),'Alternate short steps in either direction');
    assert(high<-.43 && high-low<.025,'Walking does not lift the body out of its crouch');
  }
  state.stance='prone';frame();assert(rig.body.rotation.x<-1);
  state.stance='crouch';frame();assert(rig.body.position.y<-.42,'Rise directly into the crouch from prone');
  state.stance=undefined;
  for(let i=0;i<hz;i++)frame();
  assert.equal(rig.gait.crouch,0);assert.equal(rig.body.position.z,0);assert(rig.body.position.y>-.073);
}
console.log('PASS crouch transitions, staggered loading, eye and grip alignment, low forward and lateral steps at 30/60/144 Hz');
