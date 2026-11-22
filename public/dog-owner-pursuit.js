import {blocked,groundHeight,insideTravelArea,MAP,stepPlayer} from './world.js';
import {vehicleContact} from './vehicle-contact.js';
import {aboardDogCarrier,returnDogToWalker} from './dog-walkers.js';

const pursuits=new WeakMap();
const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));

function danger(owner){
  return owner.reaction?.type==='gunfire' || owner.reaction?.type==='collapse';
}

export function startDogPursuit(world,player,dog,tick,npcs){
  if(dog?.mode!=='carried' || dog.carrier!==player.id || !dog.hp || !world.dogs?.includes(dog))return false;
  const owner=npcs.find(n=>n.id===dog.walker);
  if(!owner?.life.hp || owner.life.fall || !owner.state.grounded || danger(owner))return false;
  const previous=pursuits.get(owner);
  if(previous?.life===player.life && previous.thief===player.id && previous.dog===dog)return true;
  const s=owner.state;
  const trail=previous?.trail??owner.escapeTrail??[{x:s.x,z:s.z}];
  delete owner.escapeTrail;delete owner.checkingTraffic;delete owner.crossing;delete owner.reaction;
  owner.pursuedDog=dog.id;
  pursuits.set(owner,{dog,thief:player.id,life:player.life,trail,start:tick,
    touch:0,stopped:0,side:0,steerUntil:0});
  return true;
}

function stop(owner,p){
  pursuits.delete(owner);delete owner.pursuedDog;owner.sprint=false;
  if(owner.life.hp){
    if(owner.reaction?.trail)owner.reaction.trail=[...p.trail,...owner.reaction.trail];
    else owner.escapeTrail=p.trail;
  }
}

function traversable(world,from,x,z){
  if(!insideTravelArea(x,z,.35))return false;
  const y=groundHeight(x,z,from.y+.45,world.doors);
  return y>MAP.waterY+.05 && Math.abs(y-from.y)<.30 && !blocked(x,y,z,world.hp,world.doors) &&
    !vehicleContact(x,y,z,world,true,1.7).depth;
}

function clearReach(world,owner,holder){
  const a=owner.state,b=holder.state;
  if(!a.grounded || !b.grounded || b.climb || Math.abs(a.y-b.y)>.39 ||
      Math.hypot(a.x-b.x,a.z-b.z)>.98)return false;
  for(const t of [.25,.50,.75])if(!traversable(world,a,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;
  return true;
}

// Only this walker can reclaim the dog. Its normal patrol takes over when the
// chase ends, walking back along the ground it actually covered.
export function stepDogPursuit(world,owner,players,tick,dt){
  const p=pursuits.get(owner);
  if(!p)return false;
  const dog=p.dog,holder=players.get(p.thief),s=owner.state;
  const active=owner.life.hp && !owner.life.fall && !danger(owner) && !s.swimming &&
    holder?.life===p.life && holder.life.hp && !holder.life.fall &&
    !aboardDogCarrier(world,holder) && dog.mode==='carried' && dog.carrier===p.thief && dog.hp;
  if(!active || tick-p.start>900 || p.stopped>2.4){stop(owner,p);return false;}
  delete owner.reaction;
  const h=holder.state,dx=h.x-s.x,dz=h.z-s.z,dist=Math.hypot(dx,dz);
  if(dist>75){stop(owner,p);return false;}
  const heading=Math.atan2(dx,-dz),turn=Math.atan2(Math.sin(heading-owner.yaw),Math.cos(heading-owner.yaw));
  owner.yaw+=clamp(turn,-6*dt,6*dt);
  const canCatch=clearReach(world,owner,holder);
  p.touch=tick-p.start>=24 && canCatch?p.touch+dt:0;
  if(p.touch>=.25){
    returnDogToWalker(world,dog,owner,p.thief,tick);
    stop(owner,p);return false;
  }
  if(tick-p.start<12 || canCatch){
    owner.moving=owner.sprint=false;s.vx=s.vz=0;return true;
  }
  const speed=Math.min(1,Math.max(.16,(dist-.67)*.76));
  let moved;
  const bias=tick<p.steerUntil?p.side:0;
  for(const offset of [bias,0,.63,-.63,1.10,-1.10]){
    const x=Math.sin(heading+offset),z=-Math.cos(heading+offset);
    if(!traversable(world,s,s.x+x*.48,s.z+z*.48))continue;
    const next=stepPlayer(s,{x:x*speed,z:z*speed,sprint:dist>2.3},dt,world.hp,world);
    if(Math.hypot(next.x-s.x,next.z-s.z)<.002)continue;
    if(offset!==bias){p.side=offset;p.steerUntil=tick+12;}
    moved=next;break;
  }
  owner.moving=!!moved;owner.sprint=!!moved && dist>2.3;
  if(!moved){s.vx=s.vz=0;p.stopped+=dt;return true;}
  const last=p.trail.at(-1);
  if(!last || Math.hypot(last.x-s.x,last.z-s.z)>.85)p.trail.push({x:s.x,z:s.z});
  p.stopped=0;owner.state=moved;
  return true;
}
