import * as THREE from 'three';
import {jetPoint,waterRange} from './water-monitor.js';

const rings=23,sides=6,up=new THREE.Vector3(0,1,0);
let softDisc;
function disc(){
  if(!softDisc){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
    const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(16,16,0,16,16,16);
    gradient.addColorStop(0,'rgba(255,255,255,.93)');gradient.addColorStop(.33,'rgba(255,255,255,.60)');
    gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
    softDisc=new THREE.CanvasTexture(canvas);
  }
  return softDisc;
}
function particles(group,n,size,opacity,color){
  const geo=new THREE.BufferGeometry();
  const coords=new THREE.Float32BufferAttribute(n*3,3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position',coords);
  const material=new THREE.PointsMaterial({size,map:disc(),transparent:true,depthWrite:false,opacity,color});
  const cloud=new THREE.Points(geo,material);cloud.frustumCulled=false;group.add(cloud);
  return {cloud,coords};
}

export function nozzleSpray(root){
  const group=new THREE.Group();group.name='Monitor water';group.visible=false;root.add(group);
  const geometry=new THREE.BufferGeometry(),indices=[],colors=[],jetUV=[];
  const positions=new THREE.Float32BufferAttribute(rings*sides*3,3).setUsage(THREE.DynamicDrawUsage);
  for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
    const t=i/(rings-1),v=.69+.31*Math.cos(j*2*Math.PI/sides)**2;
    colors.push(.69*v,.85*v,v,.83*(1-t*.63));jetUV.push(t,2*Math.PI*j/sides);
    if(i===rings-1)continue;
    const a=i*sides+j,b=i*sides+(j+1)%sides;
    indices.push(a,a+sides,b,b,a+sides,b+sides);
  }
  geometry.setAttribute('position',positions);geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));
  geometry.setAttribute('jetUV',new THREE.Float32BufferAttribute(jetUV,2));geometry.setIndex(indices);
  const material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,
    side:THREE.DoubleSide,forceSinglePass:true});
  const flow={value:0},length={value:0};
  material.onBeforeCompile=shader=>{
    shader.uniforms.flow=flow;shader.uniforms.jetLength=length;
    shader.vertexShader='attribute vec2 jetUV; varying vec2 vJet;\n'+shader.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\n vJet=jetUV;');
    shader.fragmentShader='uniform float flow,jetLength; varying vec2 vJet;\n'+shader.fragmentShader
      .replace('#include <color_fragment>',`#include <color_fragment>
        float d=vJet.x*jetLength;
        float ridge=sin(d*12.0-flow*11.0+vJet.y+1.4*sin(d*5.27-flow*9.0));
        float fleck=sin(d*30.0-flow*36.0+sin(vJet.y)*3.0+.9*cos(d*7.0-flow*5.0));
        float foam=smoothstep(-.45,.80,ridge*.62+fleck*.38);
        diffuseColor.rgb=mix(diffuseColor.rgb*.78,vec3(.93,.98,1.),foam*.70);
        diffuseColor.a*=mix(.53+.30*foam,.05+.95*foam,smoothstep(2.0,11.0,d));`);
  };
  const core=new THREE.Mesh(geometry,material);
  core.frustumCulled=false;group.add(core);
  const drops=particles(group,110,.105,.87,0xdbf4ff),mist=particles(group,40,.52,.23,0xcde7ef);
  const point=new THREE.Vector3(),next=new THREE.Vector3(),dir=new THREE.Vector3();
  const u=new THREE.Vector3(),v=new THREE.Vector3(),normal=new THREE.Vector3(),across=new THREE.Vector3(),along=new THREE.Vector3();
  const contact=new THREE.Vector3();
  const sample={},frac=n=>n-Math.floor(n);
  const seeds=Array.from({length:drops.coords.count+mist.coords.count},(_,i)=>({
    initial:frac((i+.5)*.754877666),angle:6.283185*frac(i*.618033989),reach:.35+.65*frac(i*.41421356),
  }));
  return (car,time)=>{
    const end=car.water;group.visible=!!end && !car.wrecked;
    if(!group.visible)return;
    const c=Math.cos(car.yaw),s=Math.sin(car.yaw);
    function local(t,out){
      jetPoint(car,end,t,sample);
      const dx=sample.x-car.x,dz=sample.z-car.z;
      return out.set(c*dx+s*dz,sample.y-car.y,-s*dx+c*dz);
    }
    local(0,point);local(1,next);dir.subVectors(next,point).normalize();u.crossVectors(dir,up).normalize();
    v.crossVectors(u,dir).normalize();
    flow.value=time;length.value=end.d;
    const extent=Math.min(1,end.d/waterRange);
    for(let i=0;i<rings;i++){
      const t=i/(rings-1);local(t,point);
      const phase=37*t-time*18,waver=.038*t*t*extent;
      point.addScaledVector(u,Math.sin(phase)*waver).addScaledVector(v,Math.cos(.7*phase)*waver);
      for(let j=0;j<sides;j++){
        const a=2*Math.PI*j/sides,r=(.042+.055*t*extent)*(1+.20*t*Math.sin(phase+j*1.1));
        next.copy(point).addScaledVector(u,r*Math.cos(a)).addScaledVector(v,r*Math.sin(a));
        positions.setXYZ(i*sides+j,next.x,next.y,next.z);
      }
    }
    positions.needsUpdate=true;
    const impact=end.ny!=null;
    if(impact){
      normal.set(c*end.nx+s*end.nz,end.ny,-s*end.nx+c*end.nz);
      across.crossVectors(normal,Math.abs(normal.y)>.85?dir:up).normalize();
      along.crossVectors(normal,across).normalize();
    }
    if(end.splash){
      const dx=end.splash.x-car.x,dz=end.splash.z-car.z;
      contact.set(c*dx+s*dz,end.splash.y-car.y,-s*dx+c*dz);
    }
    for(const [layer,isMist] of [[drops,false],[mist,true]]){
      const n=layer.coords.count,jetCount=Math.floor(n*(impact?.61:1));
      for(let i=0;i<n;i++){
        const seed=seeds[i+(isMist?drops.coords.count:0)];
        const t=frac(time*(isMist?1.4:2.7)+seed.initial);
        const a=seed.angle+t*(isMist?.6:.22);
        if(end.splash && i%5===0){
          point.copy(contact).addScaledVector(u,Math.cos(a)*t*.64).addScaledVector(v,Math.sin(a)*t*.52);
          point.addScaledVector(dir,-.12-.24*Math.sin(Math.PI*t));point.y-=.26*t*t;
        }else if(i<jetCount){
          local(isMist?.25+.75*t:t,point);
          const width=(.035+t*extent*(isMist?.66:.43))*seed.reach;
          point.addScaledVector(u,Math.cos(a)*width).addScaledVector(v,Math.sin(a)*width);
        }else{
          local(1,point);
          const fan=t*seed.reach*(isMist?1.55:1.85);
          point.addScaledVector(across,fan*Math.cos(a)).addScaledVector(along,fan*Math.sin(a));
          point.addScaledVector(normal,.035+Math.sin(Math.PI*t)*(.20+.5*seed.reach));
          point.y+=(isMist?.48*t:-.24*t*t)*(1-Math.abs(normal.y));
        }
        layer.coords.setXYZ(i,point.x,point.y,point.z);
      }
      layer.coords.needsUpdate=true;
    }
  };
}
