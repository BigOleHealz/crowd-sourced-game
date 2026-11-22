import * as THREE from 'three';
import {strikeWaterFilm} from './shark-strike-water.js';

const dropletsPerStrike=14,foamLife=.70,drawRange=45;
const {smoothstep}=THREE.MathUtils;

export function sharkFeedingSpray(scene,waterline,sharkCount){
  // Keep at most one anchored splash at each shark's mouth and tail. Every
  // splash shares the same two draw calls, including concurrent encounters.
  const strikes=Array.from({length:2*sharkCount},()=>({time:-Infinity}));
  const origin=new THREE.Vector3(),drop=new THREE.Object3D();
  let film,spray,previous=-Infinity;

  function strike(slot,elapsed,period,offset,tick,part,lift,reach,yaw,size){
    const age=elapsed-offset;
    if(age<0)return;
    const intoBeat=age%period;
    if(intoBeat>.24)return;
    const time=tick/30-intoBeat,entry=strikes[slot];
    if(Math.abs(entry.time-time)<.001)return;
    part.localToWorld(origin.set(0,lift,reach));
    const strength=1-smoothstep(waterline-origin.y,.38,.86);
    if(strength<=.04)return;
    Object.assign(entry,{time,x:origin.x,z:origin.z,yaw,size,strength});
  }

  function mark(index,elapsed,period,tick,hull,tail,yaw,size){
    strike(2*index,elapsed,period,0,tick,hull,-.035,-1.54,yaw,size);
    strike(2*index+1,elapsed,period,period*(.37+.07*(index%3)),tick,tail,.61,.78,yaw+Math.PI/2,size*.86);
  }

  function finish(tick,local){
    if(tick<previous)for(const entry of strikes)entry.time=-Infinity;
    previous=tick;
    let foamCount=0,dropCount=0;
    for(let i=0;i<strikes.length;i++){
      const entry=strikes[i],age=tick/30-entry.time;
      if(!(age>=0 && age<foamLife))continue;
      const {x,z,strength,size,yaw}=entry,distance=Math.hypot(x-local.x,z-local.z);
      if(distance>=drawRange)continue;
      if(!spray){
        film=strikeWaterFilm(scene,waterline,strikes.length,true);
        const mist=new THREE.MeshBasicMaterial({color:0xe2f5ed,transparent:true,opacity:.82,depthWrite:false});
        spray=new THREE.InstancedMesh(new THREE.SphereGeometry(1,5,3),mist,strikes.length*dropletsPerStrike);
        spray.name='Feeding shark spray';spray.renderOrder=6;spray.frustumCulled=false;
        spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(spray);
      }
      const visibility=strength*(1-smoothstep(distance,34,drawRange));
      const seed=i*2.39996+entry.time*5.7;
      film.mark(foamCount++,x,z,seed,age+.11,visibility*(1-smoothstep(age,.33,foamLife)),size*1.65,yaw);
      for(let j=0;j<dropletsPerStrike;j++){
        const t=age-.023*(j%4),velocity=(2.35+.47*(j%5))*strength;
        const height=t*(velocity-5.5*t);
        if(t<=0 || height<=0)continue;
        const angle=yaw+(i%2?1.28:2.18)*Math.sin(seed+j*2.39996);
        const travel=t*(1.44+.39*(j%5))*size;
        const radius=(.039+.010*(j%3))*size*visibility*(1-smoothstep(t,.29,.59));
        drop.position.set(x+Math.sin(angle)*travel,waterline+height*size,z-Math.cos(angle)*travel);
        drop.rotation.set(.32*Math.cos(j+seed),angle,.31*Math.sin(j+seed));
        drop.scale.set(radius,radius*(1.45+.20*(j%5)),radius);drop.updateMatrix();
        spray.setMatrixAt(dropCount++,drop.matrix);
      }
    }
    if(spray){
      film.finish(foamCount);spray.count=dropCount;spray.visible=dropCount>0;
      if(dropCount)spray.instanceMatrix.needsUpdate=true;
    }
  }

  return {mark,finish};
}
