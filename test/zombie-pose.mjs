import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { civilianLooks } from '../public/civilian-style.js';
import { createRangerRig, poseRig } from '../public/ranger-pose.js';
import { poseInfected } from '../public/zombie-view.js';

const looks = ['rival-maia', 'rival-omar', 'rival-ines', 'rival-diego'];
for (const [index, look] of looks.entries()) {
  const avatar = createRangerRig();
  avatar.civilian = civilianLooks[look];
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
