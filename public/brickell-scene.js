import * as THREE from 'three';
import { MAP } from './world.js';
import { avenues, streets, coast } from './brickell-map.js';

export function cityStreets(scene,renderer,Batch) {
  const loader=new THREE.TextureLoader(), box=new THREE.BoxGeometry();
  function material(name, options={}) {
    const map=loader.load('./brickell-'+name+'.webp',()=>{renderer.shadowMap.needsUpdate=true;});
    map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    map.wrapS=map.wrapT=THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({map,roughness:.83,vertexColors:true,...options});
  }
  const solids=new Batch(), walls=new Batch(true), foliage=new Batch(true);
  function ground(name,rectangles,period,options={}) {
    const batch=new Batch(true), plane=new THREE.PlaneGeometry().rotateX(-Math.PI/2);
    for(const [x,y,z,w,d] of rectangles) {
      const uv=plane.attributes.uv.clone();
      for(let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*w/period,uv.getY(i)*d/period);
      plane.setAttribute('batchUv',uv);
      batch.add(plane,0xffffff,x,y,z,w,1,d);
    }
    batch.mesh(scene,material(name,options),false);plane.dispose();
  }
  const {west,east,north,south}=coast, w=east-west,d=south-north,cx=(west+east)/2,cz=(north+south)/2;
  ground('water',[[0,MAP.waterY,0,460,460]],14,{roughness:.28});
  ground('asphalt',[[cx,.70,cz,w,d]],5);
  const lots=[],lawns=[];
  const xs=[[west,-43.7],[-32.3,-5.7],[5.7,26.3],[37.7,east]];
  const zs=[[north,-49.1],[-40.9,-13.1],[-4.9,22.9],[31.1,56.9],[65.1,south]];
  for(const [x1,x2] of xs) for(const [z1,z2] of zs) {
    const x=(x1+x2)/2,z=(z1+z2)/2;
    lots.push([x,.80,z,x2-x1,z2-z1]);
    solids.add(box,0xbab4a4,x,.735,z,x2-x1,.12,z2-z1);
    if(x>37) lawns.push([x,.812,z,2.65,z2-z1-2]);
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
      const lx=x-6.2,lz=z-5.8;
      solids.add(box,0x657473,lx,3.0,lz,.16,4.5,.16);
      solids.beam(0x677775,[lx,5.1,lz],[x+1.8,5.08,lz],.12);
      solids.add(box,0x555745,x+1.5,4.7,lz,.34,.87,.32);
      for(let k=0;k<3;k++) solids.add(box,[0xac4634,0x68563a,0x52987b][k],x+1.5,4.93-k*.23,lz+.168,.14,.15,.02);
    }
  }
  // UV islands preserve the scale of windows regardless of each tower's height.
  function atlas(shape,col,row,cols,rows) {
    const uv=shape.attributes.uv.clone();
    for(let i=0;i<uv.count;i++) uv.setXY(i,(col+.008+.984*uv.getX(i))/cols,(row+.008+.984*uv.getY(i))/rows);
    shape.setAttribute('batchUv',uv);return shape;
  }
  const faces=[0,1,2,3].map(i=>atlas(new THREE.BoxGeometry(),i%2,1-Math.floor(i/2),2,2));
  MAP.buildings.forEach(({x,z,w,d,eave:h,facade},i)=>{
    const base=.80, podium=3.9;
    walls.add(faces[2],0xf5eee5,x,base+podium/2,z,w,podium,d);
    const rows=Math.max(2,Math.round((h-podium)/6)), tier=(h-podium)/rows;
    for(let j=0;j<rows;j++) {
      walls.add(faces[facade],i%3===1?0xd4e0df:0xf6f4ed,x,base+podium+(j+.5)*tier,z,w,tier,d);
      if(facade!==1 || j%3===0) solids.add(box,0xd1cec2,x,base+podium+j*tier,z,w+.32,.15,d+.32);
    }
    solids.add(box,0xd9d8cc,x,base+h,z,w+.35,.24,d+.35);
    solids.add(box,0x9caaa9,x+w*.13,base+h+.65,z,w*.45,1.18,d*.46);
    for(const side of [-1,1]) {
      // Porticoes over the ground-floor shopfronts.
      solids.add(box,i%2?0x637b78:0xc2b49d,x+side*(w/2+.45),base+2.95,z,1.1,.17,d*.79);
    }
  });
  walls.mesh(scene,material('facades',{roughness:.53,metalness:.08}));
  const leaves=[0,1,2].map(i=>atlas(new THREE.PlaneGeometry(1,1),i,0,3,1));
  MAP.trees.forEach(({x,z,height:h},i)=>{
    for(const angle of [0,Math.PI/2]) foliage.add(leaves[i%3],0xfafbf0,x,.80+h/2,z,h,h,1,0,angle+i*.91);
  });
  foliage.mesh(scene,material('palms',{side:THREE.DoubleSide,alphaTest:.53,roughness:.95}));
  solids.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true}));
  for(const geometry of [box,...faces,...leaves])geometry.dispose();
}
