import * as THREE from 'three';
import {rubbleHeight} from './tower-damage.js';

// Only collapsed lots allocate rubble. The surface uses the same height
// function as movement, and a seeded layout gives late arrivals the same ruin.
export function towerRubbleView(scene){
  const ruins=new Map(),box=new THREE.BoxGeometry(),matrix=new THREE.Object3D();
  const material=new THREE.MeshLambertMaterial({vertexColors:false});
  const stone=new THREE.MeshLambertMaterial({color:0x887f73,flatShading:true});
  const colors=[0xb4a995,0x837f75,0xa39a87,0x687273,0x514e49];
  function create(b,animate){
    let seed=b.towerId+551;
    const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    const geometry=new THREE.PlaneGeometry(b.w,b.d,12,12);
    geometry.rotateX(-Math.PI/2);
    const pos=geometry.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setY(i,rubbleHeight(b,b.x+pos.getX(i),b.z+pos.getZ(i))-.025);
    geometry.computeVertexNormals();
    const mound=new THREE.Mesh(geometry,stone);mound.position.set(b.x,0,b.z);
    mound.name='Tower rubble '+b.towerId;mound.receiveShadow=true;scene.add(mound);
    const count=80,mesh=new THREE.InstancedMesh(box,material,count),pieces=[];
    mesh.frustumCulled=false;mesh.receiveShadow=true;scene.add(mesh);
    for(let i=0;i<count;i++){
      const x=b.x+(rand()-.5)*b.w*.91,z=b.z+(rand()-.5)*b.d*.91;
      const floorSlab=i<24,initialX=b.x+((i%2)-.5)*b.w*.48;
      pieces.push({x,z,y:rubbleHeight(b,x,z),h:.16+rand()*.35,w:.4+rand()*1.6,d:.35+rand()*1.2,
        initialX:floorSlab?initialX:x,initialZ:floorSlab?b.z:z,initialWidth:floorSlab?b.w*.46:1,initialDepth:floorSlab?b.d*.90:1,
        floorSlab,
        rx:(rand()-.5)*.57,ry:rand()*Math.PI,rz:(rand()-.5)*.6,start:(floorSlab?(Math.floor(i/2)+1)/12:(.04+rand()*.94))*b.eave,delay:rand()*.18});
      mesh.setColorAt(i,new THREE.Color(colors[i%colors.length]));
    }
    return {mound,mesh,pieces,age:animate?0:2,settled:false};
  }
  return (towers,ids,dt,live)=>{
    for(const [id,r] of ruins)if(!ids.includes(id)){
      scene.remove(r.mound,r.mesh);r.mound.geometry.dispose();r.mesh.dispose();ruins.delete(id);
    }
    for(const id of ids){
      let r=ruins.get(id);
      if(!r){r=create(towers[id],live);ruins.set(id,r);}
      if(r.settled)continue;
      r.age+=dt;
      r.pieces.forEach((p,i)=>{
        const t=Math.max(0,Math.min(1,(r.age-p.delay)/1.25));
        const drop=1-t*t;
        matrix.position.set(p.x+(p.initialX-p.x)*drop,p.y+p.h*.22+p.start*drop,p.z+(p.initialZ-p.z)*drop);
        matrix.rotation.set(p.rx*t,p.floorSlab?p.ry*t:p.ry,p.rz*t);
        matrix.scale.set(p.w+(p.initialWidth-p.w)*drop,p.h,p.d+(p.initialDepth-p.d)*drop);matrix.updateMatrix();
        r.mesh.setMatrixAt(i,matrix.matrix);
      });
      r.mesh.instanceMatrix.needsUpdate=true;r.settled=r.age>=1.45;
    }
  };
}
