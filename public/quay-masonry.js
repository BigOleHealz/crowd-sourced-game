import {marinaDecks} from './marina-docks.js';
import * as THREE from 'three';
import {coast,harbor,bridges} from './brickell-map.js';
import {beach} from './beach-layout.js';
import {lanternLand,ferrySlip,marketPiers} from './lantern-point.js';
import {berthing} from './lantern-buildings-layout.js';

const shores=[coast,harbor,...lanternLand];
const adjoining=[...shores,beach,ferrySlip,berthing.lip,...marketPiers,...marinaDecks,...bridges];
// Render the exposed boundary of the land union. Overlapping survey strips,
// bridge entries, the sand and the marina slipway retain their open approaches.
export function quaySegments(){
  const edges=[];
  for(const plot of shores)for(const alongX of [true,false])for(const sign of [-1,1]){
    const [low,high,crossLow,crossHigh]=alongX?['west','east','north','south']:['north','south','west','east'];
    const cross=plot[sign>0?crossHigh:crossLow],outside=cross+.03*sign;
    const neighbors=adjoining.filter(p=>outside>=p[crossLow] && outside<=p[crossHigh]
      && p[low]<plot[high] && p[high]>plot[low]);
    const cuts=[plot[low],plot[high]];
    for(const p of neighbors)cuts.push(Math.max(p[low],plot[low]),Math.min(p[high],plot[high]));
    cuts.sort((a,b)=>a-b);
    for(let i=1;i<cuts.length;i++){
      const start=cuts[i-1],end=cuts[i],middle=(start+end)/2;
      if(end-start<.08 || neighbors.some(p=>middle>=p[low] && middle<=p[high]))continue;
      edges.push({alongX,sign,cross,start,end,marina:lanternLand.includes(plot)});
    }
  }
  return edges;
}
export function addQuayMasonry(scene,solids,renderer){
  const position=[],uv=[],index=[],block=new THREE.BoxGeometry();
  for(const {alongX,sign,cross,start,end,marina} of quaySegments()){
    const point=(u,y,offset)=>alongX?[u,y,cross+sign*offset]:[cross+sign*offset,y,u];
    const base=position.length/3;
    for(const [u,y,v] of [[start,-.81,0],[end,-.81,0],[end,.675,1],[start,.675,1]]){
      position.push(...point(u,y,.018));uv.push(u/4.8,v);
    }
    const front=(alongX?1:-1)*sign>0;
    index.push(...(front?[0,1,2,0,2,3]:[0,2,1,0,3,2]).map(i=>i+base));
    // Short separate coping stones cast a narrow drip edge above the tidal band.
    for(let a=start;a<end-.05;a+=3.2){
      const b=Math.min(a+3.2,end),len=b-a-.018;
      solids.add(block,Math.sin(a*1.14)>.5?0xbcb7a3:0xc9c3ae,...point((a+b)/2,.654,-.05),
        alongX?len:.21,.085,alongX?.21:len);
    }
    if(!marina || alongX || end-start<13)continue;
    for(let u=start+3.5;u<end-2;u+=8.8){
      solids.add(block,0x403e36,...point(u,.13,.048),.115,.78,.23);
      solids.add(block,0x383c39,...point(u,.11,.104),.054,.66,.18);
      for(const y of [.38,-.13])solids.add(block,0x878174,...point(u,y,.135),.012,.03,.04);
    }
  }
  block.dispose();
  const map=new THREE.TextureLoader().load('./bayfront-seawall.webp');
  map.colorSpace=THREE.SRGBColorSpace;map.wrapS=THREE.MirroredRepeatWrapping;
  map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(index);geo.computeVertexNormals();
  const wall=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({map}));wall.receiveShadow=true;
  wall.name='Tidal seawalls';wall.userData.impactSurface='solid';scene.add(wall);
}
