import * as THREE from 'three';
import {collapsePlan,piecePose} from './structural-collapse.js';

const palette={slab:0xb1aba0,glass:0x799297,stone:0xc2b395};

// Named chunks and their transforms are reconstructed from the authoritative
// phase, including for a spectator who arrives halfway through a collapse.
export function structuralCollapseView(scene,buildings){
  const live=new Map(),cube=new THREE.BoxGeometry(),matrix=new THREE.Object3D(),color=new THREE.Color(),pose={};
  const material=new THREE.MeshPhongMaterial({shininess:28,specular:0x354246});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 panelLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n panelLocal=position;');
    shader.fragmentShader='varying vec3 panelLocal;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(diffuseColor.b>diffuseColor.r){
        vec2 uv=vec2(panelLocal.x+panelLocal.z,panelLocal.y)+.5;
        float frame=max(step(.94,fract(uv.x*2.0)),step(.92,uv.y));
        diffuseColor.rgb=mix(diffuseColor.rgb*(.85+.17*uv.y),vec3(.29,.31,.30),frame);
      }`);
  };
  const dustMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},
    vertexShader:`attribute float opacity;attribute float diameter;varying float alpha;
      void main(){vec4 eye=modelViewMatrix*vec4(position,1.);alpha=opacity;
      gl_Position=projectionMatrix*eye;gl_PointSize=clamp(diameter*430./max(1.,-eye.z),1.,150.);}`,
    fragmentShader:`varying float alpha;void main(){vec2 p=2.*gl_PointCoord-1.;
      float edge=dot(p,p)+.08*sin(9.*p.x+4.*p.y)*cos(6.*p.y);
      gl_FragColor=vec4(.68,.63,.55,alpha*(1.-smoothstep(.02,1.,edge)));
      #include <colorspace_fragment>
      }`});
  const houseMaterial=material.clone();
  houseMaterial.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float sectionStyle; varying float style; varying vec3 localFace;\n'+shader.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\n style=sectionStyle;localFace=vec3(abs(normal.z)>abs(normal.x)?position.x:position.z,position.y,position.x);');
    shader.fragmentShader='varying float style; varying vec3 localFace;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      if(style>.5 && style<1.5){
        vec2 panel=localFace.xy;
        float light=smoothstep(.23,.31,abs(panel.x))+.21*step(.965,fract(panel.y*7.));
        if(abs(panel.x)<.31 && panel.y>-.28 && panel.y<.28){
          vec3 glazing=mix(vec3(.055,.104,.111),vec3(.25,.35,.35),panel.y+.53);
          float frame=max(step(.265,abs(panel.y)),max(step(.29,abs(panel.x)),1.-smoothstep(.008,.018,abs(panel.x))));
          diffuseColor.rgb=mix(glazing,diffuseColor.rgb*.70,frame);
        }else diffuseColor.rgb*=.86+.10*light;
      }else if(style>1.5){
        float joint=smoothstep(.90,.99,fract((localFace.z+.5)*6.));
        diffuseColor.rgb*=.93-.17*joint;
      }`);
  };
  function create(event){
    const {pieces,end}=collapsePlan(event,buildings);
    const geometryShape=event.home?cube.clone():cube;
    if(event.home)geometryShape.setAttribute('sectionStyle',new THREE.InstancedBufferAttribute(
      Float32Array.from(pieces,p=>p.type==='house-wall'?1:p.type==='house-roof'?2:0),1));
    const mesh=new THREE.InstancedMesh(geometryShape,event.home?houseMaterial:material,pieces.length);
    mesh.frustumCulled=false;mesh.name='Falling structure '+event.key;scene.add(mesh);
    pieces.forEach((p,i)=>mesh.setColorAt(i,color.setHex(p.color??palette[p.type])));
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const motes=[],count=Math.min(54,pieces.length*5);
    for(let i=0;i<count;i++){
      const p=pieces[Math.floor(i*pieces.length/count)];
      const a=i*2.39996,r=.55+.36*Math.sin(i*8.82);
      motes.push({p,dx:Math.cos(a),dz:Math.sin(a),r,life:.68+.33*r});
    }
    const geometry=new THREE.BufferGeometry();
    for(const [name,n] of [['position',3],['opacity',1],['diameter',1]]){
      geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(count*n),n).setUsage(THREE.DynamicDrawUsage));
    }
    const dust=new THREE.Points(geometry,dustMat);dust.frustumCulled=false;dust.name='Impact dust '+event.key;scene.add(dust);
    return {mesh,dust,motes,pieces,end,age:-1,clock:0};
  }
  function update(doors,dt){
    const events=doors?.structureFalls??[];
    for(const [key,v] of live)if(!events.some(e=>e.key===key)){
      scene.remove(v.mesh,v.dust);v.mesh.dispose();if(v.mesh.geometry!==cube)v.mesh.geometry.dispose();v.dust.geometry.dispose();live.delete(key);
    }
    for(const e of events){
      let v=live.get(e.key);
      if(!v){v=create(e);live.set(e.key,v);}
      if(v.age!==e.age){v.age=e.age;v.clock=e.age/30;}
      else v.clock=Math.min((e.age+2)/30,v.clock+dt);
      const t=v.clock;
      v.pieces.forEach((p,i)=>{
        piecePose(p,t,pose);
        matrix.matrix.set(pose.xx*pose.w,pose.yx*pose.h,pose.zx*pose.d,pose.x,
          pose.xy*pose.w,pose.yy*pose.h,pose.zy*pose.d,pose.y,
          pose.xz*pose.w,pose.yz*pose.h,pose.zz*pose.d,pose.z,0,0,0,1);
        v.mesh.setMatrixAt(i,matrix.matrix);
      });
      v.mesh.instanceMatrix.needsUpdate=true;
      const {position,opacity,diameter}=v.dust.geometry.attributes;
      v.motes.forEach(({p,dx,dz,r,life},i)=>{
        const u=Math.max(0,Math.min(1,(t-p.land)/life));
        const ground=p.low-p.drop;
        position.setXYZ(i,p.x+p.dx+dx*(p.w*.37+r*u*2.5)+p.ux*u*.6,ground+.2+u*.95,p.z+p.dz+dz*(p.d*.37+r*u*2.5)+p.uz*u*.6);
        diameter.setX(i,.32+(2.3+r)*u);
        opacity.setX(i,.48*Math.min(1,u*12)*(1-u));
      });
      position.needsUpdate=diameter.needsUpdate=opacity.needsUpdate=true;
    }
  }
  return update;
}
