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
  const offsets=new Map(),tip=new THREE.Vector3(),origin=new THREE.Vector3();
  let frame=0;
  return (bullets,visibleMuzzle)=>{
    frame++;
    mesh.count=Math.min(bullets?.length??0,mesh.instanceMatrix.count);
    for(let i=0;i<mesh.count;i++){
      const r=bullets[i];
      direction.set(r.vx,r.vy,r.vz).normalize();
      pose.position.set(r.x,r.y,r.z);
      // Capture the muzzle once. The round leaves the moving shooter behind,
      // then converges on the server trajectory within its first four ticks.
      const age=r.visualAge??r.age;
      if(age<4 && r.weapon>=1 && r.weapon<=3 && r.shooter!=null){
        let offset=offsets.get(r.id);
        if(!offset && visibleMuzzle(r.shooter,r.weapon,tip)){
          origin.set(r.vx,r.vy,r.vz).multiplyScalar(-age/30).add(pose.position);
          offset=tip.clone().sub(origin);
          offsets.set(r.id,offset);
        }
        if(offset){offset.frame=frame;pose.position.addScaledVector(offset,1-age/4);}
      }
      pose.quaternion.setFromUnitVectors(up,direction);
      const length=r.weapon==='turret'?.235:r.weapon===2?.145:.185;
      const radius=r.weapon==='turret'?.025:.020;
      pose.scale.set(radius,length,radius);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
    }
    for(const [id,offset] of offsets)if(offset.frame!==frame)offsets.delete(id);
    if(mesh.count) mesh.instanceMatrix.needsUpdate=true;
  };
}
