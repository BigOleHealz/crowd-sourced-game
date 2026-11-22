import * as THREE from 'three';
import {batSlot as bat,swordSlot as sword} from './arcade-melee-feedback.js';

const toolsByBatch=new WeakMap();
const cylinder=new THREE.CylinderGeometry(1,1,1,12),sphere=new THREE.SphereGeometry(1,12,6);
const bladeMaterial=new THREE.MeshPhongMaterial({vertexColors:true,shininess:56,specular:0x879fb2});
const woodMaterial=new THREE.MeshPhongMaterial({vertexColors:true,shininess:23,specular:0x50422e});

function lathe(batch,color,profile){
  const geo=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),14);
  batch.add(geo,color,0,0,0);geo.dispose();
}
function baseballBat(batch){
  lathe(batch,0xb77a43,[[0,-.142],[.041,-.142],[.046,-.126],[.042,-.112],[.025,-.101],
    [.025,.118],[.032,.222],[.042,.347],[.057,.475],[.062,.624],[.058,.722],[.048,.765],[0,.776]]);
  lathe(batch,0x3b2924,[[.025,-.102],[.030,-.093],[.030,.111],[.026,.126]]);
  for(let i=0;i<6;i++)batch.add(cylinder,0x604636,0,-.083+i*.032,0,.0305,.008,.0305);
  lathe(batch,0x8f2e2d,[[.061,.517],[.063,.548],[.065,.593]]);
  lathe(batch,0xf2d094,[[.064,.542],[.066,.557],[.065,.566]]);
  batch.add(sphere,0xd59a5c,0,.766,0,.048,.012,.048);
}
function arcadeSword(batch){
  const lower=[[-.066,.17,0],[0,.17,.026],[.066,.17,0],[0,.17,-.026]],
    upper=[[-.040,.89,0],[0,.89,.017],[.040,.89,0],[0,.89,-.017]],tip=[0,1.055,0];
  [0xbddcee,0x729bb7,0xa7cde4,0x56819c].forEach((color,i)=>{
    const j=(i+1)%4,face=new THREE.BufferGeometry();
    face.setAttribute('position',new THREE.Float32BufferAttribute([
      ...lower[i],...lower[j],...upper[j],...lower[i],...upper[j],...upper[i],...upper[i],...upper[j],...tip,
    ],3));
    face.computeVertexNormals();batch.add(face,color,0,0,0);face.dispose();
  });
  batch.add(cylinder,0x222e45,0,.008,0,.038,.25,.034);
  for(let i=0;i<6;i++)batch.add(cylinder,0x587483,0,-.102+i*.036,0,.039,.010,.035);
  batch.add(sphere,0xb98f4c,0,-.147,0,.047,.044,.042);
  batch.add(sphere,0xc59a54,0,.153,0,.104,.032,.046);
  for(const side of [-1,1]){
    batch.beam(0xc59a54,[side*.048,.154,0],[side*.172,.194,0],.046,.049);
    batch.add(sphere,0xe4b775,side*.172,.198,0,.031,.027,.031);
  }
  for(const side of [-1,1])batch.add(sphere,0x34b8bd,0,.161,side*.039,.022,.024,.013);
}

// Templates share geometry across players. The rig carries each tool at the
// actual forearm endpoint through both the idle grip and the keyed motion.
export function arcadeMeleeEquipment(forearm,Batch){
  let templates=toolsByBatch.get(Batch);
  if(!templates){
    templates=[['Baseball bat',baseballBat,woodMaterial],['Sword',arcadeSword,bladeMaterial]].map(([name,build,material])=>{
      const batch=new Batch();build(batch);
      const mesh=new THREE.Mesh(batch.geometry(),material);
      mesh.name=name;mesh.visible=false;mesh.userData.heldMelee=true;mesh.geometry.userData.sharedFieldKit=true;
      return mesh;
    });
    toolsByBatch.set(Batch,templates);
  }
  const items=templates.map(mesh=>mesh.clone());
  forearm.add(...items);return items;
}

const swings={
  [bat]:[
    [.30,1.15,-.25,.70,.70,-.13,0],
    [.43,1.43,.14,.63,.58,.51,.32],
    [.21,1.30,-.48,-.22,.11,-.97,-.24],
    [-.13,1.34,-.30,-.91,.29,-.27,-.52],
  ],
  [sword]:[
    [.29,1.18,-.23,.39,.89,-.20,0],
    [.39,1.63,.14,.47,.86,.18,.24],
    [.23,1.36,-.45,-.13,-.27,-.95,-.28],
    [-.11,1.18,-.29,-.89,-.40,-.20,-.45],
  ],
};
const {smoothstep,lerp}=THREE.MathUtils;
const hand=new THREE.Vector3(),axis=new THREE.Vector3();
const up=new THREE.Vector3(0,1,0),inverseWrist=new THREE.Quaternion();

