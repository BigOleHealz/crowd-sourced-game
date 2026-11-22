import * as THREE from 'three';

// One foam ring and a small fan of drops at each visible contact. Both players
// phase the spray from the same encounter age, including after a late join.
export function sharkDogSpray(scene,water){
  let droplets,foam;
  const dummy=new THREE.Object3D(),slots=3,drops=12;
  function allocate(){
    const mat=new THREE.MeshBasicMaterial({color:0xe4f4e8,transparent:true,opacity:.70,depthWrite:false});
    droplets=new THREE.InstancedMesh(new THREE.SphereGeometry(1,5,4),mat,slots*drops);
    foam=new THREE.InstancedMesh(new THREE.RingGeometry(.90,1,30).rotateX(-Math.PI/2),mat,slots);
    for(const mesh of [droplets,foam]){
      mesh.frustumCulled=false;mesh.renderOrder=4;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
    }
  }
  return (sharks,local)=>{
    let n=0,cloud=0;
    for(const s of sharks??[]){
      const e=s.dogEncounter;
      if(s.phase!=='dog-strike' || !e || n>=slots || Math.hypot(e.x-local.x,e.z-local.z)>45)continue;
      if(!droplets)allocate();
      const age=e.t,size=e.size??1,r=(.14+age*1.17)*size;
      dummy.position.set(e.x,water+.03,e.z);dummy.scale.set(r,1,r*(1+.14*Math.cos(age*3)));
      dummy.updateMatrix();foam.setMatrixAt(n++,dummy.matrix);
      for(let i=0;i<drops;i++){
        const t=age-i%3*.12,theta=e.yaw+i*2.39996,reach=t*(.61+i%4*.26);
        const h=t*(2.65+(i%3)*.39-4.02*t);
        if(t<0 || h<=0)continue;
        const w=(.046+.007*(i%4))*size;
        dummy.position.set(e.x+Math.sin(theta)*reach,water+h*size,e.z+Math.cos(theta)*reach);
        dummy.scale.set(w,w*2.2,w);dummy.updateMatrix();droplets.setMatrixAt(cloud++,dummy.matrix);
      }
    }
    if(droplets){
      foam.count=n;droplets.count=cloud;foam.visible=n>0;droplets.visible=cloud>0;
      if(n)foam.instanceMatrix.needsUpdate=true;
      if(cloud)droplets.instanceMatrix.needsUpdate=true;
    }
  };
}
