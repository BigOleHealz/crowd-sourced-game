import * as THREE from 'three';

// Long axis is +Y, with the nose at Y=0 (the replicated leading point).
export function flightRounds(scene) {
  const profile=[[0,-1],[.70,-1],[1,-.81],[.95,-.45],[.58,-.19],[0,0]];
  const geometry=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),8);
  const normals=geometry.attributes.normal, positions=geometry.attributes.position;
  const tint=new THREE.Color(), colors=[];
  for(let i=0;i<positions.count;i++){
    const y=positions.getY(i);
    // A warm heel stays readable viewed end-on. The graphite flanks silhouette against pale paving.
    tint.setHex(y<-.89 ? 0xe4ba84 : y<-.57 ? 0x66564a : y<-.25 ? 0x998067 : 0xd2bc95);
    tint.multiplyScalar(.94+.22*normals.getX(i));
    colors.push(tint.r,tint.g,tint.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true}),192);
  mesh.name='Flying rounds';mesh.count=0;mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
  const pose=new THREE.Object3D(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  return bullets=>{
    mesh.count=Math.min(bullets?.length??0,mesh.instanceMatrix.count);
    for(let i=0;i<mesh.count;i++){
      const r=bullets[i];
      direction.set(r.vx,r.vy,r.vz).normalize();
      pose.position.set(r.x,r.y,r.z);pose.quaternion.setFromUnitVectors(up,direction);
      const length=r.weapon==='turret'?.235:r.weapon===2?.145:.185;
      const radius=r.weapon==='turret'?.025:.020;
      pose.scale.set(radius,length,radius);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
    }
    if(mesh.count) mesh.instanceMatrix.needsUpdate=true;
  };
}
