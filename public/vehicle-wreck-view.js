import * as THREE from 'three';

// The transient fire, debris and spray share the existing capped smoke and
// particle pools. A wreck pose is separately reconstructed from its countdown.
export function vehicleWreckBurst(event,puff,particle,random){
  const water=event.surface==='water',center=new THREE.Vector3().copy(event.to);
  for(let i=0;i<11;i++){
    const a=i*Math.PI*2/11,span=.45+random()*.40;
    const dx=Math.cos(a),dz=Math.sin(a);
    const at=center.clone().add(new THREE.Vector3(dx*span,.15+random()*.26,dz*span));
    const rise=new THREE.Vector3(dx*(1.2+random()),1.35+random()*2.8,dz*(1.2+random()));
    puff(at,rise,1.12,2.0+random()*.98,.32+random()*.23,i%3?0xff943b:0xffdc87,.98);
    puff(at.clone(),new THREE.Vector3(dx*.78,1.4+random()*1.50,dz*.78),
      .68,2.08+random()*.82,1.1+random()*.77,i%2?0x4b4946:0x6b625a,.74);
    if(water)puff(at.clone().add(new THREE.Vector3(dx*.47,-.28,dz*.47)),
      new THREE.Vector3(dx*2.9,1.68+random()*1.15,dz*2.9),.52,1.64,.56,0xb5d6d3,.67);
    const size=.035+.052*random();
    particle(at,new THREE.Vector3(dx*3.20,2.8+random()*2.5,dz*3.20),
      new THREE.Vector3(size,size*.47,size*1.36),i%3?0x514c43:0xe8a955,.42+.30*random());
  }
}

export function vehicleCrushDust(event,puff,random){
  const center=new THREE.Vector3().copy(event.to);
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4,dx=Math.cos(angle),dz=Math.sin(angle);
    const at=center.clone().add(new THREE.Vector3(dx*.75,-.55,dz*.75));
    puff(at,new THREE.Vector3(dx*(.8+random()),.3+random()*.5,dz*(.8+random())),
      .35,.65+random()*.4,.38,i%2?0x827b70:0x655f58,.55);
  }
}

export function crushedScale(car){
  if(!car.crushed)return 1;
  return car.recoverySeconds>4.6 ? .24 : 0;
}

const burnedMetal=new THREE.MeshLambertMaterial({color:0x4f4340,vertexColors:true,side:THREE.DoubleSide});

// Only swap the wreck's own meshes; civilian paint and glass are shared
// across nearby intact cars. Restore the original finish on respawn.
export function roadWreckFinish(group){
  let originals;
  return car=>{
    if(car.wrecked && !car.crushed && !originals){
      originals=new Map();
      group.traverse(mesh=>{
        if(!mesh.isMesh)return;
        originals.set(mesh,mesh.material);mesh.material=burnedMetal;
      });
    }else if((!car.wrecked || car.crushed) && originals){
      for(const [mesh,material] of originals)mesh.material=material;
      originals=null;
    }
    return car.wrecked && !car.crushed ? 1-Math.exp(-3*Math.max(0,6-car.recoverySeconds)) : 0;
  };
}
