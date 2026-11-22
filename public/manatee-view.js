import {floatingBody} from './marine-float.js';
import * as THREE from 'three';
import {manateeHabitats} from './manatee-swim.js';
import {manateeAssets,manateeMaterial} from './manatee-model.js';

import {aquaticImpactView} from './aquatic-impact-view.js';

const cap=3,limit=52;
const mix=THREE.MathUtils.lerp;
const nearby=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;

function rippleMap(){
  const ring=new THREE.RingGeometry(.82,1,42).rotateX(-Math.PI/2);
  const color=[];
  for(let i=0;i<ring.attributes.position.count;i++){
    const p=ring.attributes.position,a=Math.atan2(p.getX(i),p.getZ(i));
    const crest=.3+.7*Math.pow(Math.max(0,Math.sin(3*a+.4)),2);
    color.push(1,1,1,crest);
  }
  ring.setAttribute('color',new THREE.Float32BufferAttribute(color,4));
  return ring;
}

export function manateeView(scene,waterline){
  const clock={value:0},muzzle=new THREE.Vector3();
  const animals=Array(manateeHabitats.length);
  const updateImpacts=aquaticImpactView(scene,waterline,manateeHabitats.map(h=>h.size));
  let kit,rings,snapshot,source,shown,age=0;
  function make(index){
    kit??=manateeAssets();rings??=rippleMap();
    const h=manateeHabitats[index],skin=manateeMaterial(kit,h.tint,waterline,clock);
    const root=new THREE.Group();
    root.name='Manatee · '+h.name;root.scale.setScalar(h.size);
    root.renderOrder=1;scene.add(root);
    const body=new THREE.Mesh(kit.high.torso,skin);
    const tail=new THREE.Mesh(kit.high.tail,skin);tail.position.set(0,.005,.91);
    root.add(body,tail);
    const fins=[-1,1].map(side=>{
      const fin=new THREE.Mesh(kit.high.fin,skin);
      fin.position.set(side*.282,-.112,-.65);root.add(fin);return fin;
    });
    const ripples=Array.from({length:2},(_,i)=>{
      const material=new THREE.MeshBasicMaterial({color:0xc4e0ce,transparent:true,depthWrite:false,vertexColors:true});
      const ring=new THREE.Mesh(rings,material);ring.renderOrder=2+i;scene.add(ring);return ring;
    });
    return {root,body,tail,fins,ripples,high:true};
  }

  return (states,local,simTick,dt)=>{
    updateImpacts(states,local,dt);
    if(!states?.length){
      for(const animal of animals)if(animal){animal.root.visible=false;for(const r of animal.ripples)r.visible=false;}
      snapshot=source=shown=undefined;return;
    }
    if(snapshot!==states){
      source=shown??states;snapshot=states;age=0;
    }
    clock.value=(simTick??0)/30;
    age+=dt;
    const blend=Math.min(1,age*14);
    shown=states.map((b,i)=>{
      const a=source[i];
      if(!a || Math.hypot(b.x-a.x,b.z-a.z)>5)return b;
      return {x:mix(a.x,b.x,blend),y:mix(a.y,b.y,blend),z:mix(a.z,b.z,blend),
        yaw:nearby(a.yaw,b.yaw,blend),pitch:mix(a.pitch,b.pitch,blend),roll:mix(a.roll,b.roll,blend),
        stroke:nearby(a.stroke,b.stroke,blend),air:b.air<0 || a.air<0?b.air:mix(a.air,b.air,blend)};
    });
    const closest=shown.map((p,i)=>({i,d:Math.hypot(local.x-p.x,local.y-p.y,local.z-p.z)}))
      .filter(p=>p.d<limit).sort((a,b)=>a.d-b.d).slice(0,cap);
    for(let i=0;i<shown.length;i++){
      const near=closest.find(p=>p.i===i);
      if(!near){
        const hidden=animals[i];
        if(hidden){hidden.root.visible=false;for(const r of hidden.ripples)r.visible=false;}
        continue;
      }
      const a=animals[i]??=make(i),p=shown[i];
      const state=states[i],down=state.hp===0,elapsed=(state.ageSinceHit??0)+age;
      const high=near.d<(a.high?19:17);
      if(high!==a.high){
        const lod=high?kit.high:kit.low;
        a.body.geometry=lod.torso;a.tail.geometry=lod.tail;
        for(const fin of a.fins)fin.geometry=lod.fin;
        a.high=high;
      }
      const {root,tail,fins,ripples}=a,beat=Math.sin(p.stroke);
      root.visible=true;root.position.set(p.x,p.y,p.z);
      root.rotation.set(p.pitch,-p.yaw,p.roll,'YXZ');
      if(down){
        const settle=1-Math.exp(-elapsed*.8);
        root.rotation.z=p.roll*(1-settle)+floatingBody(state.deathY,waterline,manateeHabitats[i].size,elapsed).roll;
        root.rotation.x*=1-settle;
      }
      tail.rotation.set(.245*beat+.059*Math.sin(p.stroke*2-.48),.031*Math.sin(p.stroke-.75),0);
      for(const [j,fin] of fins.entries()){
        const side=2*j-1,stroke=Math.sin(p.stroke-.52-side*.47);
        fin.rotation.set(.30+.24*stroke,side*(.92+.18*stroke+p.roll*side),side*(.038+.11*beat),'YXZ');
      }
      root.localToWorld(muzzle.set(0,.075,-1.45));
      for(const [j,ripple] of ripples.entries()){
        const t=p.air-j*.53;
        ripple.visible=!down && p.air>=0 && t>=0 && t<2.65 && near.d<36;
        if(!ripple.visible)continue;
        const drift=t*.29,r=.27+t*(.53+j*.13);
        ripple.position.set(muzzle.x-Math.sin(p.yaw)*drift,waterline+.020+j*.002,muzzle.z+Math.cos(p.yaw)*drift);
        ripple.rotation.y=-p.yaw;
        ripple.scale.setScalar(r);
        ripple.scale.z*=1.40;
        ripple.material.opacity=(1-t/2.65)*(.16-j*.042)*Math.min(1,t*7+.08);
      }
    }
  };
}
