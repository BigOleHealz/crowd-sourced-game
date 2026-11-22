import {estatePools} from './swimming-pools.js';
import {penthousePool} from './grand-resort-layout.js';
import * as THREE from 'three';

// A shot leaves suspended pigment at the impact point, while the animal can
// continue swimming. One instanced draw each for billows and floating pieces.
const pools=[...estatePools,{...penthousePool,waterY:penthousePool.water}];
const openBounds=[-10000,-10000,10000,10000];
function surfaceBounds(x,z,y){
  const p=pools.find(p=>Math.abs(y-p.waterY)<.001 && Math.abs(x-p.x)<p.w/2+.45 && Math.abs(z-p.z)<p.d/2+.45);
  return p?[p.x-p.w/2,p.z-p.d/2,p.x+p.w/2,p.z+p.d/2]:openBounds;
}
const maxBursts=12,cloudsPerBurst=9,piecesPerBurst=12;
const projection=`
  if (cameraPosition.y>waterline+.20 && worldPoint.y<waterline+.017) {
    float plane=waterline+.017-.007*clamp(waterline-worldPoint.y,0.,1.);
    float fraction=(cameraPosition.y-plane)/(cameraPosition.y-worldPoint.y);
    worldPoint=mix(cameraPosition,worldPoint,fraction);
  }`;
