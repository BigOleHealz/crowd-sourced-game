import * as THREE from 'three';
import { CITY } from './world.js';
import { roadway } from './brickell-map.js';

// Inspect the rendered surfaces only when a shot event arrives. Gameplay hits
// can use generous targeting volumes, so these cosmetic contacts use triangles.
export function surfacePicker(scene) {
  const objects=[], ray=new THREE.Raycaster(), hits=[];
  scene.traverse(mesh=>{if(mesh.isMesh && mesh.userData.impactSurface) objects.push(mesh);});
  const transform=new THREE.Matrix4(), normalMatrix=new THREE.Matrix3();
  function isVisible(mesh) {
    for (let node=mesh;node;node=node.parent) if (!node.visible) return false;
    return true;
  }
  return (shot,start,end,sourceVehicle)=>{
    const distance=start.distanceTo(end);
    if(distance<.01) return;
    ray.ray.origin.copy(start);ray.ray.direction.subVectors(end,start).normalize();
    ray.near=.012;ray.far=distance+(shot.hitKind ? 1.9 : .08);
    hits.length=0;
    for(const mesh of objects){
      if(!isVisible(mesh) || (sourceVehicle && sourceVehicle===mesh.userData.vehicle)) continue;
      mesh.updateWorldMatrix(true,false);
      ray.intersectObject(mesh,false,hits);
    }
    const first=hits[0]; // Raycaster sorts the accumulated list by distance.
    if(!first) return;
    const {object,point,face}=first, data=object.userData;
    if(first.distance>distance+.08 && data.target!==shot.targetId) return;
    let surface=data.impactSurface;
    if(surface==='gear') surface=first.uv && first.uv.y>.5 && first.uv.x>.5 ? 'solid' : 'wood';
    if(surface==='palm') surface=face.materialIndex===0 ? 'wood' : 'solid';
    // Painted road markings sit a few millimetres above the asphalt sheet.
    if(surface==='street' && CITY && roadway(point.x,point.z) && Math.abs(point.y-.71)<.025) surface='asphalt';
    if(!['metal','wood','asphalt'].includes(surface)) return;
    if (object.isInstancedMesh) {
      object.getMatrixAt(first.instanceId,transform);
      transform.premultiply(object.matrixWorld);
    } else transform.copy(object.matrixWorld);
    const normal=face.normal.clone().applyNormalMatrix(normalMatrix.getNormalMatrix(transform));
    if(normal.dot(ray.ray.direction)>0)normal.negate();
    return {point,surface,normal};
  };
}
