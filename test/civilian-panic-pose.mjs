import assert from 'node:assert/strict';
import {createRangerRig,poseRig} from '../public/ranger-pose.js';
import {gunfireAlarm,poseBystanderCover} from '../public/bystander-cover.js';

const person={x:1,y:1,z:1,grounded:true,hp:100,yaw:0};
const event={x:0,y:1,z:0,tick:100,radius:16};
assert.equal(gunfireAlarm([event],person,100),1);
assert.equal(gunfireAlarm([event],{...person,y:10},110),0);
assert.equal(gunfireAlarm([event],{...person,x:20},110),0);
assert(gunfireAlarm([event],person,188)<1);
assert.equal(gunfireAlarm([event],person,210),0);

function rig(){
  return Object.assign(createRangerRig(),{civilian:{face:3,swing:1,width:1,height:1},cycle:0,tools:[]});
}
const civil=rig();
for(let i=0;i<25;i++)poseRig(civil,{...person,z:1-i*.061,moving:true,sprint:true,reaction:'gunfire'},1/60);
assert(civil.spine.rotation.x<-.19);
assert(civil.limbs[0].forearm.rotation.x>1.35,'One forearm shields the fleeing civilian');
const dealer=rig();poseRig(dealer,person,1/30);
const anchor=dealer.root.position.toArray();
poseBystanderCover(dealer,person,1,.3,5);
assert.deepEqual(dealer.root.position.toArray(),anchor);
assert(dealer.body.position.y<-.27 && dealer.spine.rotation.x<-.5);
const athlete=rig();poseRig(athlete,person,1/30);
const height=athlete.body.position.y,knee=athlete.limbs[0].knee.rotation.x;
poseBystanderCover(athlete,person,1,.3,5,true);
assert.equal(athlete.body.position.y,height);
assert.equal(athlete.limbs[0].knee.rotation.x,knee);
assert(athlete.head.rotation.x<-.25);
console.log('Near gunfire changes civilian run posture and stationary cover, respects court placement, and expires.');
