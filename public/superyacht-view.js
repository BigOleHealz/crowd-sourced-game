import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sinkingHull} from './sinking-hull.js';
import {wakeTrail} from './boat-wake-view.js';
import {yachtGangway,yachtModelYaw,yachtModelYOffset} from './yacht-layout.js';
import {openSolanaRearDoor} from './yacht-model-openings.js';

// The imported model supplies the entire hull, decks, glazing and superstructure.
// The aft glass has a walk-through doorway; boarding hardware is game made.
export function superyachtView(scene,Batch,renderer,panorama){
  const root=new THREE.Group();root.name='Solana superyacht';root.visible=false;scene.add(root);
  new GLTFLoader().load(new URL('./solana-superyacht.glb',import.meta.url).href,({scene:model})=>{
    model.name='Superyacht by vinish.dev';
    openSolanaRearDoor(model);
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
  const steel=new THREE.MeshStandardMaterial({color:0xb6c2c3,metalness:.86,roughness:.23});
  function railBetween(group,a,b,radius){
    const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),direction=q.clone().sub(p);
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,direction.length(),8),steel);
    mesh.position.copy(p.add(q).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    mesh.castShadow=true;group.add(mesh);
  }
  function ladder(name,bottom,top,rungs){
    const group=new THREE.Group();group.name=name;
    for(const side of [-.37,.37])railBetween(group,[side,bottom[0],bottom[1]],[side,top[0],top[1]],.045);
    for(let i=0;i<=rungs;i++){
      const t=i/rungs;
      railBetween(group,[-.37,bottom[0]+(top[0]-bottom[0])*t,bottom[1]+(top[1]-bottom[1])*t],
        [.37,bottom[0]+(top[0]-bottom[0])*t,bottom[1]+(top[1]-bottom[1])*t],.035);
    }
    root.add(group);
  }
  ladder('Swim ladder',[-.72,22.1],[.8,21.1],5);
  ladder('Swim platform to aft deck',[.8,21.05],[2.61,19.55],6);
  ladder('Aft deck to upper terrace',[2.63,16.45],[5.43,14.9],9);
  const console=new THREE.Mesh(new THREE.BoxGeometry(1.3,.9,.6),new THREE.MeshStandardMaterial({color:0x182c36,roughness:.45}));
  console.name='Solana helm';console.position.set(0,3.12,7.8);console.castShadow=true;root.add(console);
  const wake=wakeTrail(scene);
  return (yacht,dt,local)=>{
    root.visible=!!yacht;wake(yacht,dt,local);if(!yacht)return;
    const sink=sinkingHull(yacht,15.8,9);
    root.position.set(yacht.x,yacht.y-sink.drop,yacht.z);
    root.rotation.set(sink.trim,-yacht.yaw,(yacht.wakeRoll??0)+sink.list,'YXZ');
    ramp.visible=!!yacht.gangway;root.userData.target=yacht.id;
  };
}
