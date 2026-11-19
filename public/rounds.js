import {wheelStations} from './road-wheel-layout.js';
import { avenues, streets, parapetTop } from './brickell-map.js';
import { CITY, MAP, BREAKABLES, podiumTop, groundHeight, terrainHeight } from './world.js';
export const firearmSpecs={
  1:{name:'Field carbine',speed:56,range:144,damage:25,cooldown:6,propDamage:1},
  2:{name:'Patrol sidearm',speed:39,range:84,damage:40,cooldown:21,propDamage:2},
  3:{name:'Meridian scoped rifle',speed:90,range:204,damage:80,headshotDamage:150,vehicleDamage:45,cooldown:33,propDamage:2},
  turret:{name:'Vehicle turret',speed:62,range:160,damage:34,cooldown:7.5,propDamage:34},
};

// Swept segments use a 0..1 fraction; this includes contacts between ticks.
function slab(o,d,lo,hi,span){
  if(Math.abs(d)<1e-10)return o>=lo && o<=hi;
  const a=(lo-o)/d,b=(hi-o)/d;
  span[0]=Math.max(span[0],Math.min(a,b));span[1]=Math.min(span[1],Math.max(a,b));
  return span[0]<=span[1];
}
function box(a,d,c,w,h,l,yaw=0){
  const cs=Math.cos(yaw),sn=Math.sin(yaw),x=a.x-c.x,z=a.z-c.z,span=[0,1];
  return slab(x*cs+z*sn,d.x*cs+d.z*sn,-w/2,w/2,span) &&
    slab(a.y-c.y,d.y,0,h,span) && slab(-x*sn+z*cs,-d.x*sn+d.z*cs,-l/2,l/2,span)?span[0]:Infinity;
}
function column(a,d,c,r,h){
  const x=a.x-c.x,z=a.z-c.z,aa=d.x*d.x+d.z*d.z,bb=x*d.x+z*d.z,cc=x*x+z*z-r*r,span=[0,1];
  if(aa<1e-10){if(cc>0)return Infinity;}else{
    const disc=bb*bb-aa*cc;if(disc<0)return Infinity;
    const root=Math.sqrt(disc);span[0]=Math.max(0,(-bb-root)/aa);span[1]=Math.min(1,(-bb+root)/aa);
  }
  return span[0]<=span[1] && slab(a.y-c.y,d.y,0,h,span)?span[0]:Infinity;
}
const roverBody=[[0,.56,0,1.48,.48,3.12],[0,1.04,-.10,1.35,.55,1.08],
    [0,.31,0,1.10,.26,2.50],[0,.46,-1.48,1.54,.16,.14],[0,.46,1.49,1.54,.16,.14]];

