import * as THREE from 'three';
import {garageRails,garageSlabs,garageColumns,garageBase,garageUpper,garageRamp} from './resort-parking.js';

export function addResortParking(scene,Batch){
  const stone=new Batch(),metal=new Batch(),glow=new Batch();
  const box=new THREE.BoxGeometry(),cylinder=new THREE.CylinderGeometry(.5,.5,1,16);
  const sand=0xc9bda7,bronze=0xb1884b,teal=0x1c4244,glowGold=0xffdfa0;
  const block=(batch,color,x,y,z,w,h,d)=>batch.add(box,color,x,y,z,w,h,d);
  block(stone,0x807b75,-81.42,-.06,47.5,19.20,1.48,35);
  block(stone,0x4a5054,-81.32,.705,60,19.1,.022,10);
  block(stone,0x797c79,-81.52,.778,43,18.96,.05,26);
  for(const s of garageSlabs)block(stone,0x92938c,s.x,garageUpper-.14,s.z,s.w,.28,s.d);
  const r=garageRamp,rise=garageUpper-garageBase,run=r.south-r.north,a=Math.atan2(rise,run);
  stone.add(box,0x777d79,(r.west+r.east)/2,(garageUpper+garageBase)/2-.11,(r.south+r.north)/2,r.east-r.west+.8,.22,Math.hypot(run,rise),a);
  for(let z=39;z<55;z+=1.0){
    const y=garageBase+(55-z)*rise/run;
    metal.add(box,0xd6c398,-87.6,y+.013,z,.17,.018,.47,a);
  }
  for(const b of garageRails){
    if(b.h-b.bottom>1)continue;
    const y=garageBase+b.bottom;
    block(stone,sand,b.x,y+.17,b.z,b.w,.34,b.d);
    for(const name of [0,1]){
      const by=y+.50+name*.29;
      block(metal,name?bronze:teal,b.x,by,b.z,b.w,.048,b.d);
    }
    const horizontal=b.w>b.d,len=horizontal?b.w:b.d,n=Math.ceil(len/2.6);
    for(let j=0;j<=n;j++){
      const off=(j/n-.5)*(len-.08);
      block(metal,teal,b.x+(horizontal?off:0),y+.53,b.z+(horizontal?0:off),.061,.53,.061);
    }
  }
  for(const [x,z] of garageColumns){
    block(stone,sand,x,2.77,z,.38,3.94,.38);
    for(let y=1.15;y<1.8;y+=.22)block(metal,bronze,x,y,z,.405,.068,.405);
  }
  for(const y of [garageBase,garageUpper]){
    for(const z of [34.9,38.1,41.3,49.5,52.7]){
      block(metal,0xf4e4ae,-75.09,y+.019,z,4.34,.022,.075);
      block(stone,0xbab7a8,-73.19,y+.105,z+.81,.25,.21,1.25);
    }
  }
  for(const z of [33.4,39.7,46.1,52.4]){
      block(glow,glowGold,-76.25,garageUpper-.31,z,3.1,.045,.09);
      block(metal,bronze,-76.25,garageUpper-.278,z,3.28,.05,.18);
  }
  // The green entry lanterns and the illuminated totem are readable from the avenue.
  function sign(text,small,x,y,z,yaw,w,h){
    const c=document.createElement('canvas');c.width=640;c.height=192;
    const ctx=c.getContext('2d');ctx.fillStyle='#163b3d';ctx.fillRect(0,0,c.width,c.height);
    ctx.strokeStyle='#d4b36f';ctx.lineWidth=5;ctx.strokeRect(9,9,622,174);ctx.textAlign='center';
    ctx.fillStyle='#ffedbd';ctx.font='bold 72px Georgia';ctx.fillText(text,320,93,594);
    ctx.font='30px sans-serif';ctx.fillText(small,320,148,580);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));
    mesh.position.set(x,y,z);mesh.rotation.y=yaw;scene.add(mesh);
  }
  block(metal,teal,-78.8,2.06,62.5,.23,2.73,.24);
  sign('PARKING','LANTERN CLUB   ·   P1 / P2',-78.68,2.97,62.4,Math.PI/2,3.9,1.17);
  sign('CASINO','LOBBY ENTRANCE   →',-72.65,2.55,48.55,-Math.PI/2,2.50,.75);
  sign('P2','WATERFRONT TERRACE',-77.8,4.10,55.99,0,3.12,.94);
  for(const x of [-90.2,-84.5]){
    metal.add(cylinder,teal,x,1.15,56.8,.22,.88,.22);
    glow.add(cylinder,0x72ffd0,x,1.62,56.8,.225,.12,.225);
  }
  stone.mesh(scene,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}),false);
  metal.mesh(scene,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.53,metalness:.24}),false);
  glow.mesh(scene,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}),false);
  box.dispose();cylinder.dispose();
}
