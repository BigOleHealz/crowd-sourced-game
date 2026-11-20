import * as THREE from 'three';
import {estates,estateCondition} from './estate-damage.js';

// One shared mask for the whole district keeps the existing building batches,
// glass indices, material textures and shadows intact. RGB encodes the storeys.
const width=512,height=448,west=-42,north=-454,metersPerTexel=1/6;
function ruinMask(){
  const pixels=new Uint8Array(width*height*4);
  const map=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat);
  map.magFilter=map.minFilter=THREE.NearestFilter;
  const active={value:false},uniform={value:map};
  const bands=estates.map(e=>e.levels.map((low,i)=>
    'if (m.'+'rgb'[i]+' > .1 && y >= '+low.toFixed(3)+' && (m.'+'rgb'[i]+' > .8 || y <= '+e.heads[i].toFixed(3)+')) discard;').join('\n'));
  function bind(material){
    const compile=material.onBeforeCompile,cache=material.customProgramCacheKey();
    material.customProgramCacheKey=()=>cache+'-estate-mask';
    material.onBeforeCompile=function(shader,renderer){
      compile.call(this,shader,renderer);
      shader.uniforms.estateActive=active;shader.uniforms.estateMap=uniform;
      shader.vertexShader='varying vec3 estateWorld;\n'+shader.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\n estateWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
      shader.fragmentShader='varying vec3 estateWorld; uniform sampler2D estateMap; uniform bool estateActive;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if(estateActive){
          vec2 uv=(estateWorld.xz-vec2(${west}.,${north}.))/vec2(${width*metersPerTexel},${height*metersPerTexel});
          if(all(greaterThanEqual(uv,vec2(0.))) && all(lessThan(uv,vec2(1.)))){
            vec3 m=texture2D(estateMap,uv).rgb; float y=estateWorld.y;
            if(estateWorld.x<0.){ ${bands[0]} }else{ ${bands[1]} }
          }
        }`);
    };
    material.needsUpdate=true;
  }
  function paint(cuts){
    active.value=cuts.length>0;
    pixels.fill(0);
    for(const r of cuts){
      const row=Math.max(0,Math.ceil((r.north-north)/metersPerTexel-.5));
      const endRow=Math.min(height,Math.ceil((r.south-north)/metersPerTexel-.5));
      const col=Math.max(0,Math.ceil((r.left-west)/metersPerTexel-.5));
      const endCol=Math.min(width,Math.ceil((r.right-west)/metersPerTexel-.5));
      for(let j=row;j<endRow;j++)for(let i=col;i<endCol;i++)
        pixels[(j*width+i)*4+r.level]=r.collapse?255:128;
    }
    map.needsUpdate=true;
  }
  map.needsUpdate=true;
  return {bind,paint};
}
export function estateDamageView(scene,meshes,solids){
  const mask=ruinMask(),materials=new Set();
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  mask.bind(depth);
  for(const root of meshes)root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    for(const material of [].concat(mesh.material)){
      if(materials.has(material))continue;
      mask.bind(material);materials.add(material);
    }
    if(mesh.castShadow)mesh.customDepthMaterial=depth;
  });
  const stones=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({roughness:.97}),1536);
  stones.name='Mansion masonry debris';stones.count=0;stones.frustumCulled=false;stones.receiveShadow=true;
  scene.add(stones);
  const transform=new THREE.Object3D(),color=new THREE.Color(),debris=[];
  let previous='',initialized=false,seen=new Set(),time=0,animateUntil=0;
  function scatter(r,animate){
    let seed=7919;
    for(const c of r.id)seed=Math.imul(seed,33)+c.charCodeAt(0);
    const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
    const material=solids.filter(p=>p.x+p.w/2>=r.left && p.x-p.w/2<=r.right &&
      p.z+p.d/2>=r.north && p.z-p.d/2<=r.south && .80+p.h>r.low+.3 && .8+(p.bottom??0)<r.high);
    const count=r.collapse?34:9;
    for(let i=0;i<count && debris.length<stones.instanceMatrix.count && material.length;i++){
      const p=material[Math.floor(random()*material.length)];
      const left=Math.max(r.left,p.x-p.w/2),right=Math.min(r.right,p.x+p.w/2);
      const north=Math.max(r.north,p.z-p.d/2),south=Math.min(r.south,p.z+p.d/2);
      const x=left+random()*(right-left),z=north+random()*(south-north);
      const high=Math.min(r.high,.8+p.h),low=Math.max(r.low,.8+(p.bottom??0));
      const origin=low+random()*(high-low);
      const w=.19+random()*(r.collapse?.98:.43),d=.15+random()*.40,h=.06+random()*.11;
      const born=animate?time+random()*.18:time-3;
      debris.push({x,z,origin,w,h,d,born,dx:random()-.5,dz:random()-.5,turn:random()*6.28,tilt:(random()-.5)*.25});
      stones.setColorAt(debris.length-1,color.setHex([0xcbbda4,0x938674,0xb2a68f,0x8a7965][i%4]));
    }
    if(stones.instanceColor)stones.instanceColor.needsUpdate=true;
  }
  return (doors,dt)=>{
    time+=dt;
    const condition=estateCondition(doors);
    if(previous!==condition.key){
      previous=condition.key;
      mask.paint(condition.cuts);
      if(!condition.count || [...seen].some(id=>!condition.cuts.some(c=>c.id===id))){
        debris.length=0;seen=new Set();initialized=false;
      }
      for(const cut of condition.cuts)if(!seen.has(cut.id)){scatter(cut,initialized);seen.add(cut.id);}
      stones.count=debris.length;animateUntil=time+2.6;
    }
    initialized=true;
    if(!stones.count || time>animateUntil)return;
    for(const [i,p] of debris.entries()){
      const t=Math.max(0,time-p.born),fall=Math.min(1,t*1.2);
      transform.position.set(p.x+p.dx*fall,Math.max(1.09+p.h/2,p.origin-8.8*t*t),p.z+p.dz*fall);
      transform.scale.set(p.w,p.h,p.d);transform.rotation.set(p.tilt*fall,p.turn+fall,p.tilt);
      transform.updateMatrix();stones.setMatrixAt(i,transform.matrix);
    }
    stones.instanceMatrix.needsUpdate=true;
  };
}
