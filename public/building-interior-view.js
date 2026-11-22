import {resortLevels,grandFurniture,skyRooms} from './grand-resort-layout.js';
import {grandHotelPalette} from './residential-furnishing-layout.js';
import {outsideWell} from './residential-spirals.js';
import * as THREE from 'three';
import {interiorPlans,doorIsOpen,landingValid,roomAtFeet,ridingHotelShaft} from './building-interiors.js';
import {furnishingSupported} from './estate-damage.js';
import {residentialFurnishingView} from './residential-furnishing-view.js';

const suiteKits=resortLevels.map(level=>{
  if(level.n<5)return;
  const furnishings=grandFurniture[level.n].filter(p=>['sofa','coffee','dining','bed','writing','nightstand'].includes(p.kind))
    .map(p=>({...p,kind:p.kind==='writing'?'desk':p.kind,y:level.y+p.bottom,yaw:0}));
  if(level.n<17){
    for(const r of skyRooms(level.n)){
      const put=(kind,x,z,w,h,d,dy=0,yaw=0)=>furnishings.push({kind,x,y:level.y+dy,z,w,h,d,yaw});
      const length=r.side?13.91:r.d-.33;
      put('floor',r.x,r.side?47.82:r.z,r.w-.58,.012,length,.036);
      put('rug',r.x-.73,r.z+1.93,3.9,.025,3.03,.054);
      put('pendant',r.x-.73,r.z+1.9,.76,.48,.76,2.92);
      if(r.side)put('art',r.x,r.z-3.414,1.76,.80,.06,1.34);
    }
  }
  return {profile:grandHotelPalette(level.n),furnishings};
});

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
  const crest=document.createElement('canvas');crest.width=512;crest.height=256;
  const pen=crest.getContext('2d');pen.fillStyle='#3a2334';pen.fillRect(0,0,512,256);
  pen.strokeStyle='#b69b69';pen.lineWidth=2;pen.strokeRect(8,8,496,240);pen.strokeRect(16,16,480,224);
  for(let i=-5;i<=5;i++){
    const a=i*.222;pen.beginPath();pen.moveTo(256,105);pen.lineTo(256+55*Math.sin(a),105-55*Math.cos(a));
    pen.stroke();
  }
  pen.fillStyle='#ecd8ac';pen.font='32px Georgia';pen.textAlign='center';pen.fillText('L A N T E R N',256,151);
  pen.font='18px Arial';pen.fillText('G R A N D   R E S O R T',256,191);
  const crestMap=new THREE.CanvasTexture(crest);crestMap.colorSpace=THREE.SRGBColorSpace;
  const carPlaque=new THREE.Mesh(new THREE.PlaneGeometry(.69,.345),new THREE.MeshBasicMaterial({map:crestMap}));
  carPlaque.visible=false;scene.add(carPlaque);
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
  function cabin(shaft,y,open){
    const {x,z,angle,nx,nz,hole}=shaft;
    const piece=(tint,u,dy,v,w,h,d)=>part(tint,x+nz*u+nx*v,y+dy,z-nx*u+nz*v,w,h,d,angle);
    piece(0x9a826a,0,.012,0,1.66,.045,1.66);
    piece(0xf1ddac,0,2.30,0,1.64,.075,1.66);
    for(const side of [-1,1]){
      piece(0x68544a,side*(hole-.038),1.16,0,.055,2.32,1.7);
      piece(0xc3a26d,side*(hole-.083),.94,0,.058,.05,1.43);
      piece(0xffdf9c,side*.52,2.25,0,.074,.025,1.20);
      const width=.82*(1-open);
      if(width>.01)piece(0x9d876c,side*(.82-width/2),1.13,hole-.075,width,2.23,.055);
    }
    piece(0x574a40,0,1.15,-hole+.03,1.66,2.28,.06);
    piece(0xa88f64,0,1.40,-hole+.07,1.21,.98,.05);
    piece(0x798b86,0,1.40,-hole+.104,1.11,.88,.024);
    for(const side of [-1,1]){
      piece(0xd4b372,side*.658,1.47,-hole+.119,.045,1.27,.033);
      piece(0xf6d29a,side*.663,1.5,-hole+.143,.022,.83,.02);
    }
    carPlaque.position.set(x-nx*(hole-.128),y+1.57,z-nz*(hole-.128));
    carPlaque.rotation.y=angle;carPlaque.visible=true;
    piece(0xcdad70,0,.91,-hole+.14,1.43,.049,.08);
  }
  function lift(s,ride,rider){
    const resort=s.p.shaft;
    const {x,y,z,angle:a}=s,c=Math.cos(a),sn=Math.sin(a);
    const local=(tint,u,dy,v,w,h,d)=>part(tint,x+c*u+sn*v,y+dy,z-sn*u+c*v,w,h,d,a);
    if(resort){
      const progress=rider && Math.abs(y-rider.y)<.10;
      const opening=progress?Math.min(1,Math.hypot(rider.x-resort.x,rider.z-resort.z)/1.62):0;
      const top=s.p.panels[s.index+1]?.y-y || 3.1;
      for(const sign of [-1,1]){
        local(0x4e4d47,sign*.87,top/2,-resort.hole,.09,top,1.70);
        local(0xb99a64,sign*.80,1.21,.025,.115,2.43,.15);
        local(0x474641,sign*.80,1.22,.11,.052,2.26,.036);
        const width=.77*(1-opening);
        if(width>.012){
          local(0xac9070,sign*(.77-width/2),1.14,.006,width,2.28,.065);
          local(0x937452,sign*(.77-width/2),1.14,.044,width*.80,1.90,.019);
        }
      }
      local(0x4e4d47,0,top/2,-resort.hole*2,1.8,top,.09);
      local(0x363d3c,0,(top+2.32)/2,0,1.74,top-2.32,.11);
      local(0xae9059,0,2.34,.036,1.84,.13,.18);
      local(0x323c39,.91,1.26,.14,.12,.35,.1);
      local(0xffe2a0,.91,1.28,.209,.05,.083,.038);
    }else{
      for(const sign of [-1,1]){
        local(0x656862,sign*.72,1.12,0,.11,2.22,.13);
        local(0xacb0a6,sign*.334,1.09,.026,.65,2.13,.055);
        local(0x858d86,sign*.53,1.10,.062,.035,1.96,.026);
      }
      local(0x555e56,0,2.22,0,1.55,.11,.14);
      local(0x31454a,.90,1.21,.018,.22,.41,.065);
      local(ride?0xf7ce70:0x98e8ba,.90,1.24,.056,.11,.072,.028);
    }
    temp.position.set(x+sn*.088,y+2.48,z+c*.088);temp.scale.set(1,1,1);temp.rotation.set(0,a,0);temp.updateMatrix();
    if(textCount<labels.instanceMatrix.count)labels.setMatrixAt(textCount++,temp.matrix);
  }
  let hadVisibleRider=false;
  return (feet,doors,dt,remotes)=>{
    const room=roomAtFeet(feet,doors),l=room?.l;
    const suite=suiteKits[room?.casinoStorey];
    const model=feet.liftTravel?null:l?.residential??room?.p.residential??suite;
    if(model)furnish(model,{x:room.p.x,y:l?.y??(suite?resortLevels[room.casinoStorey].y:room.p.b.base),z:room.p.z});
    else furnish(null);
    const changedArea=Math.abs(feet.x-lastX)>6 || Math.abs(feet.z-lastZ)>6;
    if(changedArea){lastX=feet.x;lastZ=feet.z;nearby=interiorPlans.filter(p=>Math.abs(p.x-feet.x)<p.w/2+20 && Math.abs(p.z-feet.z)<p.d/2+20);}
    const newBits=JSON.stringify(doors?.roomLeaves??{}),newRev=(doors?.collapsedTowers?.length??0)+(doors?.estateBreaches?.length??0)+Object.keys(doors?.houseRuins??{}).length+Object.keys(doors?.beachWood??{}).length;
    const levelKey=Math.floor(feet.y*2),ride=feet.liftTravel;
    const remoteRider=remotes.find(p=>p.liftTravel && Math.abs(p.y-feet.y)<2.1 && Math.hypot(p.x-feet.x,p.z-feet.z)<26);
    const rideChanged=hadVisibleRider || !!remoteRider;hadVisibleRider=!!remoteRider;
    if(!rideChanged && !changedArea && l===previous && newBits===bits && newRev===revision && lastLevel===levelKey && !sliding.size && prevRide===ride && !ride)return;
    previous=l;bits=newBits;revision=newRev;lastLevel=levelKey;prevRide=ride;count=textCount=0;sliding.clear();
    carPlaque.visible=false;
    const shaft=ridingHotelShaft(feet);
    const remoteShaft=remoteRider && ridingHotelShaft(remoteRider);
    if(shaft){
      const nearLanding=nearby.find(p=>p.shaft===shaft)?.panels.some(s=>Math.abs(s.y-feet.y)<.03);
      cabin(shaft,feet.y,nearLanding?Math.min(1,Math.hypot(feet.x-shaft.x,feet.z-shaft.z)/1.62):0);
    }
    if(l){
      const p=l.p,b=p.b;
      for(const r of outsideWell({x:b.x,z:b.z,w:b.w-.42,d:b.d-.42},p.stair??p.shaft))part(0xc4af90,r.x,l.y-.043,r.z,r.w,.085,r.d);
      for(const r of outsideWell({x:b.x,z:b.z,w:b.w-.42,d:b.d-.42},p.shaft))part(0xe3dac6,r.x,l.y+l.height-.085,r.z,r.w,.12,r.d);
      for(const r of outsideWell({x:b.x,z:b.z,w:1.77,d:b.d-.85},p.stair??p.shaft))part(0x577074,r.x,l.y+.009,r.z,r.w,.016,r.d);
      for(const q of l.parts)part(q.color,q.x,q.bottom+q.h/2,q.z,q.w,q.h,q.d);
      if(!model)for(const r of l.rooms){
        part(0xb39773,r.x,l.y+.011,r.z,r.w*.73,.017,r.d*.69);
        part(0xf2deb1,r.x,l.y+l.height-.17,r.z,.55,.035,.3);
      }
      for(const d of l.doors)leaf(d,doors,dt);
    }
    for(const p of nearby){
      if(doors?.beachWood?.[p.wood] || doors?.collapsedTowers?.includes(p.b.towerId) || p.home && doors?.houseRuins?.[p.home])continue;
      for(const s of p.panels)if(Math.abs(s.y-feet.y)<2.0 && landingValid(s,doors))lift(s,ride,p.shaft && (shaft===p.shaft?feet:remoteShaft===p.shaft?remoteRider:null));
      if(p.grandDoors)for(const d of p.grandDoors[Math.floor((feet.y-.80+.16)/3.6)]??[])leaf(d,doors,dt);
      for(const d of p.entrances)if(Math.abs(d.y-feet.y)<3.5 && (!p.home || furnishingSupported(p.home,d.x,d.y,d.z,doors)))leaf(d,doors,dt);
    }
    buffer.count=count;labels.count=textCount;buffer.instanceMatrix.needsUpdate=true;
    if(buffer.instanceColor)buffer.instanceColor.needsUpdate=true;
    labels.instanceMatrix.needsUpdate=true;
  };
}
