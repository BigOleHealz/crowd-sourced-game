import {brickellMap} from './brickell-map.js';
import {clearSharkCourse} from './shark-swim.js';

const searches=new WeakMap();
const water=brickellMap.waterY,notice=11.5,release=1.22,removeAt=.86;
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(n,l,h)=>Math.max(l,Math.min(h,n));
const snap=n=>Math.round(n*1000)/1000;
function finish(s){
  delete s.dogEncounter;
  if(s.hp && (s.phase==='dog-approach' || s.phase==='dog-strike'))s.phase='patrol';
}
function choose(world,sharks,dogs){
  const taken=new Set(sharks.map(s=>s.dogEncounter?.dogId));
  const pairs=[];
  for(const s of sharks){
    if(!s.hp || s.scavenger || s.phase!=='patrol' || s.target!=null || s.dogEncounter)continue;
    for(const d of dogs){
      if(d.mode!=='swimming' || taken.has(d.id) || Math.abs(d.y-water)>.85)continue;
      const distance=gap(s,d);
      if(distance<=notice)pairs.push({s,d,distance});
    }
  }
  for(const {s,d} of pairs.sort((a,b)=>a.distance-b.distance)){
    if(s.dogEncounter || taken.has(d.id) || !clearSharkCourse(s,d))continue;
    s.phase='dog-approach';s.dogEncounter={dogId:d.id,t:0};taken.add(d.id);
  }
}
function approach(s,d,e,dt){
  if(e.t>5 || gap(s,d)>notice+2.5 || !clearSharkCourse(s,d)){finish(s);return;}
  const dx=d.x-s.x,dz=d.z-s.z,yaw=Math.atan2(dx,-dz),angle=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw));
  s.yaw=snap(s.yaw+clamp(angle,-dt*2.75,dt*2.75));
  const forwardX=Math.sin(s.yaw),forwardZ=-Math.cos(s.yaw),nose=1.47*s.size;
  const speed=4.9*clamp(Math.cos(angle),.14,1),distance=gap(s,d);
  const move=Math.min(speed*dt,Math.max(0,distance-nose));
  const next={x:s.x+forwardX*move,z:s.z+forwardZ*move};
  if(!clearSharkCourse(s,next)){finish(s);return;}
  s.x=snap(next.x);s.z=snap(next.z);s.y=snap(s.y+(water-.34-s.y)*Math.min(1,dt*3.6));
  s.stroke=snap((s.stroke+dt*(2.7+speed*.8))%(Math.PI*2));
  const mouth={x:s.x+nose*forwardX,z:s.z+nose*forwardZ};
  if(e.t>.32 && Math.cos(angle)>.83 && gap(mouth,d)<.62 && Math.abs(d.y-s.y)<.63){
    const end={x:d.x+forwardX*1.45,z:d.z+forwardZ*1.45};
    s.phase='dog-strike';
    Object.assign(e,{t:0,x:d.x,z:d.z,yaw:s.yaw,run:clearSharkCourse(d,end)?1.45:0,size:d.size});
  }
}
function strike(s,d,e,dt,removeDog){
  const q=clamp(e.t/release,0,1),progress=Math.sin(q*Math.PI/2),dx=Math.sin(e.yaw),dz=-Math.cos(e.yaw);
  const px=e.x+dx*progress*e.run,pz=e.z+dz*progress*e.run;
  s.x=snap(px-dx*1.47*s.size);s.z=snap(pz-dz*1.47*s.size);
  s.y=snap(water-.34+.22*Math.sin(q*2*Math.PI)-.77*q*q);
  s.stroke=snap((s.stroke+dt*7.6)%(Math.PI*2));
  if(d.mode==='swimming'){
    if(e.t>=removeAt)removeDog(d);
    else {d.x=snap(px);d.z=snap(pz);d.y=snap(s.y+.09);d.yaw=e.yaw;d.speed=0;}
  }
  if(e.t>=release)finish(s);
}
// Called after the normal dog and shark simulations. A carried or ashore dog
// immediately leaves the encounter; each shark and swimmer has at most one partner.
export function stepSharkDogEncounters(world,dt,removeDog){
  const dogs=world.dogs,sharks=world.sharks;
  if(!dogs?.length || !sharks?.length)return;
  const remaining=(searches.get(world)??0)-dt;
  if(remaining<=0){choose(world,sharks,dogs);searches.set(world,.33);}else searches.set(world,remaining);
  for(const s of sharks){
    const e=s.dogEncounter;if(!e)continue;
    const d=dogs.find(d=>d.id===e.dogId);
    if(!s.hp || !d || (d.mode!=='swimming' && !(d.mode==='removed' && s.phase==='dog-strike' && e.t>=removeAt))){finish(s);continue;}
    e.t=snap(e.t+dt);
    if(s.phase==='dog-strike')strike(s,d,e,dt,removeDog);
    else approach(s,d,e,dt);
  }
}
