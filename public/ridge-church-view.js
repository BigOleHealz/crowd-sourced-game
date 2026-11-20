import * as THREE from 'three';
import {church,churchParts} from './ridge-church.js';

export function buildRidgeChurch(batch){
  const box=new THREE.BoxGeometry(), stone=0xb7ac94, trim=0xd8cbb2, oak=0x664735, slate=0x424c51;
  const colors={stone,floor:0xaa9982,landing:oak,step:0x916c4c,rail:stone,cap:slate};
  const add=(color,x,y,z,w,h,d,roll=0)=>batch.add(box,color,x,church.base+y,church.z+z,w,h,d,0,0,roll);
  const beam=(a,b,color,width,depth)=>batch.beam(color,[a[0],church.base+a[1],church.z+a[2]],[b[0],church.base+b[1],church.z+b[2]],width,depth);
  for(const p of churchParts){
    const z=p.z-church.z,h=p.h-p.bottom;
    if(p.kind==='pew'){
      add(oak,p.x,.52,z,p.w,.14,.70);
      add(0x835c3d,p.x,.77,z+.31,p.w,.43,.12);
      for(const side of [-1,1])add(0x543d30,p.x+side*p.w*.41,.32,z,.16,.52,.68);
    }else if(p.kind==='table'){
      add(oak,p.x,.98,z,p.w,.14,p.d);
      for(const side of [-1,1])add(oak,p.x+side*.66,.54,z,.18,.90,.60);
      add(0xcdbda0,p.x,1.08,z,.69,.06,.83);
    }else if(p.kind==='glass'){
      const tones=[0x527982,0xa77346,0x595d83,0x875554];
      for(let i=0;i<4;i++)for(let j=0;j<5;j++)
        add(tones[(i+j*3)%4],p.x,1.44+(j+.5)*h/5,z+(i-1.5)*p.d/4,.11,h/5-.023,p.d/4-.022);
      for(const edge of [-1,1])add(trim,p.x,2.65,z+edge*.90,.43,2.55,.11);
      add(trim,p.x,1.42,z,.48,.14,1.94);
      add(trim,p.x,3.88,z,.45,.15,1.94);
    }else if(colors[p.kind]!==undefined){
      add(colors[p.kind],p.x,(p.h+p.bottom)/2,z,p.w,h,p.d);
    }
  }
  // A blue slate gable with exposed oak trusses over the aisle.
  const angle=Math.atan(.48);
  for(const side of [-1,1]){
    add(slate,side*2.59,6.48,.5,5.76,.19,13.95,-side*angle);
    add(trim,side*5.12,5.22,.5,.28,.23,13.8);
    for(const z of [-5.8,-2.6,.6,3.8,6.9]){
      beam([side*4.9,5.08,z],[0,7.47,z],oak,.18,.19);
      beam([side*4.7,4.40,z],[side*3.36,5.54,z],oak,.13,.14);
      add(trim,side*5.17,2.00,z,.52,3.95,.46);
      add(trim,side*5.17,.40,z,.70,.78,.68);
    }
  }
  for(const z of [-6,7]){
    const verts=new Float32Array([-5,5.3,z,5,5.3,z,0,7.70,z]);
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(verts,3));g.setIndex([0,1,2,2,1,0]);g.computeVertexNormals();
    batch.add(g,stone,0,church.base,church.z);g.dispose();
  }
  // Open oak door leaves, a stone arch and a glazed rose window.
  for(const side of [-1,1]){
    add(oak,side*1.53,1.55,6.32,.13,2.92,1.32);
    add(trim,side*1.56,1.61,7,.30,3.08,.52);
    for(let n=0;n<5;n++)add(0xa99c88,side*1.92, .39+n*.65,7.22,.42,.22,.09);
  }
  for(let i=0;i<11;i++){
    const a=(i+.5)*Math.PI/11;
    add(trim,1.54*Math.cos(a),2.65+1.00*Math.sin(a),7.19,.42,.30,.31,a-Math.PI/2);
  }
  const disk=new THREE.CylinderGeometry(1,1,1,24);
  for(const [r,c,dz] of [[1.04,trim,.22],[.83,0x485f72,.28],[.26,0xc29b61,.34]])
    batch.add(disk,c,0,church.base+5.18,church.z+7+dz,r,.11,r,Math.PI/2);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    beam([0,5.18,7.35],[.8*Math.cos(a),5.18+.8*Math.sin(a),7.35],trim,.055,.07);
  }
  for(const z of [-4.25,-.95,2.35,5.65])add(oak,0,5.0,z,9.85,.19,.19);
  const bell=new THREE.LatheGeometry([new THREE.Vector2(.56,0),new THREE.Vector2(.61,.08),new THREE.Vector2(.45,.23),new THREE.Vector2(.32,.63),new THREE.Vector2(.16,.72)],24);
  batch.add(bell,0x8c7957,0,church.base+9.14,church.z-9.8);
  add(oak,0,10.05,-9.8,5.32,.22,.32);
  beam([0,9.72,-9.8],[0,10.04,-9.8],slate,.10,.10);
  const spire=new THREE.ConeGeometry(1,1,4).rotateY(Math.PI/4);
  batch.add(spire,0x455952,0,church.base+13.95,church.z-9.8,4.26,6.3,5.46);
  add(0xc0a369,0,17.49,-9.8,.13,1.65,.13);
  add(0xc0a369,0,17.66,-9.8,.83,.12,.13);
  box.dispose();bell.dispose();disk.dispose();spire.dispose();
}
