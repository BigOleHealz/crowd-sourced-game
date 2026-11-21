import * as THREE from 'three';
import {CITY,MAP,groundHeight} from './world.js';
import {onBeach,sandHeight} from './beach-layout.js';
import {wheelsFor} from './road-wheel-layout.js';

const capacity=448,trackLife=13;
export function surfaceMarks(scene){
  const geo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  const styles=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('stamp',styles);
  const mat=new THREE.ShaderMaterial({uniforms:{now:{value:0}},transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-3,
    vertexShader:`attribute vec3 stamp;uniform float now;varying vec2 tile;varying float age;
      void main(){tile=uv;age=clamp((now-stamp.x)/stamp.y,0.,1.);
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 tile;varying float age;
      void main(){
        float edge=smoothstep(0.,.12,min(tile.x,1.-tile.x));
        float groove=step(.34,fract(tile.y*4.+abs(tile.x-.5)*1.8));
        float opacity=edge*(.20+.26*groove)*(1.-smoothstep(.25,1.,age));
        gl_FragColor=vec4(.16,.095,.045,opacity);
        #include <colorspace_fragment>
      }`});
  const stamps=new THREE.InstancedMesh(geo,mat,capacity);
  stamps.name='Fading surface marks';stamps.count=0;stamps.frustumCulled=false;stamps.visible=false;
  stamps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(stamps);
  const matrix=new THREE.Matrix4(),right=new THREE.Vector3(),normal=new THREE.Vector3(),back=new THREE.Vector3(),pos=new THREE.Vector3(),scale=new THREE.Vector3();
  const tracks=new Map();
  let cursor=0,time=0,lastUntil=0;
  function stamp(x,y,z,yaw,width,length,life,kind,slopeX,slopeZ){
    normal.set(-slopeX,1,-slopeZ).normalize();
    right.set(Math.cos(yaw),slopeX*Math.cos(yaw)+slopeZ*Math.sin(yaw),Math.sin(yaw)).normalize();
    back.crossVectors(right,normal).normalize();
    matrix.makeBasis(right,normal,back).scale(scale.set(width,1,length)).setPosition(pos.set(x,y+.019,z));
    stamps.setMatrixAt(cursor,matrix);styles.setXYZ(cursor,time,life,kind);
    stamps.count=Math.min(capacity,stamps.count+1);cursor=(cursor+1)%capacity;
    stamps.instanceMatrix.needsUpdate=true;styles.needsUpdate=true;lastUntil=Math.max(lastUntil,time+life);
  }
  function tires(car,key,listener){
    const {x,z}=car;
    if(!CITY || !onBeach(x,z) || car.bridgeFlight || car.wrecked || Math.abs(car.speed)<.28 ||
      Math.hypot(listener.x-x,listener.z-z)>85 || car.y<=MAP.waterY+.08 || Math.abs(car.y-sandHeight(x,z))>.24){tracks.delete(key);return;}
    const last=tracks.get(key);tracks.set(key,last??{x,z,yaw:car.yaw});
    if(!last)return;
    const dx=x-last.x,dz=z-last.z,d=Math.hypot(dx,dz);
    if(d<.28)return;
    if(d<3.8){
      const parts=Math.ceil(d/.34),turn=Math.atan2(Math.sin(car.yaw-last.yaw),Math.cos(car.yaw-last.yaw));
      const stations=wheelsFor(car);
      for(let i=0;i<parts;i++){
        const t=(i+.5)/parts,yaw=last.yaw+t*turn,c=Math.cos(yaw),s=Math.sin(yaw);
        for(const [side,aft] of [stations[1],stations[3]]){
          const u=last.x+t*dx+side*c-aft*s,v=last.z+t*dz+side*s+aft*c;
          if(!onBeach(u,v))continue;
          const floor=sandHeight(u,v);if(floor<=MAP.waterY+.05)continue;
          stamp(u,floor,v,yaw,.22,d/parts+.035,trackLife,0,
            (sandHeight(u+.12,v)-sandHeight(u-.12,v))/.24,(sandHeight(u,v+.12)-sandHeight(u,v-.12))/.24);
        }
      }
    }
    Object.assign(last,{x,z,yaw:car.yaw});
  }
  function update(world,local,remotes,dt){
    time+=dt;mat.uniforms.now.value=time;
    if(CITY){
      tires(world.rover,'rover',local);
      if(world.supercar)tires(world.supercar,'supercar',local);
      for(const car of world.traffic??[])tires(car,car.id,local);
    }
    stamps.visible=stamps.count>0 && lastUntil>time;
  }
  function reset(){tracks.clear();cursor=stamps.count=0;stamps.visible=false;lastUntil=time;}
  return {update,reset};
}
