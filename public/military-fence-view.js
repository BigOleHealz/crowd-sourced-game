import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {militaryFence,fenceDown} from './military-island.js';

// One instance per bay and source mesh keeps the supplied chain-link asset
// affordable around the entire island. Damage state only changes that bay.
export function militaryFenceView(base){
  const batches=[];
  const fallback=new THREE.Group();base.add(fallback);
  const wire=new THREE.MeshStandardMaterial({color:0x87938b,roughness:.8,metalness:.5,side:THREE.DoubleSide,transparent:true,opacity:.34});
  const poleGeometry=new THREE.CylinderGeometry(.055,.055,2.55,6);
  const panelGeometry=new THREE.PlaneGeometry(1,2.35);
  for(const bay of militaryFence){
    const length=Math.max(bay.w,bay.d);
    const group=new THREE.Group();group.position.set(bay.x,.8,bay.z);
    group.rotation.y=bay.w>bay.d?0:-Math.PI/2;
    for(const offset of [-length/2,length/2]){
      const post=new THREE.Mesh(poleGeometry,wire);post.position.set(offset,1.275,0);group.add(post);
    }
    const panel=new THREE.Mesh(panelGeometry,wire);
    panel.scale.x=length;panel.position.y=1.275;panel.material=wire;group.add(panel);
    fallback.add(group);
  }
  let last='';
  if(typeof window!=='undefined')new GLTFLoader().load('./chainlink_fence_tileable.glb',({scene:model})=>{
    model.updateMatrixWorld(true);
    // The supplied tile spans twelve metres. Its first two adjacent panels
    // and end post form a natural four-metre bay without squashing the mesh.
    const selected=[];
    model.traverse(mesh=>{if(mesh.isMesh && /^(Plane\.004|Plane\.010|Cylinder\.004)/.test(mesh.name))selected.push(mesh);});
    if(!selected.length)return;
    const size=new THREE.Vector3(),bounds=new THREE.Box3();
    for(const mesh of selected)bounds.union(new THREE.Box3().setFromObject(mesh));
    bounds.getSize(size);
    const center=bounds.getCenter(new THREE.Vector3());
    for(const mesh of selected){
      const material=mesh.material.clone();material.side=THREE.DoubleSide;
      const batch=new THREE.InstancedMesh(mesh.geometry,material,militaryFence.length);
      batch.name='Military chain-link fence bays';batch.castShadow=true;batch.receiveShadow=true;
      batch.userData.impactSurface='metal';
      const local=new THREE.Matrix4().copy(mesh.matrixWorld);
      for(let i=0;i<militaryFence.length;i++){
        const bay=militaryFence[i],length=Math.max(bay.w,bay.d);
        const matrix=new THREE.Matrix4().makeTranslation(bay.x,.8+2.55/2,bay.z);
        matrix.multiply(new THREE.Matrix4().makeRotationY(bay.w>bay.d?0:-Math.PI/2));
        matrix.multiply(new THREE.Matrix4().makeScale(length/size.x,2.55/size.y,length/size.x));
        matrix.multiply(new THREE.Matrix4().makeTranslation(-center.x,-center.y,-center.z));
        matrix.multiply(local);batch.setMatrixAt(i,matrix);
      }
      batch.instanceMatrix.needsUpdate=true;
      batch.userData.original=militaryFence.map((_,n)=>{const m=new THREE.Matrix4();batch.getMatrixAt(n,m);return m;});
      base.add(batch);batches.push(batch);
    }
    const endPosts=new THREE.InstancedMesh(poleGeometry,new THREE.MeshStandardMaterial({color:0x74817a,roughness:.65,metalness:.55}),militaryFence.length);
    endPosts.name='Military fence start posts';endPosts.castShadow=true;
    for(let i=0;i<militaryFence.length;i++){
      const bay=militaryFence[i],length=Math.max(bay.w,bay.d);
      const x=bay.w>bay.d?bay.x-length/2:bay.x;
      const z=bay.w>bay.d?bay.z:bay.z-length/2;
      endPosts.setMatrixAt(i,new THREE.Matrix4().makeTranslation(x,.8+1.275,z));
    }
    endPosts.instanceMatrix.needsUpdate=true;
    endPosts.userData.original=militaryFence.map((_,n)=>{const m=new THREE.Matrix4();endPosts.getMatrixAt(n,m);return m;});
    base.add(endPosts);batches.push(endPosts);
    fallback.visible=false;last='';
  });
  return doors=>{
    const key=militaryFence.map(b=>fenceDown(doors,b.fenceId)?'1':'0').join('');
    if(key===last)return;last=key;
    for(let i=0;i<militaryFence.length;i++){
      const down=key[i]==='1';
      fallback.children[i].visible=!down;
      for(const batch of batches){
        const matrix=new THREE.Matrix4();batch.getMatrixAt(i,matrix);
        // Keep original transforms so an intact bay can be restored by a new world.
        matrix.copy(batch.userData.original[i]);
        if(down){
          const bay=militaryFence[i];
          const fallen=new THREE.Matrix4().makeTranslation(bay.x,.9,bay.z);
          fallen.multiply(new THREE.Matrix4().makeRotationY(bay.w>bay.d?0:-Math.PI/2));
          fallen.multiply(new THREE.Matrix4().makeRotationX(Math.PI/2));
          fallen.multiply(new THREE.Matrix4().makeRotationY(bay.w>bay.d?0:Math.PI/2));
          fallen.multiply(new THREE.Matrix4().makeTranslation(-bay.x,-2.075,-bay.z));
          matrix.premultiply(fallen);
        }
        batch.setMatrixAt(i,matrix);batch.instanceMatrix.needsUpdate=true;
      }
    }
  };
}
