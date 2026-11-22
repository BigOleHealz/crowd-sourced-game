import {roadway} from './brickell-map.js';
import {hydrants,repairTicks} from './hydrants.js';
import {CITY,MAP,blocked,groundHeight,insideTravelArea,stepPlayer} from './world.js';
import {vehicleContact} from './vehicle-contact.js';

const cues={
  gunfire:{rank:4},
  horn:{radius:10,retreat:1.6,speed:.42,duration:42,rank:1},
  spray:{radius:9,retreat:2.8,speed:.65,duration:69,rank:2},
  collapse:{radius:25,retreat:5.1,speed:.88,duration:95,rank:3},
};
const seenFalls=new WeakSet();

function safe(world,x,z,startY,avoidRoad){
  if(!insideTravelArea(x,z,.4) || (avoidRoad && roadway(x,z)))return false;
  const floor=groundHeight(x,z,startY+.5,world.doors);
  return floor>MAP.waterY+.12 && Math.abs(floor-startY)<.36 && !blocked(x,floor,z,world.hp,world.doors) &&
    !vehicleContact(x,floor,z,world,CITY,1.80).depth;
}

function retreatPoint(world,s,yaw,distance){
  let best,score=0;
  for(const offset of [0,.58,-.58,1.12,-1.12,1.49,-1.49]){
    const dx=Math.sin(yaw+offset),dz=-Math.cos(yaw+offset);
    let avoidRoad=CITY && !roadway(s.x,s.z),lastY=s.y;
    for(let d=.28;d<=distance;d+=.28){
      const x=s.x+dx*d,z=s.z+dz*d;
      if(!safe(world,x,z,lastY,avoidRoad))break;
      if(CITY && !roadway(x,z))avoidRoad=true;
      lastY=groundHeight(x,z,lastY+.5,world.doors);
      const merit=d*(1-.35*Math.abs(offset))+(avoidRoad?.7:0);
      if(merit>score){best={x,z};score=merit;}
    }
  }
  return best??{x:s.x,z:s.z};
}

export function signalPedestrians(world,npcs,type,source,tick){
  const cue=cues[type];
  for(const n of npcs){
    const s=n.state,r=n.reaction;
    if(r?.type==='gunfire' || !n.life.hp || n.life.fall || !s.grounded || s.swimming ||
      (n.reactAfter>tick && (!r || cue.rank<=cues[r.type].rank)) ||
      world.traffic?.some(v=>v.npcDriver===n.id || v.takeover?.npcId===n.id))continue;
    if(Math.hypot(s.x-source.x,s.z-source.z)>cue.radius || Math.abs(s.y-source.y)>4.5)continue;
    const away=Math.atan2(s.x-source.x,source.z-s.z);
    const end=retreatPoint(world,s,away,cue.retreat);
    n.reaction={type,since:tick,until:tick+cue.duration,...end,look:away+Math.PI};
    n.reactAfter=tick+cue.duration+50;
  }
}

const heardShots=new WeakSet();
function scatter(world,npcs,source,tick,radius){
  for(const [index,n] of npcs.entries()){
    const s=n.state;
    if(n.officer || !n.life.hp || n.life.fall || !s.grounded || s.swimming ||
      Math.abs(s.y-source.y)>8 || Math.hypot(s.x-source.x,s.z-source.z)>radius ||
      world.traffic?.some(v=>v.npcDriver===n.id || v.takeover?.npcId===n.id))continue;
    const current=n.reaction;
    if(current?.type==='gunfire'){
      current.until=tick+155+index%65;
      if(tick-current.lastThreat>14){
        current.threat=source;current.lastThreat=tick;
      }
      continue;
    }
    // Different people hesitate and find their footing at different moments.
    const delay=2+Math.imul(index+3,19)%12;
    n.reaction={type:'gunfire',since:tick,until:tick+155+index%65,threat:source,lastThreat:tick,
      moveAt:tick+delay,cryAt:tick+delay+index%9,nextLeg:tick,turnBias:(index%5-2)*.12,
      trail:n.escapeTrail??[{x:s.x,z:s.z}]};
    n.reactAfter=n.reaction.until;
    delete n.escapeTrail;
  }
}

