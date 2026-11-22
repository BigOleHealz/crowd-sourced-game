import * as THREE from 'three';
import {MAP,groundHeight,solidTopAt} from './world.js';

export function characterBurst(part,point,from,particle,random) {
  if(part==='headPop') {
    // Two bright rings of faceted confetti fold into a short upward plume.
    const pinks=[0xff59bb,0xffa9dc,0xffe7f8];
    for(let i=0;i<24;i++) {
      const angle=i*Math.PI/6+(i<12 ? 0 : Math.PI/12);
      const radius=(i<12 ? 2.5 : 1.35)+random()*.45;
      const velocity=new THREE.Vector3(Math.cos(angle)*radius,.5+random()*(i<12 ? .7 : 2.9),Math.sin(angle)*radius);
      const size=.030+.042*random();
      particle(point.clone(),velocity,new THREE.Vector3(size,size,size),
        pinks[i%3],.22+.16*random());
    }
    return;
  }
  const forward=point.clone().sub(from).normalize();
  const fatalDogHit=part==='dogHead';
  const count=fatalDogHit?20:part==='torso'?11:16;
  for(let i=0;i<count;i++) {
    const direction=new THREE.Vector3(random()-.5,random()-.36,random()-.5);
    direction.addScaledVector(forward,.48).normalize();
    const speed=1.4+random()*2.5;
    const width=.025*(1+random()*.8);
    const fragment=fatalDogHit && i%3===0;
    const color=fragment?0xd68b91:i%3?0xb52736:0x701723;
    particle(point.clone(),direction.multiplyScalar(speed),new THREE.Vector3(width*(fragment?1.6:1),width*1.85,width*(fragment?1.4:.78)),
      color,.18+random()*.27);
  }
}

// The original and the detached garment share geometry; each needs the matrices
// of the two joints on its own copy of the limb.
function detachedLimb(joint) {
  const copy=joint.clone(true), nodes=[], clones=[];
  joint.traverse(n=>nodes.push(n));copy.traverse(n=>clones.push(n));
  const mapped=new Map(nodes.map((node,i)=>[node,clones[i]]));
  for(const node of nodes)if(node.isSkinnedMesh) {
    const skeleton=node.skeleton;
    mapped.get(node).bind(new THREE.Skeleton(skeleton.bones.map(bone=>mapped.get(bone)),skeleton.boneInverses),node.bindMatrix);
  }
  for(const clone of clones)if(clone.userData.heldMelee)clone.removeFromParent();
  return copy;
}
function releaseLimb(prop) {
  if(!prop)return;
  prop.traverse(n=>n.skeleton?.dispose());
  prop.removeFromParent();
}

export function clearLostParts(avatar) {
  if(!avatar.detached) return;
  for(const entry of avatar.detached.values())releaseLimb(entry.prop);
  avatar.detached.clear();
}

export function applyLostParts(avatar,state,scene,hp,dt) {
  if(!state.lostParts && !avatar.detached?.size)return;
  avatar.detached ??= new Map();
  const [left,right]=avatar.limbs;
  const joints={head:avatar.head,leftArm:left.arm,rightArm:right.arm,leftLeg:left.leg,rightLeg:right.leg};
  for(const [part,joint] of Object.entries(joints)) {
    const hit=part==='head' && !state.dead ? undefined : state.lostParts?.[part];
    joint.visible=!hit;
    let entry=avatar.detached.get(part);
    if(entry && entry.tick!==hit?.tick) {
      releaseLimb(entry.prop);avatar.detached.delete(part);entry=null;
    }
    if(!hit)continue;
    if(!entry) {
      let prop=null;
      if(part!=='head') {
        // Reuse the hiker's sleeve, glove, trouser and boot geometry.
        prop=detachedLimb(joint);prop.visible=true;
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
    if(hit.water){
      const rise=1-Math.exp(-fallTime*1.8);
      entry.prop.position.set(x+.12*fallTime,(1-rise)*hit.y+rise*(MAP.waterY-.03+.03*Math.sin(fallTime*3+side)),z);
      entry.prop.rotation.set(.8+rise*.65,-hit.yaw+side*1.1*rise,side*.18*Math.cos(fallTime*2));
      continue;
    }
    const top=solidTopAt(x,z,hp,0,hit.y+.05);
    const floor=top<=hit.y+.10 ? top : groundHeight(x,z);
    entry.prop.position.set(x,Math.max(floor+.12,hit.y+2.3*fallTime-7*fallTime*fallTime),z);
    entry.prop.rotation.set(Math.min(1.55,.68+2.8*t),-hit.yaw+side*2.2*t,side*.13,'YXZ');
  }
  if(state.lostParts?.rightArm && state.lostParts.leftArm)
    for(const tool of avatar.tools)tool.visible=false;
}
