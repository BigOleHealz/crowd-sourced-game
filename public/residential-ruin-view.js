import * as THREE from 'three';
import {homes,houseRubbleHeight} from './residential-sites.js';

export function residentialRuinView(scene,buildings,renderer){
  // Bind the mask only on the first collapse. Sparse world-space footprints
  // preserve the shared batches for the pier, other houses and storefronts.
  const rects={value:Array.from({length:12},()=>new THREE.Vector4())},count={value:0};
  const bound=new Set(),ruins=new Map();
  let installed=false,key='';
  function bind(mat){
    if(!mat || bound.has(mat))return;
    bound.add(mat);
    const previous=mat.onBeforeCompile,signature=mat.customProgramCacheKey();
    mat.customProgramCacheKey=()=>signature+'-home-ruins';
    mat.onBeforeCompile=function(shader,gpu){
      previous.call(this,shader,gpu);
      shader.uniforms.homeRects=rects;shader.uniforms.homeCount=count;
      shader.vertexShader='varying vec3 homePoint;\n'+shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
        vec4 hp=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          hp=instanceMatrix*hp;
        #endif
        homePoint=(modelMatrix*hp).xyz;`);
      shader.fragmentShader='varying vec3 homePoint; uniform vec4 homeRects[12]; uniform int homeCount;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
        if(homePoint.y>.804)for(int i=0;i<12;i++){
          if(i>=homeCount)break;
          vec4 r=homeRects[i];
          if(all(lessThanEqual(abs(homePoint.xz-r.xy),r.zw)))discard;
        }`);
    };
    mat.needsUpdate=true;
  }
  function install(){
    const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});bind(depth);
    for(const root of buildings)root.traverse(m=>{
      if(!m.isMesh)return;
      for(const mat of [].concat(m.material))bind(mat);
      if(m.castShadow){m.customDepthMaterial??=depth;bind(m.customDepthMaterial);}
    });
    installed=true;
  }
  const cube=new THREE.BoxGeometry(),stone=new THREE.MeshLambertMaterial();
  let baseStone;
  function foundation(home,ruin){
    if(!baseStone){
      const photo=new THREE.TextureLoader().load('./avenue-concrete.webp');
      photo.colorSpace=THREE.SRGBColorSpace;photo.wrapS=photo.wrapT=THREE.RepeatWrapping;
      baseStone=new THREE.MeshLambertMaterial({map:photo,color:0xafa393});
    }
    const position=[],uv=[],index=[];
    for(const p of home.parts){
      // Higher storeys occupy the same base. Only lay a bed over ground-level wings.
      if((p.bottom??0)>.4)continue;
      const nx=Math.ceil(p.w/1.4),nz=Math.ceil(p.d/1.4),start=position.length/3;
      for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
        const x=p.x+p.w*(i/nx-.5),z=p.z+p.d*(j/nz-.5);
        position.push(x,.018+houseRubbleHeight(home,x,z,ruin)-.8,z);uv.push(x*.43,z*.43);
        if(i<nx && j<nz){
          const a=start+j*(nx+1)+i;index.push(a,a+nx+1,a+1,a+1,a+nx+1,a+nx+2);
        }
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(index);geo.computeVertexNormals();
    const base=new THREE.Mesh(geo,baseStone);base.receiveShadow=true;base.name='Exposed foundation '+home.id;return base;
  }
  function pile(home,ruin){
    const stones=[],matrix=new THREE.Object3D(),color=new THREE.Color();
    let seed=2311+homes.indexOf(home)*621;
    const rand=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296;
    for(const part of home.parts){
      for(let i=0;i<45;i++){
        const x=part.x+(rand()-.5)*part.w,z=part.z+(rand()-.5)*part.d;
        const across=Math.abs((x-ruin.entry.x)*ruin.travel.z-(z-ruin.entry.z)*ruin.travel.x);
        const gap=Math.min(1,Math.max(0,(across-1.8)/2));
        if(gap<.04)continue;
        const h=.075+rand()*.36*gap;
        stones.push({x,z,y:houseRubbleHeight(home,x,z,ruin)-.8+h*.26,h,w:.24+rand()*1.14,
          d:.22+rand()*.64,tilt:(rand()-.5)*.43,yaw:rand()*Math.PI,color:[home.siding,home.roof,0x6c6a61,0xa09b8c][i%4]});
      }
    }
    const mesh=new THREE.InstancedMesh(cube,stone,stones.length);mesh.name='Settled house '+home.id;mesh.receiveShadow=true;
    for(const [i,s] of stones.entries()){
      matrix.position.set(s.x,s.y,s.z);matrix.rotation.set(s.tilt,s.yaw,.42*s.tilt);matrix.scale.set(s.w,s.h,s.d);matrix.updateMatrix();
      mesh.setMatrixAt(i,matrix.matrix);mesh.setColorAt(i,color.setHex(s.color));
    }
    const group=new THREE.Group();group.name=mesh.name;mesh.name='House fragments '+home.id;
    group.add(foundation(home,ruin),mesh);group.position.y=.8;scene.add(group);return group;
  }
  return doors=>{
    const lost=doors?.houseRuins;
    if(!lost && !key)return;
    const next=Object.keys(lost??{}).join('|');
    if(next!==key){
      if(!installed)install();
      key=next;let n=0;
      for(const h of homes){
        const ruin=lost?.[h.id],mesh=ruins.get(h.id);
        if(!ruin){if(mesh){scene.remove(mesh);mesh.children[0].geometry.dispose();mesh.children[1].dispose();ruins.delete(h.id);}continue;}
        if(!mesh)ruins.set(h.id,pile(h,ruin));
        for(const p of h.parts)rects.value[n++].set(p.x,p.z,p.w/2+1.25,p.d/2+1.25);
      }
      count.value=n;renderer.shadowMap.needsUpdate=true;
    }
    for(const [id,mesh] of ruins){
      const event=doors?.structureFalls?.find(e=>e.home===id);
      const t=event?THREE.MathUtils.smoothstep(event.age/30,.3,2.05):1;
      mesh.visible=t>0;mesh.scale.y=t;
    }
  };
}
