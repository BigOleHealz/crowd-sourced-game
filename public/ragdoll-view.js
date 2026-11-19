import * as THREE from 'three';
import {J,pointSet,readJoints} from './ragdoll.js';
import {groundHeight} from './world.js';

const axisX=new THREE.Vector3(),axisY=new THREE.Vector3(),axisZ=new THREE.Vector3();
const target=new THREE.Vector3(),origin=new THREE.Vector3(),local=new THREE.Vector3();
const basis=new THREE.Matrix4(),q=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
const down=new THREE.Vector3(0,-1,0),toeAxis=new THREE.Vector3(0,-.078,-.145).normalize();
function rotation(node,worldQ){
  node.parent.getWorldQuaternion(parentQ).invert();
  node.quaternion.copy(parentQ.multiply(worldQ));node.updateWorldMatrix(false,false);
}
function position(node,p){
  node.position.copy(node.parent.worldToLocal(local.copy(p)));node.updateWorldMatrix(false,false);
}
function orient(node,right,up){
  axisY.copy(up).normalize();axisZ.crossVectors(right,axisY).normalize();axisX.crossVectors(axisY,axisZ);
  rotation(node,q.setFromRotationMatrix(basis.makeBasis(axisX,axisY,axisZ)));
}
function pointBone(node,from,to,normal=down){
  position(node,from);
  node.parent.getWorldQuaternion(parentQ).invert();
  target.subVectors(to,from).normalize().applyQuaternion(parentQ);
  node.quaternion.setFromUnitVectors(normal,target);node.updateWorldMatrix(false,false);
}
export function releaseRagdoll(a){
  if(!a.released)return;
  for(const [node,pos,quat] of a.released.saved){node.position.copy(pos);node.quaternion.copy(quat);}
  a.released=null;a.gait=null;
}
export function poseRagdoll(a,s,dt){
  const f=s.fall;
  if(a.released?.started!==f.started){
    releaseRagdoll(a);
    const joints=[a.body,a.spine,a.head,...a.limbs.flatMap(l=>[l.leg,l.knee,l.ankle,l.arm,l.forearm])];
    const live=pointSet();readJoints(a,live);
    a.released={started:f.started,saved:joints.map(n=>[n,n.position.clone(),n.quaternion.clone()]),
      live,points:pointSet(),handoff:a.initialized && f.age<.22 ? 0 : 1};
  }
  const r=a.released;
  r.handoff=Math.min(1,r.handoff+dt/.115);
  for(let i=0;i<r.points.length;i++){
    const p=r.points[i];p.fromArray(f.joints,3*i).multiplyScalar(.001);
    if(r.handoff<1)p.lerp(r.live[i],1-r.handoff);
  }
  const p=r.points;
  const hips=origin.addVectors(p[J.hipL],p[J.hipR]).multiplyScalar(.5);
  // Keep the crew label with the resting body as the physics separates it from the gameplay anchor.
  a.root.position.set(hips.x,Math.max(groundHeight(hips.x,hips.z),hips.y-.975),hips.z);
  a.root.rotation.set(0,0,0);a.root.scale.setScalar(1);a.root.updateWorldMatrix(true,false);
  const shoulders=new THREE.Vector3().addVectors(p[J.shoulderL],p[J.shoulderR]).multiplyScalar(.5);
  const torsoUp=new THREE.Vector3().subVectors(shoulders,hips).normalize();
  const hipRight=new THREE.Vector3().subVectors(p[J.hipR],p[J.hipL]);
  const hipUp=new THREE.Vector3().subVectors(p[J.pelvisBack],hips).cross(hipRight).normalize();
  orient(a.body,hipRight,hipUp);
  const bodyUp=new THREE.Vector3(0,1,0).applyQuaternion(a.body.getWorldQuaternion(q));
  position(a.body,local.copy(hips).addScaledVector(bodyUp,-.975));
  orient(a.spine,target.subVectors(p[J.shoulderR],p[J.shoulderL]),torsoUp);
  position(a.spine,local.copy(shoulders).addScaledVector(torsoUp,1.01-1.447));
  a.upper.updateWorldMatrix(true,false);
  const neck=local.set(0,1.525,0).applyMatrix4(a.upper.matrixWorld).clone();
  orient(a.head,target.subVectors(p[J.shoulderR],p[J.shoulderL]),axisY.subVectors(p[J.head],neck));
  for(let i=0;i<2;i++){
    const l=a.limbs[i];pointBone(l.leg,p[J.hipL+i],p[J.kneeL+i]);pointBone(l.knee,p[J.kneeL+i],p[J.ankleL+i]);
    pointBone(l.ankle,p[J.ankleL+i],p[J.toeL+i],toeAxis);
    pointBone(l.arm,p[J.shoulderL+i],p[J.elbowL+i]);pointBone(l.forearm,p[J.elbowL+i],p[J.wristL+i]);
  }
  for(const kit of a.tools)kit.visible=false;
  if(a.canopy)a.canopy.visible=false;
  if(a.ripples)for(const ring of a.ripples.rings)ring.visible=false;
  a.label.update(s);a.shadow.position.set(hips.x,groundHeight(hips.x,hips.z)+.025,hips.z);
  a.shadow.scale.set(.47,1,.60);a.shadow.material.opacity=.27;
}
