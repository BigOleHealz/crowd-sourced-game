import * as THREE from 'three';
import {estateSafes} from './estate-safes.js';
import {furnishingSupported} from './estate-damage.js';

export function addEstateSafes(scene,Batch){
  const cube=new THREE.BoxGeometry(),steel=new THREE.MeshLambertMaterial({vertexColors:true});
  const safes=estateSafes.map(s=>{
    const group=new THREE.Group(),hinge=new THREE.Group(),casework=new Batch(),door=new Batch();
    group.position.set(s.x,s.y+s.table,s.z);group.rotation.y=s.side===1?0:Math.PI;
    group.add(hinge);scene.add(group);
    const plate=(b,color,x,y,z,w,h,d)=>b.add(cube,color,x,y,z,w,h,d);
    for(const side of [-1,1]){
      plate(casework,0x3e5154,side*.30,.235,0,.05,.47,.42);
      plate(casework,0x516267,0,.235+side*.21,0,.60,.05,.42);
    }
    plate(casework,0x202d2e,0,.235,-.19,.58,.40,.04);
    hinge.position.set(-.29,0,.205);
    plate(door,0x35474a,.29,.235,0,.57,.39,.055);
    plate(door,0xa5aaaa,.35,.25,.04,.23,.10,.034);
    plate(door,0xd8bb82,.12,.31,.039,.10,.11,.028);
    casework.mesh(group,steel,false);door.mesh(hinge,steel,false);
    return {s,group,hinge};
  });
  cube.dispose();
  return doors=>{
    for(const {s,group,hinge} of safes){
      group.visible=furnishingSupported(s.id,s.x,s.y,s.z,doors);
      hinge.rotation.y=doors?.estateSafes&s.bit?-1.38:0;
    }
  };
}
