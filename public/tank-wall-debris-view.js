import * as THREE from 'three';
import {groundHeight} from './world.js';
import {cutGrid} from './tank-wall-cuts.js';

// Leave small masonry fragments at the edges of recent openings. The seeded
// settled pile looks the same to an observer who arrives after the impact.
export function tankWallDebrisView(scene){
  const capacity=120,perCell=5,fragments=[],pose=new THREE.Object3D(),color=new THREE.Color();
  let mesh,clock=0;
  function add(id,landed,doors){
    if(!mesh){
      mesh=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.5,0),new THREE.MeshLambertMaterial(),capacity);
      mesh.name='Broken tank wall masonry';mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;scene.add(mesh);
    }
    const x=cutGrid.west+(id%cutGrid.width+.5)*cutGrid.size;
    const z=cutGrid.north+(Math.floor(id/cutGrid.width)+.5)*cutGrid.size;
    let seed=id+17;
    const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    for(let i=0;i<perCell;i++){
      const a=rand()*Math.PI*2,drift=.40+.53*rand();
      const dx=Math.cos(a)*drift,dz=Math.sin(a)*drift,floor=groundHeight(x+dx,z+dz,1.65,doors);
      fragments.push({x,z,floor,start:landed?clock-2:clock,y:1.5+rand()*1.5,dx,dz,
        w:.22+.30*rand(),h:.12+.15*rand(),d:.19+.23*rand(),turn:a,tint:[0x9d9285,0xb4a694,0x87827c,0x7d7264][Math.floor(rand()*4)]});
    }
    if(fragments.length>capacity)fragments.splice(0,fragments.length-capacity);
  }
  return (doors,previous,dt)=>{
    const cuts=doors?.tankWallCuts;
    clock+=dt;
    if(!cuts?.length){if(mesh)mesh.count=0;fragments.length=0;return;}
    if(previous>cuts.length){previous=0;fragments.length=0;}
    for(let i=Math.max(previous,cuts.length-capacity/perCell);i<cuts.length;i++)add(cuts[i],previous===0 && dt===0,doors);
    if(!mesh || clock-fragments.at(-1).start>2 && mesh.count===fragments.length && previous===cuts.length)return;
    fragments.forEach((f,i)=>{
      const t=Math.max(0,clock-f.start),travel=Math.min(1,t*1.55);
      pose.position.set(f.x+f.dx*travel,Math.max(f.floor+f.h*.35,f.y+.6*t-6.8*t*t),f.z+f.dz*travel);
      pose.scale.set(f.w,f.h,f.d);pose.rotation.set(travel*.7,f.turn+travel*.8,-.4*travel);pose.updateMatrix();
      mesh.setMatrixAt(i,pose.matrix);mesh.setColorAt(i,color.setHex(f.tint));
    });
    mesh.count=fragments.length;mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
  };
}
