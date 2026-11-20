import * as THREE from 'three';

// A swept planform, twin fins and dark canopy give the small aircraft a distinct silhouette.
export function jetView(scene,Batch){
  const group=new THREE.Group(), body=new Batch(), box=new THREE.BoxGeometry();
  const shell=new THREE.SphereGeometry(1,12,8), skin=0x718089, dark=0x303d45;
  body.add(shell,skin,0,1,0,.58,.58,3.05);
  body.add(shell,0x203b49,0,1.38,-.88,.40,.40,1.04);
  for(const side of [-1,1]){
    body.add(shell,dark,side*.49,.91,.78,.32,.36,1.65);
    body.add(box,skin,side*1.48,.95,.38,3.05,.13,1.18,0,-side*.48);
    body.add(box,skin,side*.91,1.04,2.12,1.61,.11,.68,0,-side*.35);
    body.add(box,dark,side*.48,1.51,1.94,.10,1.14,.79,-.28,0,-side*.28);
    body.add(shell,0x303339,side*.69,.61,.1,.13,.13,.76);
    body.add(shell,0x252a2d,side*.53,.25,.64,.12,.24,.24);
  }
  body.add(shell,dark,0,.25,-1.67,.12,.23,.23);
  const mesh=body.mesh(group,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62}));
  mesh.userData.impactSurface='metal';scene.add(group);
  return j=>{
    group.visible=!!j;
    if(!j)return;
    group.position.set(j.x,j.y,j.z);
    group.rotation.set(j.pitch,-j.yaw,j.wrecked?1.12:j.roll,'YXZ');
  };
}
