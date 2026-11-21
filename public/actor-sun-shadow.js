import * as THREE from 'three';
import {groundHeight,solidTopAt} from './world.js';
import {yachtFloorAt} from './yacht-layout.js';

// The sun is at (-36,32,-21) relative to its target in both districts.
const dx=36/32,dz=21/32;
const pelvis=new THREE.Vector3(),shoulder=new THREE.Vector3(),head=new THREE.Vector3();
const joint=new THREE.Vector3(),bend=new THREE.Vector3(),tip=new THREE.Vector3();
const surfaces=new WeakMap();
function support(x,y,z,world){
  const ground=groundHeight(x,z,y+.20,world.doors);
  if(Math.abs(ground-y)<.26)return ground;
  const upper=solidTopAt(x,z,world.hp,0,y+.12,world.doors);
  const deck=yachtFloorAt(world.yacht,x,y,z);
  return Math.max(ground,upper<=y+.20?upper:-Infinity,deck<=y+.20?deck:-Infinity);
}
function receiver(avatar,state,world){
  const {x,y,z}=state;
  let floor=surfaces.get(avatar);
  if(floor && Math.abs(floor.y-y)<.04 && Math.hypot(x-floor.x,z-floor.z)<.19)return floor;
  const length=2.2,across=support(x+length,y,z,world),along=support(x,y,z+length,world);
  const diagonal=support(x+length,y,z+length*dz/dx,world);
  floor={x,y,z,ax:(across-y)/length,az:(along-y)/length,safe:Math.max(Math.abs(across-y),Math.abs(along-y),Math.abs(diagonal-y))<.24};
  surfaces.set(avatar,floor);
  return floor;
}
export function castActorShadow(avatar,state,world,blob){
  const floor=receiver(avatar,state,world);
  if(!floor.safe)return;
  avatar.root.updateWorldMatrix(true,true);
  function segment(a,b,width,opacity){
    const ha=Math.max(0,a.y-floor.y),hb=Math.max(0,b.y-floor.y);
    const left=a.x+ha*dx,right=b.x+hb*dx,back=a.z+ha*dz,front=b.z+hb*dz;
    const x=(left+right)/2,z=(back+front)/2,diffX=right-left,diffZ=front-back;
    const len=Math.hypot(diffX,diffZ),rise=len>.02?(floor.ax*diffX+floor.az*diffZ)/len:0;
    const y=floor.y+(x-floor.x)*floor.ax+(z-floor.z)*floor.az;
    blob(x,y,z,-Math.atan2(diffX,diffZ),width,len+width*.55,-opacity,-Math.atan(rise));
  }
  pelvis.set(0,.94,0).applyMatrix4(avatar.body.matrixWorld);
  shoulder.set(0,1.43,0).applyMatrix4(avatar.upper.matrixWorld);
  segment(pelvis,shoulder,.51,.29);
  if(!state.lostParts?.head){
    head.set(0,.16,0).applyMatrix4(avatar.head.matrixWorld);
    segment(shoulder,head,.31,.30);
  }
  for(const {side,leg,knee,ankle,arm,forearm} of avatar.limbs){
    if(!state.lostParts?.[side<0?'leftLeg':'rightLeg']){
      joint.setFromMatrixPosition(leg.matrixWorld);bend.setFromMatrixPosition(knee.matrixWorld);tip.setFromMatrixPosition(ankle.matrixWorld);
      segment(joint,bend,.23,.27);segment(bend,tip,.18,.26);
    }
    if(!state.lostParts?.[side<0?'leftArm':'rightArm']){
      joint.setFromMatrixPosition(arm.matrixWorld);bend.setFromMatrixPosition(forearm.matrixWorld);
      tip.set(0,-.26,0).applyMatrix4(forearm.matrixWorld);
      segment(joint,bend,.19,.22);segment(bend,tip,.15,.22);
    }
  }
}
