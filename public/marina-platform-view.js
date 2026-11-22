import * as THREE from 'three';
import {berthDeckY} from './marina-docks.js';
import {marinaPlatform as p,towerSlabs} from './marina-platform.js';

export function addDivingTower(scene,batch){
  const stone=0xc4cec7,teal=0x255b63,rail=0xa2b9b5,cream=0xe7dfc5,gold=0xdda94d;
  const cube=new THREE.BoxGeometry(),pole=new THREE.CylinderGeometry(.5,.5,1,10);
  const box=(color,x,y,z,w,h,d)=>batch.add(cube,color,x,y,z,w,h,d);
  const beam=(color,start,end,r)=>batch.beam(color,start,end,r);
  const {x,width,exitX,exitZ,exitEnd}=p;
  for(const [i,s] of towerSlabs.entries()){
    const z=(s.south+s.north)/2,length=s.south-s.north;
    box(stone,x,s.top-.112,z,width,.224,length+.002);
    box(s.tread?0xa2b4ae:teal,x,s.top+.002,z,width-.12,.008,length-.025);
    if(i%4===0 && s.tread)box(cream,x,s.top+.009,s.south-.043,width-.20,.008,.045);
    if(!s.tread || i%8===5){
      // V frames carry the intermediate landings and the cantilever over open water.
      box(teal,x,s.top-.258,z,width+.10,.17,.28);
      if(s.tread)continue;
      const postZ=i===towerSlabs.length-1?p.near+.39:z;
      const high=s.top-.24;
      for(const side of [-1,1]){
        const px=x+side*.70;
        box(stone,px,(high-2.5)/2,postZ,.25,high+2.5,.46);
        beam(teal,[px,high-2.38,postZ],[px,high,z-.83],.089);
      }
    }
  }
  for(const side of [-1,1]){
    const px=x+side*(width/2-.04);
    let prev;
    for(const [i,slab] of towerSlabs.entries()){
      if(slab.tread && i%3!==0)continue;
      const z=slab.tread?(slab.south+slab.north)/2:slab.south-.04;
      const y=slab.top;
      const up=[px,y+.96,z],mid=[px,y+.50,z];
      beam(rail,[px,y,z],up,.035);
      if(prev){beam(rail,prev.up,up,.043);beam(rail,prev.mid,mid,.024);}
      prev={up,mid};
    }
    const end=p.near-1.5;
    beam(rail,prev.up,[px,p.deck+.96,end],.043);
    beam(rail,[px,p.deck,end],[px,p.deck+.96,end],.035);
    box(gold,px,p.deck-.055,(p.tip+p.near)/2,.083,.072,p.apron);
    box(teal,px,p.deck-.18,p.tip+1.7,.13,.24,3.4);
  }
  for(let i=0;i<5;i++)box(cream,x,p.deck+.015,p.tip+.12+i*.13,width-.28,.008,.045);
  const returnLength=p.startZ+1.2-exitZ,returnCenter=exitZ+returnLength/2;
  box(teal,exitX,berthDeckY-.16,returnCenter,p.exitWidth,.27,returnLength);
  box(0xa4896e,exitX,berthDeckY-.014,returnCenter,p.exitWidth-.04,.028,returnLength);
  for(let z=exitZ+.04;z<p.startZ+1.17;z+=.34)box(0x7f6a54,exitX,berthDeckY+.004,z,p.exitWidth-.06,.008,.012);
  const joinLeft=x-width/2,joinRight=exitX+p.exitWidth/2;
  box(0xb38f68,(joinLeft+joinRight)/2,berthDeckY-.11,p.startZ+.6,joinRight-joinLeft,.22,1.2);
  for(let i=0;i<p.exitSteps;i++){
    const z=exitZ-(i+.5)*p.exitRun,top=berthDeckY-(i+1)*p.exitRise;
    box(0x9cafa5,exitX,top-.09,z,p.exitWidth,.18,p.exitRun);
    box(gold,exitX,top+.004,z-.18,p.exitWidth-.12,.009,.06);
  }
  for(const side of [-1,1]){
    const px=exitX+side*(p.exitWidth/2-.06);
    for(const z of [exitZ,exitZ-2,exitEnd+.20]){
      const y=.52+(z-exitZ)*p.exitRise/p.exitRun;
      beam(rail,[px,y,z],[px,y+.9,z],.032);
    }
    beam(rail,[px,1.42,exitZ],[px,-.27,exitEnd+.20],.04);
    for(const z of [exitZ+1,-461,-451])batch.add(pole,teal,px,-.66,z,.20,2.45,.20);
  }
  // Buoy lines mark the swimming area. Leave the east side open to the exit.
  for(const [a,b] of [[[x-4.3,p.near],[x-4.3,p.tip-12.8]],[[x-4.3,p.tip-12.8],[exitX+1.25,p.tip-12.8]]]){
    beam(teal,[a[0],p.water+.025,a[1]],[b[0],p.water+.025,b[1]],.014);
    const count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.1);
    for(let i=0;i<=count;i++){
      const t=i/count;batch.add(pole,i%3?cream:gold,a[0]+(b[0]-a[0])*t,p.water+.04,a[1]+(b[1]-a[1])*t,.18,.15,.18);
    }
  }
  // Wayfinding remains legible from the main guest ramp and from the water.
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
  const ctx=canvas.getContext('2d');
  for(const [i,[a,b]] of [['10 M   DIVING','NORTH END   •   PIER A'],['10 M   PLATFORM','EAST QUAY   /   DIVING'],['SWIM EXIT','STAIRS   ↑']].entries()){
    const v=i*128;ctx.fillStyle='#1f474c';ctx.fillRect(0,v,768,128);
    ctx.strokeStyle='#cca957';ctx.lineWidth=5;ctx.strokeRect(7,v+7,754,114);
    ctx.fillStyle='#f6edd7';ctx.textAlign='center';ctx.font='bold 56px sans-serif';ctx.fillText(a,384,v+66);
    ctx.font='bold 27px sans-serif';ctx.fillStyle='#e5c777';ctx.fillText(b,384,v+103);
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});
  function sign(index,width,height,x,y,z,yaw){
    const geom=new THREE.PlaneGeometry(width,height),uv=geom.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,(2-index+uv.getY(i))/3);
    const mesh=new THREE.Mesh(geom,mat);mesh.position.set(x,y,z);mesh.rotation.y=yaw;scene.add(mesh);
  }
  sign(0,2.72,.45,62.62,1.14,-422.2,-Math.PI/2);
  sign(1,2.18,.48,x,p.deck-.43,p.tip-.015,Math.PI);
  sign(1,1.68,.34,x,3.05,p.startZ+.02,0);
  // Keep the base entrance open below the overhead sign.
  for(const dx of [-1,1])box(teal,x+dx,1.80,p.startZ,.09,2.48,.10);
  sign(2,1.48,.39,exitX,.70,exitEnd+.12,Math.PI);
  cube.dispose();pole.dispose();
}
