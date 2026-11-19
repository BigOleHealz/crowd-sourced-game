import {Vector3} from 'three';
import {createRangerRig,poseRig} from './ranger-pose.js';
import {MAP,CITY,groundHeight,solidTopAt} from './world.js';
import {vehicleContact} from './vehicle-contact.js';

export const J={hipL:0,hipR:1,shoulderL:2,shoulderR:3,head:4,elbowL:5,elbowR:6,
  wristL:7,wristR:8,kneeL:9,kneeR:10,ankleL:11,ankleR:12,toeL:13,toeR:14,back:15,pelvisBack:16};
const radius=[.125,.125,.13,.13,.157,.073,.073,.058,.058,.084,.084,.075,.075,.062,.062,.14,.105];
const inverseMass=[.67,.67,.55,.55,.84,1.4,1.4,2,2,.95,.95,1.3,1.3,1.6,1.6,.60,.8];
const frame=new WeakMap();
const difference=new Vector3();
export const pointSet=()=>radius.map(()=>new Vector3());
function at(out,node,x=0,y=0,z=0){out.set(x,y,z).applyMatrix4(node.matrixWorld);}
export function readJoints(rig,out) {
  rig.root.updateMatrixWorld(true);
  for(let side=0;side<2;side++){
    const l=rig.limbs[side];at(out[J.hipL+side],l.leg);at(out[J.shoulderL+side],l.arm);
    at(out[J.kneeL+side],l.knee);at(out[J.ankleL+side],l.ankle);
    at(out[J.toeL+side],l.ankle,0,-.078,-.145);at(out[J.elbowL+side],l.forearm);
    at(out[J.wristL+side],l.forearm,0,-.265);
  }
  at(out[J.head],rig.head,0,.155,-.008);at(out[J.back],rig.upper,0,1.26,.18);at(out[J.pelvisBack],rig.body,0,.975,.138);
}

// Sample the same hierarchy, IK, planted feet and gait used by the visible avatar.
// Keep its last two actual poses so a released wrist and a planted boot inherit different velocities.
export function sampleRanger(actor,dt) {
  if(!actor.life.hp || actor.life.fall)return;
  let state=frame.get(actor.life);
  if(!state) {
    state={rig:createRangerRig(),now:pointSet(),last:pointSet(),initialized:false};
    frame.set(actor.life,state);
  }
  const swap=state.last;state.last=state.now;state.now=swap;
  poseRig(state.rig,{...actor.state,id:actor.id,yaw:actor.yaw,weapon:actor.weapon,moving:actor.moving,sprint:actor.sprint},dt);
  readJoints(state.rig,state.now);
  const hit=actor.hitPose??={indices:J,origin:{}};
  hit.joints=state.now;
  Object.assign(hit.origin,{x:actor.state.x,y:actor.state.y,z:actor.state.z});
  if(!state.initialized){state.last.forEach((p,i)=>p.copy(state.now[i]));state.initialized=true;}
}

