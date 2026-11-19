import * as THREE from 'three';
import {CITY, MAP, HELIPAD, groundHeight} from './world.js';
import {harbor, within, roadway, bayfrontLawns} from './brickell-map.js';
import {onBeach,sandHeight} from './beach-layout.js';
import {wheelStations} from './road-wheel-layout.js';

function looseSurface(x,z,y,trailDistance) {
  if(y<=MAP.waterY+.12) return 0;
  if(CITY) {
    if(onBeach(x,z)) return Math.abs(y-sandHeight(x,z))<.09 ? 3 : 0;
    if(roadway(x,z)) return 0;
    if(within(harbor,x,z) || bayfrontLawns.some(lot=>within(lot,x,z))) return 2;
    return 0;
  }
  if(Math.abs(x-MAP.bridge.x)<=MAP.bridge.width/2+.07 && Math.abs(z-MAP.bridge.z)<=MAP.bridge.length/2) return 0;
  if(Math.hypot(x-HELIPAD.x,z-HELIPAD.z)<2.9) return 0;
  return Math.min(trailDistance(x,z),Math.hypot(x,z-15)*.56)<2.15 ? 1 : 2;
}

// A single bounded point batch carries dust, grass blades and sand grains.
export function tireDebris(scene,trailDistance) {
  const capacity=224, particles=[], rates=[0,0,0,0], positions=new Float32Array(capacity*3);
  const shapes=new Float32Array(capacity*4), geometry=new THREE.BufferGeometry();
  const xyz=new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage);
  const style=new THREE.BufferAttribute(shapes,4).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position',xyz);geometry.setAttribute('tireStyle',style);
  const material=new THREE.ShaderMaterial({
    uniforms:{pixelScale:{value:400}}, transparent:true,depthWrite:false,
    vertexShader:`attribute vec4 tireStyle; varying vec4 v; uniform float pixelScale;
      void main(){ v=tireStyle; vec4 eye=modelViewMatrix*vec4(position,1.);
        gl_Position=projectionMatrix*eye; gl_PointSize=clamp(v.y*pixelScale*projectionMatrix[1][1]/max(.1,-eye.z),1.4,84.); }`,
    fragmentShader:`varying vec4 v; void main() {
      vec2 p=gl_PointCoord*2.-1.; float c=cos(v.w),s=sin(v.w);
      p=mat2(c,-s,s,c)*p; vec3 tint; float alpha;
      if(v.x<1.5){ float r=length(p)*(1.+.12*sin(atan(p.y,p.x)*3.+v.w));
        alpha=.49*(1.-smoothstep(.12,1.,r)); tint=vec3(.49,.34,.21); }
      else if(v.x<2.5){ float width=.26*(1.-.64*p.y);
        alpha=1.-smoothstep(.66,1.,max(abs(p.x+.13*p.y*p.y)/width,abs(p.y)));
        tint=mix(vec3(.12,.19,.044),vec3(.32,.38,.13),p.y*.5+.5); }
      else { alpha=1.-smoothstep(.56,.97,length(p*vec2(1.32,.82)));
        tint=mix(vec3(.36,.23,.11),vec3(.90,.73,.46),.5+.5*sin(v.w*7.)); }
      gl_FragColor=vec4(tint,alpha*v.z);
      #include <colorspace_fragment>
    }`,
  });
  const cloud=new THREE.Points(geometry,material),bufferSize=new THREE.Vector2();
  cloud.frustumCulled=false;cloud.name='Tire debris';scene.add(cloud);
  cloud.onBeforeRender=renderer=>{material.uniforms.pixelScale.value=renderer.getDrawingBufferSize(bufferSize).y*.5;};
  return function update(rover,dt) {
    const speed=rover.speed||0,side=rover.lateralSpeed||0,motion=Math.hypot(speed,side);
    const sn=Math.sin(rover.yaw),cs=Math.cos(rover.yaw);
    for(let i=0;i<4;i++){
      const [width,length]=wheelStations[i],x=rover.x+width*cs-length*sn,z=rover.z+width*sn+length*cs;
      const floor=groundHeight(x,z);
      const offset=rover.suspension?.wheels?.[i];
      const gap=offset==null ? rover.y-groundHeight(rover.x,rover.z) : rover.y+offset-floor;
      const kind=motion>.45 && !rover.wrecked && Math.abs(gap)<.095 ? looseSurface(x,z,floor,trailDistance) : 0;
      if(!kind){rates[i]=0;continue;}
      rates[i]+=dt*Math.min(44,motion*(kind===1?1.8:3.4)+Math.abs(side)*4);
      while(rates[i]>=1) {
        rates[i]--;
        if(particles.length>=capacity) continue;
        const spray=Math.sign(width)*(.38+.09*motion)+(Math.random()-.5)*(1.1+.20*motion)-side*.52;
        const back=-Math.sign(speed)*(.48+Math.random()*.22*motion);
        particles.push({x:x+(Math.random()-.5)*.16,y:floor+.045,z:z+(Math.random()-.5)*.16,
          vx:cs*spray+sn*back,vz:sn*spray-cs*back,vy:kind===1?.48+Math.random()*.52:.95+Math.random()*(.60+.07*motion),
          size:kind===1?.29+Math.random()*.29:kind===2?.11+Math.random()*.09:.052+Math.random()*.051,
          angle:Math.random()*6.28,kind,age:0,life:kind===1?.46+Math.random()*.18:.25+Math.random()*.19});
      }
    }
    let write=0;
    for(const p of particles){
      p.age+=dt;if(p.age>=p.life) continue;
      p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;
      p.vy-=(p.kind===1?.7:7.4)*dt;
      const t=p.age/p.life;
      xyz.setXYZ(write,p.x,p.y,p.z);style.setXYZW(write,p.kind,p.size*(p.kind===1?1+1.8*t:1),1-t,p.angle+t*(p.kind===2?2:.35));
      particles[write++]=p;
    }
    particles.length=write;geometry.setDrawRange(0,write);
    cloud.visible=write>0;
    if(write){xyz.needsUpdate=true;style.needsUpdate=true;}
  };
}
