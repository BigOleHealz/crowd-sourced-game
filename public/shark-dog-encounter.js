import {brickellMap} from './brickell-map.js';
import {bridgeSharkWaypoint,clearSharkCourse,returnToSharkPatrol} from './shark-swim.js';
import {bridgeTossNotice,dogTossBridge} from './bridge-shark-water.js';

const searches=new WeakMap();
const water=brickellMap.waterY,notice=11.5,release=1.22,removeAt=.86;
export const dogTossNotice=36;
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(n,l,h)=>Math.max(l,Math.min(h,n));
const snap=n=>Math.round(n*1000)/1000;
function finish(s){
  delete s.dogEncounter;
  if(s.hp && (s.phase==='dog-approach' || s.phase==='dog-strike')){s.phase='patrol';returnToSharkPatrol(s);}
}
function choose(sharks,dogs){
  const taken=new Set(sharks.map(s=>s.dogEncounter?.dogId));
  const pairs=[];
  for(const s of sharks){
    if(!s.hp || s.phase!=='patrol' || s.target!=null || s.dogEncounter)continue;
    for(const d of dogs){
      if(d.mode!=='swimming' || taken.has(d.id) || Math.abs(d.y-water)>.85)continue;
      const distance=gap(s,d);
      const tossed=d.tossSplashTick!=null,bridge=dogTossBridge(d);
      if((tossed || !s.scavenger) && distance<=(bridge?bridgeTossNotice:tossed?dogTossNotice:notice))pairs.push({s,d,distance,bridge});
    }
  }
  for(const {s,d,bridge} of pairs.sort((a,b)=>a.distance-b.distance)){
    if(s.dogEncounter || taken.has(d.id) || !bridgeSharkWaypoint(s,d,bridge))continue;
    s.phase='dog-approach';s.dogEncounter={dogId:d.id,t:0};
    if(d.tossSplashTick!=null)s.dogEncounter.tossKey='toss-'+d.id+'-'+d.tossSplashTick;
    taken.add(d.id);
  }
}
function approach(s,d,e,dt,sharks){
  const tossed=!!e.tossKey,bridge=tossed && dogTossBridge(d);
  if(e.contactAt!=null){
    d.x=e.x;d.z=e.z;d.speed=0;
  }
  const waypoint=bridgeSharkWaypoint(s,d,bridge);
  if((e.contactAt==null && e.t>(bridge?18:tossed?12:5)) || gap(s,d)>(bridge?bridgeTossNotice:tossed?dogTossNotice:notice)+2.5 || !waypoint){finish(s);return;}
  const dx=waypoint.x-s.x,dz=waypoint.z-s.z,yaw=Math.atan2(dx,-dz),angle=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw));
  s.yaw=snap(s.yaw+clamp(angle,-dt*2.75,dt*2.75));
  const forwardX=Math.sin(s.yaw),forwardZ=-Math.cos(s.yaw),nose=1.47*s.size;
  const distance=gap(s,waypoint),speed=(bridge && distance>8?6.1:4.9)*clamp(Math.cos(angle),.14,1);
  const move=Math.min(speed*dt,Math.max(0,distance-(waypoint===d?nose:0)));
  const next={x:snap(s.x+forwardX*move),z:snap(s.z+forwardZ*move)};
  if(clearSharkCourse(s,next,bridge)){s.x=next.x;s.z=next.z;}
  else if(!bridge){finish(s);return;}
  s.y=snap(s.y+(water-.34-s.y)*Math.min(1,dt*3.6));
  s.stroke=snap((s.stroke+dt*(2.7+speed*.8))%(Math.PI*2));
  const mouth={x:s.x+nose*forwardX,z:s.z+nose*forwardZ};
  if(waypoint===d && e.t>.32 && Math.cos(angle)>.83 && gap(mouth,d)<(tossed?.17:.62) && Math.abs(d.y-s.y)<.63){
    const helpers=tossed?sharks.filter(other=>other.scavenge?.key===e.tossKey):[];
    // At a bridge the other resident may still be routing around an abutment.
    // A brief reassignment must not trigger a solo strike before it arrives.
    const feeding=helpers.some(other=>other.phase==='scavenging' && gap(other,d)<1.47*other.size+1);
    if((bridge || helpers.length) && !feeding){
      if(e.contactAt==null)Object.assign(e,{contactAt:e.t,x:d.x,z:d.z});
      if(e.t-e.contactAt<(bridge?12:8))return;
    }
    const end={x:d.x+forwardX*1.45,z:d.z+forwardZ*1.45};
    s.phase='dog-strike';
    Object.assign(e,{t:0,x:d.x,z:d.z,yaw:s.yaw,run:!helpers.length && clearSharkCourse(d,end,bridge)?1.45:0,size:d.size});
  }
}
function strike(s,d,e,dt,removeDog){
  const q=clamp(e.t/release,0,1),progress=Math.sin(q*Math.PI/2),dx=Math.sin(e.yaw),dz=-Math.cos(e.yaw);
  const px=e.x+dx*progress*e.run,pz=e.z+dz*progress*e.run;
  s.x=snap(px-dx*1.47*s.size);s.z=snap(pz-dz*1.47*s.size);
  s.y=snap(water-.34+.22*Math.sin(q*2*Math.PI)-.77*q*q);
  s.stroke=snap((s.stroke+dt*7.6)%(Math.PI*2));
  if(d.mode==='swimming'){
    if(e.t>=removeAt){removeDog(d);e.consumed=d.mode==='removed';}
    else {d.x=snap(px);d.z=snap(pz);d.y=snap(s.y+.09);d.yaw=e.yaw;d.speed=0;}
  }
  if(e.t>=release)finish(s);
}
// Called after the normal dog and shark simulations. A carried or ashore dog
// immediately leaves the encounter; one shark controls the dog during contact.
export function stepSharkDogEncounters(world,dt,removeDog){
  const dogs=world.dogs,sharks=world.sharks;
  if(!dogs?.length || !sharks?.length)return;
  const remaining=(searches.get(world)??0)-dt;
  if(remaining<=0){choose(sharks,dogs);searches.set(world,.33);}else searches.set(world,remaining);
  for(const s of sharks){
    const e=s.dogEncounter;if(!e)continue;
    const d=dogs.find(d=>d.id===e.dogId);
    if(!s.hp || !d || (d.mode!=='swimming' && !(d.mode==='removed' && s.phase==='dog-strike' && e.t>=removeAt))){finish(s);continue;}
    e.t=snap(e.t+dt);
    if(s.phase==='dog-strike')strike(s,d,e,dt,removeDog);
    else approach(s,d,e,dt,sharks);
  }
}
