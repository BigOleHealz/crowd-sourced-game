import {outsideWell} from './residential-spirals.js';
import * as THREE from 'three';
import {interiorPlans,doorIsOpen,landingValid,roomAtFeet} from './building-interiors.js';
import {furnishingSupported} from './estate-damage.js';
import {residentialFurnishingView} from './residential-furnishing-view.js';

// Reuse two bounded instance buffers: nearby entrances and a single furnished floor.
export function buildingInteriorView(scene,Batch){
  const furnish=residentialFurnishingView(scene,Batch);
  const geometry=new THREE.BoxGeometry(),material=new THREE.MeshLambertMaterial();
  const buffer=new THREE.InstancedMesh(geometry,material,980);
  buffer.userData.interiorFixtures=true;buffer.frustumCulled=false;buffer.count=0;scene.add(buffer);
  const temp=new THREE.Object3D(),color=new THREE.Color();
  const smooth=new Map(),sliding=new Set();
  const atlas=document.createElement('canvas');atlas.width=512;atlas.height=128;
  const ink=atlas.getContext('2d');ink.fillStyle='#153537';ink.fillRect(0,0,512,128);
  ink.fillStyle='#f0e6bc';ink.font='bold 66px Arial';ink.textAlign='center';ink.fillText('ELEVATOR',256,89);
  const tex=new THREE.CanvasTexture(atlas);tex.colorSpace=THREE.SRGBColorSpace;
  const labels=new THREE.InstancedMesh(new THREE.PlaneGeometry(1.22,.30),new THREE.MeshBasicMaterial({map:tex}),36);
  labels.userData.interiorFixtures=true;labels.count=0;labels.frustumCulled=false;scene.add(labels);
  let count,textCount,previous,bits,revision,nearby=[],lastX=Infinity,lastZ=Infinity,lastLevel,prevRide;
  function part(tint,x,y,z,w,h,d,yaw=0){
    if(count>=buffer.instanceMatrix.count)return;
    temp.position.set(x,y,z);temp.scale.set(w,h,d);temp.rotation.set(0,yaw,0);temp.updateMatrix();
    buffer.setMatrixAt(count,temp.matrix);buffer.setColorAt(count++,color.setHex(tint));
  }
  function leaf(d,state,dt){
    const open=doorIsOpen(d,state)?1:0,old=smooth.get(d.id)??open;
    const next=old+Math.sign(open-old)*Math.min(Math.abs(open-old),dt*3.5);
    smooth.set(d.id,next);
    if(next!==open)sliding.add(d.id);else sliding.delete(d.id);
    const yaw=d.axis==='x'?0:Math.PI/2;
    const add=(col,u,y,w,h,t,depth=.0)=>part(col,d.x+Math.cos(yaw)*u+Math.sin(yaw)*depth,d.y+y,d.z-Math.sin(yaw)*u+Math.cos(yaw)*depth,w,h,t,yaw);
    if(d.shutter){
      const bottom=next*d.height,height=d.height-bottom;
      if(height>.015){
        add(0x878e86,0,bottom+height/2,d.width,height,.065);
        for(let y=.11;y<height;y+=.22)add(0x60685e,0,bottom+y,d.width,.024,.078);
        add(0x494d48,0,bottom+.035,d.width,.07,.087);
      }
      for(const side of [-1,1])add(0x5f665c,side*(d.width/2+.02),d.height/2,.045,d.height,.11);
      add(0x676e67,0,d.height+.12,d.width+.13,.24,.24);return;
    }
    // The leaves retract into shallow pockets, without protruding into another doorway.
    for(const s of [-1,1]){
      const w=d.width*.5*(1-next),u=s*(d.width-w)*.5;
      if(w>.008){
        add(0x766653,u,1.03,w,2.06,.060);
        add(0xb39c75,u,1.52,w*.82,.55,.066);
        add(0x514c46,u,.56,w*.80,.69,.066);
        if(w>.14)add(0xcbbb8e,u-s*w*.29,1.05,.035,.23,.078);
      }
      add(0x6d695e,s*(d.width/2+.025),1.05,.047,2.10,.09);
    }
    add(0xb2a17a,0,2.115,d.width+.10,.074,.10);
  }
  function lift(s,ride){
    const {x,y,z,angle:a}=s,c=Math.cos(a),sn=Math.sin(a);
    const local=(tint,u,dy,v,w,h,d)=>part(tint,x+c*u+sn*v,y+dy,z-sn*u+c*v,w,h,d,a);
    for(const sign of [-1,1]){
      local(0x656862,sign*.72,1.12,0,.11,2.22,.13);
      local(0xacb0a6,sign*.334,1.09,.026,.65,2.13,.055);
      local(0x858d86,sign*.53,1.10,.062,.035,1.96,.026);
    }
    local(0x555e56,0,2.22,0,1.55,.11,.14);
    local(0x31454a,.90,1.21,.018,.22,.41,.065);
    local(ride?0xf7ce70:0x98e8ba,.90,1.24,.056,.11,.072,.028);
    temp.position.set(x+sn*.088,y+2.48,z+c*.088);temp.scale.set(1,1,1);temp.rotation.set(0,a,0);temp.updateMatrix();
    if(textCount<labels.instanceMatrix.count)labels.setMatrixAt(textCount++,temp.matrix);
  }
  return (feet,doors,dt)=>{
    const room=roomAtFeet(feet,doors),l=room?.l;
    const model=l?.residential??room?.p.residential;
    if(model)furnish(model,{x:room.p.x,y:l?.y??room.p.b.base,z:room.p.z});
    else furnish(null);
    const changedArea=Math.abs(feet.x-lastX)>6 || Math.abs(feet.z-lastZ)>6;
    if(changedArea){lastX=feet.x;lastZ=feet.z;nearby=interiorPlans.filter(p=>Math.abs(p.x-feet.x)<p.w/2+20 && Math.abs(p.z-feet.z)<p.d/2+20);}
    const newBits=JSON.stringify(doors?.roomLeaves??{}),newRev=(doors?.collapsedTowers?.length??0)+(doors?.estateBreaches?.length??0)+Object.keys(doors?.houseRuins??{}).length+Object.keys(doors?.beachWood??{}).length;
    const levelKey=Math.floor(feet.y*2),ride=feet.liftTravel;
    if(!changedArea && l===previous && newBits===bits && newRev===revision && lastLevel===levelKey && !sliding.size && prevRide===ride)return;
    previous=l;bits=newBits;revision=newRev;lastLevel=levelKey;prevRide=ride;count=textCount=0;sliding.clear();
    if(l){
      const p=l.p,b=p.b;
      for(const r of outsideWell({x:b.x,z:b.z,w:b.w-.42,d:b.d-.42},p.stair))part(0xc4af90,r.x,l.y-.043,r.z,r.w,.085,r.d);
      part(0xe3dac6,b.x,l.y+l.height-.085,b.z,b.w-.42,.12,b.d-.42);
      for(const r of outsideWell({x:b.x,z:b.z,w:1.77,d:b.d-.85},p.stair))part(0x577074,r.x,l.y+.009,r.z,r.w,.016,r.d);
      for(const q of l.parts)part(q.color,q.x,q.bottom+q.h/2,q.z,q.w,q.h,q.d);
      if(!model)for(const r of l.rooms){
        part(0xb39773,r.x,l.y+.011,r.z,r.w*.73,.017,r.d*.69);
        part(0xf2deb1,r.x,l.y+l.height-.17,r.z,.55,.035,.3);
      }
      for(const d of l.doors)leaf(d,doors,dt);
    }
    for(const p of nearby){
      if(doors?.beachWood?.[p.wood] || doors?.collapsedTowers?.includes(p.b.towerId) || p.home && doors?.houseRuins?.[p.home])continue;
      for(const s of p.panels)if(Math.abs(s.y-feet.y)<2.0 && landingValid(s,doors))lift(s,ride);
      if(p.grandDoors)for(const d of p.grandDoors[Math.floor((feet.y-.80+.16)/3.6)]??[])leaf(d,doors,dt);
      for(const d of p.entrances)if(Math.abs(d.y-feet.y)<3.5 && (!p.home || furnishingSupported(p.home,d.x,d.y,d.z,doors)))leaf(d,doors,dt);
    }
    buffer.count=count;labels.count=textCount;buffer.instanceMatrix.needsUpdate=true;
    if(buffer.instanceColor)buffer.instanceColor.needsUpdate=true;
    labels.instanceMatrix.needsUpdate=true;
  };
}
