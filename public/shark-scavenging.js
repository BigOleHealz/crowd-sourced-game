import {brickellMap,cityGround} from './brickell-map.js';
import {clearSharkCourse} from './shark-swim.js';
import {inDivingLane} from './marina-platform.js';
import {immersedSurface} from './water-impact.js';

const sea=brickellMap.waterY,states=new WeakMap(),tau=Math.PI*2;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const snap=n=>Math.round(n*1000)/1000;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function safeWater(p){
  return Math.abs(p.y-sea)<3 && !inDivingLane(p.x,p.z) && sea-cityGround(p.x,p.z)>2.05;
}
function release(shark){
  if(shark.phase==='scavenge-approach' || shark.phase==='scavenging')shark.phase='patrol';
  delete shark.scavenge;
}
function addSite(memory,key,point,blast,tick,body){
  if(!safeWater(point) || memory.sites.has(key))return;
  if(memory.sites.size>=12)memory.sites.delete(memory.sites.keys().next().value);
  memory.sites.set(key,{key,x:point.x,y:sea-.24,z:point.z,expires:tick+(blast?540:330),blast,body});
}
function observe(world,memory,players,npcs,tick){
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
  for(const [key,site] of memory.sites)if(tick>=site.expires || site.body && (site.body.hp || site.body.mode==='removed' || !present.has(site.body)))memory.sites.delete(key);
}
function assign(world,sites){
  for(const s of world.sharks){
    if(!s.hp || s.phase!=='patrol' || s.target!=null || s.dogEncounter || s.scavenge)continue;
    let site,nearest=Infinity;
    for(const candidate of sites.values()){
      const d=distance(s,candidate);
      if(d>=nearest || d>(candidate.blast?32:18) || !clearSharkCourse(s,candidate))continue;
      if(world.sharks.filter(other=>other.scavenge?.key===candidate.key).length>=3)continue;
      nearest=d;site=candidate;
    }
    if(!site)continue;
    const approach=Math.atan2(s.x-site.x,site.z-s.z);
    const others=world.sharks.filter(other=>other.scavenge?.key===site.key);
    // Reserve different edges of the same feeding area as each shark approaches.
    const bearing=[0,1,-1,2,-2,3].map(i=>approach+i*tau/6)
      .find(a=>others.every(other=>Math.abs(angleDiff(a,other.scavenge.bearing))>1.25));
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
    const range=Math.hypot(x-s.x,z-s.z);
    const arc=range>.5?Math.atan2(x-s.x,s.z-z):e.bearing+Math.PI;
    const turn=angleDiff(arc,s.yaw);
    s.yaw=snap(s.yaw+clamp(turn,-2.6*dt,2.6*dt));
    const move=Math.min(range,dt*(biting?1.9:4.6)*clamp(Math.cos(turn),.15,1));
    const next={x:s.x+(x-s.x)*move/(range||1),z:s.z+(z-s.z)*move/(range||1)};
    if(!clearSharkCourse(s,next)){release(s);continue;}
    s.x=snap(next.x);s.z=snap(next.z);
    s.y=snap(s.y+(sea-.43+pulse*.44-s.y)*Math.min(1,dt*3));
    s.stroke=snap((s.stroke+dt*(biting?3:5))%tau);
    if(!biting && range<.48 && Math.abs(angleDiff(e.bearing+Math.PI,s.yaw))<.34){
      s.phase='scavenging';e.biteTick=tick;
    }
  }
}
