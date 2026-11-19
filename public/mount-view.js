import * as THREE from 'three';
import { mounts } from './mounts.js';

export function missileLaunchers(batch,kind) {
  const [side,y,z]=mounts[kind].launcher;
  const sleeve=new THREE.CylinderGeometry(.098,.098,.75,10);
  const tip=new THREE.ConeGeometry(.073,.19,10);
  const bracket=new THREE.BoxGeometry(1,1,1);
  for(const x of [-side,side]) {
    batch.add(bracket,0x444d49,x*.88,y+.07,z+.33,.25,.09,.32);
    batch.add(sleeve,0x465952,x,y,z+.33,1,1,1,-Math.PI/2);
    batch.add(tip,0xc8ab6b,x,y,z-.096,1,1,1,-Math.PI/2);
  }
  bracket.dispose();tip.dispose();sleeve.dispose();
}

export function missileView(scene) {
  const body=new THREE.ConeGeometry(.095,.60,8);
  const finish=new THREE.MeshBasicMaterial({color:0xffb453});
  const live=new Map();
  return (missiles, dt)=>{
    const ids=new Set();
    for(const m of missiles) {
      ids.add(m.id);
      let mesh=live.get(m.id);
      if(!mesh) {
        mesh=new THREE.Mesh(body,finish);live.set(m.id,mesh);scene.add(mesh);
        mesh.position.set(m.x,m.y,m.z);
        mesh.rotation.set(-Math.PI/2,-m.yaw,0,'YXZ');
      }
      const factor=1-Math.exp(-dt*35);
      mesh.position.x+=(m.x-mesh.position.x)*factor;
      mesh.position.z+=(m.z-mesh.position.z)*factor;
    }
    for(const [id,mesh] of live) if(!ids.has(id)){scene.remove(mesh);live.delete(id);}
  };
}
