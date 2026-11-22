import {damageActor} from './rivals.js';
import {drivenRoad} from './rover.js';
import {CITY,blocked,groundHeight,insideTravelArea,waterSurfaceAt} from './world.js';

export const neighborhoodDogs=[
  {id:'dog-pip',name:'Pip',walker:'rival-fern',coat:'spaniel',size:.79},
  {id:'dog-biscuit',name:'Biscuit',walker:'rival-rosa',coat:'retriever',size:1.05},
  {id:'dog-mango',name:'Mango',walker:'rival-santi',coat:'shepherd',size:1},
];
const motion=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function newDogs(npcs){
  if(!CITY)return [];
  return neighborhoodDogs.flatMap(site=>{
    const walker=npcs.find(n=>n.id===site.walker);
    if(!walker)return [];
    const maxHp=Math.round(75*site.size*site.size);
    const dog={...site,maxHp,hp:maxHp,mode:'leashed',carrier:null,speed:0,yaw:walker.yaw,...heel(walker)};
    motion.set(dog,{time:0,vx:0,vy:0,vz:0});return [dog];
  });
}

function heel(actor){
  const {x,y,z}=actor.state,yaw=actor.yaw;
  return {x:x-.78*Math.cos(yaw)+.50*Math.sin(yaw),y,z:z-.78*Math.sin(yaw)-.50*Math.cos(yaw)};
}

export function carriedDog(world,id){
  return world.dogs?.find(d=>d.mode==='carried' && d.carrier===id)??null;
}

function canReach(player,dog){
  if(!dog || !player?.state || player.life?.hp===0 || player.life?.fall || player.state.dead || player.state.ride || player.state.parachute)return false;
  const s=player.state;
  return (dog.mode==='leashed' || dog.mode==='loose' || dog.mode==='swimming' || dog.mode==='startled' || dog.mode==='defending') &&
    Math.abs(s.y-dog.y)<1.55 && Math.hypot(s.x-dog.x,s.z-dog.z)<=2.2;
}

export function nearDog(world,player){
  let best=null,bestDistance=Infinity;
  for(const d of world.dogs??[]){
    if(!canReach(player,d))continue;
    const gap=Math.hypot(player.state.x-d.x,player.state.z-d.z);
    if(gap<bestDistance){best=d;bestDistance=gap;}
  }
  return best;
}

export function takeDog(world,player,dog=nearDog(world,player)){
  if(carriedDog(world,player?.id) || !canReach(player,dog) || !world.dogs?.includes(dog))return false;
  dog.mode='carried';dog.carrier=player.id;dog.speed=0;
  carry(dog,player);return true;
}

function carry(dog,player){
  const yaw=player.yaw??0,s=player.state;
  dog.x=s.x+.31*Math.sin(yaw);dog.z=s.z-.31*Math.cos(yaw);
  dog.y=s.y+.88+(s.stance==='crouch'?-.28:0);dog.yaw=yaw+Math.PI/2;
}

function launch(dog,yaw,speed,vertical,mode){
  dog.mode=mode;dog.carrier=null;dog.yaw=yaw;dog.speed=speed;
  Object.assign(motion.get(dog),{time:0,vx:speed*Math.sin(yaw),vz:-speed*Math.cos(yaw),vy:vertical});
}

export function kickDog(world,player,dog=nearDog(world,player),tick=0){
  if(!canReach(player,dog) || !world.dogs?.includes(dog) || dog.mode==='startled' || player.state.swimming)return false;
  const dx=dog.x-player.state.x,dz=dog.z-player.state.z;
  const yaw=Math.hypot(dx,dz)>.1?Math.atan2(dx,-dz):player.yaw??0;
  dog.kicker=player.id;dog.lastKickTick=tick;
  damageDog(dog,12,tick);
  if(dog.hp)launch(dog,yaw,3.5,2.3,'startled');return true;
}

