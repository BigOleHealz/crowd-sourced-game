import * as THREE from 'three';
import {bandHeight,towerBase,towerCellBounds} from './tower-damage.js';

export function towerDamageView(scene,buildings,meshes) {
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
  const cuts=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshLambertMaterial(),towers.length*levels*16);
  cuts.count=0;cuts.frustumCulled=false;
  const transform=new THREE.Object3D(),depthMat=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  const concrete=new THREE.Color(0x514f49);
  const edges=new THREE.Color(0x958778);
  scene.add(cuts);
  let installed=false, previous='';
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
  return doors=>{
    const ids=doors?.towerBreaches??[];
    const key=ids.join(',');
    if(key===previous)return;
    previous=key;
    if(!installed){
      bind(depthMat);
      for(const root of meshes)root.traverse(obj=>{
        if(!obj.isMesh)return;
        bind(obj.material);if(obj.castShadow)obj.customDepthMaterial=depthMat;
      });
      installed=true;
    }
    data.fill(0);cuts.count=0;
    for(const id of ids){
      const b=towers[Math.floor(id/64)];
      if(!b)continue;
      const {x0,x1,y0,y1,z0,z1}=towerCellBounds(b,id);
      const row=Math.floor(id%64/4);
      for(let z=Math.floor(z0);z<Math.ceil(z1);z++){
        const start=(row*depth+z-north)*width-west;
        data.fill(255,start+Math.floor(x0),start+Math.ceil(x1));
      }
      // The surviving bays expose concrete cross-walls and fractured floor edges.
      const right=id%2,back=(id>>1)%2;
      const x=(b.x+(right?1:-1)*b.w/4),z=b.z+(back?1:-1)*b.d/4;
      const h=Math.min(y1,b.base+b.eave)-y0;
      if(h<=0)continue;
      if(!ids.includes(id^1))block(concrete,b.x,y0+h/2,z,.12,h,b.d/2);
      if(!ids.includes(id^2))block(concrete,x,y0+h/2,b.z,b.w/2,h,.12);
      if(row===0 || !ids.includes(id-4))block(edges,x,y0,z,b.w/2,.18,b.d/2);
      if(y1<b.base+b.eave && !ids.includes(id+4))block(edges,x,y1,z,b.w/2,.18,b.d/2);
    }
    cuts.instanceMatrix.needsUpdate=true;
    if(cuts.instanceColor)cuts.instanceColor.needsUpdate=true;
    mask.needsUpdate=true;
  };
}
