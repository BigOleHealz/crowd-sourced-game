import * as THREE from 'three';
import {groundHeight,solidTopAt} from './world.js';

export function characterBurst(part,point,from,particle,random) {
  const head=part==='head';
  const forward=point.clone().sub(from).normalize();
  const count=head ? 27 : part==='torso' ? 11 : 16;
  for(let i=0;i<count;i++) {
    const chip=head && i%4===0;
    const direction=new THREE.Vector3(random()-.5,random()-.36,random()-.5);
    direction.addScaledVector(forward,head ? .12 : .48).normalize();
    const speed=(head ? 2.2 : 1.4)+random()*2.5;
    const width=(chip ? .038 : .025)*(1+random()*.8);
    const color=chip ? (i%8 ? 0x4c5149 : 0x283439) : i%3 ? 0xb52736 : 0x701723;
    particle(point.clone(),direction.multiplyScalar(speed),new THREE.Vector3(width,width*(chip ? 1.4 : 1.85),width*.78),
      color,.18+random()*(head ? .44 : .27));
  }
}

export function clearLostParts(avatar) {
  if(!avatar.detached) return;
  for(const entry of avatar.detached.values())entry.prop?.removeFromParent();
  avatar.detached.clear();
}

export function applyLostParts(avatar,state,scene,hp,dt) {
  if(!state.lostParts && !avatar.detached?.size)return;
  avatar.detached ??= new Map();
  const [left,right]=avatar.limbs;
  const joints={head:avatar.head,leftArm:left.arm,rightArm:right.arm,leftLeg:left.leg,rightLeg:right.leg};
  for(const [part,joint] of Object.entries(joints)) {
    const hit=state.lostParts?.[part];
    joint.visible=!hit;
    let entry=avatar.detached.get(part);
    if(entry && entry.tick!==hit?.tick) {
      entry.prop?.removeFromParent();avatar.detached.delete(part);entry=null;
    }
    if(!hit)continue;
    if(!entry) {
      let prop=null;
      if(part!=='head') {
        // Reuse the hiker's sleeve, glove, trouser and boot geometry.
        prop=joint.clone(true);prop.visible=true;
        for(const child of prop.children)if(child.isGroup) {
          child.rotation.set(part.endsWith('Leg') ? -.29 : .35,0,0);
          for(const end of child.children)if(end.isGroup)end.rotation.set(.10,0,0);
        }
        scene.add(prop);
      }
      entry={tick:hit.tick,prop};avatar.detached.set(part,entry);
    }
    if(!entry.prop)continue;
    entry.age=Math.max(hit.age,(entry.age ?? hit.age)+dt);
    const fallTime=Math.min(8,entry.age);
    const t=Math.min(1.05,entry.age),side=part.startsWith('left') ? -1 : 1;
    const travel=t*(1.55-.65*t);
    const x=hit.x+travel*(hit.dx+.58*side*Math.cos(hit.yaw));
    const z=hit.z+travel*(hit.dz+.58*side*Math.sin(hit.yaw));
    const top=solidTopAt(x,z,hp,0,hit.y+.05);
    const floor=top<=hit.y+.10 ? top : groundHeight(x,z);
    entry.prop.position.set(x,Math.max(floor+.12,hit.y+2.3*fallTime-7*fallTime*fallTime),z);
    entry.prop.rotation.set(Math.min(1.55,.68+2.8*t),-hit.yaw+side*2.2*t,side*.13,'YXZ');
  }
  if(state.lostParts?.rightArm && state.lostParts.leftArm)
    for(const tool of avatar.tools)tool.visible=false;
}