export function throwDog(world,player,aim={}){
  const dog=carriedDog(world,player.id);
  if(!dog || !player.life.hp || player.life.fall)return false;
  const pitch=clamp(Number.isFinite(aim.pitch)?aim.pitch:0,-1.1,1.25);
  const yaw=Number.isFinite(aim.yaw)?aim.yaw:player.yaw??0;
  carry(dog,player);launch(dog,yaw,6.1*Math.cos(pitch),2.8+4*Math.sin(pitch),'thrown');return true;
}

export function returnDogToWalker(world,dog,owner,thief,tick){
  if(!world.dogs?.includes(dog) || !dog.hp || dog.mode!=='carried' || dog.carrier!==thief || dog.walker!==owner.id)return false;
  dog.mode='leashed';dog.carrier=null;dog.speed=0;dog.recoveredTick=tick;
  delete dog.lastThief;
  const m=motion.get(dog);m.time=0;m.lowering=true;
  return true;
}

export function removeDog(world,dog){
  if(!dog || !world.dogs?.includes(dog) || dog.mode==='removed')return false;
  dog.mode='removed';dog.carrier=null;dog.speed=0;delete dog.attacker;motion.get(dog).time=0;return true;
}

export function damageDog(dog,amount,tick){
  if(!dog?.hp || dog.mode==='removed' || !Number.isFinite(amount) || amount<=0)return false;
  dog.hp=Math.max(0,dog.hp-amount);dog.lastHurtTick=tick;
  if(!dog.hp){
    dog.mode='down';dog.carrier=null;dog.speed=0;delete dog.attacker;motion.get(dog).time=0;
  }
  return true;
}

export function alertWalkersDogs(world,walkerId,shooter,players,tick){
  const attacker=players.get(shooter);
  if(!attacker?.life.hp)return;
  for(const dog of world.dogs??[]){
    if(dog.walker!==walkerId || !dog.hp || dog.mode==='removed')continue;
    dog.attacker=shooter;
    const m=motion.get(dog),distance=Math.hypot(attacker.state.x-dog.x,attacker.state.z-dog.z);
    m.targetLife=attacker.life;m.until=tick+30*clamp(15+distance/4,22,72);
    if(dog.mode==='leashed' || dog.mode==='loose')dog.mode='defending';
  }
}

function clearBite(world,dog,actor){
  const feet=actor.state;
  if(Math.abs(dog.y-feet.y)>.68 || Math.hypot(dog.x-feet.x,dog.z-feet.z)>1.12*dog.size)return false;
  for(const t of [.2,.5,.8]){
    if(blocked(dog.x+(feet.x-dog.x)*t,dog.y+.24,dog.z+(feet.z-dog.z)*t,world.hp,world.doors,.38))return false;
  }
  return true;
}

function surface(dog,world){
  const y=groundHeight(dog.x,dog.z,dog.y+1.3,world.doors);
  const water=waterSurfaceAt(dog.x,dog.z,dog.y);
  const swimming=y<water-.33;
  return {y:swimming?water-.29*dog.size:y,swimming};
}

function move(dog,dx,dz,world){
  const canMove=(x,z)=>insideTravelArea(x,z,.16) && !blocked(x,dog.y+.09,z,world.hp,world.doors,.44);
  if(canMove(dog.x+dx,dog.z))dog.x+=dx;
  if(canMove(dog.x,dog.z+dz))dog.z+=dz;
}

export function aboardDogCarrier(world,p){
  const id=p.id;
  return p.state.ride || drivenRoad(world,id) || world.rover?.gunner===id ||
    [world.heli,world.jet,world.tank,world.yacht,...(world.boats??[])].some(v=>v && (v.pilot===id || v.driver===id || v.gunner===id));
}