export function poseArcadeMelee(avatar,slot,event,tick,gripPose,side){
  const keys=swings[slot],mesh=avatar.tools[slot-1];
  const active=avatar.limbs[side===1?1:0],other=avatar.limbs[side===1?0:1];
  let a=keys[0],b=a,progress=0;
  if(event?.weapon===slot && tick>=event.tick && tick<event.endTick){
    const ready=event.tick+(event.hitTick-event.tick)*.56;
    const follow=event.hitTick+(event.endTick-event.hitTick)*.47;
    if(tick<ready){a=keys[0];b=keys[1];progress=smoothstep(tick,event.tick,ready);}
    else if(tick<event.hitTick){a=keys[1];b=keys[2];progress=smoothstep(tick,ready,event.hitTick);}
    else if(tick<follow){a=keys[2];b=keys[3];progress=smoothstep(tick,event.hitTick,follow);}
    else {a=keys[3];b=keys[0];progress=smoothstep(tick,follow,event.endTick);}
  }
  const twist=lerp(a[6],b[6],progress)*side;
  avatar.spine.rotation.y+=twist;
  avatar.head.rotation.y-=twist*.60;
  hand.set(lerp(a[0],b[0],progress)*side,lerp(a[1],b[1],progress),lerp(a[2],b[2],progress));
  gripPose(active.arm,active.forearm,hand.x,hand.y,hand.z,side);
  gripPose(other.arm,other.forearm,-.31*side+twist*.20,1.17,-.13+twist*.31*side,-side);
  if(mesh){
    if(mesh.parent!==active.forearm)active.forearm.add(mesh);
    axis.set(lerp(a[3],b[3],progress)*side,lerp(a[4],b[4],progress),lerp(a[5],b[5],progress)).normalize();
    inverseWrist.copy(active.arm.quaternion).multiply(active.forearm.quaternion).invert();
    mesh.quaternion.setFromUnitVectors(up,axis.applyQuaternion(inverseWrist));
    mesh.position.set(0,-.265,-.013);
  }
}

// The hit is keyed to the server's contact tick and position. One reusable
// instanced draw holds at most five zero-allocation ray fans for 0.22 seconds.
export function arcadeSwordContacts(scene,splatter){
  const raysPerHit=6,maxRays=30,dummy=new THREE.Object3D(),direction=new THREE.Vector3();
  const tint=new THREE.Color();
  const limbs=new Set(['leftArm','rightArm','leftLeg','rightLeg']);
  let previousCuts=new Map(),currentCuts=new Map();
  let sparks;
  return (actors,local,tick,remoteTick=tick)=>{
    let count=0;
    for(const actor of actors){
      const previous=previousCuts.get(actor.id);
      if(previous!==undefined)currentCuts.set(actor.id,previous);
      if(count>=maxRays)continue;
      const event=actor.meleeSwing,point=event?.contact;
      if(event?.weapon!==sword || !event.hit || !point)continue;
      const at=actor.id===local.id?tick:remoteTick;
      const age=(at-event.hitTick)/30,distance=Math.hypot(local.x-point.x,local.y-point.y,local.z-point.z);
      if(!(age>=0 && age<.22) || distance>=24)continue;
      if(event.severed && limbs.has(event.hitPart) && previous!==event.seq){
        currentCuts.set(actor.id,event.seq);
        splatter(event.hitPart,point,actor);
      }
      if(!sparks){
        sparks=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({
          transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending,
        }),maxRays);
        sparks.name='Sword strike glints';sparks.frustumCulled=false;sparks.renderOrder=8;
        sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(sparks);
      }
      const t=age/.22,fade=(1-t)**2*(1-smoothstep(distance,15,24));
      for(let i=0;i<raysPerHit;i++){
        const angle=i/raysPerHit*Math.PI*2+event.seq*.87,spread=.06+t*(.24+i*.024);
        direction.set(Math.cos(angle),.30+Math.sin(angle*2)*.62,Math.sin(angle)).normalize();
        dummy.position.set(point.x,point.y,point.z).addScaledVector(direction,spread);
        dummy.quaternion.setFromUnitVectors(up,direction);
        dummy.scale.set(.011*fade,(.10+.05*(i%3))*fade,.011*fade);
        dummy.updateMatrix();sparks.setMatrixAt(count,dummy.matrix);
        sparks.setColorAt(count++,tint.setHex(i%3===0?0xffe793:0xacf3ff).multiplyScalar(fade));
      }
    }
    [previousCuts,currentCuts]=[currentCuts,previousCuts];currentCuts.clear();
    if(sparks){
      sparks.count=count;sparks.visible=count>0;
      if(count){sparks.instanceMatrix.needsUpdate=true;sparks.instanceColor.needsUpdate=true;}
    }
  };
}
