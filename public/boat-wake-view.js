import * as THREE from 'three';
import {WakeTrail,wakeCapacity,wakeLife,crestSpread} from './boat-wakes.js';
// Each ribbon retains world-space samples, so its foam stays on the water through a turn.
export function wakeTrail(scene) {
  const max=wakeCapacity, lanes=3,count=max*lanes*2;
  const geometry=new THREE.BufferGeometry(),pos=new THREE.Float32BufferAttribute(new Float32Array(count*3),3);
  const tint=new THREE.Float32BufferAttribute(new Float32Array(count*4),4),uv=new THREE.Float32BufferAttribute(new Float32Array(count*2),2),indices=[];
  pos.setUsage(THREE.DynamicDrawUsage);tint.setUsage(THREE.DynamicDrawUsage);
  uv.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position',pos);geometry.setAttribute('foamTint',tint);geometry.setAttribute('uv',uv);
  for(let k=0;k<lanes;k++)for(let i=0;i<max-1;i++){
    const n=2*(k*max+i);indices.push(n,n+1,n+2,n+1,n+3,n+2);
  }
  geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`attribute vec4 foamTint;varying vec4 tint;varying vec2 strip;
      void main(){tint=foamTint;strip=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec4 tint;varying vec2 strip;
      float hash(vec2 p){return fract(sin(dot(p,vec2(71.37,16.59)))*43758.5);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){float eddy=noise(vec2(strip.x*2.9,strip.y*3.7));
        float strand=1.-smoothstep(.03,.52,abs(strip.x-.50+.24*(eddy-.5)));
        float patches=smoothstep(.24,.73,.67*eddy+.33*noise(vec2(strip.x*7.,strip.y*9.)));
        gl_FragColor=vec4(tint.rgb,strand*patches*tint.a);
        #include <colorspace_fragment>
      }`
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.visible=false;mesh.renderOrder=1;scene.add(mesh);
  mesh.name='Water wake';
  const trail=new WakeTrail();let refresh=0;
  return (boat,dt,local)=>{
    if(!boat || Math.hypot(boat.x-local.x,boat.z-local.z)>150){mesh.visible=false;trail.count=0;return;}
    trail.step(boat,dt);mesh.visible=trail.count>1;
    refresh-=dt;
    if(!mesh.visible || refresh>0)return;
    refresh=1/30;
    for(let k=0;k<lanes;k++)for(let i=0;i<max;i++){
      const q=trail.at(Math.min(i,trail.count-1)),age=trail.time-q.time,lane=k-1;
      const fade=Math.max(0,1-age/wakeLife);
      const spread=lane*crestSpread(q,age);
      const chop=.75+.25*Math.sin(q.time*29+k*9.2);
      const width=(lane?.072+.15*age:.095+.20*age)*chop*q.power;
      for(let side=0;side<2;side++){
        const n=(k*max+i)*2+side,lateral=spread+(side?width:-width);
        pos.setXYZ(n,q.x+q.c*lateral,q.y,q.z+q.s*lateral);uv.setXY(n,side,q.time*2.5+k*5.31);
        tint.setXYZW(n,.64,.80,.75,(i<trail.count?fade:0)*chop*q.power*(lane?.65:.42));
      }
    }
    pos.needsUpdate=tint.needsUpdate=uv.needsUpdate=true;
  };
}
