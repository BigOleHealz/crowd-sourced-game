import * as THREE from 'three';
import {berthDeckY} from './marina-docks.js';
import {marinaPlatform as p,rungPitch} from './marina-platform.js';

export function addDivingTower(scene,batch){
  const stone=0xc4cec7,teal=0x255b63,rail=0xa2b9b5,cream=0xe7dfc5,gold=0xdda94d;
  const cube=new THREE.BoxGeometry(),pole=new THREE.CylinderGeometry(.5,.5,1,10);
  const box=(color,x,y,z,w,h,d)=>batch.add(cube,color,x,y,z,w,h,d);
  const beam=(color,start,end,r)=>batch.beam(color,start,end,r);
  const {x,width,exitX,exitZ,exitEnd}=p;
  const approach=p.startZ-p.near,mid=(p.startZ+p.near)/2,deckMid=(p.tip+p.near)/2;
  box(teal,x,berthDeckY-.13,mid,width,.26,approach);
  box(0xa4896e,x,berthDeckY-.014,mid,width-.04,.028,approach);
  for(let z=p.near+.07;z<p.startZ;z+=.34)box(0x7f6a54,x,berthDeckY+.004,z,width-.06,.008,.012);
  box(stone,x,p.deck-.12,deckMid,width,.24,p.apron);
  box(0x729b96,x,p.deck-.006,deckMid,width-.11,.024,p.apron-.03);
  const ladderFace=p.near+.06;
  for(const side of [-1,1]){
    const edge=x+side*width/2,post=x+side*.77,stile=x+side*.43;
    box(teal,post,(p.deck-2.5)/2,p.near-.33,.25,p.deck+2.5,.28);
    beam(teal,[post,p.deck-2.03,p.near-.33],[post,p.deck-.20,p.tip+.64],.13);
    beam(rail,[stile,berthDeckY,ladderFace],[stile,p.deck+.98,ladderFace],.058);
    beam(rail,[stile,p.deck+.98,ladderFace],[edge,p.deck+.98,p.near-.12],.05);
    for(const h of [.48,.98]){
      beam(rail,[edge,p.deck+h,p.near-.12],[edge,p.deck+h,p.near-1.5],.044);
      beam(rail,[edge,berthDeckY+h,p.startZ],[edge,berthDeckY+h,p.near+.10],.041);
    }
    for(const z of [p.near-.12,p.near-1.5])beam(rail,[edge,p.deck,z],[edge,p.deck+.98,z],.045);
    for(let z=p.near+.12;z<p.startZ;z+=2.2)beam(rail,[edge,berthDeckY,z],[edge,berthDeckY+.98,z],.04);
    for(const z of [p.startZ,-457,p.near+.22])box(teal,post,(berthDeckY-2.1)/2,z,.17,berthDeckY+2.1,.19);
    box(gold,edge,p.deck-.055,deckMid,.083,.072,p.apron);
  }
  for(let i=1;i<=p.rungs;i++){
    const y=berthDeckY+i*rungPitch;
    beam(i%5===0?gold:rail,[x-.43,y,ladderFace],[x+.43,y,ladderFace],.057);
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
  for(const [i,[a,b]] of [['10 M   DIVING','NORTH END   •   PIER A'],['10 M   PLATFORM','CLIMB THE LADDER'],['SWIM EXIT','STAIRS   ↑']].entries()){
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
  sign(1,1.68,.34,x,3.05,p.startZ+.055,0);
  box(teal,x,3.05,p.startZ,1.74,.39,.08);
  // Keep the base entrance open below the overhead sign.
  for(const dx of [-1,1])box(teal,x+dx,1.80,p.startZ,.09,2.48,.10);
  sign(2,1.48,.39,exitX,.70,exitEnd+.12,Math.PI);
  cube.dispose();pole.dispose();
}
