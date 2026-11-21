import {roadway} from './brickell-map.js';
import {hydrants,repairTicks} from './hydrants.js';
import {CITY,MAP,blocked,groundHeight,insideTravelArea,stepPlayer} from './world.js';
import {vehicleContact} from './vehicle-contact.js';

const cues={
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
    if(!n.life.hp || n.life.fall || !s.grounded || s.swimming ||
      (n.reactAfter>tick && (!r || cue.rank<=cues[r.type].rank)) ||
      world.traffic?.some(v=>v.npcDriver===n.id || v.takeover?.npcId===n.id))continue;
    if(Math.hypot(s.x-source.x,s.z-source.z)>cue.radius || Math.abs(s.y-source.y)>4.5)continue;
    const away=Math.atan2(s.x-source.x,source.z-s.z);
    const end=retreatPoint(world,s,away,cue.retreat);
    n.reaction={type,since:tick,until:tick+cue.duration,...end,look:away+Math.PI};
    n.reactAfter=tick+cue.duration+50;
  }
}

export function localWorldReactions(world,npcs,tick){
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
  if(!r)return false;
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
