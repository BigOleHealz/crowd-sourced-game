import * as THREE from 'three';
import {strikeWaterFilm} from './shark-strike-water.js';
import {bloodCloudBatch} from './aquatic-impact-view.js';
import {sharkDefeatPose} from './shark-defeat.js';

// Each group marks where the struggle was at that moment. Its pigment diffuses
// with the current after the shark and swimmer have moved on.
const times=[0,.17,.39,.74,1.06,1.24,1.48,1.70,1.94,2.20,2.44],clouds=4,bubbles=6,maxEvents=5,life=8;
const foamColor=new THREE.Color(0xd9eae3),bloodColor=new THREE.Color(0x8d1722);
const maxArrivals=4,maxPulses=times.length+2*maxArrivals;
function sprayBatch(scene){
  const geo=new THREE.SphereGeometry(1,7,5);
  const mat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.71,depthWrite:false});
  const spray=new THREE.InstancedMesh(geo,mat,maxEvents*maxPulses*bubbles);
  spray.name='Shark struggle spray';spray.renderOrder=5;spray.count=0;spray.frustumCulled=false;
  spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(spray);return spray;
}
function eventPulses(event,waterline,emissions=times,seed=0){
  let state=(event.tick+1)*241+event.sharkIndex*173+seed*317+19;
  const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  return emissions.map((start,i)=>{
    const p=sharkDefeatPose(event,start),y=Math.min(waterline-.10,p.y+.75);
    return {start,x:p.x,y,z:p.z,crest:seed===0 ? i===0 || i===3 || i===5 : i===0,
      plumes:Array.from({length:clouds},()=>({angle:rand()*6.283,spread:.16+.4*rand(),scale:.67+.69*rand(),phase:rand()*31})),
      foam:Array.from({length:bubbles},(_,j)=>({bloody:j%3===0,angle:rand()*6.283,spread:.16+.36*rand(),rise:.48+.45*rand(),
        height:(i<3?.61:.24)*(.45+.75*rand()),radius:.016+.031*rand()}))};
  });
}
export function createSharkDefeatView(scene,waterline){
  const pose=new THREE.Object3D(),entries=new Map();
  let batch,spray,film,previous,frameAge=0;
  return (events,tick,local,dt)=>{
    // Fill the small gaps between authoritative snapshots using render time.
    if(tick!==previous){if(tick<previous)entries.clear();frameAge=0;previous=tick;}
    else frameAge=Math.min(frameAge+dt,.1);
    if(!events){entries.clear();}
    for(const e of events??[]){
      if((tick-e.tick)/30>life+.1)continue;
      let trail=entries.get(e.id);
      if(!trail){
        if(entries.size>=maxEvents)entries.delete(entries.keys().next().value);
        trail={tick:e.tick,x:e.x,z:e.z,size:e.size,yaw:e.towYaw??e.yaw,pulses:eventPulses(e,waterline),arrivals:new Set()};
        entries.set(e.id,trail);
      }
      for(const contact of e.arrivals??[]){
        if(trail.arrivals.has(contact.sharkIndex) || trail.arrivals.size>=maxArrivals)continue;
        trail.arrivals.add(contact.sharkIndex);
        const t=(contact.tick-e.tick)/30;
        trail.pulses.push(...eventPulses(e,waterline,[t,t+.13],1+contact.sharkIndex));
      }
    }
    let n=0,k=0,m=0;
    for(const [id,e] of entries){
      const age=(tick-e.tick)/30+frameAge;
      if(age<0 || age>life){entries.delete(id);continue;}
      const distance=Math.hypot(local.x-e.x,local.z-e.z);
      if(distance>60)continue;
      if(!batch){
        batch=bloodCloudBatch(scene,waterline,maxEvents*maxPulses*clouds);
        film=strikeWaterFilm(scene,waterline,maxEvents*(3+maxArrivals));
        batch.mist.name='Shark struggle blood trail';spray=sprayBatch(scene);
      }
      for(const pulse of e.pulses){
        const t=age-pulse.start;if(t<0)continue;
        if(pulse.crest && t<6.4 && distance<44){
          const fade=THREE.MathUtils.smoothstep(t,0,.11)*(1-THREE.MathUtils.smoothstep(t,2.1,6.4))*(1-THREE.MathUtils.smoothstep(distance,35,44));
          film.mark(m++,pulse,t,fade,e.size,e.yaw);
        }
        const appear=.48+.52*(1-Math.exp(-9*t)),disperse=1-Math.exp(-.84*t);
        for(const p of pulse.plumes){
          const drift=(.11+.96*disperse)*p.spread*e.size,diam=e.size*p.scale*(.39+Math.sqrt(t)*.97);
          pose.position.set(pulse.x+Math.cos(p.angle)*drift+t*.085,Math.min(waterline-.16,pulse.y-.08+.045*t),
            pulse.z+Math.sin(p.angle)*drift+t*.038);
          pose.scale.set(diam,diam*(.59+.17*disperse),1);pose.updateMatrix();batch.mist.setMatrixAt(n,pose.matrix);
          const opacity=.81*appear*(1-THREE.MathUtils.smoothstep(age,3,life))*(1-THREE.MathUtils.smoothstep(distance,49,60));
          batch.density.setXY(n++,opacity,p.phase+.06*t);
        }
        for(const p of pulse.foam){
          // Bubble rises unseen from above until it breaks the opaque water.
          // It then beads into a narrow arc and falls back into the surface.
          const surfaceTime=Math.max(0,waterline-pulse.y)/p.rise,air=t-surfaceTime;
          if(air>.65)continue;
          const horizontal=p.spread*Math.min(1,t*1.8),x=pulse.x+Math.cos(p.angle)*horizontal,z=pulse.z+Math.sin(p.angle)*horizontal;
          const y=air<0 ? pulse.y+p.rise*t : waterline+4*p.height*(air/.65)*(1-air/.65);
          const r=p.radius*e.size*(p.bloody?1.5:1)*(air<0?.77:1-THREE.MathUtils.smoothstep(air,.40,.65));
          pose.position.set(x,y,z);pose.scale.set(r,r*(p.bloody?2.8:air<0?1.15:1.8),r);pose.updateMatrix();
          spray.setColorAt(k,p.bloody?bloodColor:foamColor);spray.setMatrixAt(k++,pose.matrix);
        }
      }
    }
    if(batch){
      film.finish(m);
      batch.mist.visible=n>0;batch.mist.count=n;
      if(n){batch.mist.instanceMatrix.needsUpdate=true;batch.density.needsUpdate=true;}
      spray.visible=k>0;spray.count=k;if(k){spray.instanceMatrix.needsUpdate=true;spray.instanceColor.needsUpdate=true;}
    }
  };
}
