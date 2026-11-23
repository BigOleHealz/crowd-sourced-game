import * as THREE from 'three';
import {fuelSites} from './vehicle-fuel.js';
import {MAP,groundHeight} from './world.js';

// Use one two-sided placard texture for the buoy, pump and apron. Static
// geometry joins the map's existing scenery batch.
export function addFuelMarkers(scene,features){
  const cube=new THREE.BoxGeometry(),buoy=new THREE.CylinderGeometry(.52,.66,1,10);
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#174b48';ctx.fillRect(0,0,128,64);
  ctx.fillStyle='#edc364';ctx.fillRect(0,0,128,5);ctx.fillRect(0,59,128,5);
  ctx.fillStyle='#fff3cf';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.fillText('FUEL',64,45);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map});
  const face=new THREE.PlaneGeometry(1.4,.7);
  function sign(x,y,z){
    for(const side of [-1,1]){
      const panel=new THREE.Mesh(face,material);
      panel.position.set(x,y,z+side*.05);panel.rotation.y=side<0?Math.PI:0;scene.add(panel);
    }
  }
  for(const site of fuelSites){
    const {x,z,kind}=site;
    if(kind==='marine'){
      // Keep the berth open: the marker sits at its edge, away from the quay.
      const markerZ=z-Math.min(site.radius*.75,5),y=MAP.waterY;
      features.add(buoy,0xcb8f26,x,y+.17,markerZ,1,.72,1);
      features.add(buoy,0xf4e6b7,x,y+.60,markerZ,.48,.30,.48);
      features.add(cube,0x356c68,x,y+1.14,markerZ,.1,1,.1);
      sign(x,y+1.52,markerZ);
    }else if(kind==='air'){
      const span=Math.min(3.5,site.radius*.65);
      for(const dx of [-1,1])for(const dz of [-1,1]){
        const cx=x+dx*span,cz=z+dz*span,y=groundHeight(cx,cz)+.075;
        features.add(cube,0xf1c865,cx-dx*.55,y,cz,1.35,.018,.18);
        features.add(cube,0xf1c865,cx,y,cz-dz*.55,.18,.018,1.35);
      }
      const paint=new THREE.Mesh(face,material);
      paint.scale.set(2.3,2.3,1);paint.position.set(x,groundHeight(x,z)+.08,z);
      paint.rotation.x=-Math.PI/2;scene.add(paint);
    }else if(kind==='depot'){
      const cx=x-2.5,y=groundHeight(cx,z);
      features.add(cube,0x314c4c,cx,y+.51,z,.56,1.02,.5);
      features.add(cube,0xb2bcaa,cx,y+1.3,z,.6,.58,.52);
      features.add(cube,0x23574e,cx,y+1.58,z,.65,.12,.54);
      sign(cx,y+1.35,z+.26);
    }
  }
  cube.dispose();buoy.dispose();
}
