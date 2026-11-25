import {estatePoolHoles} from './swimming-pools.js';
import {addMarinaDocks} from './marina-dock-view.js';
import * as THREE from 'three';
import {verges} from './waterfront-roads.js';
import {lanternLand,lanternRoads,lanternSigns,ferrySlip,slipHeight,marketPiers,pierDeck,bollards,benches,gardens,quayLamps} from './lantern-point.js';
import {dockPileSpan} from './dock-piles.js';

export function addLanternPoint(scene,solids,ground,patch,posts) {
  const box=new THREE.BoxGeometry(),post=new THREE.CylinderGeometry(.5,.5,1,12);
  addMarinaDocks(scene,solids);
  const paved=[];
  for(const strip of lanternLand.flatMap(r=>verges(r,estatePoolHoles))){
    const [x,,z,w,d]=patch(strip,.8);
    solids.add(box,0x9e9786,x,-.42,z,w,2.20,d);
    for(const lot of verges(strip,lanternRoads)){
      const [lx,,lz,lw,ld]=patch(lot,.8);
      solids.add(box,0xbfb9a9,lx,.747,lz,lw,.10,ld);
      paved.push(...verges(lot,gardens));
    }
  }
  ground('pavers',paved.map(l=>patch(l,.80)),3);
  ground('lawn',gardens.flatMap(r=>verges(r,estatePoolHoles)).map(l=>patch(l,.806)),2.8);
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
      const pileZ=z+side*.74,{y,height}=dockPileSpan(x,pileZ,pierDeck-.155);
      solids.add(post,0x685d50,x,y,pileZ,.24,height,.24);
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
  for(const {x,z,postId} of quayLamps){
    posts.add(postId,x,.8,z,solids=>{
    solids.add(post,0x465953,x,.925,z,.28,.25,.28);
    solids.add(post,0x4c6258,x,2.32,z,.112,2.9,.112);
    solids.add(post,0x9e875b,x,3.74,z,.30,.09,.30);
    solids.add(post,0xd7d6b4,x,3.99,z,.27,.43,.27);
    for(const dx of [-.1,.1])for(const dz of [-.1,.1])
      solids.add(box,0x526158,x+dx,3.99,z+dz,.028,.46,.028);
    solids.add(post,0x526159,x,4.24,z,.38,.10,.38);
    solids.add(post,0x9b8255,x,4.37,z,.085,.19,.085);
    });
  }
  const labels=new THREE.PlaneGeometry(4.5,1.22);
  for(const [i,{x,z,label,sub}] of lanternSigns.entries()){
    posts.add('lantern-sign-'+i,x,.8,z,solids=>{
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=208;
    const c=canvas.getContext('2d');c.fillStyle='#bd9c68';c.fillRect(0,0,768,208);
    c.fillStyle='#213c39';c.fillRect(6,6,756,196);
    c.textAlign='center';c.fillStyle='#f2ead5';c.font='63px Georgia,serif';c.fillText(label,384,105,696);
    c.fillStyle='#e1c597';c.font='27px sans-serif';c.fillText(sub,384,162);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
    const face=new THREE.Mesh(labels,new THREE.MeshBasicMaterial({map}));
    face.position.set(x,3.56,z+.08);scene.add(face);
    solids.add(box,0x446768,x,3.56,z,4.53,1.25,.14);
    for(const side of [-1,1])solids.add(box,0x697c77,x+side*1.4,2.11,z,.14,2.65,.14);
    return face;
    });
  }
  box.dispose();post.dispose();
}
