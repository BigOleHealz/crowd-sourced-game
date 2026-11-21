import {towerRubbleView} from './tower-rubble-view.js';
import * as THREE from 'three';
import {bandHeight,towerBase,towerCellBounds,towerStride,baysAcross,baysPerFloor} from './tower-damage.js';

export function towerDamageView(scene,buildings,meshes,renderer) {
  const updateRuins=towerRubbleView(scene);
  const towers=buildings.filter(b=>b.towerId!=null);
  const west=Math.floor(Math.min(...towers.map(b=>b.x-b.w/2-2)));
  const north=Math.floor(Math.min(...towers.map(b=>b.z-b.d/2-2)));
  const width=Math.ceil(Math.max(...towers.map(b=>b.x+b.w/2+2)))-west;
  const depth=Math.ceil(Math.max(...towers.map(b=>b.z+b.d/2+2)))-north;
  const levels=Math.ceil((Math.max(...towers.map(b=>b.base+b.eave+2))-towerBase)/bandHeight);
  const data=new Uint8Array(width*depth*levels);
  const mask=new THREE.Data3DTexture(data,width,depth,levels);
  mask.format=THREE.RedFormat;
  mask.needsUpdate=true;
  const seen=new Set();
  const cuts=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshLambertMaterial(),towers.length*levels*baysPerFloor*6);
  cuts.count=0;cuts.frustumCulled=false;
  const transform=new THREE.Object3D(),depthMat=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  const concrete=new THREE.Color(0x514f49);
  const edges=new THREE.Color(0x958778);
  scene.add(cuts);
  let lastDoors, lastCount, lastRuins, installed=false, previous='|';
  function bind(mat) {
    if(seen.has(mat))return;
    seen.add(mat);
    const compile=mat.onBeforeCompile,key=mat.customProgramCacheKey();
    mat.customProgramCacheKey=()=>key+'-tower-damage';
    mat.onBeforeCompile=function(s,r){
      compile.call(this,s,r);
      s.uniforms.towerMask={value:mask};
      s.vertexShader='varying vec3 towerPoint;\n'+s.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\n vec4 tp=vec4(transformed,1.);\n#ifdef USE_INSTANCING\n tp=instanceMatrix*tp;\n#endif\n towerPoint=(modelMatrix*tp).xyz;');
      s.fragmentShader='varying vec3 towerPoint; uniform highp sampler3D towerMask;\n'+s.fragmentShader.replace('#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        ivec3 cell=ivec3(floor(vec3(towerPoint.x-float(${west}),towerPoint.z-float(${north}),(towerPoint.y-${towerBase})/${bandHeight}.0)));
        if(all(greaterThanEqual(cell,ivec3(0))) && all(lessThan(cell,textureSize(towerMask,0))) && texelFetch(towerMask,cell,0).r>.5) discard;`);
    };
    mat.needsUpdate=true;
  }
  function block(mat,x,y,z,w,h,d) {
    transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.updateMatrix();
    cuts.setMatrixAt(cuts.count,transform.matrix);cuts.setColorAt(cuts.count++,mat);
  }
  const rubble=new THREE.InstancedMesh(cuts.geometry,new THREE.MeshLambertMaterial({color:0x887d6e}),64);
  rubble.count=0;rubble.frustumCulled=false;scene.add(rubble);
  let elapsed=0,particles=[],known=null;
  function animate(dt){
    if(!particles.length)return;
    elapsed+=dt;
    particles=particles.filter(p=>elapsed-p.time<1.35);
    rubble.count=particles.length;
    particles.forEach((p,i)=>{
      const t=elapsed-p.time;
      transform.position.set(p.x+p.vx*t,p.y+p.vy*t-6*t*t,p.z+p.vz*t);
      transform.rotation.set(t*p.vz,t*p.vx,0);transform.scale.set(p.size,p.size*.48,p.size*.72);
      transform.updateMatrix();rubble.setMatrixAt(i,transform.matrix);
    });
    rubble.instanceMatrix.needsUpdate=true;transform.rotation.set(0,0,0);
  }
  return (doors,dt)=>{
    animate(dt);
    const ids=doors?.towerBreaches??[];
    const collapsed=doors?.collapsedTowers??[];
    updateRuins(towers,collapsed,doors?.structureFalls,doors?.towerDirections);
    if(lastDoors===doors && lastCount===ids.length && lastRuins===collapsed.length)return;
    lastDoors=doors;lastCount=ids.length;lastRuins=collapsed.length;
    const key=ids.join(',')+'|'+collapsed.join(',');
    if(key===previous){known??=new Set(ids);return;}
    previous=key;
    if(!installed){
      bind(depthMat);
      for(const root of meshes)root.traverse(obj=>{
        if(!obj.isMesh)return;
        for(const mat of [].concat(obj.material))bind(mat);
        if(obj.castShadow)obj.customDepthMaterial=depthMat;
      });
      installed=true;
    }
    data.fill(0);cuts.count=0;
    const lost=new Set(ids);
    for(const tower of collapsed){
      const b=towers[tower];
      for(let row=0;row<levels;row++)for(let z=Math.floor(b.z-b.d/2-1.55);z<Math.ceil(b.z+b.d/2+1.55);z++){
        const start=(row*depth+z-north)*width-west;
        data.fill(255,start+Math.floor(b.x-b.w/2-1.55),start+Math.ceil(b.x+b.w/2+1.55));
      }
    }
    for(const id of ids){
      const b=towers[Math.floor(id/towerStride)];
      if(!b)continue;
      const {x0,x1,y0,y1,z0,z1}=towerCellBounds(b,id);
      const row=Math.floor(id%towerStride/baysPerFloor);
      for(let z=Math.floor(z0);z<Math.ceil(z1);z++){
        const start=(row*depth+z-north)*width-west;
        data.fill(255,start+Math.floor(x0),start+Math.ceil(x1));
      }
      // The surviving bays expose concrete cross-walls and fractured floor edges.
      const col=id%baysAcross,line=Math.floor(id%baysPerFloor/baysAcross);
      const left=Math.max(b.x-b.w/2,x0),right=Math.min(b.x+b.w/2,x1);
      const front=Math.max(b.z-b.d/2,z0),back=Math.min(b.z+b.d/2,z1);
      const x=(left+right)/2,z=(front+back)/2,w=right-left,d=back-front;
      const h=Math.min(y1,b.base+b.eave)-y0;
      if(h<=0)continue;
      if(known && !known.has(id)){
        const signX=x>=b.x?1:-1, signZ=z>=b.z?1:-1;
        for(let i=0;i<12;i++){
          const along=Math.random(),side=i%2===0;
          particles.push({time:elapsed,x:side?x+signX*w/2:left+along*w,
            z:side?front+along*d:z+signZ*d/2,y:y0+.25+Math.random()*h,
            vx:signX*(.5+Math.random()*2),vz:signZ*(.5+Math.random()*2),vy:Math.random()*2,size:.16+Math.random()*.38});
        }
        particles=particles.slice(-64);
      }
      if(col>0 && !lost.has(id-1))block(concrete,left,y0+h/2,z,.12,h,d);
      if(col<baysAcross-1 && !lost.has(id+1))block(concrete,right,y0+h/2,z,.12,h,d);
      if(line>0 && !lost.has(id-baysAcross))block(concrete,x,y0+h/2,front,w,h,.12);
      if(line<baysAcross-1 && !lost.has(id+baysAcross))block(concrete,x,y0+h/2,back,w,h,.12);
      if(row===0 || !lost.has(id-baysPerFloor))block(edges,x,y0,z,w,.18,d);
      if(y1<b.base+b.eave && !lost.has(id+baysPerFloor))block(edges,x,y1,z,w,.18,d);
    }
    known=new Set(ids);
    if(!ids.length){particles=[];rubble.count=0;}
    cuts.instanceMatrix.needsUpdate=true;
    if(cuts.instanceColor)cuts.instanceColor.needsUpdate=true;
    mask.needsUpdate=true;renderer.shadowMap.needsUpdate=true;
  };
}
