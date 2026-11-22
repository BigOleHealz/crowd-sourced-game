import * as THREE from 'three';
import {officeWindows} from './office-windows.js';
import {paneBatch} from './pane-damage-view.js';
import {frontageGlassMaterial} from './frontage-glass-material.js';
import {glassSupportKey} from './glass-support.js';
export function addOfficeWindows(scene,Batch,buildings,panorama){
  const stone=new Batch(),windows=new Batch(),panes=paneBatch(windows);
  const cube=new THREE.BoxGeometry(),plane=new THREE.PlaneGeometry();
  for(const b of buildings)for(const p of officeWindows(b)){
    const c=Math.cos(p.yaw),s=Math.sin(p.yaw);
    const box=(u,y,w,h,depth,color)=>stone.add(cube,color,p.x+u*c,y,p.z-u*s,w,h,depth,0,p.yaw);
    box(0,p.bottom-.32,p.bay,.64,.22,0x9ba4a1);
    box(0,p.top+.19,p.bay,.38,.26,0xc8c8bb);
    for(const sign of [-1,1])box(sign*(p.bay-.13)/2,(p.bottom+p.top)/2,.13,p.top-p.bottom,.22,0x757e79);
    panes.add(p.id,()=>windows.add(plane,0xdce4df,p.x,(p.top+p.bottom)/2,p.z,p.width,p.top-p.bottom,1,0,p.yaw),{...p,owner:b});
  }
  stone.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true}));
  const glass=frontageGlassMaterial(panorama);
  glass.fragmentShader=glass.fragmentShader.replace('.105+.49*edge*edge','gl_FrontFacing ? .21+.41*edge*edge : .12+.25*edge');
  const mesh=windows.mesh(scene,glass,false);
  mesh.userData.impactSurface='glass';cube.dispose();plane.dispose();
  const updatePanes=panes.bind(mesh);
  let previous;
  return {mesh,update(doors){
    const key=(doors?.glassSeq??0)+'|'+glassSupportKey(doors);
    if(key===previous)return;
    previous=key;
    updatePanes(doors?.brokenPanes,doors);
  }};
}
