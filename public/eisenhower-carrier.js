import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {eisenhowerCarrier} from './eisenhower-carrier-layout.js';

export function addEisenhowerCarrier(scene,waterY){
  new GLTFLoader().load(new URL('./eisenhower-carrier.glb',import.meta.url).href,({scene:model})=>{
    // Sketchfab's GLB node already converts the source's Z-up frame to Y-up.
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);
    const size=bounds.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.z) || size.z<=0)return;
    const scale=eisenhowerCarrier.length/size.z;
    model.scale.setScalar(scale);
    model.position.set(
      eisenhowerCarrier.x-scale*(bounds.min.x+bounds.max.x)/2,
      waterY-scale*25,
      eisenhowerCarrier.z-scale*(bounds.min.z+bounds.max.z)/2,
    );
    model.name='USS Dwight D. Eisenhower (static scenery)';
    model.traverse(part=>{
      if(!part.isMesh)return;
      part.castShadow=false;
      part.receiveShadow=false;
      part.userData.impactSurface='metal';
    });
    scene.add(model);
  },undefined,error=>console.warn('Could not load carrier model',error));
}
