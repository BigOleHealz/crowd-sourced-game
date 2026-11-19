import * as THREE from 'three';
import {streetLamps,lampDown} from './street-lamps.js';
export function streetLampView(scene,Batch){
  const box=new THREE.BoxGeometry(),metal=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.64});
  const bulb=new THREE.MeshBasicMaterial({color:0xffefcc});
  const lights=streetLamps.map(p=>{
    const batch=new Batch(),group=new THREE.Group(),side=p.side;
    batch.add(box,0x596466,0,.14,0,.33,.28,.33);
    batch.add(box,0x657477,0,2.26,0,.15,4.34,.15);
    batch.add(box,0x586a6b,-side*.31,4.37,0,.73,.105,.12);
    batch.add(box,0x38484b,-side*.70,4.33,0,.51,.13,.31);
    batch.mesh(group,metal);
    const lens=new THREE.Mesh(box,bulb);lens.position.set(-side*.70,4.25,0);lens.scale.set(.44,.035,.24);
    group.add(lens);group.position.set(p.x,.81,p.z);scene.add(group);
    return {p,group,lens};
  });
  let initialized=false;
  return (state,dt)=>{
    for(const {p,group,lens} of lights){
      const down=lampDown(state,p),angle=down?1.52:0;
      group.rotation.x=initialized?THREE.MathUtils.damp(group.rotation.x,angle,8,dt):angle;
      lens.visible=!down;
    }
    if(state)initialized=true;
  };
}
