import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sinkingHull} from './sinking-hull.js';
import {wakeTrail} from './boat-wake-view.js';
import {yachtGangway,yachtModelYaw,yachtModelYOffset} from './yacht-layout.js';

// The imported model supplies the entire hull, decks, glazing and superstructure.
// Only the removable quay-to-deck boarding ramp is game made.
export function superyachtView(scene,Batch,renderer,panorama){
  const root=new THREE.Group();root.name='Solana superyacht';root.visible=false;scene.add(root);
  new GLTFLoader().load(new URL('./solana-superyacht.glb',import.meta.url).href,({scene:model})=>{
    model.name='Superyacht by vinish.dev';
    model.rotation.y=yachtModelYaw;model.position.y=yachtModelYOffset;
    model.traverse(part=>{if(part.isMesh){part.receiveShadow=true;part.castShadow=true;
      Object.assign(part.userData,{target:'superyacht',impactSurface:'solid'});}});
    root.add(model);
  },undefined,error=>console.error('Solana model could not load',error));
  const ramp=new THREE.Group();ramp.name='Removable marina boarding ramp';
  const g=yachtGangway,span=g.outer-g.inner,drop=g.top-g.bottom;
  const walk=new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(span,drop),.10,g.halfWidth*2),
    new THREE.MeshStandardMaterial({color:0x949d9b,metalness:.35,roughness:.62}));
  walk.position.set((g.inner+g.outer)/2,(g.top+g.bottom)/2,g.centerZ);
  walk.rotation.z=-Math.atan2(drop,span);walk.receiveShadow=true;ramp.add(walk);root.add(ramp);
  const wake=wakeTrail(scene);
  return (yacht,dt,local)=>{
    root.visible=!!yacht;wake(yacht,dt,local);if(!yacht)return;
    const sink=sinkingHull(yacht,15.8,9);
    root.position.set(yacht.x,yacht.y-sink.drop,yacht.z);
    root.rotation.set(sink.trim,-yacht.yaw,(yacht.wakeRoll??0)+sink.list,'YXZ');
    ramp.visible=!!yacht.gangway;root.userData.target=yacht.id;
  };
}