function stepDog(dog,owner,world,players,dt,tick){
  const m=motion.get(dog);m.time+=dt;
  if(dog.mode==='down'){
    const floor=surface(dog,world);dog.y=Math.max(floor.y,dog.y-5*dt);
    if(m.time>=6)removeDog(world,dog);
    return;
  }
  if(dog.mode==='removed'){
    if(m.time>=35 && owner?.life.hp){Object.assign(dog,heel(owner),{mode:'leashed',yaw:owner.yaw,hp:dog.maxHp});delete dog.lastThief;delete dog.lastHurtTick;delete dog.lastBiteTick;delete dog.attacker;m.time=0;}
    return;
  }
  if(dog.mode==='carried'){
    const p=players.get(dog.carrier);
    const boarded=p && aboardDogCarrier(world,p);
    if(p?.life.hp && !p.life.fall && !boarded){carry(dog,p);return;}
    launch(dog,dog.yaw,0,0,'thrown');
  }
  if(dog.mode==='thrown' || dog.mode==='startled'){
    move(dog,m.vx*dt,m.vz*dt,world);m.vy-=13*dt;dog.y+=m.vy*dt;
    const floor=surface(dog,world);
    if(m.vy<=0 && dog.y<=floor.y){
      dog.y=floor.y;dog.mode=floor.swimming?'swimming':'loose';dog.speed=0;m.time=0;
    }
    return;
  }
  let enemy=players.get(dog.attacker);
  if(!enemy || enemy.life!==m.targetLife || !enemy.life.hp || tick>m.until ||
    Math.hypot(enemy.state.x-dog.x,enemy.state.z-dog.z)>260 || aboardDogCarrier(world,enemy)){
    enemy=null;delete dog.attacker;
    if(dog.mode==='defending'){dog.mode='loose';m.time=0;}
  }else if(dog.mode!=='swimming')dog.mode='defending';
  if(!enemy && (!owner?.life.hp || owner.life.fall)){
    if(dog.mode==='leashed'){dog.mode='loose';m.time=0;}
    dog.speed=0;return;
  }
  const goal=enemy?enemy.state:heel(owner);
  const beforeX=dog.x,beforeZ=dog.z,dx=goal.x-dog.x,dz=goal.z-dog.z,d=Math.hypot(dx,dz);
  if(dog.mode==='leashed' && d>18){dog.mode='loose';m.time=0;}
  const follow=!!enemy || dog.mode==='leashed' || dog.mode==='swimming' || m.time>2;
  if(follow && d>(enemy ? .65 : .12)){
    const speed=dog.mode==='swimming'?1.2:enemy?5.3:Math.min(4.5,.2+d*2.7);
    const step=Math.min(d,speed*dt);
    move(dog,dx/d*step,dz/d*step,world);
    const angle=Math.atan2(dx,-dz);
    dog.yaw+=clamp(Math.atan2(Math.sin(angle-dog.yaw),Math.cos(angle-dog.yaw)),-dt*6,dt*6);
  }
  dog.speed=Math.hypot(dog.x-beforeX,dog.z-beforeZ)/dt;
  const floor=surface(dog,world);
  dog.y=m.lowering?Math.max(floor.y,dog.y-3*dt):floor.y;
  if(dog.y===floor.y)m.lowering=false;
  if(floor.swimming){dog.mode='swimming';}
  else if(dog.mode==='swimming'){dog.mode='loose';m.time=0;}
  else if(dog.mode==='loose' && !enemy && m.time>2 && d<.55){dog.mode='leashed';delete dog.lastThief;m.time=0;}
  if(enemy && tick>=(m.nextBite??0) && clearBite(world,dog,enemy)){
    const hp=enemy.life.hp;
    damageActor(enemy,Math.round(7*dog.size),tick);
    if(enemy.life.hp<hp)dog.lastBiteTick=tick;
    m.nextBite=tick+36;
  }
}

export function stepDogs(world,npcs,players,dt,tick){
  for(const dog of world.dogs??[])stepDog(dog,npcs.find(n=>n.id===dog.walker),world,players,dt,tick);
}
