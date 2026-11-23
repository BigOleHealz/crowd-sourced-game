import * as THREE from 'three';

// The held and moving spear use the same short, brightly banded shaft.
export function spearfishingView(scene,camera){
  const shaft=new THREE.CylinderGeometry(.012,.016,.59,6),grip=new THREE.CylinderGeometry(.024,.024,.16,8);
  const tip=new THREE.ConeGeometry(.026,.115,6);
  const blue=new THREE.MeshLambertMaterial({color:0x34565c}),gold=new THREE.MeshLambertMaterial({color:0xe8b344});
  const steel=new THREE.MeshLambertMaterial({color:0xc2d6d0});
  const spear=new THREE.Group();
  for(const [shape,mat,y] of [[shaft,blue,0],[grip,gold,-.17],[tip,steel,.347]]){
    const mesh=new THREE.Mesh(shape,mat);mesh.position.y=y;spear.add(mesh);
  }
  const up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3();
  const held=spear.clone();held.name='Scuba hand spear';held.visible=false;
  held.position.set(.18,-.15,-.43);
  held.quaternion.setFromUnitVectors(up,dir.set(-.14,.11,-1).normalize());camera.add(held);
  const passing=new Map();
  return (players,local,sighted,tick)=>{
    const age=tick-(local.spearfishing?.last?.tick??-Infinity);
    held.visible=sighted && (age<0 || age>12);
    for(const shot of passing.values())shot.visible=false;
    for(const who of players){
      const last=who.spearfishing?.last,elapsed=tick-last?.tick;
      if(!last || elapsed<0 || elapsed>12)continue;
      let shot=passing.get(who.id);
      if(!shot){shot=spear.clone();shot.name='Passing fishing spear';passing.set(who.id,shot);scene.add(shot);}
      const {from,to}=last;
      dir.set(to.x-from.x,to.y-from.y,to.z-from.z);
      if(dir.lengthSq()<.001)continue;
      const progress=Math.min(1,elapsed/10);
      shot.position.set(from.x+dir.x*progress,from.y+dir.y*progress,from.z+dir.z*progress);
      shot.quaternion.setFromUnitVectors(up,dir.normalize());
      shot.visible=true;
    }
    for(const [id,shot] of passing)if(!shot.visible){scene.remove(shot);passing.delete(id);}
  };
}
