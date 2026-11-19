import {harborSigns,signalPost} from './scenery-layout.js';
import { retailRecess, streetShops } from './street-shops.js';
import { avenueFrontage } from './avenue-frontage.js';
import {addCauseway} from './causeway-view.js';
import { addBeach } from './beach-view.js';
import * as THREE from 'three';
import { addPalms } from './coconut-palms.js';
import { MAP } from './world.js';
import { avenues, streets, coast, harbor, causeway, bayfrontLawns } from './brickell-map.js';

export function cityStreets(scene,renderer,Batch,panorama) {
  addBeach(scene,Batch);
  const loader=new THREE.TextureLoader(), box=new THREE.BoxGeometry();
  function material(name, options={}) {
    const map=loader.load('./brickell-'+name+'.webp',()=>{renderer.shadowMap.needsUpdate=true;});
    map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    // Mirror the photographed wave edges so adjacent water tiles meet at the surface.
    map.wrapS=map.wrapT=name==='water' ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({map,roughness:.83,vertexColors:true,...options});
  }
  const furniture=new Batch(),solids=new Batch(), walls=new Batch(true);
  function ground(name,rectangles,period,options={}) {
    const batch=new Batch(true), plane=new THREE.PlaneGeometry().rotateX(-Math.PI/2);
    for(const [x,y,z,w,d] of rectangles) {
      const uv=plane.attributes.uv.clone();
      for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*w/period,uv.getY(i)*d/period);
      plane.setAttribute('batchUv',uv);
      batch.add(plane,0xffffff,x,y,z,w,1,d);
    }
    const mesh=batch.mesh(scene,material(name,options),false);
    mesh.userData.impactSurface=name==='asphalt'?'asphalt':'solid';plane.dispose();
  }
  const {west,east,north,south}=coast, w=east-west,d=south-north,cx=(west+east)/2,cz=(north+south)/2;
  ground('water',[[0,MAP.waterY,-102,730,820]],14,{roughness:.28});
  const patch=(r,y)=>[(r.west+r.east)/2,y,(r.north+r.south)/2,r.east-r.west,r.south-r.north];
  const harborAvenue={...harbor,west:-6,east:6};
  const cross={...harbor,north:harbor.crossing-4.5,south:harbor.crossing+4.5};
  ground('asphalt',[[cx,.70,cz,w,d],patch(harborAvenue,.70),patch(cross,.705)],5);
  const lots=[],lawns=bayfrontLawns.map(r=>patch(r,.812));
  const xs=[[west,-43.7],[-32.3,-5.7],[5.7,26.3],[37.7,east]];
  const zs=[[north,-49.1],[-40.9,-13.1],[-4.9,22.9],[31.1,56.9],[65.1,south]];
  for(const [x1,x2] of xs) for(const [z1,z2] of zs) {
    const x=(x1+x2)/2,z=(z1+z2)/2;
    lots.push([x,.80,z,x2-x1,z2-z1]);
    solids.add(box,0xbab4a4,x,.735,z,x2-x1,.12,z2-z1);
  }
  for(const [west,east] of [[harbor.west,-6],[6,harbor.east]]) {
    for(const [north,south] of [[harbor.north,cross.north],[cross.south,harbor.south]]) {
      const r={west,east,north,south};lawns.push(patch(r,.80));
    }
  }
  solids.add(box,0xa99985,...patch(harbor,.15).slice(0,3),harbor.east-harbor.west,1,harbor.south-harbor.north);
  addCauseway(scene,Batch,solids,material('asphalt'));
  for(let z=harbor.north+2;z<causeway.north;z+=4){
    if(Math.abs(z-harbor.crossing)<6)continue;
    solids.add(box,0xe3bc67,0,.718,z,.12,.014,2.25);
  }
  // Face northbound traffic from the sidewalk before the causeway and at landfall.
  for(const [x,z,label] of harborSigns) {
    const face=document.createElement('canvas');face.width=640;face.height=144;
    const ink=face.getContext('2d');
    ink.fillStyle='#e3e6cd';ink.fillRect(0,0,640,144);
    ink.fillStyle='#205448';ink.fillRect(6,6,628,132);
    ink.fillStyle='#fff9dd';ink.textAlign='center';ink.textBaseline='middle';
    ink.font='bold 70px sans-serif';ink.fillText(label,320,74);
    const texture=new THREE.CanvasTexture(face);texture.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.8,.86),new THREE.MeshBasicMaterial({map:texture}));
    sign.position.set(x,3.62,z+.08);scene.add(sign);
    solids.add(box,0x737c70,x,3.62,z,3.82,.88,.13);
    for(const side of [-1,1])solids.add(box,0x8c9287,x+side*1.3,2.05,z,.10,2.68,.10);
  }
  ground('pavers',lots,3);ground('lawn',lawns,3);
  solids.add(box,0xa59f90,cx,.15,cz,w,1,d);
  const stripe=(x,z,w,d,tint=0xe9e5d4)=>solids.add(box,tint,x,.713,z,w,.012,d);
  for(const x of avenues) {
    for(let z=north+2;z<south;z+=2.8) {
      if(streets.some(s=>Math.abs(z-s)<6.9)) continue;
      for(const dx of [-.12,.12]) stripe(x+dx,z,.095,2.8,0xd6a446);
      for(const dx of [-3,3]) stripe(x+dx,z,.09,1.2);
    }
    for(const z of streets) {
      for(const side of [-1,1]) for(let k=-5;k<=5;k++) stripe(x+k*.89,z+side*5.45,.44,1.75);
      const {x:lx,z:lz}=signalPost(x,z);
      furniture.add(box,0x657473,lx,3.0,lz,.16,4.5,.16);
      furniture.beam(0x677775,[lx,5.1,lz],[x+1.8,5.08,lz],.12);
      furniture.add(box,0x555745,x+1.5,4.7,lz,.34,.87,.32);
      for(let k=0;k<3;k++) furniture.add(box,[0xac4634,0x68563a,0x52987b][k],x+1.5,4.93-k*.23,lz+.168,.14,.15,.02);
    }
  }
  // UV islands preserve the scale of windows regardless of each tower's height.
  function atlas(shape,col,row,cols,rows) {
    const uv=shape.attributes.uv.clone();
    for(let i=0;i<uv.count;i++) uv.setXY(i,(col+.008+.984*uv.getX(i))/cols,(row+.008+.984*uv.getY(i))/rows);
    shape.setAttribute('batchUv',uv);return shape;
  }
  const updateDoors=avenueFrontage(scene,renderer,Batch,solids,furniture,box,panorama);
  furniture.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true})).userData.impactSurface='metal';
  const faces=[0,1,2,3].map(i=>atlas(new THREE.BoxGeometry(),i%2,1-Math.floor(i/2),2,2));
  const furnishPortico=streetShops(scene,renderer,Batch,panorama);
  MAP.buildings.forEach(({x,z,w,d,eave:h,facade},i)=>{
    const base=.80, podium=3.9;
    const avenueCorner=x===-17 && z===7;
    const westDepth=retailRecess(w),eastDepth=avenueCorner?7.13:westDepth;
    const coreWidth=w-westDepth-eastDepth;
    walls.add(faces[2],0xf5eee5,x+(westDepth-eastDepth)/2,base+podium/2,z,coreWidth,podium,d);
    furnishPortico(i,-1,{x,z,w,d},westDepth);
    if(!avenueCorner)furnishPortico(i,1,{x,z,w,d},eastDepth);
    if(avenueCorner) {
      for(let floor=1;floor<=6;floor++) {
        const level=base+podium+floor*(h-podium)/6;
        const front=x+w/2;
        solids.add(box,0xb7b3a3,front+.15,level,z,.71,.125,d+.20);
        if(floor===6)continue;
        solids.add(box,0x737f77,front+.465,level+.74,z,.038,.045,d-.2);
        for(let k=-4;k<=4;k++)solids.add(box,0xa4aba0,front+.46,level+.39,z+2.15*k,.034,.72,.036);
      }
    }
    const rows=Math.max(2,Math.round((h-podium)/6)), tier=(h-podium)/rows;
    for(let j=0;j<rows;j++) {
      walls.add(faces[facade],i%3===1?0xd4e0df:0xf6f4ed,x,base+podium+(j+.5)*tier,z,w,tier,d);
      if(facade!==1 || j%3===0) solids.add(box,0xd1cec2,x,base+podium+j*tier,z,w+.32,.15,d+.32);
    }
    solids.add(box,0xd9d8cc,x,base+h,z,w+.35,.24,d+.35);
    solids.add(box,0x9caaa9,x+w*.13,base+h+.65,z,w*.45,1.18,d*.46);
    for(const side of [-1,1]) {
      // Porticoes over the ground-floor shopfronts.
      if(avenueCorner && side===1)continue;
      solids.add(box,i%2?0x637b78:0xc2b49d,x+side*(w/2+.45),base+2.95,z,1.1,.17,d*.79);
    }
  });
  walls.mesh(scene,material('facades',{roughness:.53,metalness:.08})).userData.impactSurface='solid';
  addPalms(scene);
  solids.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true})).userData.impactSurface='street';
  for(const geometry of [box,...faces])geometry.dispose();
  return updateDoors;
}
