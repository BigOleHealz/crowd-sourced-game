import assert from 'node:assert/strict';
import {sharkDefeatPose,poseBittenSwimmer} from '../public/shark-defeat.js';
import {createRangerRig} from '../public/ranger-pose.js';
const event={id:2,playerId:1,x:4,y:-.86,z:10,yaw:Math.PI/2,tick:30};
const rig=createRangerRig();
rig.shadow={visible:false,position:{set(){}},scale:{set(){}},rotation:{},material:{}};
rig.label={sprite:{visible:true},update(){}};
let previous=sharkDefeatPose(event,0);
for(let i=0;i<90;i++){
 const age=i/30,p=sharkDefeatPose(event,age);
 poseBittenSwimmer(rig,event,age);
 const pelvis=rig.limbs[0].leg.position.clone().lerp(rig.limbs[1].leg.position,.5);
 rig.body.localToWorld(pelvis);
 assert(Math.hypot(pelvis.x-p.x,pelvis.z-p.z,pelvis.y-p.y-.78)<.002);
 assert(Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<.14);
 assert(rig.tools.every(t=>!t.visible));
 previous=p;
}
assert(previous.x>event.x+2.8 && previous.y<event.y-.85);
console.log('Swimmer turns around the contact point and travels continuously through the drag and submersion.');
