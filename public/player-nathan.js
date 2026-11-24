import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';

let template, pending;
const names = [
  ['hip_02', 'body'], ['spine_01_03', 'spine'], ['head_07', 'head'],
  ['upperleg_l_', 'leftLeg'], ['lowerleg_l_', 'leftKnee'], ['foot_l_', 'leftAnkle'],
  ['upperleg_r_', 'rightLeg'], ['lowerleg_r_', 'rightKnee'], ['foot_r_', 'rightAnkle'],
  ['upperarm_l_', 'leftArm'], ['lowerarm_l_', 'leftForearm'],
  ['upperarm_r_', 'rightArm'], ['lowerarm_r_', 'rightForearm'],
];
const children = {
  upperleg_l_:'lowerleg_l_', lowerleg_l_:'foot_l_',
  upperleg_r_:'lowerleg_r_', lowerleg_r_:'foot_r_',
  upperarm_l_:'lowerarm_l_', lowerarm_l_:'hand_l_',
  upperarm_r_:'lowerarm_r_', lowerarm_r_:'hand_r_',
};

export function preloadNathan() {
  if (new URLSearchParams(location.search).get('avatar') === 'classic' || pending) return;
  pending = new GLTFLoader().loadAsync('./nathan-animated-003.glb').then(({scene}) => {
    if (!scene.getObjectByProperty('isSkinnedMesh', true)) throw new Error('Missing Nathan skin');
    template = scene;
    scene.traverse(node => { if (node.isSkinnedMesh) node.geometry.userData.sharedFieldKit = true; });
  }).catch(error => console.warn('Nathan unavailable; showing field kit.', error));
}

export function useNathan(state) {
  const override = new URLSearchParams(location.search).get('avatar');
  return !!template && (!override || override === 'nathan') && (override === 'nathan' || state.character === 'nathan') && !Object.keys(state.lostParts ?? {}).length;
}

export function fitNathan(rig) {
  const model = cloneSkeleton(template);
  model.scale.setScalar(.01); // Source FBX skeleton and geometry use centimeters.
  model.rotation.y = Math.PI; // The source faces +Z; game characters face -Z.
  rig.body.add(model);
  rig.root.updateMatrixWorld(true);
  const [left, right] = rig.limbs;
  const joints = {
    body:rig.body, spine:rig.spine, head:rig.head,
    leftLeg:left.leg, leftKnee:left.knee, leftAnkle:left.ankle,
    rightLeg:right.leg, rightKnee:right.knee, rightAnkle:right.ankle,
    leftArm:left.arm, leftForearm:left.forearm,
    rightArm:right.arm, rightForearm:right.forearm,
  };
  const rootInverse = rig.root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const findBone = suffix => {
    let bone;
    model.traverse(node => {if(node.isBone && node.name.includes(suffix))bone = node;});
    return bone;
  };
  const mappings = names.map(([suffix, key]) => {
    const bone = findBone(suffix);
    if (!bone) throw new Error('Missing Nathan bone: ' + suffix);
    const next = children[suffix] && findBone(children[suffix]);
    const nextJoint = key.endsWith('Arm') ? joints[key.replace('Arm','Forearm')] :
      key.endsWith('Leg') ? joints[key.replace('Leg','Knee')] :
      key.endsWith('Knee') ? joints[key.replace('Knee','Ankle')] : null;
    const correction = new THREE.Quaternion();
    if (next) {
      const from = next.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
      const to = nextJoint ? nextJoint.getWorldPosition(new THREE.Vector3()).sub(joints[key].getWorldPosition(new THREE.Vector3())).normalize() : new THREE.Vector3(0,-1,0);
      correction.setFromUnitVectors(from,to);
    }
    return {
      bone, joint:joints[key],
      sourceRest:rootInverse.clone().multiply(bone.getWorldQuaternion(new THREE.Quaternion())),
      rigRest:rootInverse.clone().multiply(joints[key].getWorldQuaternion(new THREE.Quaternion())).invert(),
      correction,
    };
  });
  model.traverse(node => {if(node.isSkinnedMesh) {
    node.frustumCulled = false;
    node.castShadow = false;
  }});
  rig.nathan = {model,mappings};
  rig.scanned = 'nathan';
}

const current = new THREE.Quaternion(), target = new THREE.Quaternion(), parent = new THREE.Quaternion();
export function poseNathan(rig) {
  if (!rig.nathan) return;
  rig.root.updateMatrixWorld(true);
  for (const {bone,joint,sourceRest,rigRest,correction} of rig.nathan.mappings) {
    joint.getWorldQuaternion(current);
    target.copy(current).multiply(rigRest).multiply(correction).multiply(sourceRest);
    bone.parent.getWorldQuaternion(parent);
    bone.quaternion.copy(parent.invert().multiply(target));
    bone.updateWorldMatrix(false,false);
  }
}
