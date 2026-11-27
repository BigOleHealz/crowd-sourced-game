import * as THREE from 'three';
import {CITY,MAP,groundHeight} from './world.js';
import {onBeach,sandHeight} from './beach-layout.js';
import {aboardYacht} from './yacht-layout.js';
import {wheelsFor} from './road-wheel-layout.js';

const capacity=448,trackLife=13,wetDuration=8;
export function surfaceMarks(scene){
  const geo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  const styles=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('stamp',styles);
  const mat=new THREE.ShaderMaterial({uniforms:{now:{value:0}},transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-3,
    vertexShader:`attribute vec3 stamp;uniform float now;varying vec2 tile;varying float age;varying float kind;
      void main(){tile=uv;kind=stamp.z;age=clamp((now-stamp.x)/stamp.y,0.,1.);
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 tile;varying float age;varying float kind;
      void main(){
        float edge=smoothstep(0.,.12,min(tile.x,1.-tile.x));
        float groove=step(.34,fract(tile.y*4.+abs(tile.x-.5)*1.8));
        float opacity=edge*(.20+.26*groove)*(1.-smoothstep(.25,1.,age));
        vec3 ink=vec3(.16,.095,.045);
        if(kind>.5){
          vec2 foot=tile*2.-1.;
          float sole=length(vec2((foot.x-.075)*1.10,(foot.y-.36)*1.52));
          float heel=length(vec2((foot.x+.04)*1.37,(foot.y+.66)*3.15));
          float tread=.65+.35*step(.22,fract(tile.y*7.+abs(foot.x)*.65));
          opacity=(1.-smoothstep(.82,1.,min(sole,heel)))*tread*.62*(1.-age);
          ink=vec3(.055,.076,.072);
        }
        gl_FragColor=vec4(ink,opacity);
        #include <colorspace_fragment>
      }`});
  const stamps=new THREE.InstancedMesh(geo,mat,capacity);
  stamps.name='Fading surface marks';stamps.count=0;stamps.frustumCulled=false;stamps.visible=false;
  stamps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(stamps);
  const matrix=new THREE.Matrix4(),right=new THREE.Vector3(),normal=new THREE.Vector3(),back=new THREE.Vector3(),pos=new THREE.Vector3(),scale=new THREE.Vector3();
  const tracks=new Map(),walkers=new Map();
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
  function footsteps(actor,world,seated,listener){
    if(actor.id==null)return;
    if(actor.dead || actor.fall || seated.has(actor.id) || Math.hypot(actor.x-listener.x,actor.z-listener.z)>65){
      walkers.delete(actor.id);return;
    }
    let last=walkers.get(actor.id);
    const {x,y,z}=actor;
    if(actor.swimming || (actor.grounded && y<=MAP.waterY+.18 && y>MAP.waterY-.85)){
      walkers.set(actor.id,{x,z,side:last?.side??1,until:time+wetDuration});return;
    }
    if(!last || last.until<=time){walkers.delete(actor.id);return;}
    if(!actor.grounded || actor.climb || actor.stance==='prone' || aboardYacht(world.yacht,actor)){
      Object.assign(last,{x,z});return;
    }
    const dx=x-last.x,dz=z-last.z,d=Math.hypot(dx,dz);
    if(d>3.5){walkers.delete(actor.id);return;}
    const stride=actor.sprint ? .92 : .66;
    for(let distance=stride;distance<=d;distance+=stride){
      const t=distance/d,sin=dx/d,cos=-dz/d;
      const u=last.x+dx*t+cos*.105*last.side,v=last.z+dz*t+sin*.105*last.side;
      const floor=groundHeight(u,v,y+.36,world.doors);
      if(floor>MAP.waterY+.06 && Math.abs(floor-y)<.3){
        // Wet feet leave a full sole at first and a shorter-lived print as they dry.
        stamp(u,floor,v,Math.atan2(dx,-dz),.135,.305,2+Math.min(6,last.until-time),1,
          (groundHeight(u+.06,v,y+.36,world.doors)-groundHeight(u-.06,v,y+.36,world.doors))/.12,
          (groundHeight(u,v+.06,y+.36,world.doors)-groundHeight(u,v-.06,y+.36,world.doors))/.12);
      }
      last.side=-last.side;
    }
    if(d>=stride){
      const ratio=Math.floor(d/stride)*stride/d;
      last.x+=dx*ratio;last.z+=dz*ratio;
    }
  }
  function update(world,local,remotes,dt){
    time+=dt;mat.uniforms.now.value=time;
    if(CITY){
      tires(world.rover,'rover',local);
      if(world.rover2)tires(world.rover2,'rover2',local);
      if(world.rover3)tires(world.rover3,'rover3',local);
      if(world.supercar)tires(world.supercar,'supercar',local);
      for(const car of world.traffic??[])tires(car,car.id,local);
    }
    const actors=[local,...remotes,...(world.npcs??[])];
    if(walkers.size || actors.some(a=>a.swimming || (a.grounded && a.y<=MAP.waterY+.18 && a.y>MAP.waterY-.85))){
      const seated=new Set();
      for(const v of ['heli','heli2','heli3','heli4','jet','jet2','jet3','rover','rover2','rover3','supercar','tank','yacht'].map(kind=>world[kind]).concat(world.traffic??[],world.boats??[])){
        if(v)for(const id of [v.driver,v.pilot,v.gunner,v.npcDriver])if(id!=null)seated.add(id);
      }
      for(const actor of actors)footsteps(actor,world,seated,local);
    }
    for(const [id,foot] of walkers)if(time>=foot.until)walkers.delete(id);
    stamps.visible=stamps.count>0 && lastUntil>time;
  }
  function reset(){tracks.clear();walkers.clear();cursor=stamps.count=0;stamps.visible=false;lastUntil=time;}
  return {update,reset};
}
