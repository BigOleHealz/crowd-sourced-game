import {estateDamageView} from './estate-damage-view.js';
import {addLanternBuildings} from './lantern-point-buildings.js';
import {lanternLand,lanternBridge} from './lantern-point.js';
import {addLanternPoint} from './lantern-point-view.js';
import {hotel} from './maravela-hotel.js';
import {glassBreakDebris} from './glass-break-debris.js';
import {storefrontFaces} from './frontage-glass.js';
import {verges} from './waterfront-roads.js';
import { addBrickellHorizon } from './brickell-horizon.js';
import {updateShopFurniture} from './shop-furniture-view.js';
import {breakableWindows} from './frontage-break-view.js';
import {streetLampView} from './street-lamp-view.js';
import {harborSigns,signalPost} from './scenery-layout.js';
import {galleryPlans,galleryPanes,galleryDoorPanes} from './gallery-lobbies.js';
import {galleryLobbyView} from './gallery-lobby-view.js';
import { streetShops } from './street-shops.js';
import { avenueFrontage } from './avenue-frontage.js';
import {addCauseway} from './causeway-view.js';
import { addApartmentBalconies, hasApartmentBalconies } from './apartment-balconies.js';
import { addBeach } from './beach-view.js';
import { addHarborKeyStructures } from './harbor-key-structure-view.js';
import * as THREE from 'three';
import { MAP } from './world.js';
import { avenues, streets, coast, harbor, streetPlan, bayfrontLawns } from './brickell-map.js';

