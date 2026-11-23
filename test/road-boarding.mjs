import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createRangerRig,poseRig,poseRoadBoarding} from '../public/ranger-pose.js';
import {bootSole} from '../public/ranger-surfaces.js';
import {mountPosition} from '../public/mounts.js';
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

// Check the actual boot sole against the inclined chassis floor, including the
// final boarding frame. Raising the entire actor would also move the wheel grips.
const floors=[
  [{},.65],[{kind:'supercar'},.235],
  ...Object.entries({sedan:.397,hatchback:.397,van:.452,engine:.58,falco:.38,veloce:.38})
    .map(([model,height])=>[{model,id:model,npcDriver:null},height]),
];
for(const [spec,floorY] of floors){
  const car={...spec,x:5,y:1.2,z:6,yaw:.74,driver:1,suspension:{pitch:.09,roll:-.06,heave:.037}};
  const rig=createRangerRig(),driver={id:1,x:3,y:1.2,z:6,yaw:0,grounded:true};
  const origin=new Vector3().copy(mountPosition(car,[0,floorY,0]));
  const up=new Vector3().copy(mountPosition(car,[0,floorY+1,0])).sub(origin);
  const relative=new Vector3(),vertex=new Vector3(),bootScale=new Vector3(.83,1,.90),positions=bootSole.attributes.position;
  function checkFeet(){
    return rig.limbs.map(({ankle,knee})=>{
      let clearance=Infinity;
      for(let i=0;i<positions.count;i++){
        vertex.fromBufferAttribute(positions,i).multiply(bootScale);
        clearance=Math.min(clearance,relative.copy(ankle.localToWorld(vertex)).sub(origin).dot(up));
      }
      assert(clearance>=0 && clearance<.035,`${spec.model??spec.kind??'pickup'} boot floor clearance ${clearance}`);
      const heel=ankle.getWorldPosition(new Vector3()),bend=knee.getWorldPosition(new Vector3());
      assert(bend.sub(heel).dot(up)>.06,'knee bends above the ankle');
      return heel;
    });
  }
  poseRig(rig,driver,1/60,car);
  const driving=checkFeet();
  poseRoadBoarding(rig,car,{startX:driver.x,startY:driver.y,startZ:driver.z,progress:1});
  checkFeet().forEach((heel,i)=>assert(heel.distanceTo(driving[i])<.00001,'boarding finishes in the driving pose'));
}
console.log('PASS boot soles stay inside all eight road footwells during boarding completion and driving on a pitched, rolled chassis.');
