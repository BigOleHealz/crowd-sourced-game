import * as THREE from 'three';
import { mounts, mountPosition } from './mounts.js';

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
        mesh.rotation.set(-Math.PI/2+(m.pitch ?? 0),-m.yaw,0,'YXZ');
      }
      const factor=1-Math.exp(-dt*35);
      mesh.position.x+=(m.x-mesh.position.x)*factor;
      mesh.position.y+=(m.y-mesh.position.y)*factor;
      mesh.position.z+=(m.z-mesh.position.z)*factor;
    }
    for(const [id,mesh] of live) if(!ids.has(id)){scene.remove(mesh);live.delete(id);}
  };
}

// A pedestal and a separate swivel keep the handles and barrel on the same axes.
export function turretView(scene,kind,Batch,material) {
  const base=new THREE.Group(), swivel=new THREE.Group(), cradle=new THREE.Group();
  scene.add(base);base.add(swivel);swivel.add(cradle);
  const metal=new Batch(), stand=new Batch(), box=new THREE.BoxGeometry(1,1,1);
  const cylinder=new THREE.CylinderGeometry(1,1,1,12);
  if(kind==='rover'){
    stand.add(cylinder,0x525b53,0,-.62,0,.093,1.24,.093);
    stand.add(cylinder,0x53574d,0,-1.22,0,.22,.052,.22);
  } else stand.add(cylinder,0x53574d,0,.085,0,.22,.18,.22);
  stand.add(cylinder,0x4c554c,0,-.014,0,.157,.13,.157);
  metal.add(box,0x49534e,0,.006,-.06,.212,.182,.37);
  metal.add(cylinder,0x444e4b,0,.026,-.36,.066,.33,.066,Math.PI/2);
  metal.add(cylinder,0x303b39,0,.026,-.55,.032,.29,.032,Math.PI/2);
  metal.add(box,0x82947b,-.153,-.012,-.012,.11,.13,.16);
  metal.add(box,0x626861,0,.112,-.071,.177,.045,.298);
  for(let j=0;j<5;j++){
    metal.add(box,0x535b55,0,.026,-.28-.042*j,.115,.110,.018);
    metal.add(box,0x999079,-.123,-.028,.038-.024*j,.036,.028,.015);
  }
  metal.add(cylinder,0x49504b,0,.026,-.673,.043,.064,.043,Math.PI/2);
  metal.add(box,0x434a42,-.167,.06,-.008,.125,.022,.18);
  for(const side of [-1,1]){
    metal.beam(0x49524d,[side*.073,0,.095],[side*.177,-.004,.19],.038);
    metal.add(cylinder,0x423c33,side*.177,-.062,.19,.032,.13,.032);
  }
  stand.mesh(base,material,false);metal.mesh(cradle,material,false);
  box.dispose();cylinder.dispose();
  const offset=mounts[kind].turret;
  return v=>{
    const pivot=mountPosition(v,offset);
    base.position.set(pivot.x,pivot.y,pivot.z);
    base.visible=!v.wrecked;
    swivel.rotation.y=-(v.gunner==null ? v.yaw : v.turretYaw);
    cradle.rotation.x=v.gunner==null ? (v.pitch ?? 0) : v.turretPitch;
  };
}
