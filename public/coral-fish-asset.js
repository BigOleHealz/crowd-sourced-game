import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fishSpecies} from './reef-fish.js';

// Sketchfab export: polyplant3d, "coral fish", CC BY 4.0.
// The mesh is in large source units and faces -X; game fish face +Z.
let assetPromise;
export function loadCoralFishAsset(){
  return assetPromise??=new GLTFLoader().loadAsync(new URL('./coral_fish.glb',import.meta.url).href)
    .then(({scene})=>{
      let source;
      scene.traverse(node=>{if(node.isMesh && !source)source=node;});
      if(!source)throw new Error('Coral fish GLB has no mesh');
      const geometry=source.geometry.clone();
      geometry.computeBoundingBox();
      const bounds=geometry.boundingBox;
      const center=bounds.getCenter(new THREE.Vector3());
      geometry.translate(-center.x,-center.y,-center.z);
      geometry.rotateY(Math.PI/2);
      geometry.computeBoundingBox();
      const size=geometry.boundingBox.getSize(new THREE.Vector3());
      const species=fishSpecies['coral-fish'];
      geometry.scale(species.width/size.x,species.height/size.y,species.length/size.z);
      geometry.computeBoundingSphere();
      const material=source.material.clone();
      material.side=THREE.DoubleSide;
      return {geometry,material};
    });
}
