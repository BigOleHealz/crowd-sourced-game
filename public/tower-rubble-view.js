import * as THREE from 'three';
import {rubbleHeight,rubbleProgress} from './tower-damage.js';

// Only collapsed lots allocate rubble. The surface uses the same height
// function as movement, and a seeded layout gives late arrivals the same ruin.
export function towerRubbleView(scene){
  const ruins=new Map(),box=new THREE.BoxGeometry(),matrix=new THREE.Object3D();
  const material=new THREE.MeshLambertMaterial({vertexColors:false});
  const stone=new THREE.MeshLambertMaterial({color:0x887f73,flatShading:true});
  const colors=[0xb4a995,0x837f75,0xa39a87,0x687273,0x514e49];
  function create(b,directions){
    const settled={towerDirections:directions};
    let seed=b.towerId+551;
    const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const geometry=new THREE.PlaneGeometry(b.w,b.d,12,12);
    geometry.rotateX(-Math.PI/2);
    const pos=geometry.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setY(i,rubbleHeight(b,b.x+pos.getX(i),b.z+pos.getZ(i),settled)-.025);
    geometry.computeVertexNormals();
    const mound=new THREE.Mesh(geometry,stone);mound.position.set(b.x,0,b.z);
    mound.name='Tower rubble '+b.towerId;mound.receiveShadow=true;scene.add(mound);
    const count=80,mesh=new THREE.InstancedMesh(box,material,count),pieces=[];
    mesh.frustumCulled=false;mesh.receiveShadow=true;scene.add(mesh);
    for(let i=0;i<count;i++){
      const x=b.x+(rand()-.5)*b.w*.91,z=b.z+(rand()-.5)*b.d*.91;

      pieces.push({x,z,y:rubbleHeight(b,x,z,settled),h:.16+rand()*.35,w:.4+rand()*1.6,d:.35+rand()*1.2,
        rx:(rand()-.5)*.57,ry:rand()*Math.PI,rz:(rand()-.5)*.6});
      mesh.setColorAt(i,new THREE.Color(colors[i%colors.length]));
    }
    pieces.forEach((p,i)=>{
      matrix.position.set(p.x,p.y+p.h*.22,p.z);matrix.rotation.set(p.rx,p.ry,p.rz);
      matrix.scale.set(p.w,p.h,p.d);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
    return {mound,mesh};
  }
  return (towers,ids,events,directions)=>{
    for(const [id,r] of ruins)if(!ids.includes(id)){
      scene.remove(r.mound,r.mesh);r.mound.geometry.dispose();r.mesh.dispose();ruins.delete(id);
    }
    for(const id of ids){
      let r=ruins.get(id);
      if(!r){r=create(towers[id],directions);ruins.set(id,r);}
      const event=events?.find(e=>e.tower===id),rise=event?rubbleProgress(event.age):1;
      for(const object of [r.mound,r.mesh]){
        object.visible=rise>.001;object.scale.y=rise;object.position.y=towers[id].base*(1-rise);
      }
    }
  };
}
