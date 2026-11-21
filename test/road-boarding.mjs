import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createRangerRig,poseRig,poseRoadBoarding} from '../public/ranger-pose.js';
import {roadHandle,roadWheelGrip,beginRoadBoarding,stepRoadBoarding} from '../public/road-cabin.js';
const palm=(rig,i)=>rig.limbs[i].forearm.localToWorld(new Vector3(0,-.265,0));
const distance=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);
for(const spec of [{},{kind:'supercar'},...['hatchback','sedan','van'].map(model=>({model,id:model,npcDriver:null}))]){
  const car={...spec,x:5,y:.74,z:-11,yaw:.84,driver:1,suspension:{pitch:.035,roll:-.02,heave:.012}};
  const rig=createRangerRig(),feet={id:1,x:4,y:.74,z:-10,yaw:0,grounded:true,weapon:1};
  beginRoadBoarding(car,feet);stepRoadBoarding(car,.78*.32);
  poseRig(rig,feet,1/60,car);poseRoadBoarding(rig,car,car.boarding);
  const err=distance(palm(rig,1),roadHandle(car,.32));
  assert(err<.018,(car.kind??car.model??'pickup')+' handle '+err);
  poseRig(rig,feet,1/60,car);
  for(let i=0;i<2;i++){
    const error=distance(palm(rig,i),roadWheelGrip(car,2*i-1));
    assert(error<.018,(car.kind??car.model??'pickup')+' wheel '+error);
  }
  stepRoadBoarding(car,.78);assert(!car.boarding);
  beginRoadBoarding(car,feet);car.driver=null;stepRoadBoarding(car,1/30);assert(!car.boarding);
}
console.log('PASS right palm follows actual door handle, both palms reach tilted wheel rim on five cabin types and entries expire or cancel.');