function panicStep(n,tick,dt,world){
  const r=n.reaction,s=n.state;
  if(tick>=r.cryAt && tick>=(n.panicCry??-1000)+130){
    n.panicCry=tick;r.cryAt=tick+150+Math.round(95*Math.abs(r.turnBias));
  }
  if(tick<r.moveAt){n.moving=false;s.vx=s.vz=0;return;}
  if(tick>=r.nextLeg || r.x==null || (!r.cornered && Math.hypot(r.x-s.x,r.z-s.z)<.34)){
    const away=Math.atan2(s.x-r.threat.x,r.threat.z-s.z);
    const last=r.trail.at(-1);
    if(!last || Math.hypot(s.x-last.x,s.z-last.z)>1.5){
      if(r.trail.length>=40)r.trail.splice(1,1);
      r.trail.push({x:s.x,z:s.z});
    }
    const goal=retreatPoint(world,s,away+r.turnBias,5.8);
    r.x=goal.x;r.z=goal.z;r.nextLeg=tick+28;r.cornered=false;
    if(Math.hypot(r.x-s.x,r.z-s.z)<.34){r.x=s.x;r.z=s.z;r.nextLeg=tick+18;r.cornered=true;}
  }
  const dx=r.x-s.x,dz=r.z-s.z,d=Math.hypot(dx,dz);
  if(d>.24){
    const stride=Math.min(d,6.5*dt),x=dx/d,z=dz/d;
    if(safe(world,s.x+x*stride,s.z+z*stride,s.y,CITY && !roadway(s.x,s.z))){
      n.state=stepPlayer(s,{x,z,sprint:true},dt,world.hp,world);
      n.yaw=Math.atan2(dx,-dz);n.moving=true;return;
    }
  }
  n.moving=false;s.vx=s.vz=0;
}

function returnFromCover(n,dt,world){
  const trail=n.escapeTrail;
  if(!trail?.length)return false;
  const s=n.state,next=trail.at(-1);
  const dx=next.x-s.x,dz=next.z-s.z,d=Math.hypot(dx,dz);
  if(d<.32){trail.pop();if(!trail.length)delete n.escapeTrail;return true;}
  const vx=dx/d*.45,vz=dz/d*.45;
  const moved=stepPlayer(s,{x:vx,z:vz},dt,world.hp,world);
  if(Math.hypot(s.x-moved.x,s.z-moved.z)<.001){
    n.moving=false;return false;
  }
  n.state=moved;n.yaw=Math.atan2(dx,-dz);n.moving=true;return true;
}

export function localWorldReactions(world,npcs,tick){
  const cues=world.panicCues??=[];
  while(cues.length && tick-cues[0].tick>110)cues.shift();
  for(const shot of world.shots??[]){
    if(heardShots.has(shot))continue;
    heardShots.add(shot);
    const muzzle=shot.weapon==='muzzle' || shot.weapon==='launch';
    const injury=shot.hit && (shot.hitKind==='npc' || shot.hitKind==='player');
    if(!muzzle && !injury)continue;
    const point=muzzle?shot.from:shot.to,radius=muzzle?37:25;
    if(cues.some(c=>tick-c.tick<10 && Math.hypot(point.x-c.x,point.y-c.y,point.z-c.z)<4 && c.radius>=radius))continue;
    if(cues.length>=28)cues.shift();
    cues.push({id:shot.id,tick,x:point.x,y:point.y,z:point.z,radius});
    scatter(world,npcs,point,tick,radius);
  }
  for(const h of hydrants)if(world.doors?.hydrants?.[h.id]===repairTicks)signalPedestrians(world,npcs,'spray',h,tick);
  for(const f of world.doors?.structureFalls??[]){
    if(seenFalls.has(f))continue;
    seenFalls.add(f);
    const b=f.tower!=null ? MAP.buildings.find(b=>b.towerId===f.tower) : null;
    if(b)signalPedestrians(world,npcs,'collapse',{x:b.x,y:b.base,z:b.z},tick);
    else if(f.index!=null)signalPedestrians(world,npcs,'collapse',{x:(f.left+f.right)/2,y:f.low,z:(f.north+f.south)/2},tick);
  }
}

export function stepPedestrianReaction(n,tick,dt,world){
  const r=n.reaction;
  if(!r)return returnFromCover(n,dt,world);
  if(r.type==='gunfire'){
    if(!n.life.hp || n.life.fall){delete n.reaction;return false;}
    if(tick<r.until){panicStep(n,tick,dt,world);return true;}
    n.escapeTrail=r.trail;delete n.reaction;
    return returnFromCover(n,dt,world);
  }
  if(tick>=r.until || n.life.fall || !n.life.hp){delete n.reaction;return false;}
  const s=n.state,dx=r.x-s.x,dz=r.z-s.z,d=Math.hypot(dx,dz);
  const retreat=tick-r.since>6 && d>.14;
  if(retreat){
    const step=Math.min(d,cues[r.type].speed*4.6*dt);
    if(safe(world,s.x+dx/d*step,s.z+dz/d*step,s.y,CITY && !roadway(s.x,s.z))){
      n.state=stepPlayer(s,{x:dx/d*cues[r.type].speed,z:dz/d*cues[r.type].speed},dt,world.hp,world);
      n.yaw=Math.atan2(dx,-dz);n.moving=true;return true;
    }
  }
  n.moving=false;n.yaw=r.look;n.state.vx=n.state.vz=0;return true;
}

export function soundRoadHorn(world,road,npcs,tick){
  if(road.driver==null || road.takeover || road.wrecked || (road.horn && tick-road.horn.id<28))return;
  road.horn={id:tick,x:road.x,y:road.y+.8,z:road.z};
  signalPedestrians(world,npcs,'horn',road,tick);
}
