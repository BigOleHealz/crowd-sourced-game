import * as THREE from 'three';
import {berthDeckY,marinaFingers,marinaRamp,marinaSpine} from './marina-docks.js';

export function addMarinaDocks(scene,batch){
  const box=new THREE.BoxGeometry(),tube=new THREE.CylinderGeometry(.5,.5,1,10);
  const walnut=0x76523d,brass=0xc3a16d,navy=0x244451,cream=0xe8e0cc;
  const timber=[0xad8460,0xb98b63,0xba926e,0xbb916a,0xb78c65];
  const block=(c,x,y,z,w,h,d,rz=0)=>batch.add(box,c,x,y,z,w,h,d,0,0,rz);
  const post=(c,x,y,z,w,h)=>batch.add(tube,c,x,y,z,w,h,w);
  function deck(r,alongZ){
    const w=r.east-r.west,d=r.south-r.north,x=(r.west+r.east)/2,z=(r.north+r.south)/2;
    block(navy,x,.35,z,w,.35,d);
    const length=alongZ?d:w,n=Math.ceil(length/.22),pitch=length/n;
    for(let i=0;i<n;i++){
      const offset=(i+.5)*pitch-length/2,c=timber[(i*7+Math.floor(i/4))%timber.length];
      block(c,x+(alongZ?0:offset),berthDeckY-.026,z+(alongZ?offset:0),alongZ?w:pitch-.01,.052,alongZ?pitch-.01:d);
    }
    for(const side of [-1,1]){
      block(walnut,x+(alongZ?side*(w/2-.06):0),.555,z+(alongZ?0:side*(d/2-.06)),alongZ?.12:w,.023,alongZ?d:.12);
    }
  }
  deck(marinaSpine,true);for(const f of marinaFingers)deck(f,false);
  const run=marinaRamp.east-marinaRamp.west,angle=Math.atan2(.24,run);
  block(navy,68.375,.555,-419,run,.24,2.9,-angle);
  for(let i=0;i<15;i++){
    const t=(i+.5)/15;block(timber[i%5],marinaRamp.west+t*run,.8-t*.24-.024,-419,run/15-.008,.048,2.9,-angle);
  }
  for(const z of [-448,-440,-428,-414]){
    post(navy,70.24,.91,z,.23,.7);post(cream,70.24,1.30,z,.17,.16);post(brass,70.24,1.40,z,.25,.05);
  }
  for(const f of marinaFingers){
    for(const x of [74.7,80.8,87.7])for(const d of [-1,1]){
      const z=f.z+d*.86;
      block(brass,x,.62,z,.26,.045,.11);
      post(brass,x,.68,z,.074,.09);block(brass,x,.735,z,.38,.07,.068);
      block(0x293e46,x,.28,f.z+d*1.105,.73,.195,.07);
    }
    for(const x of [74.4,87.95])post(0x445052,x,-.48,f.z,.25,1.65);
    block(cream,88.83,.44,f.z,.10,.07,1.93);
  }
  // A paved waiting terrace and a pair of canvas-upholstered teak settees.
  block(0xcac4b4,63.25,.816,-428.9,6.6,.032,5.85);
  for(const z of [-427.6,-430.5]){
    const side=z<-429?-1:1;
    block(walnut,64.1,1.015,z,2.25,.32,.84);
    for(const dx of [-.54,.54])block(cream,64.1+dx,1.27,z,1.055,.21,.75);
    block(0x456269,64.1,1.49,z+side*.37,2.24,.38,.15);
    for(const dx of [-1.04,1.04])block(walnut,64.1+dx,1.35,z,.12,.26,.9);
  }
  post(brass,64.15,1.06,-429.1,.12,.45);post(0xe5d7bc,64.15,1.32,-429.1,.81,.075);
  // One sign atlas covers the entrance identity and berth plates.
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=512;
  const c=atlas.getContext('2d');c.fillStyle='#183940';c.fillRect(0,0,1024,512);
  c.strokeStyle='#bba276';c.lineWidth=4;c.strokeRect(12,12,1000,246);c.textAlign='center';
  c.fillStyle='#e8d5a4';c.font='25px sans-serif';c.fillText('L A N T E R N    P O I N T',512,67);
  c.fillStyle='#fff4d8';c.font='78px Georgia,serif';c.fillText('East Quay Marina',512,156);
  c.fillStyle='#d3bd8e';c.font='32px sans-serif';c.fillText('GUEST DOCKS    ·    A    B    C',512,218);
  for(const [i,f] of marinaFingers.entries()){
    const x=i*336;c.strokeRect(x+9,290,314,197);c.font='bold 116px Georgia,serif';c.fillText(f.id,x+167,435);
  }
  const map=new THREE.CanvasTexture(atlas);map.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map});
  function face(w,h,x,y,z,yaw,u0,v0,u1,v1){
    const g=new THREE.PlaneGeometry(w,h),uv=g.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,u0+uv.getX(i)*(u1-u0),v0+uv.getY(i)*(v1-v0));
    const m=new THREE.Mesh(g,material);m.position.set(x,y,z);m.rotation.y=yaw;scene.add(m);
  }
  block(0xa49172,62.8,1.84,-422.2,.32,2.08,3.88);block(navy,62.8,2.05,-422.2,.35,1.20,3.80);
  for(const sign of [-1,1])face(3.72,1.14,62.8+sign*.181,2.05,-422.2,sign*Math.PI/2,0,.47,1,1);
  marinaFingers.forEach((f,i)=>{
    block(navy,73.7,.84,f.z-.92,.10,.54,.52);
    face(.48,.36,73.643,.87,f.z-.92,-Math.PI/2,i*336/1024,.04,(i*336+332)/1024,.45);
  });
  box.dispose();tube.dispose();
}
