// Every falling slab and facade panel uses the same deterministic trajectory
// in the renderer and server. Only the event, missing bays and age are sent.
import {bandHeight,baysPerFloor,towerStride,towerCellBounds} from './tower-damage.js';
import {casaSlabs} from './casa-luma.js';
import {mareLoggiaRoof,mareParts} from './palazzo-mare.js';

const estateSlabs=[casaSlabs,[...mareParts.filter(p=>p.kind==='slab'),mareLoggiaRoof]];
const gravity=15;
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));

export function collapsePlan(event,buildings){
  const pieces=[];
  let seed=123,end=0;
  for(const c of event.key)seed=(Math.imul(seed,31)+c.charCodeAt(0))>>>0;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function piece(x,z,low,h,w,d,ground,delay,type){
    if(h<.05 || w<.12 || d<.12)return;
    const drop=Math.max(.08,low-ground),duration=Math.sqrt(2*drop/gravity);
    const dx=(rand()-.5)*.45,dz=(rand()-.5)*.45;
    const yaw=(rand()-.5)*.10;
    const land=delay+duration;
    end=Math.max(end,land);
    pieces.push({x,z,low,w,h,d,drop,delay,duration,land,dx,dz,yaw,type});
  }
  if(event.tower!=null){
    const b=buildings.find(b=>b.towerId===event.tower);
    if(!b)return {pieces,end:0};
    const missing=new Set(event.missing);
    const floors=Math.ceil(b.eave/bandHeight);
    const ground=b.base;
    for(let row=0;row<floors;row++)for(let col=0;col<baysPerFloor;col++){
      const id=b.towerId*towerStride+row*baysPerFloor+col;
      if(missing.has(id))continue;
      const r=towerCellBounds(b,id),west=Math.max(b.x-b.w/2,r.x0),east=Math.min(b.x+b.w/2,r.x1);
      const north=Math.max(b.z-b.d/2,r.z0),south=Math.min(b.z+b.d/2,r.z1);
      const w=east-west,d=south-north,x=(west+east)/2,z=(north+south)/2;
      const top=Math.min(b.base+b.eave,r.y1),wallH=top-r.y0-.21;
      const delay=.28+.035*row+.04*(col%4)+.07*rand();
      piece(x,z,top-.20,.23,w-.025,d-.025,ground,delay,'slab');
      // Window panels stay attached for the first beat, then drop with their bay.
      if(wallH>.15){
        if(col%4===0 || col%4===3)piece(col%4===0?west:east,z,r.y0+.04,wallH,.13,d-.05,ground,delay+.07,'glass');
        if(col<4 || col>=12)piece(x,col<4?north:south,r.y0+.04,wallH,w-.05,.13,ground,delay+.07,'glass');
      }
    }
  }else{
    for(const plate of estateSlabs[event.index]){
      const top=.8+plate.h;
      if(top<=event.low+.10 || top>event.high+.01)continue;
      const west=Math.max(event.left,plate.x-plate.w/2),east=Math.min(event.right,plate.x+plate.w/2);
      const north=Math.max(event.north,plate.z-plate.d/2),south=Math.min(event.south,plate.z+plate.d/2);
      if(east-west<.12 || south-north<.12)continue;
      const across=east-west>=south-north,w=east-west,d=south-north;
      for(const side of [-1,1]){
        piece((west+east)/2+(across?side*w/4:0),(north+south)/2+(across?0:side*d/4),
          .8+plate.bottom,plate.h-plate.bottom,across?w/2:w,across?d:d/2,event.low,
          .33+.09*(side+1)+.055*(top-event.low)+rand()*.08,'stone');
      }
    }
  }
  const west=Math.min(...pieces.map(p=>p.x-p.w/2))-1,east=Math.max(...pieces.map(p=>p.x+p.w/2))+1;
  const north=Math.min(...pieces.map(p=>p.z-p.d/2))-1,south=Math.max(...pieces.map(p=>p.z+p.d/2))+1;
  return {pieces,end:end+1.2,west,east,north,south};
}

// The intact moving volume remains hazardous until its first impact. Its
// fragments settle and shrink over the following half-second into the rubble.
export function piecePose(p,time,out){
  const t=clamp((time-p.delay)/p.duration,0,1),q=t*t;
  const settled=clamp((time-p.land)/.56,0,1),remain=1-settled;
  out.x=p.x+p.dx*q;out.z=p.z+p.dz*q;out.yaw=p.yaw*t;
  out.w=p.w*remain;out.d=p.d*remain;out.h=p.h*remain;
  out.low=p.low-p.drop*q+Math.sin(settled*Math.PI)*remain*.08;
  return out;
}
const plans=new WeakMap(),pose={};
export function stepStructuralFalls(doors,buildings,players,tick,damage,bodyHeight){
  const falls=doors?.structureFalls;
  if(!falls?.length)return;
  for(let i=falls.length-1;i>=0;i--){
    const event=falls[i];
    let plan=plans.get(event);
    if(!plan){plan=collapsePlan(event,buildings);plan.hit=new WeakSet();plans.set(event,plan);}
    const before=event.age/30,time=++event.age/30;
    if(time>=plan.end){falls.splice(i,1);continue;}
    for(const actor of players.values()){
      if(!actor.life.hp || actor.life.immuneUntil>tick || plan.hit.has(actor))continue;
      const state=actor.state,radius=.29;
      if(state.x<plan.west || state.x>plan.east || state.z<plan.north || state.z>plan.south)continue;
      const head=state.y+bodyHeight(state.stance);
      for(const p of plan.pieces){
        if(time<=p.delay || before>=p.land || Math.abs(state.x-p.x)>p.w/2+1 || Math.abs(state.z-p.z)>p.d/2+1)continue;
        // Sweep vertically between simulation steps so thin, fast slabs cannot skip a player.
        const oldTop=piecePose(p,before,pose).low+p.h;
        piecePose(p,Math.min(p.land,time),pose);
        if(head<pose.low || state.y>oldTop+.015)continue;
        const dx=state.x-pose.x,dz=state.z-pose.z,c=Math.cos(pose.yaw),s=Math.sin(pose.yaw);
        const gapX=Math.max(0,Math.abs(dx*c+dz*s)-p.w/2);
        const gapZ=Math.max(0,Math.abs(dz*c-dx*s)-p.d/2);
        if(gapX*gapX+gapZ*gapZ>radius*radius)continue;
        if(damage(actor,actor.life.hp,tick))plan.hit.add(actor);
        break;
      }
    }
  }
  if(!falls.length)delete doors.structureFalls;
}
