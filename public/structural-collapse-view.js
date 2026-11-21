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
  function create(event){
    const {pieces,end}=collapsePlan(event,buildings);
    const mesh=new THREE.InstancedMesh(cube,material,pieces.length);
    mesh.frustumCulled=false;mesh.name='Falling structure '+event.key;scene.add(mesh);
    pieces.forEach((p,i)=>mesh.setColorAt(i,color.setHex(palette[p.type])));
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
      scene.remove(v.mesh,v.dust);v.mesh.dispose();v.dust.geometry.dispose();live.delete(key);
    }
    for(const e of events){
      let v=live.get(e.key);
      if(!v){v=create(e);live.set(e.key,v);}
      if(v.age!==e.age){v.age=e.age;v.clock=e.age/30;}
      else v.clock=Math.min((e.age+2)/30,v.clock+dt);
      const t=v.clock;
      v.pieces.forEach((p,i)=>{
        piecePose(p,t,pose);
        matrix.position.set(pose.x,pose.low+pose.h/2,pose.z);matrix.rotation.y=-pose.yaw;
        matrix.scale.set(pose.w,pose.h,pose.d);matrix.updateMatrix();v.mesh.setMatrixAt(i,matrix.matrix);
      });
      v.mesh.instanceMatrix.needsUpdate=true;
      const {position,opacity,diameter}=v.dust.geometry.attributes;
      v.motes.forEach(({p,dx,dz,r,life},i)=>{
        const u=Math.max(0,Math.min(1,(t-p.land)/life));
        const ground=p.low-p.drop;
        position.setXYZ(i,p.x+dx*(p.w*.37+r*u*2.5),ground+.2+u*.95,p.z+dz*(p.d*.37+r*u*2.5));
        diameter.setX(i,.32+(2.3+r)*u);
        opacity.setX(i,.48*Math.min(1,u*12)*(1-u));
      });
      position.needsUpdate=diameter.needsUpdate=opacity.needsUpdate=true;
    }
  }
  return update;
}
