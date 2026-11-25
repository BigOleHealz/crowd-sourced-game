import * as THREE from 'three';

// Long axis is +Y, with the nose at Y=0 (the replicated leading point).
export function flightRounds(scene) {
  const profile=[[0,-1],[.76,-1],[1,-.81],[.94,-.45],[.52,-.19],[0,0]];
  const geometry=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),8);
  const normals=geometry.attributes.normal, positions=geometry.attributes.position;
  const tint=new THREE.Color(), colors=[];
  for(let i=0;i<positions.count;i++){
    const y=positions.getY(i);
    // The bright heel reads from behind; the dark shoulder separates it from sky and concrete.
    if(y<-.89){
      const radius=Math.hypot(positions.getX(i),positions.getZ(i));
      tint.setHex(radius<.1?0xfff5d5:0xf3b36a);
    }else{
      tint.setHex(y<-.57?0x4c3830:y<-.25?0xb78558:0xefcc94);
    }
    tint.multiplyScalar(.94+.22*normals.getX(i));
    colors.push(tint.r,tint.g,tint.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true}),192);
  mesh.name='Flying rounds';mesh.count=0;mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
  const pose=new THREE.Object3D(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  const offsets=new Map(),tip=new THREE.Vector3(),forward=new THREE.Vector3(),origin=new THREE.Vector3();
  let frame=0;
  return (bullets,visibleMuzzle,localShooterId)=>{
    frame++;
    mesh.count=Math.min(bullets?.length??0,mesh.instanceMatrix.count);
    for(let i=0;i<mesh.count;i++){
      const r=bullets[i];
      direction.set(r.vx,r.vy,r.vz).normalize();
      pose.position.set(r.x,r.y,r.z);
      // Capture the muzzle once. The round leaves the moving shooter behind,
      // then converges on the server trajectory within its first four ticks.
      const age=r.visualAge??r.age;
      const jet=r.source==='jet';
      // The local reticle follows the replicated trajectory. Shifting that
      // round toward the posed gun makes it visibly fly away from the aim point.
      if(age<4 && r.shooter!==localShooterId && (jet || (r.weapon>=1 && r.weapon<=3)) && r.shooter!=null){
        let offset=offsets.get(r.id);
        if(!offset && visibleMuzzle(r.shooter,r.weapon,tip,r.source,forward)){
          origin.set(r.vx,r.vy,r.vz).multiplyScalar(-age/30).add(pose.position);
          offset=tip.clone().sub(origin);
          if(jet)offset.velocity=forward.clone().multiplyScalar(Math.hypot(r.vx,r.vy,r.vz)).sub(origin.set(r.vx,r.vy,r.vz));
          offsets.set(r.id,offset);
        }
        if(offset){
          offset.frame=frame;
          const blend=1-age/4;
          pose.position.addScaledVector(offset,blend);
          if(offset.velocity){
            pose.position.addScaledVector(offset.velocity,age/30*blend);
            direction.set(r.vx,r.vy,r.vz).addScaledVector(offset.velocity,blend).normalize();
          }
        }
      }
      pose.quaternion.setFromUnitVectors(up,direction);
      const length=r.weapon==='turret'?.26:r.weapon===2?.16:.202;
      const radius=r.weapon==='turret'?.031:.025;
      pose.scale.set(radius,length,radius);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
    }
    for(const [id,offset] of offsets)if(offset.frame!==frame)offsets.delete(id);
    if(mesh.count) mesh.instanceMatrix.needsUpdate=true;
  };
}
