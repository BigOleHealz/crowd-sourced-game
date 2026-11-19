import { blocked, CITY, insideTravelArea, solidTopAt } from './world.js';
import { vehicleContact } from './vehicle-contact.js';

const minRise=.72, maxRise=2.1, duration=.88, headroom=1.80;
const footprint=[[0,0],[-.28,0],[.28,0],[0,-.28],[0,.28],[-.20,-.20],[-.20,.20],[.20,-.20],[.20,.20]];
const smooth=t=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;

function clear(x,y,z,hp,world) {
  if(blocked(x,y,z,hp,world?.doors) || solidTopAt(x,z,hp,.32,y+headroom,world?.doors)>y+.001) return false;
  const vehicle=vehicleContact(x,y,z,world,CITY,headroom);
  return vehicle.depth<.00001 && vehicle.floor<=y+.01 && vehicle.ceiling>=y;
}

function landingFits(x,y,z,hp,world) {
  if(!insideTravelArea(x,z,.32)) return false;
  return clear(x,y,z,hp,world) && footprint.every(([dx,dz])=>
    Math.abs(solidTopAt(x+dx,z+dz,hp,0,y+.03,world?.doors)-y)<.14);
}

function path(c,t) {
  const reach=smooth(t/.29), lift=smooth((t-.36)/.40), over=smooth((t-.76)/.24);
  const hangY=Math.max(c.sy+.04,c.top-1.64);
  return {x:mix(mix(c.sx,c.hx,reach),c.tx,over),z:mix(mix(c.sz,c.hz,reach),c.tz,over),
    y:mix(mix(c.sy,hangY,reach),c.top,lift)};
}

export function findLedge(state,input,hp,world) {
  if(!input.jump || !state.grounded || state.parachute || state.swimming || state.fall || state.dead ||
    (state.stance && state.stance!=='stand' && state.stance!=='standing') || input.interact || input.seat) return null;
  const {x,y,z}=state, moving=Math.hypot(input.x||0,input.z||0)>.15;
  const yaw=moving?Math.atan2(input.x,-input.z):(input.yaw??0);
  const dx=Math.sin(yaw), dz=-Math.cos(yaw);
  let hx=x,hz=z;
  for(let distance=.05;distance<=.82;distance+=.05){
    const ex=x+dx*distance,ez=z+dz*distance,top=solidTopAt(ex,ez,hp,0,y+maxRise,world?.doors);
    if(top-y<minRise){
      if(clear(ex,y,ez,hp,world)){hx=ex;hz=ez;}
      continue;
    }
    if(top-y>maxRise || Math.hypot(ex-hx,ez-hz)>.60) return null;
    let inset=.34;
    // A diagonal approach to a rounded corner needs a little more depth for both feet.
    while(inset<=.61 && !landingFits(ex+dx*inset,top,ez+dz*inset,hp,world)) inset+=.06;
    if(inset>.61) return null;
    const tx=ex+dx*inset,tz=ez+dz*inset;
    const climb={sx:x,sy:y,sz:z,hx,hz,tx,tz,top,yaw,t:0};
    // Sweep the standing capsule through the jump and transfer before accepting a grab.
    for(let i=1;i<=20;i++){
      const p=path(climb,i/20);
      if(!clear(p.x,p.y,p.z,hp,world)) return null;
    }
    return climb;
  }
  return null;
}

export function stepClimb(state,c,dt,hp,world) {
  const t=Math.min(1,c.t+dt/duration),p=path(c,t);
  if(!landingFits(c.tx,c.top,c.tz,hp,world) || !clear(p.x,p.y,p.z,hp,world)){
    // A destroyed stack or moving vehicle can invalidate the landing mid-pull.
    return {x:state.x,y:state.y,z:state.z,vx:0,vy:0,vz:0,grounded:false};
  }
  const next={...p,vx:0,vy:0,vz:0,grounded:t===1};
  if(t<1) next.climb={...c,t};
  return next;
}
