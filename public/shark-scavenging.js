import {brickellMap} from './brickell-map.js';
import {bridgeSharkWaypoint,clearSharkCourse,returnToSharkPatrol,sharkSeabed} from './shark-swim.js';
import {dogTossNotice} from './shark-dog-encounter.js';
import {bridgeDogWater,bridgeTossNotice,dogTossBridge} from './bridge-shark-water.js';
import {inDivingLane} from './marina-platform.js';
import {immersedSurface} from './water-impact.js';

const sea=brickellMap.waterY,states=new WeakMap(),tau=Math.PI*2;
const approachOffsets=Array.from({length:24},(_,i)=>(i%2?1:-1)*Math.ceil(i/2)*tau/24);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const snap=n=>Math.round(n*1000)/1000;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function inFeedingDepth(y,floor){
  return y<=sea+.20 && y>=floor-.20 && sea-floor>1.5;
}
function safeWater(p,bridge){
  return !inDivingLane(p.x,p.z) && (bridge && p.y<=sea+.20 && bridgeDogWater(bridge,p.x,p.z) ||
    inFeedingDepth(p.y,sharkSeabed(p.x,p.z)));
}
function release(shark){
  if(shark.phase==='scavenge-approach' || shark.phase==='scavenging'){shark.phase='patrol';returnToSharkPatrol(shark);}
  delete shark.scavenge;
}
function addSite(memory,key,point,blast,tick,body,bridge){
  if(!safeWater(point,bridge) || memory.sites.has(key))return;
  // A missile may defeat several swimmers in the same burst. Keep one shared
  // patch for that impact instead of reserving several feeding rings on top of it.
  if(blast && [...memory.sites.values()].some(site=>site.blast && Math.abs(site.created-tick)<5 && distance(site,point)<=7))return;
  if(memory.sites.size>=12)memory.sites.delete(memory.sites.keys().next().value);
  memory.sites.set(key,{key,x:point.x,y:sea-.24,z:point.z,created:tick,expires:tick+(blast?540:330),blast,body,bridge});
}
// The strike owner controls the dog. Other sharks share a moving feeding site
// until contact, then stay at the last water position for a short feeding bout.
function observeDogTosses(world,memory,tick){
  for(const lead of world.sharks){
    const encounter=lead.dogEncounter;
    if(!encounter?.tossKey)continue;
    const dog=world.dogs?.find(d=>d.id===encounter.dogId);
    if(!dog)continue;
    const key=encounter.tossKey,bridge=dogTossBridge(dog);
    if(dog.mode==='swimming' && safeWater(dog,bridge)){
      addSite(memory,key,dog,false,tick,null,bridge);
      const site=memory.sites.get(key);
      Object.assign(site,{x:dog.x,z:dog.z,lead,dog,notice:bridge?bridgeTossNotice:dogTossNotice,expires:tick+240});
    }else if(dog.mode==='removed' && encounter.consumed){
      const site=memory.sites.get(key);
      if(site?.dog){
        Object.assign(site,{x:dog.x,z:dog.z,expires:tick+240});
        delete site.dog;delete site.lead;
      }
    }
  }
}
function observe(world,memory,players,npcs,tick){
  observeDogTosses(world,memory,tick);
  const subjects=[...players.values(),...npcs];
  const bodies=new Map(subjects.map(p=>[p.id,p.life]));
  for(const dog of world.dogs??[])bodies.set(dog.id,dog);
  for(const e of world.shots??[]){
    if(e.id<=memory.shot)continue;
    memory.shot=e.id;
    if(e.weapon!=='waterHit' || !e.dead)continue;
    const body=bodies.get(e.victim);if(body)memory.seen.add(body);
    if(Math.abs(e.waterline-sea)>.025)continue;
    addSite(memory,'hit'+e.id,e.to,e.blast,e.tick,e.blast?null:body);
  }
  for(const actor of subjects){
    const life=actor.life;
    if(life.hp || memory.seen.has(life) || immersedSurface(actor.state,world.doors)!==sea ||
      world.sharkDefeats?.some(e=>e.playerId===actor.id))continue;
    memory.seen.add(life);
    addSite(memory,'actor'+actor.id+'-'+tick,actor.state,false,tick,life);
  }
  for(const species of ['dogs','sharks','manatees','dolphins','gulls']){
    (world[species]??[]).forEach((animal,i)=>{
      if(animal.hp){memory.seen.delete(animal);return;}
      if(memory.seen.has(animal))return;
      if(species==='dogs' && (animal.mode!=='down' || immersedSurface(animal,world.doors)!==sea))return;
      if(species==='gulls' && animal.y>sea+.12)return;
      memory.seen.add(animal);
      const blast=animal.deathKind==='blast',age=animal.ageSinceHit??0;
      if(age>=(blast?18:11))return;
      const point=blast?{x:animal.hitX??animal.x,y:animal.hitY??animal.y,z:animal.hitZ??animal.z}:animal;
      addSite(memory,species+i+'-'+tick,point,blast,tick-Math.round(age*30),blast?null:animal);
    });
  }
  const present=new Set(bodies.values());
  for(const group of ['sharks','manatees','dolphins','gulls'])for(const a of world[group]??[])present.add(a);
  for(const [key,site] of memory.sites){
    const lostDog=site.dog && (site.dog.mode!=='swimming' || site.lead.dogEncounter?.tossKey!==site.key || !safeWater(site.dog,site.bridge));
    if(lostDog || tick>=site.expires || site.body && (site.body.hp || site.body.mode==='removed' || !present.has(site.body)))memory.sites.delete(key);
  }
}
function assign(world,sites){
  const pairs=[];
  for(const s of world.sharks){
    if(!s.hp || s.phase!=='patrol' || s.target!=null || s.dogEncounter || s.scavenge)continue;
    for(const site of sites.values()){
      const d=distance(s,site);
      if(d<=(site.notice??(site.blast?124:18)))pairs.push({s,site,d});
    }
  }
  for(const {s,site} of pairs.sort((a,b)=>a.d-b.d)){
    if(s.scavenge)continue;
    const others=world.sharks.filter(o=>o.scavenge?.key===site.key);
    if(others.length+(site.lead?1:0)>=3)continue;
    const approach=Math.atan2(s.x-site.x,site.z-s.z);
    const nose=1.47*s.size+.52;
    const bearing=approachOffsets.map(offset=>approach+offset).find(a=>{
      if(site.lead && Math.abs(angleDiff(a,Math.atan2(site.lead.x-site.x,site.z-site.lead.z)))<=.73)return false;
      if(others.some(o=>Math.abs(angleDiff(a,o.scavenge.bearing))<=.73))return false;
      const stand={x:site.x+Math.sin(a)*nose,z:site.z-Math.cos(a)*nose};
      return bridgeSharkWaypoint(s,stand,site.bridge);
    });
    if(bearing===undefined)continue;
    s.scavenge={key:site.key,bearing:snap(bearing)};s.phase='scavenge-approach';
  }
}
export function stepSharkScavenging(world,players,npcs,tick,dt){
  if(!world.sharks?.length)return;
  let m=states.get(world);
  if(!m){m={sites:new Map(),seen:new WeakSet(),shot:0,scan:0};states.set(world,m);}
  if(tick>=m.scan){observe(world,m,players,npcs,tick);assign(world,m.sites);m.scan=tick+5;}
  for(const s of world.sharks){
    const e=s.scavenge;if(!e)continue;
    const site=m.sites.get(e.key);
    if(!s.hp || !site || tick>=site.expires || s.target!=null || s.dogEncounter){release(s);continue;}
    const nose=1.47*s.size,dx=Math.sin(e.bearing),dz=-Math.cos(e.bearing);
    const biting=s.phase==='scavenging';
    const pulse=biting?.20*Math.sin((tick-e.biteTick)*.19):0;
    const stand=nose+.52-pulse;
    const x=site.x+dx*stand,z=site.z+dz*stand;
    const range=Math.hypot(x-s.x,z-s.z),goal=bridgeSharkWaypoint(s,{x,z},site.bridge);
    if(!goal){release(s);continue;}
    const travel=Math.hypot(goal.x-s.x,goal.z-s.z);
    const arc=range>.5?Math.atan2(goal.x-s.x,s.z-goal.z):e.bearing+Math.PI;
    const turn=angleDiff(arc,s.yaw);
    s.yaw=snap(s.yaw+clamp(turn,-2.6*dt,2.6*dt));
    const speed=biting?1.9:range>9 && site.blast?8.4:range>9 && site.bridge?6.1:4.6;
    const move=Math.min(travel,dt*speed*clamp(Math.cos(turn),.15,1));
    const next={x:snap(s.x+(goal.x-s.x)*move/(travel||1)),z:snap(s.z+(goal.z-s.z)*move/(travel||1))};
    if(!clearSharkCourse(s,next,site.bridge)){release(s);continue;}
    s.x=next.x;s.z=next.z;
    s.y=snap(s.y+(sea-.43+pulse*.44-s.y)*Math.min(1,dt*3));
    s.stroke=snap((s.stroke+dt*(biting?3:5))%tau);
    if(!biting && range<.48 && Math.abs(angleDiff(e.bearing+Math.PI,s.yaw))<.34){
      s.phase='scavenging';e.biteTick=tick;
    }
  }
}
