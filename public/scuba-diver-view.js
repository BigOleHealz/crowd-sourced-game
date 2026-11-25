import {BufferAttribute, Matrix4, Skeleton, SkinnedMesh} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// The source is an unrigged T-pose. Its dimensions match the player rig, so
// assign its vertices to that rig instead of running an unrelated animation.
let parts, pending;
const blend=(a,b,t)=>[[a,1-t],[b,t]];
const mix=(value,start,end)=>Math.max(0,Math.min(1,(value-start)/(end-start)));

function influences(part,x,y) {
  const side=x<0?0:1, base=4+side*5, ax=Math.abs(x);
  if(part===2) return [[base+2,1]]; // fins, attached to the ankles
  if(part===5 || part===6) return [[3,1]]; // mask and regulator
  if(part===4 && ax>.5) return blend(2,base+4,mix(ax,.5,.65)); // wrist gauge and its hose
  if(part!==0) return [[y>1.54?3:2,1]]; // tank, straps and hoses
  if(y>1.53 && ax<.27) return blend(2,3,mix(y,1.53,1.59));
  if(y>1.10 && y<1.56 && ax>.24) {
    const arm=mix(ax,.24,.34);
    const outer=blend(base+3,base+4,mix(ax,.46,.55));
    return [[2,1-arm],...outer.map(([index,weight])=>[index,weight*arm])];
  }
  if(y<1.00 && ax>.075) {
    if(y<.17) return [[base+2,1]];
    if(y<.57) return blend(base+2,base+1,mix(y,.17,.24));
    if(y<.96) return blend(base+1,base,mix(y,.57,.64));
    return blend(base,0,mix(y,.96,1.04));
  }
  return blend(0,2,mix(y,.99,1.12));
}

function skinGeometry(mesh,part) {
  mesh.updateWorldMatrix(true,false);
  const geometry=mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.rotateY(Math.PI); // the source faces the opposite direction from the player rig
  const position=geometry.getAttribute('position');
  const indices=new Uint16Array(position.count*4),weights=new Float32Array(position.count*4);
  for(let i=0;i<position.count;i++) {
    const influence=influences(part,position.getX(i),position.getY(i));
    for(let j=0;j<influence.length;j++) {
      indices[i*4+j]=influence[j][0];weights[i*4+j]=influence[j][1];
    }
  }
  geometry.setAttribute('skinIndex',new BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new BufferAttribute(weights,4));
  geometry.userData.sharedFieldKit=true; // shared by all player instances
  return geometry;
}

export function preloadScubaDiver() {
  if(pending)return;
  pending=new GLTFLoader().loadAsync('./scuba-diver.glb').then(({scene})=>{
    scene.updateMatrixWorld(true);
    parts=[];
    let part=0;
    scene.traverse(node=>{
      if(!node.isMesh)return;
      parts.push({geometry:skinGeometry(node,part++),material:node.material});
    });
    if(parts.length!==8)throw new Error(`Expected 8 scuba meshes; got ${parts.length}`);
  }).catch(error=>{parts=null;console.warn('Scuba diver unavailable; showing player kit.',error);});
}

export function useScubaDiver(state) {
  return !!parts && typeof state.id==='number' && !!state.scuba &&
    (!state.lostParts || !Object.keys(state.lostParts).length);
}

export function fitScubaDiver(rig) {
  const bones=[rig.body,rig.spine,rig.upper,rig.head];
  for(const limb of rig.limbs) bones.push(limb.leg,limb.knee,limb.ankle,limb.arm,limb.forearm);
  for(const limb of rig.limbs) limb.arm.rotation.z=limb.side*Math.PI/2;
  rig.root.updateMatrixWorld(true);
  const inverses=bones.map(bone=>bone.matrixWorld.clone().invert());
  for(const limb of rig.limbs) limb.arm.rotation.z=0;
  rig.root.updateMatrixWorld(true);
  const skeleton=new Skeleton(bones,inverses);
  for(const {geometry,material} of parts) {
    const mesh=new SkinnedMesh(geometry,material);
    mesh.bind(skeleton,new Matrix4());
    mesh.frustumCulled=false;
    rig.root.add(mesh);
  }
  rig.scubaDiver=true;
}