// Resolve the closest game collider before deciding if the impact belongs
// to the wheel or the body. Axle-space coordinates rotate with either rover.
export function roverRoundContact(rover,start,delta){
  if(!rover || rover.wrecked)return null;
  const c=Math.cos(rover.yaw),s=Math.sin(rover.yaw),x=start.x-rover.x,z=start.z-rover.z;
  const point={x:x*c+z*s,y:start.y-rover.y,z:-x*s+z*c};
  const step={x:delta.x*c+delta.z*s,y:delta.y,z:-delta.x*s+delta.z*c};
  if(box(point,step,{x:0,y:-.34,z:0},1.84,2.34,3.56)===Infinity)return null;
  // Sheet metal above the axles, narrower underbody, and the end bumpers.
  // Their overlaps leave the four visually exposed wheel wells selectable.
  let t=Infinity,wheel=null;
  for(const [x,y,z,w,h,d] of roverBody)t=Math.min(t,box(point,step,{x,y,z},w,h,d));
  const across={x:point.y,y:point.x,z:point.z}, travel={x:step.y,y:step.x,z:step.z};
  for(let i=0;i<wheelStations.length;i++){
    const [side,length]=wheelStations[i],height=.368+(rover.suspension?.wheels[i] ?? 0);
    const value=column(across,travel,{x:height,y:side-.14,z:length},.36,.28);
    if(value<t){t=value;wheel=i;}
  }
  return t===Infinity ? null : {t,wheel};
}
const trunks=[...MAP.trees,...MAP.rocks].map(p=>({...p,y:groundHeight(p.x,p.z)}));
const crates=BREAKABLES.map(p=>({...p,y:groundHeight(p.x,p.z)}));
const barriers=(MAP.barriers??[]).map(p=>({...p,y:terrainHeight(p.x,p.z)+(p.bottom??0),h:p.h-(p.bottom??0)}));
// Match the signal pole, overhead arm and housing drawn at each intersection.
const furniture=CITY?avenues.flatMap(x=>streets.flatMap(z=>[
  {x:x-6.2,y:.75,z:z-5.8,w:.16,h:4.5,d:.16},
  {x:x-2.2,y:5.03,z:z-5.8,w:8,h:.12,d:.12},
  {x:x+1.5,y:4.265,z:z-5.8,w:.34,h:.87,d:.32},
])):[];
export function segmentContact(world,round,d,actors,previous,actorIntersection){
  let t=Infinity,target=null,hitKind=null,headshot=false,hitPart=null,visualT=Infinity,wheel=null;
  function accept(value,obj,kind,head=false,part=null,visual=value,wheelIndex=null){
    if(value>=0 && value<=1 && value<t){t=value;target=obj;hitKind=kind;headshot=head;hitPart=part;visualT=visual;wheel=wheelIndex;}
  }
  for(const p of trunks)accept(column(round,d,p,p.radius,p.height),null,'scenery');
  for(const p of furniture)accept(box(round,d,p,p.w,p.h,p.d),null,'scenery');
  for(const p of barriers)if(!p.netting && !(p.net!=null && world.doors?.nets?.[p.net]))accept(box(round,d,p,p.w,p.h,p.d),null,'scenery');
  for(const b of MAP.buildings){
    const height=b.eave+b.rise;
    const base={x:b.x,y:b.base-2,z:b.z},span=[0,1];
    if(!slab(round.x-base.x,d.x,-b.w/2,b.w/2,span)||!slab(round.z-base.z,d.z,-b.d/2,b.d/2,span))continue;
    if(!slab(round.y-base.y,d.y,0,height+2,span))continue;
    // Traverse ground-floor rooms using the same furnishings and glass as movement.
    if(CITY && round.y+Math.min(0,d.y)<4.74){
      const length=Math.hypot(d.x,d.y,d.z)*(span[1]-span[0]);
      const steps=Math.max(1,Math.ceil(length/.045));
      for(let i=0;i<=steps;i++){
        const f=span[0]+(span[1]-span[0])*i/steps;
        const x=round.x+f*d.x,y=round.y+f*d.y,z=round.z+f*d.z;
        if(y<=podiumTop(b,x,z,0,y,b.base+height,world.doors)){
          accept(f,null,'scenery');break;
        }
      }
      continue;
    }
    // Clip both pitched roof planes. Flat city roofs have zero rise.
    const slope=2*b.rise/b.d;
    if(slab(round.y+slope*(round.z-b.z),d.y+slope*d.z,-Infinity,b.base+height,span) &&
       slab(round.y-slope*(round.z-b.z),d.y-slope*d.z,-Infinity,b.base+height,span))accept(span[0],null,'scenery');
  }
  if(MAP.bridge){
    const b=MAP.bridge;
    for(const s of [-1,1])for(const height of [.39,.90])
      accept(box(round,d,{x:b.x+s*b.width/2,y:b.y+height-.065,z:b.z},.15,.13,b.length),null,'scenery');
  }
  for(const c of crates)if(world.hp[c.id]>0)accept(column(round,d,c,c.radius,c.height),c,'crystal');
  if(round.source!=='rover'){
    const hit=roverRoundContact(world.rover,round,d);
    if(hit)accept(hit.t,world.rover,'rover',false,null,hit.t,hit.wheel);
  }
  const heli=world.heli;
  if(heli && !heli.wrecked && round.source!=='heli')accept(box(round,d,heli,1.85,2.15,3.38,heli.yaw),heli,'heli');
  for(const b of world.boats??[]) {
    if(!b.wrecked && b.id!==round.source)accept(box(round,d,{...b,y:b.y-.5},2.08,1.55,5.30,b.yaw),b,b.id);
  }
  for(const actor of actors){
    const now=actor.state, prev=previous.get(actor)??now;
    // Respawns are discontinuities; ordinary movers sweep relative to the bullet.
    const start=Math.hypot(now.x-prev.x,now.y-prev.y,now.z-prev.z)<2.5?prev:now;
    const rel={x:d.x-(now.x-start.x),y:d.y-(now.y-start.y),z:d.z-(now.z-start.z)};
    const hit=actorIntersection({...actor,state:{...start,stance:now.stance}},round,rel);
    accept(hit.distance,actor,typeof actor.id==='number'?'player':'npc',hit.headshot,hit.hitPart,hit.visualT);
  }
  const above=f=>{
    const x=round.x+f*d.x,y=round.y+f*d.y,z=round.z+f*d.z;
    return y-Math.max(MAP.waterY,groundHeight(x,z,y),CITY ? parapetTop(x,z,0,y) : -Infinity);
  };
  const steps=Math.max(1,Math.ceil(Math.hypot(d.x,d.z)/.12));
  for(let i=0;i<=steps;i++){
    const u=i/steps;if(u-1/steps>=t)break;
    if(above(u)>0)continue;
    let lo=Math.max(0,(i-1)/steps),hi=u;
    for(let k=0;k<6;k++){const m=(lo+hi)/2;if(above(m)>0)lo=m;else hi=m;}
    accept(hi,null,'scenery');break;
  }
  return {t,target,hitKind,headshot,hitPart,visualT,wheel};
}
