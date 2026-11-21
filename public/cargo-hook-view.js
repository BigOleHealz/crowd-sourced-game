import * as THREE from 'three';
import {bellyHeight,slingHitch,slingVehicle} from './cargo-hook.js';
export function cargoHookView(scene){
  const group=new THREE.Group(),steel=new THREE.MeshStandardMaterial({color:0x666d70,metalness:.68,roughness:.4});
  const line=new THREE.Mesh(new THREE.CylinderGeometry(.029,.029,1,7),steel);
  const tip=new THREE.Group(),paint=new THREE.MeshStandardMaterial({color:0xe6a331,roughness:.54});
  const shank=new THREE.Mesh(new THREE.CylinderGeometry(.07,.06,.22,8),paint);
  shank.position.y=.16;tip.add(shank);
  const curve=new THREE.Mesh(new THREE.TorusGeometry(.15,.043,6,16,Math.PI*1.62),paint);
  curve.rotation.z=Math.PI*.46;tip.add(curve);group.add(line,tip);group.visible=false;scene.add(group);
  const a=new THREE.Vector3(),b=new THREE.Vector3(),axis=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  return world=>{
    const h=world.heli,hook=h?.hook;
    group.visible=!!hook && hook.length>.03;
    if(!group.visible)return;
    const load=hook.load && slingVehicle(world,hook.load);
    a.set(h.x,h.y+bellyHeight,h.z);
    if(load)b.set(load.x,load.y+slingHitch(load),load.z);
    else b.set(h.x,a.y-hook.length,h.z);
    tip.position.copy(b);b.y+=.22;
    axis.subVectors(a,b);line.scale.y=Math.max(.005,axis.length());
    line.quaternion.setFromUnitVectors(up,axis.normalize());line.position.addVectors(a,b).multiplyScalar(.5);
  };
}