export function releaseJoints(actor,tick,impact) {
  const sample=frame.get(actor.life);
  if(!sample)return null;
  const points=sample.now.map(p=>p.clone()),previous=sample.last.map(p=>p.clone()),edges=[];
  // The packed torso keeps its volume. Limbs remain independent articulated chains.
  function link(a,b,min,max,stiffness=1){
    const length=points[a].distanceTo(points[b]);
    edges.push({a,b,min:min??length,max:max??length,stiffness});
  }
  function triangle(a,b,c){link(a,b);link(a,c);link(b,c);}
  triangle(J.hipL,J.hipR,J.pelvisBack);
  triangle(J.shoulderL,J.shoulderR,J.back);
  // A compliant waist couples the two body volumes without welding their pitch and twist.
  for(const hip of [J.hipL,J.hipR]){
    for(const shoulder of [J.shoulderL,J.shoulderR]){
      const span=points[hip].distanceTo(points[shoulder]);
      link(hip,shoulder,span*.95,span*1.03,.75);
    }
    link(hip,J.back,.31,.39);
  }
  link(J.pelvisBack,J.back,.24,.36);
  link(J.pelvisBack,J.shoulderL,.47,.60);link(J.pelvisBack,J.shoulderR,.47,.60);
  link(J.shoulderL,J.head,.304,.365);link(J.shoulderR,J.head,.304,.365);
  link(J.back,J.head,.39,.54);link(J.hipL,J.head,.63,.77);link(J.hipR,J.head,.63,.77);
  for(let i=0;i<2;i++){
    const hip=J.hipL+i,knee=J.kneeL+i,ankle=J.ankleL+i,toe=J.toeL+i;
    const shoulder=J.shoulderL+i,elbow=J.elbowL+i,wrist=J.wristL+i;
    link(hip,knee);link(knee,ankle);link(ankle,toe);link(shoulder,elbow);link(elbow,wrist);
    link(hip,ankle,.24,.795);link(knee,toe,.34,.54);link(shoulder,wrist,.115,.534);
    link(J.back,elbow,.22,.72);link(J.head,wrist,.19,1.15);link(J.back,wrist,.20,.97);
  }
  link(J.kneeL,J.kneeR,.15,.69);link(J.ankleL,J.ankleR,.13,1.1);
  const seed=[...String(actor.id)].reduce((n,c)=>Math.imul(n,31)+c.charCodeAt(0)|0,tick);
  const eccentricity=Math.sin(seed*1.37)*.55;
  for(let i=0;i<points.length;i++) {
    const inherited=points[i].clone().sub(previous[i]).multiplyScalar(30).clampLength(0,11);
    const lift=Math.max(0,points[i].y-actor.state.y);
    const kick=.3+1.70*lift;
    inherited.x+=impact.x*kick + impact.z*eccentricity*lift;
    inherited.z+=impact.z*kick - impact.x*eccentricity*lift;
    inherited.y+=.52*lift;
    previous[i].copy(points[i]).addScaledVector(inherited,-1/60);
  }
  frame.delete(actor.life);
  return {points,previous,edges,quiet:0};
}

function constrain(rag) {
  for(const {a,b,min,max,stiffness} of rag.edges){
    const p=rag.points[a],q=rag.points[b];
    difference.subVectors(q,p);const length=difference.length();
    if(length<1e-7 || (length>=min && length<=max))continue;
    const correction=(length-Math.min(max,Math.max(min,length)))*stiffness/(length*(inverseMass[a]+inverseMass[b]));
    p.addScaledVector(difference,correction*inverseMass[a]);q.addScaledVector(difference,-correction*inverseMass[b]);
  }
}
export function advanceJoints(rag,hp,world) {
  let movement=0;
  for(let half=0;half<2;half++) {
    for(let i=0;i<rag.points.length;i++){
      const p=rag.points[i],old=rag.previous[i];difference.subVectors(p,old).multiplyScalar(.994);
      old.copy(p);p.add(difference);p.y-=19/3600;
    }
    for(let pass=0;pass<7;pass++){
      constrain(rag);
      for(let i=0;i<rag.points.length;i++) {
        const p=rag.points[i],old=rag.previous[i],r=radius[i];
        const top=solidTopAt(p.x,p.z,hp,r,p.y+r);
        let floor=Math.max(groundHeight(p.x,p.z),MAP.waterY-.08);
        if(top<=Math.max(old.y,p.y)+r+.075) floor=Math.max(floor,top);
        else {p.x=old.x;p.z=old.z;}
        const contact=vehicleContact(p.x,p.y-r,p.z,world,CITY,r*2);
        if(contact.depth){p.x+=contact.dx;p.z+=contact.dz;}
        floor=Math.max(floor,contact.floor);
        if(p.y<=floor+r+.002){
          p.y=floor+r;
          if(pass===6){old.x+=(p.x-old.x)*.68;old.z+=(p.z-old.z)*.68;old.y=p.y;}
        }
      }
    }
    for(let i=0;i<rag.points.length;i++)movement=Math.max(movement,rag.points[i].distanceToSquared(rag.previous[i]));
  }
  rag.quiet=movement<.000004 ? rag.quiet+1 : 0;
  return rag.quiet>=7;
}
export function packedJoints(rag){
  return rag.points.flatMap(p=>[Math.round(p.x*1000),Math.round(p.y*1000),Math.round(p.z*1000)]);
}
