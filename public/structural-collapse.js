import {housePieces} from './residential-falls.js';
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
  const direction=event.direction,dirLength=direction && Math.hypot(direction.x,direction.z);
  const ux=dirLength?direction.x/dirLength:0,uz=dirLength?direction.z/dirLength:0;
  let seed=123,end=0;
  for(const c of event.key)seed=(Math.imul(seed,31)+c.charCodeAt(0))>>>0;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  function piece(x,z,low,h,w,d,ground,delay,type,color,pitch=0){
    if(h<.05 || w<.12 || d<.12)return;
    const drop=Math.max(.08,low-ground),duration=Math.sqrt(2*drop/gravity);
    const drift=dirLength?Math.min(event.tower!=null?9.5:3.25,.65+(low+h*.5-ground)*.23):0;
    const dx=(rand()-.5)*.45+ux*drift,dz=(rand()-.5)*.45+uz*drift;
    const wallLean=event.home && type!=='house-roof' ? .78 : .20;
    const tilt=dirLength ? wallLean+Math.min(.29,drop*.012):0;
    const yaw=(rand()-.5)*.10;
    const land=delay+duration;
    end=Math.max(end,land);
    pieces.push({x,z,low,w,h,d,drop,delay,duration,land,dx,dz,yaw,tilt,ux,uz,ground,type,color,pitch});
  }
  if(event.home){housePieces(event,piece);}
  else if(event.tower!=null){
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
      const side=ux*(x-b.x)/b.w+uz*(z-b.z)/b.d;
      const delay=.31+.033*row+(dirLength?.23*(.72-side):.04*(col%4))+.06*rand();
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
  let west=Infinity,east=-Infinity,north=Infinity,south=-Infinity;
  for(const p of pieces){
    const radius=.5*Math.hypot(p.w,p.d,p.h)+.32;
    p.west=Math.min(p.x,p.x+p.dx)-radius;p.east=Math.max(p.x,p.x+p.dx)+radius;
    p.north=Math.min(p.z,p.z+p.dz)-radius;p.south=Math.max(p.z,p.z+p.dz)+radius;
    west=Math.min(west,p.west);east=Math.max(east,p.east);north=Math.min(north,p.north);south=Math.max(south,p.south);
  }
  return {pieces,end:end+1.2,west,east,north,south};
}

// The intact moving volume remains hazardous until its first impact. Its
// fragments settle and shrink over the following half-second into the rubble.
export function piecePose(p,time,out){
  const t=clamp((time-p.delay)/p.duration,0,1),q=t*t;
  const settled=clamp((time-p.land)/.56,0,1),remain=1-settled;
  // Rotate each section about a horizontal axis aligned across the fall.
  // The three basis columns below are used verbatim for display and contact.
  const tilt=p.tilt*(t*t*(3-2*t)),sn=Math.sin(tilt),cs=Math.cos(tilt),dx=p.ux,dz=p.uz;
  out.yaw=p.yaw*t;
  const c=Math.cos(out.yaw),s=Math.sin(out.yaw);
  const alongX=dx*c+dz*s,alongZ=-dx*s+dz*c;
  out.xx=c+dx*(cs-1)*alongX;out.xy=-sn*alongX;out.xz=s+dz*(cs-1)*alongX;
  out.yx=dx*sn;out.yy=cs;out.yz=dz*sn;
  out.zx=-s+dx*(cs-1)*alongZ;out.zy=-sn*alongZ;out.zz=c+dz*(cs-1)*alongZ;
  if(p.pitch){
    const a=Math.cos(p.pitch),b=Math.sin(p.pitch),x=out.yx,y=out.yy,z=out.yz;
    out.yx=a*x+b*out.zx;out.yy=a*y+b*out.zy;out.yz=a*z+b*out.zz;
    out.zx=a*out.zx-b*x;out.zy=a*out.zy-b*y;out.zz=a*out.zz-b*z;
  }
  out.x=p.x+p.dx*q;out.z=p.z+p.dz*q;
  out.w=p.w*remain;out.d=p.d*remain;out.h=p.h*remain;
  const extent=.5*(Math.abs(out.xy)*out.w+out.yy*out.h+Math.abs(out.zy)*out.d);
  out.y=Math.max(p.ground+extent,p.low-p.drop*q+out.h/2)+Math.sin(settled*Math.PI)*remain*.08;
  out.low=out.y-extent;out.top=out.y+extent;
  return out;
}
// Intersect the player's upright capsule with the oriented box. In local
// coordinates the distance to an AABB is piecewise quadratic along the body.
function touches(q,feet,height,radius){
  const dx=feet.x-q.x,dy=feet.y-q.y,dz=feet.z-q.z;
  const axis=[
    [dx*q.xx+dy*q.xy+dz*q.xz,q.xy,q.w/2],
    [dx*q.yx+dy*q.yy+dz*q.yz,q.yy,q.h/2],
    [dx*q.zx+dy*q.zy+dz*q.zz,q.zy,q.d/2],
  ];
  const bottom=Math.min(height*.5,radius),top=height-bottom;
  let lo=bottom,hi=top;
  for(const [v,k,half] of axis){
    if(Math.abs(k)<1e-8){
      if(Math.abs(v)>half+radius)return false;
    }else{
      const a=(-half-radius-v)/k,b=(half+radius-v)/k;
      lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));
      if(lo>hi)return false;
    }
  }
  for(let n=0;n<12;n++){
    const y=(lo+hi)/2;
    let distance=0,deriv=0;
    for(const [v,k,h] of axis){
      const at=v+k*y,gap=at-clamp(at,-h,h);
      distance+=gap*gap;deriv+=gap*k;
    }
    if(distance<=radius*radius)return true;
    if(deriv>0)hi=y;else lo=y;
  }
  return false;
}
const plans=new WeakMap(),pose={};
export function stepStructuralFalls(doors,buildings,players,tick,damage,bodyHeight,tankDriver){
  const falls=doors?.structureFalls;
  if(!falls?.length)return;
  for(let i=falls.length-1;i>=0;i--){
    const event=falls[i];
    let plan=plans.get(event);
    if(!plan){plan=collapsePlan(event,buildings);plan.hit=new WeakSet();plans.set(event,plan);}
    const before=event.age/30,time=++event.age/30;
    if(time>=plan.end){falls.splice(i,1);continue;}
    for(const actor of players.values()){
      if((event.home && tankDriver!=null && actor.id===tankDriver) || !actor.life.hp || actor.life.immuneUntil>tick || plan.hit.has(actor))continue;
      const state=actor.state,radius=.29;
      if(state.x<plan.west || state.x>plan.east || state.z<plan.north || state.z>plan.south)continue;
      const height=bodyHeight(state.stance);
      for(const p of plan.pieces){
        if(time<=p.delay || before>=p.land || state.x<p.west || state.x>p.east || state.z<p.north || state.z>p.south)continue;
        const start=Math.max(before,p.delay),end=Math.min(time,p.land);
        const maxTravel=(2*Math.hypot(p.dx,p.dz,p.drop)+p.tilt*Math.hypot(p.w,p.h,p.d))/p.duration;
        const samples=Math.max(1,Math.ceil((end-start)*maxTravel/.16));
        let hit=false;
        for(let n=0;n<=samples;n++){
          piecePose(p,start+(end-start)*n/samples,pose);
          if(state.y+height<pose.low || state.y>pose.top)continue;
          if(touches(pose,state,height,radius)){hit=true;break;}
        }
        if(!hit)continue;
        if(damage(actor,actor.life.hp,tick))plan.hit.add(actor);
        break;
      }
    }
  }
  if(!falls.length)delete doors.structureFalls;
}
