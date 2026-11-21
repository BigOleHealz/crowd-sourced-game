import * as THREE from 'three';
import {carriedFinish} from './equipment-finish.js';
import {throwableLimit} from './arcade-molotov.js';

// An opaque arcade capsule with an amber crown and enamel chevrons.
export function capsuleProp(b){
  const mold=new THREE.LatheGeometry([[0,-.13],[.044,-.126],[.056,-.095],[.061,-.039],
    [.062,.008],[.054,.033],[.037,.049],[.032,.076],[0,.077]].map(([x,y])=>new THREE.Vector2(x,y)),14);
  const band=new THREE.CylinderGeometry(1,1,1,14);
  const chip=new THREE.BoxGeometry();
  b.add(mold,0x23968c,0,-.025,.040,1,1,1);
  for(const y of [-.112,.003])b.add(band,0xe8cb83,0,y,.040,.061,.013,.061);
  b.add(band,0x2f4249,0,.042,.040,.041,.031,.041);
  b.add(band,0xffa34e,0,.066,.040,.042,.019,.042);
  b.add(band,0xffdd90,0,.080,.040,.028,.012,.028);
  for(const side of [-1,1]){
    b.add(chip,0xf0cd73,side*.048,-.052,.081,.012,.052,.029,0,side*.6,side*.25);
    b.add(chip,0xf0cd73,side*.048,-.052,-.001,.012,.052,.029,0,-side*.6,side*.25);
  }
  mold.dispose();band.dispose();chip.dispose();
}

export function airborneCapsules(scene,Batch){
  const b=new Batch(true);capsuleProp(b);
  const mesh=new THREE.InstancedMesh(b.geometry(),carriedFinish(),throwableLimit);
  mesh.name='Thrown arcade capsules';mesh.frustumCulled=false;mesh.count=0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
  const pose=new THREE.Object3D();
  let previous,tween=0;
  return (list,tick,dt,localId,sighted)=>{
    mesh.count=Math.min(list?.length??0,throwableLimit);
    if(!mesh.count)return;
    if(list!==previous){tween=0;previous=list;}
    else tween=Math.min(.10,tween+dt);
    for(let i=0;i<mesh.count;i++){
      const s=list[i],age=((tick??s.born)-s.born)/30+tween;
      const emerge=s.shooter===localId && sighted ? THREE.MathUtils.smoothstep(age,.035,.12) : 1;
      pose.scale.setScalar(1.24*emerge);
      pose.position.set(s.x+s.vx*tween,s.y+s.vy*tween,s.z+s.vz*tween);
      pose.rotation.set(age*7,s.id*.92,age*3.4);
      pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
  };
}
