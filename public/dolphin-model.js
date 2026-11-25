import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {marineSurfaceMaterial} from './manatee-model.js';

let templatePromise;

function grayCoastalSkin(material){
  material.roughness=.58;
  material.metalness=0;
  material.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      #include <map_fragment>
      // Keep the dark back, eyes and painted detail. Recolor the bright
      // cream flank and white underside to the muted grays of a bottlenose.
      float brightness=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
      float warmth=max(0.,diffuseColor.r-diffuseColor.b);
      float pale=smoothstep(.36,.72,brightness);
      float cream=smoothstep(.08,.20,warmth)*smoothstep(.24,.48,brightness);
      float grayAmount=max(pale,cream);
      float grayLight=mix(.16,.27,smoothstep(.38,.90,brightness));
      vec3 coastalGray=vec3(grayLight*.83,grayLight*.94,grayLight);
      diffuseColor.rgb=mix(diffuseColor.rgb,coastalGray,grayAmount*.97);
    `);
  };
  material.customProgramCacheKey=()=>'gray-coastal-dolphin-v1';
}

export function loadDolphinModel(waterline,clock){
  return templatePromise??=new GLTFLoader().loadAsync('./common-dolphin.glb').then(gltf=>{
    gltf.scene.traverse(node=>{
      if(node.isMesh){
        grayCoastalSkin(node.material);
        marineSurfaceMaterial(node.material,waterline,clock);
        node.castShadow=true;
      }
    });
    const bounds=new THREE.Box3().setFromObject(gltf.scene);
    return {scene:gltf.scene,clip:gltf.animations[0],center:bounds.getCenter(new THREE.Vector3()),
      scale:3.3/bounds.getSize(new THREE.Vector3()).x};
  });
}

export function makeDolphinModel(template){
  const scene=cloneSkeleton(template.scene);
  scene.position.sub(template.center);
  const oriented=new THREE.Group();
  // The GLB's beak points along +X; the swim view faces local -Z.
  oriented.rotation.y=Math.PI/2;
  oriented.scale.setScalar(template.scale);
  oriented.add(scene);
  const mixer=new THREE.AnimationMixer(scene);
  if(template.clip)mixer.clipAction(template.clip).play();
  oriented.visible=false;
  return {model:oriented,mixer};
}
