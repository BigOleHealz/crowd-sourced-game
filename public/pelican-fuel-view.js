import * as THREE from 'three';
import {fuelStop,pumpIslands} from './fire-sites.js';

export function addFuelStop(scene,Batch,solids){
  const {x,z}=fuelStop;
  const box=new THREE.BoxGeometry(),building=new Batch(),labels=new Batch(true);
  const add=(tint,cx,y,cz,w,h,d)=>building.add(box,tint,cx,y,cz,w,h,d);
  // A continuous open apron connects both drives to the north coast road.
  solids.add(box,0xaaaca0,x,.805,z+1.7,22,.035,13.4);
  for(const cx of pumpIslands){
    for(const side of [-1,1])solids.add(box,0xd4cfaf,cx+side*1.85,.830,z,.06,.012,5.05);
    add(0xa4aba3,cx,.90,z,1.18,.18,2.65);
    add(0x405c5c,cx,1.51,z,.78,1.1,1.15);
    add(0xf1ebd3,cx,2.28,z,.79,.80,1.15);
    add(0x12786d,cx,2.725,z,.83,.12,1.19);
    add(0xf0bc55,cx,2.60,z,.80,.055,1.165);
    add(0xc9d2c6,cx,2.88,z-1.04,.22,4.08,.26);
    for(const s of [-1,1]){
      add(0x2f5554,cx,1.64,z+s*.58,.63,.72,.025);
      for(let v=0;v<5;v++)add(0x243d3a,cx,1.30+v*.055,z+s*.60,.36,.017,.017);
      for(const corner of [-1,1])add(0xb8bcb0,cx+corner*.36,1.85,z+s*.57,.037,1.55,.047);
      // Guard posts and rounded hoop bumpers belong to the raised island.
      add(0xb59e56,cx+s*.43,1.16,z+.99,.10,.38,.10);
      add(0x384b49,cx+s*.43,1.24,z+.99,.104,.11,.104);
      add(0x263736,cx+s*.405,2.31,z,.023,.255,.65);
      add(0x91b9a8,cx+s*.422,2.34,z,.012,.076,.42);
      add(0x1d504c,cx+s*.41,1.52,z,.018,.32,.67);
    }
  }
  add(0xc3c8b8,x,4.86,z,13.8,.14,7.2);
  add(0x18756e,x,5.07,z,13.8,.36,7.2);
  add(0xf3c063,x,5.16,z,13.83,.060,7.225);
  for(const side of [-1,1])for(const cx of pumpIslands){
    add(0xf4e8bd,cx,4.769,z+side*2.05,1.14,.033,.21);
  }
  const px=x-8.8,pz=z+4.65;
  add(0x647c75,px,2.72,pz,.25,3.84,.26);
  add(0xe1d8b7,px,4.27,pz,2.62,1.53,.22);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
  const ink=canvas.getContext('2d');
  ink.fillStyle='#174b48';ink.fillRect(0,0,1024,512);
  ink.fillStyle='#efb543';ink.fillRect(0,12,1024,8);ink.fillRect(0,489,1024,8);
  // The station mark is a pelican in profile with a long golden bill.
  ink.fillStyle='#fff2cf';ink.beginPath();ink.moveTo(55,217);ink.quadraticCurveTo(111,248,146,190);
  ink.bezierCurveTo(185,123,214,143,225,154);ink.lineTo(218,166);ink.lineTo(186,168);
  ink.quadraticCurveTo(184,247,142,255);ink.quadraticCurveTo(93,272,55,217);ink.fill();
  ink.fillStyle='#efb543';ink.beginPath();ink.moveTo(202,156);ink.lineTo(305,161);ink.lineTo(225,181);ink.lineTo(201,170);ink.fill();
  ink.fillStyle='#fff2cf';ink.font='bold 122px sans-serif';ink.fillText('PELICAN',295,255,690);
  ink.font='bold 66px sans-serif';ink.textAlign='center';ink.fillText('F U E L   /   H A R B O R   K E Y',512,384,925);
  ink.textAlign='left';
  ink.fillStyle='#d8ded3';ink.fillRect(0,512,1024,288);
  ink.fillStyle='#1c3433';ink.fillRect(20,529,680,177);
  ink.fillStyle='#9db5a5';ink.fillRect(42,548,634,136);
  ink.fillStyle='#263d34';ink.font='bold 45px monospace';ink.fillText('READY',77,604);
  ink.font='bold 33px monospace';ink.fillText('0.000',515,663);
  ink.fillStyle='#283c3a';ink.fillRect(746,545,235,155);ink.fillStyle='#a8bcae';
  for(let i=0;i<9;i++)ink.fillRect(770+(i%3)*63,561+Math.floor(i/3)*41,43,21);
  for(const [i,col] of ['#5c8b6f','#dda340','#99643d'].entries()){
    ink.fillStyle=col;ink.fillRect(35+i*201,724,172,51);
  }
  ink.fillStyle='#eaddbe';ink.fillRect(0,812,1024,212);ink.fillStyle='#176b60';ink.fillRect(0,821,1024,194);
  ink.fillStyle='#ffedc6';ink.textAlign='center';ink.font='bold 117px sans-serif';ink.fillText('PELICAN  FUEL',512,959,950);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  function panel(start,end){
    const g=new THREE.PlaneGeometry(1,1),uv=g.attributes.uv.clone();
    for(let i=0;i<uv.count;i++)uv.setY(i,1-end/1024+(end-start)/1024*uv.getY(i));
    g.setAttribute('batchUv',uv);return g;
  }
  const placard=panel(0,512),display=panel(512,800),banner=panel(812,1024);
  labels.add(placard,0xffffff,px,4.27,pz+.12,2.48,1.38,1);
  labels.add(placard,0xffffff,px,4.27,pz-.12,2.48,1.38,1,0,Math.PI);
  for(const side of [-1,1]){
    for(const cx of pumpIslands)labels.add(display,0xffffff,cx,2.29,z+side*.585,.68,.38,1,0,side<0?Math.PI:0);
    labels.add(banner,0xffffff,x,5.062,z+side*3.615,3.1,.39,1,0,side<0?Math.PI:0);
  }
  const material=new THREE.MeshLambertMaterial({vertexColors:true});
  const trim=building.mesh(scene,material);trim.userData.impactSurface='metal';
  const letterMat=new THREE.MeshLambertMaterial({map,vertexColors:true});
  labels.mesh(scene,letterMat,false);
  box.dispose();placard.dispose();display.dispose();banner.dispose();
  let burned=false;
  return doors=>{
    const next=doors?.fires?.[fuelStop.id]?.stage==='burned';
    if(next===burned)return;
    burned=next;material.color.setHex(burned?0x5b5146:0xffffff);
    letterMat.color.setHex(burned?0x655a4b:0xffffff);
  };
}