import {breakablePostView} from './breakable-post-view.js';
export function cityStreets(scene,renderer,Batch,panorama) {
  const posts=breakablePostView(scene,Batch);
  const updateCourts=addBeach(scene,Batch);
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
  ground('water',[[0,MAP.waterY,-102,1500,1600]],14,{roughness:.28});
  const patch=(r,y)=>[(r.west+r.east)/2,y,(r.north+r.south)/2,r.east-r.west,r.south-r.north];
  ground('asphalt',[[cx,.70,cz,w,d],patch(harbor,.70),...lanternLand.map(r=>patch(r,.70))],5);
  const lots=verges(coast,streetPlan.mainland), lawns=verges(harbor,streetPlan.island);
  for(const lot of [...lots,...lawns]) {
    const [x,,z,w,d]=patch(lot,.80);
    solids.add(box,0xbab4a4,x,.735,z,w,.12,d);
  }
  solids.add(box,0xa99985,...patch(harbor,.15).slice(0,3),harbor.east-harbor.west,1,harbor.south-harbor.north);
  const updateCauseway=addCauseway(scene,Batch,solids,material('asphalt'));
  const updateLantern=addCauseway(scene,Batch,solids,material('asphalt'),lanternBridge);
  addLanternPoint(scene,solids,ground,patch,posts);
  const estateStart=scene.children.length;
  const updateEstates=addLanternBuildings(scene,Batch,panorama);
  const updateDamage=estateDamageView(scene,scene.children.slice(estateStart),MAP.barriers);
  const {northStreet,westStreet,eastStreet}=streetPlan;
  const paint=(x,z,w,d,tint=0xe3bc67)=>solids.add(box,tint,x,.712,z,w,.012,d);
  for(const x of [westStreet,0,eastStreet]) {
    const end=x===0 ? harbor.south : harbor.crossing;
    for(let z=northStreet+7;z<end-1;z+=4)
      if(Math.abs(z-harbor.crossing)>6)paint(x,z,.12,2.15);
  }
  for(const z of [northStreet,harbor.crossing])
    for(let x=westStreet+6;x<eastStreet-5;x+=4)if(Math.abs(x)>7)paint(x,z,2.1,.12);
  // Lane arrows show the available turns before each northern junction.
  for(const x of [westStreet,0,eastStreet]) {
    const lane=x+2.25,z=northStreet+7.5;
    paint(lane,z+.55,.16,1.25,0xece9d6);
    if(x===0)for(const side of [-1,1])
      solids.add(box,0xece9d6,lane+side*.15,.713,z-.30,.13,.014,.54,0,-side*.69);
    for(const sign of (x===0?[-1,1]:[x===westStreet?1:-1])) {
      paint(lane+sign*.46,z,.98,.15,0xece9d6);
      for(const side of [-1,1])solids.add(box,0xece9d6,lane+sign*.87,.713,z+side*.15,.55,.014,.13,0,sign*side*.69);
    }
  }
  // Raised stone stops and amber reflectors make the dry turning heads readable from a car.
  for(const curb of streetPlan.curbs) {
    solids.add(box,0xbcb9ab,curb.x,.80+curb.h/2,curb.z,curb.w,curb.h,curb.d);
    solids.add(box,0xe4b954,curb.x,.80+curb.h-.09,curb.z,curb.w+.016,.09,curb.d+.016);
  }
  for(const {x,z,dx,dz,span} of streetPlan.ends) {
    const acrossX=Math.abs(dz),acrossZ=Math.abs(dx);
    paint(x-.40*dx,z-.40*dz,acrossX?2*span-.2:.11,acrossZ?2*span-.2:.11,0xece9d6);
  }
  // Face northbound traffic from the sidewalk before the causeway and at landfall.
  for(const [i,[x,z,label]] of harborSigns.entries()) {
    posts.add('harbor-'+i,x,.8,z,solids=>{
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
    return sign;
    });
  }
  ground('pavers',lots.map(r=>patch(r,.80)),3);
  ground('lawn',[...lawns.map(r=>patch(r,.80)),...bayfrontLawns.flatMap(r=>verges(r,streetPlan.mainland).map(l=>patch(l,.812)))],3);
  solids.add(box,0xa59f90,cx,.15,cz,w,1,d);
  const stripe=(x,z,w,d,tint=0xe9e5d4)=>solids.add(box,tint,x,.713,z,w,.012,d);
  for(const x of avenues) {
    for(let z=north+2;z<south;z+=2.8) {
      if(streets.some(s=>Math.abs(z-s)<6.9) || streetPlan.ends.some(e=>e.dx===0 && e.x===x && (z-e.z)*e.dz>-5.4)) continue;
      for(const dx of [-.12,.12]) stripe(x+dx,z,.095,2.8,0xd6a446);
      for(const dx of [-3,3]) stripe(x+dx,z,.09,1.2);
    }
    for(const z of streets) {
      for(const side of [-1,1]) for(let k=-5;k<=5;k++) stripe(x+k*.89,z+side*5.45,.44,1.75);
      const {x:lx,z:lz,postId}=signalPost(x,z);
      posts.add(postId,lx,.75,lz,furniture=>{
      furniture.add(box,0x657473,lx,3.0,lz,.16,4.5,.16);
      furniture.beam(0x677775,[lx,5.1,lz],[x+1.8,5.08,lz],.12);
      furniture.add(box,0x555745,x+1.5,4.7,lz,.34,.87,.32);
      for(let k=0;k<3;k++) furniture.add(box,[0xac4634,0x68563a,0x52987b][k],x+1.5,4.93-k*.23,lz+.168,.14,.15,.02);
      });
    }
  }
  // UV islands preserve the scale of windows regardless of each tower's height.
  function atlas(shape,col,row,cols,rows) {
    const uv=shape.attributes.uv.clone();
    for(let i=0;i<uv.count;i++) uv.setXY(i,(col+.008+.984*uv.getX(i))/cols,(row+.008+.984*uv.getY(i))/rows);
    shape.setAttribute('batchUv',uv);return shape;
  }
  const galleryCount=galleryPanes.length+galleryDoorPanes.length+hotel.fronts.length*2;
  const paneCount=storefrontFaces.reduce((count,{glass})=>
    count+glass.extra.length+glass.bays.reduce((total,bay)=>total+Math.max(1,bay.panes.length),0),galleryCount);
  const debris=glassBreakDebris(scene,paneCount);
  const breakables=breakableWindows(scene,Batch,debris);
  const updateDoors=avenueFrontage(scene,renderer,Batch,solids,furniture,box,panorama,breakables,debris);
  furniture.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true})).userData.impactSurface='metal';
  const faces=[0,1,2,3].map(i=>atlas(new THREE.BoxGeometry(),i%2,1-Math.floor(i/2),2,2));
  const updateGallery=galleryLobbyView(scene,renderer,Batch,panorama,debris);
  const furnishPortico=streetShops(scene,renderer,Batch,panorama,breakables);
  const base=.80,podium=3.9;
  MAP.buildings.forEach(({x,z,w,d,eave:h,facade,housing},i)=>{
    const avenueCorner=x===-17 && z===7;
    const {west:westDepth,east:eastDepth,x:coreX,w:coreWidth,rooms,ends}=galleryPlans[i];
    if(rooms.length===2)solids.add(box,0xb5a88e,coreX,base+podium/2,z,coreWidth,podium,d-2*ends[0].depth);
    solids.add(box,0xbcaf97,coreX,base+podium-.34,z,coreWidth,.68,d);
    furnishPortico(i,-1,{x,z,w,d},westDepth);
    if(!avenueCorner)furnishPortico(i,1,{x,z,w,d},eastDepth);
    if (housing && !hasApartmentBalconies(facade)) {
      const rows=Math.max(2,Math.round((h-podium)/6)), tier=(h-podium)/rows;
      for(let j=0;j<rows;j++) {
        walls.add(faces[facade],i%3===1?0xd4e0df:0xf6f4ed,x,base+podium+(j+.5)*tier,z,w,tier,d);
        if(facade!==1 || j%3===0) solids.add(box,0xd1cec2,x,base+podium+j*tier,z,w+.32,.15,d+.32);
      }
    }
    if(housing) {
      solids.add(box,0xd9d8cc,x,base+h,z,w+.35,.24,d+.35);
      solids.add(box,0x9caaa9,housing.x,base+(housing.bottom+housing.h)/2,housing.z,
        housing.w,housing.h-housing.bottom,housing.d);
    }
    for(const side of [-1,1]) {
      // Porticoes over the ground-floor shopfronts.
      if(avenueCorner && side===1)continue;
      solids.add(box,i%2?0x637b78:0xc2b49d,x+side*(w/2+.45),base+2.95,z,1.1,.17,d*.79);
    }
  });
  const facadeMaterial=material('facades',{roughness:.53,metalness:.08});
  walls.mesh(scene,facadeMaterial).userData.impactSurface='solid';
  addBrickellHorizon(scene,facadeMaterial.map);
  const updateApartments=addApartmentBalconies(scene,Batch,facadeMaterial.map,MAP.buildings.filter(b=>b.housing),base,podium);
  const updateHarborWindows=addHarborKeyStructures(scene,Batch,base+podium);
  solids.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true})).userData.impactSurface='street';
  for(const geometry of [box,...faces])geometry.dispose();
  const updatePosts=posts.finish();
  const updateLamps=streetLampView(scene,Batch);
  return (doors,dt,local,remotes)=>{
    updateDamage(doors,dt);
    updateHarborWindows(doors?.brokenPanes);updateApartments(doors);updateEstates(doors);updateCauseway(doors);updateLantern(doors);
    updateDoors(doors,dt);
    updateShopFurniture(scene,doors);
    updateLamps(doors,dt);updatePosts(doors,dt);
    breakables.update(doors);
    updateGallery(doors);
    debris.update(dt);
    updateCourts(doors,dt,local,remotes);
  };
}