// A folded, uneven strip with a narrow pale edge. Shared across the burst;
// different widths, rolled orientations and muted colours break up repetition.
function fragmentGeometry(){
  const geometry=new THREE.IcosahedronGeometry(1,2);
  const points=geometry.attributes.position,colors=[];
  const rose=new THREE.Color(0xc07772),dark=new THREE.Color(0x914449);
  const seam=new THREE.Color(0xdcaba1),tint=new THREE.Color();
  for(let i=0;i<points.count;i++){
    const x=points.getX(i),y=points.getY(i),z=points.getZ(i);
    const fold=Math.sin(x*4.7+z*2.2),grain=Math.sin(x*13.1+z*9.5+y*5.9);
    points.setXYZ(i,x*(1+.09*grain),y*(.64+.25*fold)+.38*fold,z*(.85+.19*grain));
    tint.copy(dark).lerp(rose,.48+.42*fold).lerp(seam,Math.max(0,.7*grain+.35*fold-.16));
    colors.push(tint.r,tint.g,tint.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  return geometry;
}
export function bloodCloudBatch(scene,waterline,capacity){
  const plane=new THREE.PlaneGeometry(1,1);
  const density=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);
  for(let i=0;i<capacity;i++)density.setZ(i,waterline);
  const bounds=new THREE.InstancedBufferAttribute(new Float32Array(capacity*4),4);
  for(let i=0;i<capacity;i++)bounds.setXYZW(i,...openBounds);
  bounds.setUsage(THREE.DynamicDrawUsage);plane.setAttribute('waterBounds',bounds);
  density.setUsage(THREE.DynamicDrawUsage);plane.setAttribute('cloudState',density);
  const ink=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    vertexShader:`
      attribute vec3 cloudState; attribute vec4 waterBounds;
      varying vec2 coord; varying vec2 billow; varying float depth; varying vec2 surfaceXZ; varying vec4 clipBounds;
      void main(){
        coord=uv*2.-1.; billow=cloudState.xy;float waterline=cloudState.z;
        vec3 center=instanceMatrix[3].xyz;
        vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
        vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
        vec3 worldPoint=center+right*position.x*instanceMatrix[0][0]+up*position.y*instanceMatrix[1][1];
        surfaceXZ=worldPoint.xz;clipBounds=waterBounds;depth=waterline-worldPoint.y;
        ${projection}
        gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.);
      }`,
    fragmentShader:`
      varying vec2 coord; varying vec2 billow; varying float depth; varying vec2 surfaceXZ; varying vec4 clipBounds;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
      }
      void main(){
        if(any(lessThan(surfaceXZ,clipBounds.xy)) || any(greaterThan(surfaceXZ,clipBounds.zw)))discard;
        vec2 p=coord+billow.y;
        float turbulence=.6*noise(p*3.2)+.3*noise(p*7.1)+.1*noise(p*15.);
        float edge=length(coord)+.72*(turbulence-.5);
        float alpha=billow.x*(1.-smoothstep(.12,1.,edge))*smoothstep(-.015,.14,depth);
        vec3 tint=mix(vec3(.095,.008,.012),vec3(.34,.039,.046),turbulence);
        tint=mix(tint,vec3(.068,.065,.068),.28*clamp(depth/2.,0.,1.));
        gl_FragColor=vec4(tint,alpha);
        #include <colorspace_fragment>
      }`
  });
  const mist=new THREE.InstancedMesh(plane,ink,capacity);
  mist.name='Suspended blood';mist.renderOrder=4;mist.count=0;mist.frustumCulled=false;
  mist.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mist);
  return {mist,density,bounds};
}
function makeBatches(scene,waterline){
  const {mist,density,bounds}=bloodCloudBatch(scene,waterline,maxBursts*cloudsPerBurst);
  const fragmentSurfaces=new THREE.InstancedBufferAttribute(new Float32Array(maxBursts*piecesPerBurst),1);
  fragmentSurfaces.setUsage(THREE.DynamicDrawUsage);
  const surface=new THREE.MeshStandardMaterial({roughness:.38,vertexColors:true,transparent:true});
  surface.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float fragmentSurface;\n'+shader.vertexShader.replace('#include <project_vertex>',`
      #include <project_vertex>
      float waterline=fragmentSurface;
      vec3 worldPoint=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;
      ${projection}
      gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.);
    `);
  };
  const debris=new THREE.InstancedMesh(fragmentGeometry(),surface,maxBursts*piecesPerBurst);
  debris.geometry.setAttribute('fragmentSurface',fragmentSurfaces);
  debris.name='Floating tissue and fragments';debris.count=0;debris.frustumCulled=false;debris.renderOrder=3;
  debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(debris);
  return {mist,debris,density,bounds,fragmentSurfaces};
}

function samples(count,seed) {
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  return Array.from({length:count},()=>({
    angle:random()*2*Math.PI,radius:.25+.75*random(),lift:random(),variation:random(),spin:random()*2-1,
  }));
}

export function aquaticImpactView(scene,waterline,sizes){
  let batches,bursts=[],seen=[],snapshot;
  const pose=new THREE.Object3D(),color=new THREE.Color();
  function add({x,y,z,line,age,size,blast,dead,seed}){
    const duration=blast?18:dead?12:9;
    if(age<0 || age>=duration)return;
    if(bursts.length===maxBursts)bursts.shift();
    bursts.push({x,y,z,line,age,duration,blast,size,bounds:surfaceBounds(x,z,line),clouds:samples(blast?cloudsPerBurst:dead?6:4,seed),
      pieces:samples(blast?piecesPerBurst:dead?3:0,seed+351)});
  }
  function frame(local,dt){
    for(const burst of bursts)burst.age+=dt;
    let n=0,k=0,live=0;
    for(const b of bursts){
      if(b.age>=b.duration)continue;
      bursts[live++]=b;
      const distance=Math.hypot(local.x-b.x,local.y-b.y,local.z-b.z);
      if(distance>55)continue;
      batches??=makeBatches(scene,waterline);
      const age=b.age,t=age/b.duration,spread=b.blast?1.7:.62;
      const impulse=1-Math.exp(-age*1.8);
      for(const p of b.clouds){
        const drift=p.radius*spread*(impulse+.085*age)*b.size;
        pose.position.set(b.x+Math.cos(p.angle)*drift+.055*age,
          Math.min(b.line-.12,b.y-.10+p.lift*.34*impulse+.045*age),
          b.z+Math.sin(p.angle)*drift+.018*age);
        const width=b.size*(b.blast?.78:.45)*(1+p.variation*.7+Math.sqrt(age)*1.2);
        pose.rotation.set(0,0,0);pose.scale.set(width,width*(.65+.23*p.lift),1);pose.updateMatrix();
        batches.mist.setMatrixAt(n,pose.matrix);
        const opacity=(1-t*t)*Math.min(1,(55-distance)/9)*(b.blast?.82:.70);
        batches.bounds.setXYZW(n,...b.bounds);
        batches.density.setXYZ(n++,opacity,p.angle+.055*age,b.line);
      }
      for(const p of b.pieces){
        const distance=p.radius*(2.1*impulse+.12*age)*b.size;
        const rise=1-Math.exp(-age*(.37+.48*p.lift));
        const wave=.046*Math.sin(2*age+p.angle);
        pose.position.set(b.x+Math.cos(p.angle)*distance+.055*age,
          THREE.MathUtils.lerp(Math.min(b.y,b.line),b.line-.025+wave,rise),
          b.z+Math.sin(p.angle)*distance+.018*age);
        pose.position.x=THREE.MathUtils.clamp(pose.position.x,b.bounds[0]+.2,b.bounds[2]-.2);
        pose.position.z=THREE.MathUtils.clamp(pose.position.z,b.bounds[1]+.2,b.bounds[3]-.2);
        pose.rotation.set(p.angle+2.8*p.spin*impulse+.13*age,p.angle+p.spin*.25*age,.20*Math.sin(age+p.angle));
        const size=(.08+.12*p.variation)*b.size*(1-THREE.MathUtils.smoothstep(t,.78,1));
        pose.scale.set(size*(1.15+p.radius),size*.60,size);pose.updateMatrix();
        batches.debris.setMatrixAt(k,pose.matrix);
        color.setHex(p.lift>.75?0xa2a396:p.lift>.4?0xf4bdbb:0xb36875);
        batches.fragmentSurfaces.setX(k,b.line);batches.debris.setColorAt(k++,color);
      }
    }
    bursts.length=live;
    if(!batches)return;
    batches.mist.count=n;batches.debris.count=k;
    batches.mist.visible=n>0;batches.debris.visible=k>0;
    if(n){batches.mist.instanceMatrix.needsUpdate=true;batches.density.needsUpdate=true;batches.bounds.needsUpdate=true;}
    if(k){batches.debris.instanceMatrix.needsUpdate=true;batches.debris.instanceColor.needsUpdate=true;batches.fragmentSurfaces.needsUpdate=true;}
  }
  function update(states,local,dt){
    if(!states?.length){bursts.length=0;seen=[];snapshot=undefined;}
    if(states?.length && snapshot!==states){
      const first=snapshot===undefined;
      snapshot=states;
      states.forEach((p,i)=>{
        if(seen[i]===p.hitSeq)return;
        seen[i]=p.hitSeq;
        if(first || !p.hitSeq || p.ageSinceHit==null)return;
        add({x:p.hitX??p.x,y:p.hitY??p.y,z:p.hitZ??p.z,line:waterline,age:p.ageSinceHit,
          size:sizes[i]??1,blast:p.deathKind==='blast',dead:!p.hp,seed:(i+1)*479+p.hitSeq*12197});
      });
    }
    frame(local,dt);
  }
  update.event=(s,tick)=>add({...s.to,line:s.waterline,age:Math.max(0,(tick-s.tick)/30),size:s.size,
    blast:s.blast,dead:s.dead,seed:s.id*12197});
  update.frame=frame;
  update.clear=()=>{bursts.length=0;};
  return update;
}
