import * as THREE from 'three';

const TAU=Math.PI*2;
const clamp=THREE.MathUtils.clamp;
const mix=THREE.MathUtils.lerp;

function random(seed) {
  return () => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
}

function hash(x,y,seed=0) {
  let n=Math.imul(x+seed,374761393)+Math.imul(y,668265263);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967296;
}

function noise(x,y,seed=0,period=0) {
  let i=Math.floor(x),j=Math.floor(y),u=x-i,v=y-j;
  u=u*u*(3-2*u);v=v*v*(3-2*v);
  const sample=(a,b)=>hash(period?(a%period+period)%period:a,period?(b%period+period)%period:b,seed);
  return mix(mix(sample(i,j),sample(i+1,j),u),mix(sample(i,j+1),sample(i+1,j+1),u),v);
}

function canvasTile(size) {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;
  return canvas.getContext('2d');
}

function texture(ctx,renderer,repeat=1) {
  const map=new THREE.CanvasTexture(ctx.canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.repeat.set(repeat,repeat);
  map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return map;
}

// Blend two small repeating surface tiles on the existing terrain mesh.
export function floorMaterial(renderer) {
  const loader=new THREE.TextureLoader();
  const gravel=loader.load('./trail-gravel.webp');
  const litter=loader.load('./forest-duff.webp');
  for (const tile of [gravel,litter]) {
    tile.colorSpace=THREE.SRGBColorSpace;
    tile.wrapS=tile.wrapT=THREE.MirroredRepeatWrapping;
    tile.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  }
  gravel.repeat.set(43,43);
  const material=new THREE.MeshLambertMaterial({map:gravel,vertexColors:true});
  material.onBeforeCompile=shader=>{
    shader.uniforms.forestDuff={value:litter};
    shader.vertexShader='attribute float forestCover; varying float cover;\n'+shader.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\n cover=forestCover;');
    shader.fragmentShader='uniform sampler2D forestDuff; varying float cover;\n'+shader.fragmentShader
      .replace('#include <map_fragment>', `
        vec3 gravel=texture2D(map,vMapUv).rgb;
        vec3 duff=texture2D(forestDuff,vMapUv*1.31).rgb;
        diffuseColor.rgb*=mix(gravel,duff,cover);`);
  };
  material.addEventListener('dispose',()=>litter.dispose());
  return material;
}

// Reflect the existing mountain panorama on vehicle windows. This samples
// the sky texture directly and never renders the world into a reflection map.
export function alpineGlass(panorama, options={}) {
  const glass=new THREE.MeshPhongMaterial({vertexColors:true,specular:0xa9bfcc,shininess:88,...options});
  glass.onBeforeCompile=shader=>{
    shader.uniforms.alpineSky={value:panorama};
    shader.fragmentShader='uniform sampler2D alpineSky;\n'+shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 eye=normalize(vViewPosition);
      vec3 ray=inverseTransformDirection(reflect(-eye,normal),viewMatrix);
      vec2 uv=vec2(atan(ray.x,-ray.z)*.46+.17,clamp((asin(clamp(ray.y,-1.,1.))+.19)/.72,0.,1.));
      vec3 skyReflection=texture2D(alpineSky,uv).rgb;
      float grazing=1.-clamp(dot(normal,eye),0.,1.);
      outgoingLight=mix(outgoingLight,skyReflection,.26+.57*grazing*grazing);
      #include <opaque_fragment>`);
  };
  return glass;
}

// All crowns share one two-species photographic atlas and one draw. Each
// crown rotates about its trunk axis. The cached sun pass uses the same
// orientation logic, so sunlight still projects the cutout needle silhouette.
function faceCamera(shader) {
  shader.vertexShader='attribute float species;\n'+shader.vertexShader
    .replace('#include <uv_vertex>', '#include <uv_vertex>\n vMapUv.x=(vMapUv.x+species)*.5;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      vec2 eye=cameraPosition.xz-instanceMatrix[3].xz;
      vec2 right=normalize(vec2(eye.y,-eye.x)+vec2(.00001,0.));
      transformed.xz=right*position.x;
      if(dot(eye,eye)<2.1) transformed.y=-1000.;
    `);
}

export function conifers(scene,wood,trees,ground,renderer,bounds) {
  const rng=random(33597),trunk=new THREE.CylinderGeometry(.035,1,1,10);
  const stands=trees.map(v=>({...v,near:true}));
  for(let i=0;i<170;i++){
    const a=rng()*TAU,d=48+rng()*25,x=d*Math.cos(a),z=d*Math.sin(a);
    if(ground(x,z)>-1.3)stands.push({x,z,height:5.4+rng()*8.5,radius:.17+rng()*.22,near:false});
  }
  // The outer valley floor is outside the playable map. Tall forest in the
  // sheltered draws softens the drop-off from the air and leaves clearings
  // on the more exposed ridges.
  const rimRandom=random(9943);
  for(let i=0;i<1280;i++){
    const x=(rimRandom()-.5)*132,z=(rimRandom()-.5)*132,edge=Math.max(Math.abs(x),Math.abs(z));
    if(edge<bounds+.7 || edge>bounds+23)continue;
    const grove=noise(x*.065+9,z*.071-3);
    if(rimRandom()>.27+.68*grove)continue;
    const H=7+7*grove+8*rimRandom();
    stands.push({x,z,height:H,radius:H*.03,near:false});
  }
  const map=new THREE.TextureLoader().load('./conifer-atlas.webp',()=>{renderer.shadowMap.needsUpdate=true;});
  map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const geo=new THREE.PlaneGeometry(1,1).translate(0,.5,0);
  const material=new THREE.MeshBasicMaterial({map,alphaTest:.37,side:THREE.DoubleSide});
  material.onBeforeCompile=faceCamera;
  const shade=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map,alphaTest:.37,side:THREE.DoubleSide});
  shade.onBeforeCompile=faceCamera;
  const crowns=new THREE.InstancedMesh(geo,material,stands.length);
  crowns.customDepthMaterial=shade;crowns.castShadow=true;crowns.frustumCulled=false;
  const species=[],transform=new THREE.Object3D(),tint=new THREE.Color();
  for(const [i,tree] of stands.entries()){
    const {x,z,height:H,radius}=tree,y=ground(x,z),variant=rng()>.45?1:0;
    const width=H*(.42+rng()*.18)*(variant?.92:1);
    transform.position.set(x,y-.025,z);
    transform.scale.set(width,H,width);transform.updateMatrix();
    crowns.setMatrixAt(i,transform.matrix);species.push(variant);
    tint.setRGB(.69+rng()*.24,.73+rng()*.20,.73+rng()*.19);
    crowns.setColorAt(i,tint);
    if(tree.near){
      // The textured crown can turn while the rooted, solid bole stays put.
      wood.add(trunk,0x6c5b49,x,y+H*.075,z,radius*.57,H*.15,radius*.57,0,rng()*TAU);
      for(let k=0;k<5;k++){
        const a=rng()*TAU,dx=Math.cos(a),dz=Math.sin(a);
        wood.beam(0x605143,[x+.38*dx*radius,y+radius,z+.38*dz*radius],
          [x+1.45*dx*radius,y+.025,z+1.45*dz*radius],radius*.28);
      }
    }
  }
  geo.setAttribute('species',new THREE.InstancedBufferAttribute(new Float32Array(species),1));
  scene.add(crowns);trunk.dispose();
}

export function granite(scene,rocks,ground,renderer) {
  const rng=random(119),map=new THREE.TextureLoader().load('./granite.webp');
  map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
  map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const pos=[],uv=[],col=[],nor=[],v=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),normal=new THREE.Vector3(),soft=new THREE.Vector3();
  const source=new THREE.IcosahedronGeometry(1,3).attributes.position;
  for(let k=0;k<rocks.length;k++){
    const r=rocks[k],floor=ground(r.x,r.z),seed=15+k,angle=rng()*TAU;
    for(let i=0;i<source.count;i+=3){
      const face=[],softNormals=[];
      for(let j=0;j<3;j++){
        v.fromBufferAttribute(source,i+j).normalize();
        const x=v.x,z=v.z,y=v.y,rough=noise(x*4+seed,z*4+y*2,seed)-.5;
        const shape=(.89+.25*rough)/Math.pow(Math.pow(Math.abs(x),2.85)+Math.pow(Math.abs(y),2.85)+Math.pow(Math.abs(z),2.85),1/2.85);
        const u=(x*Math.cos(angle)-z*Math.sin(angle))*shape;
        const w=(x*Math.sin(angle)+z*Math.cos(angle))*shape;
        const point=new THREE.Vector3(r.x+u*r.radius,floor+r.height*(.31+.67*Math.min(y*shape,.89)+.07*x),r.z+w*r.radius);
        face.push(point);softNormals.push(new THREE.Vector3(u,y*1.2,w).normalize());
      }
      a.subVectors(face[1],face[0]);b.subVectors(face[2],face[0]);normal.crossVectors(a,b).normalize();
      for(let j=0;j<3;j++){
        const q=face[j];soft.copy(normal).lerp(softNormals[j],.45).normalize();
        const t=clamp((q.y-floor)/r.height,0,1),wet=clamp(1-t*3,0,1);
        const c=new THREE.Color(0xe7e5d9).lerp(new THREE.Color(0x8e9978),wet*.8);
        c.multiplyScalar(.84+.30*noise(q.x*1.7,q.z*1.7+q.y*.6,seed));
        pos.push(q.x,q.y,q.z);nor.push(soft.x,soft.y,soft.z);col.push(c.r,c.g,c.b);
        const nx=Math.abs(normal.x),ny=Math.abs(normal.y),nz=Math.abs(normal.z);
        if(ny>=nx&&ny>=nz)uv.push(q.x*.82,q.z*.82);
        else if(nx>=nz)uv.push(q.z*.82,q.y*.82);
        else uv.push(q.x*.82,q.y*.82);
      }
    }
  }
  const g=new THREE.BufferGeometry();for(const [name,arr,n] of [['position',pos,3],['normal',nor,3],['uv',uv,2],['color',col,3]])g.setAttribute(name,new THREE.Float32BufferAttribute(arr,n));
  const mesh=new THREE.Mesh(g,new THREE.MeshLambertMaterial({map,vertexColors:true}));mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);
}

export function creekMaterial(renderer) {
  const ctx=canvasTile(256),pixels=ctx.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const n=noise(x/32,y/32,39,8),eddy=noise(x/16,y/16,11,16);
    const t=y*TAU/256*19+n*13+eddy*2;
    const ripple=Math.pow(.5+.5*Math.sin(t),7)*(.23+.65*eddy);
    const shade=109+38*n+72*ripple;
    pixels.data.set([shade*.65,shade*.90,shade,255],(y*256+x)*4);
  }
  ctx.putImageData(pixels,0,0);
  const map=texture(ctx,renderer);map.repeat.set(28,2);
  return new THREE.MeshPhongMaterial({map,color:0xb1c7bb,specular:0x94aba4,shininess:24,
    bumpMap:map,bumpScale:.021,transparent:true,opacity:.90});
}

// Mild paint sheen and lower-panel trail dust use the vehicle's own coordinates.
// The finish stays fixed to the body as it turns and requires no reflection pass.
export function fieldPaint() {
  const paint=new THREE.MeshPhongMaterial({vertexColors:true,specular:0x484a41,shininess:31});
  paint.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 panelPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n panelPoint=position;');
    shader.fragmentShader='varying vec3 panelPoint;\n'+shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 p=panelPoint;
      float streak=.5+.5*sin(17.*p.z+2.*sin(11.*p.x)+sin(36.*p.z));
      float dust=(1.-smoothstep(.35,.84+.11*streak,p.y))*(.17+.18*streak);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.23,.195,.14),dust);`);
  };
  return paint;
}
