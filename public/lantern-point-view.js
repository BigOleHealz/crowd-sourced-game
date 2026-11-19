import * as THREE from 'three';
import {verges} from './waterfront-roads.js';
import {lanternLand,lanternRoads,lanternSigns,ferrySlip,slipHeight,marketPiers,pierDeck,bollards,benches,gardens,quayLamps,marketStalls} from './lantern-point.js';

export function addLanternPoint(scene,solids,ground,patch) {
  const box=new THREE.BoxGeometry(),post=new THREE.CylinderGeometry(.5,.5,1,12);
  const paved=[];
  for(const strip of lanternLand){
    const [x,,z,w,d]=patch(strip,.8);
    solids.add(box,0x9e9786,x,-.42,z,w,2.20,d);
    for(const lot of verges(strip,lanternRoads)){
      const [lx,,lz,lw,ld]=patch(lot,.8);
      solids.add(box,0xbfb9a9,lx,.747,lz,lw,.10,ld);
      paved.push(...verges(lot,gardens));
    }
  }
  ground('pavers',paved.map(l=>patch(l,.80)),3);
  ground('lawn',gardens.map(l=>patch(l,.806)),2.8);
  const paint=(x,z,w,d,tint)=>solids.add(box,tint,x,.715,z,w,.012,d);
  for(const x of [-49,0,49]){
    const end=x===0?-352:-370;
    for(let z=-463;z<end;z+=4.2)if([-466,-419,-370].every(i=>Math.abs(i-z)>5.7)){
      paint(x,z,.115,2.0,0xe5bd6a);
    }
  }
  for(const z of [-466,-419,-370]){
    for(let x=-46;x<47;x+=4.2)if(Math.abs(x)>6.5)paint(x,z,2.1,.12,0xe5bd6a);
    for(const side of [-1,1])for(let i=-3;i<=3;i++)paint(i*1.13,z+side*6.1,.52,1.40,0xece9d7);
  }
  for(let z=-278;z<-262;z+=4)paint(0,z,.13,2.15,0xe5bd6a);
  // Precast ribbed slip, with its highest edge flush against the ferry apron.
  const {west,east,north,south}=ferrySlip,dx=east-west,dz=south-north;
  const a=Math.atan2(slipHeight(west)-slipHeight(east),dx),mid=(west+east)/2;
  solids.add(box,0xaea997,mid,slipHeight(mid)-.08,(north+south)/2,dx/Math.cos(a),.16,dz,0,0,-a);
  for(let x=west+.4;x<east;x+=.7)solids.add(box,0x9b9887,x,slipHeight(x)+.005,(north+south)/2,.038,.016,dz-.18,0,0,-a);
  for(const pier of marketPiers){
    const d=pier.south-pier.north,z=(pier.north+pier.south)/2;
    for(let x=pier.west+.125;x<pier.east;x+=.25)
      solids.add(box,0xa68b6b,x,pierDeck-.075,z,.245,.15,d);
    for(let x=pier.west+.6;x<pier.east;x+=3.7)for(const side of [-1,1]){
      solids.add(post,0x685d50,x,-.79,z+side*.74,.24,2.43,.24);
      solids.add(box,0x54524a,x,pierDeck-.17,z+side*.80,.35,.16,.31);
    }
  }
  for(const {x,z} of bollards){
    solids.add(post,0x414e4e,x,1.10,z,.27,.60,.27);
    solids.add(post,0xd4c397,x,1.46,z,.35,.13,.35);
  }
  for(const {x,z} of benches){
    for(const side of [-1,1])solids.add(box,0x58645c,x+side*.75,1.01,z,.12,.43,.44);
    for(const side of [-1,1])solids.add(box,0x967352,x,1.27,z+side*.135,2.20,.12,.24);
    solids.add(box,0x987452,x,1.53,z-.216,2.20,.20,.085);
  }
  for(const {x,z} of quayLamps){
    solids.add(post,0x465953,x,.925,z,.28,.25,.28);
    solids.add(post,0x4c6258,x,2.32,z,.112,2.9,.112);
    solids.add(post,0x9e875b,x,3.74,z,.30,.09,.30);
    solids.add(post,0xd7d6b4,x,3.99,z,.27,.43,.27);
    for(const dx of [-.1,.1])for(const dz of [-.1,.1])
      solids.add(box,0x526158,x+dx,3.99,z+dz,.028,.46,.028);
    solids.add(post,0x526159,x,4.24,z,.38,.10,.38);
    solids.add(post,0x9b8255,x,4.37,z,.085,.19,.085);
  }
  // Striped canvas stalls between the ferry hall and the market street.
  for(const {x,z,tint} of marketStalls){
    for(const side of [-1,1])for(const end of [-1,1])
      solids.add(box,0x716453,x+side*2.48,2.05,z+end*1.41,.10,2.5,.10);
    const angle=.31;
    for(let i=0;i<10;i++)for(const side of [-1,1]){
      const xx=x-2.7+(i+.5)*.54,col=i%2?tint:0xe7d7ae;
      solids.add(box,col,xx,3.55,z+side*.8,.54,.06,1.6/Math.cos(angle),side*angle);
      solids.add(box,col,xx,3.23,z+side*1.6,.54,.17,.05);
    }
    solids.add(box,0x926e4e,x,1.26,z-.68,4.2,.91,.72);
    solids.add(box,0xbea67e,x,1.76,z-.68,4.22,.09,.74);
    for(let i=0;i<4;i++){
      const xx=x-1.55+i*1.02;
      solids.add(box,0xab825b,xx,1.87,z-.68,.88,.15,.55);
      solids.add(box,[0xb7ab87,0xb97846,0x8e935f,0xb7b3a2][i],xx,1.96,z-.68,.72,.09,.39);
    }
  }
  const labels=new THREE.PlaneGeometry(4.5,1.22);
  for(const {x,z,label,sub} of lanternSigns){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=208;
    const c=canvas.getContext('2d');c.fillStyle='#d5d1af';c.fillRect(0,0,768,208);
    c.fillStyle='#174d54';c.fillRect(6,6,756,196);
    c.textAlign='center';c.fillStyle='#f2ead5';c.font='bold 71px sans-serif';c.fillText(label,384,105);
    c.fillStyle='#e1c597';c.font='34px sans-serif';c.fillText(sub,384,162);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(labels,new THREE.MeshBasicMaterial({map}));
    face.position.set(x,3.56,z+.08);scene.add(face);
    solids.add(box,0x446768,x,3.56,z,4.53,1.25,.14);
    for(const side of [-1,1])solids.add(box,0x697c77,x+side*1.4,2.11,z,.14,2.65,.14);
  }
  box.dispose();post.dispose();
}
