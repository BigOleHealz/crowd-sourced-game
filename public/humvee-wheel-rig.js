import * as THREE from 'three';

// Only these four meshes are tires. Their parent groups also contain fixed
// suspension parts and have origins away from the center of each tire.
const tires=[
  ['Object_33',0,'x',-1],['Object_14',1,'y',-1],
  ['Object_8',2,'x',-1],['Object_11',3,'y',1],
];

export function rigHumveeWheels(model) {
  model.updateMatrixWorld(true);
  const wheels=[];
  for(const [name,index,axis,sign] of tires){
    const tire=model.getObjectByName(name);
    if(!tire)continue;
    const parent=tire.parent;
    const center=new THREE.Box3().setFromObject(tire).getCenter(new THREE.Vector3());
    const pivot=new THREE.Group();
    parent.add(pivot);
    pivot.position.copy(parent.worldToLocal(center));
    model.updateMatrixWorld(true);
    pivot.attach(tire);
    wheels[index]={node:pivot,y:pivot.position.y,
      spinAxis:axis==='x'?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),
      steerAxis:new THREE.Vector3(0,1,0).applyQuaternion(parent.getWorldQuaternion(new THREE.Quaternion()).invert()),
      sign,spin:0};
  }
  return wheels;
}
