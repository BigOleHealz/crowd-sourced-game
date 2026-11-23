import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { civilianLooks } from '../public/civilian-style.js';
import { createRangerRig, poseRig } from '../public/ranger-pose.js';
import { dressPerson } from '../public/civilian-view.js';
import { infectedWardrobe, poseInfected } from '../public/zombie-view.js';

const looks = ['rival-maia', 'rival-omar', 'rival-ines', 'rival-diego'];
for (const [index, look] of looks.entries()) {
  const avatar = createRangerRig();
  // The shirt is a separate textured mesh from the batched limbs.
  class EmptyBatch { add(){} beam(){} mesh(){} }
  const profile = infectedWardrobe(civilianLooks[look],index);
  dressPerson(avatar,profile,EmptyBatch,undefined,{});
  const shirt = avatar.upper.children.find(child=>child.isMesh);
  assert.equal(shirt.geometry.attributes.color.count,shirt.geometry.attributes.position.count);
  assert.ok(shirt.geometry.attributes.color.array.every(shade=>shade>0 && shade<=1));
  const state = { x: 0, y: 0, z: 0, yaw: 0, hp: 100, infected: index + 1, holstered: true };
  for (let frame = 0; frame < 90; frame++) {
    state.moving = frame >= 20;
    if (state.moving) {
      state.z -= .055;
      state.yaw += .012;
    }
    poseRig(avatar, state, 1 / 60);
    poseInfected(avatar, state, frame / 60);
    const shirtHem = avatar.upper.localToWorld(new Vector3(0, 1.01, 0));
    const belt = avatar.body.localToWorld(new Vector3(0, 1.01, 0));
    assert.ok(shirtHem.distanceTo(belt) < 1e-6, look + ' shirt detached at frame ' + frame);
  }
}
console.log('All four infected shirts stay attached at the waist while standing, walking, and turning.');

const crawler=createRangerRig();
const prone={id:'infected-1',infected:1,x:0,y:0,z:0,yaw:0,moving:true,grounded:true,stance:'prone',holstered:true};
const fall={...prone,fall:{cause:'lostLeg',age:.5,speed:0,yaw:0,settled:true,recovery:1}};
poseRig(crawler,fall,1/30);
poseInfected(crawler,fall,0);
const fallenAngle=crawler.body.rotation.x;
poseRig(crawler,prone,1/30);
poseInfected(crawler,prone,0);
assert.ok(fallenAngle < -1 && Math.abs(fallenAngle-crawler.body.rotation.x)<.01,'settles into crawl without standing');
const reach=crawler.limbs.map(l=>l.arm.rotation.x);
poseInfected(crawler,prone,Math.PI/5);
assert.ok((reach[0]-crawler.limbs[0].arm.rotation.x)*(reach[1]-crawler.limbs[1].arm.rotation.x)<0,'alternating arm pulls');
