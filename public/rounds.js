import {lotHeight,lotWidth} from './island-rules.js';
import {estateSolids} from './estate-damage.js';
import {towerGlassIndex,visitTowerGlass} from './tower-glass.js';
import {cabinPieces} from './solana-interior.js';
import {yachtSolidAt,yachtLocal} from './yacht-layout.js';
import {supercarLayout} from './supercar-layout.js';
import {paneCenter,visitRoundGlass} from './frontage-glass.js';
import {postDown,damagePost} from './street-lamps.js';
import {wheelsFor} from './road-wheel-layout.js';
import {harborSigns,beachSigns,signalPost,trailMarkers} from './scenery-layout.js';
import {lanternSigns} from './lantern-point.js';
import { avenues, streets, parapetTop } from './brickell-map.js';
import { CITY, MAP, BREAKABLES, podiumTop, groundHeight, terrainHeight } from './world.js';
export const firearmSpecs={
  1:{name:'Field carbine',speed:56,range:144,damage:25,cooldown:6,propDamage:1},
  2:{name:'Patrol sidearm',speed:39,range:84,damage:40,cooldown:21,propDamage:2},
  3:{name:'Meridian scoped rifle',speed:90,range:204,damage:80,headshotDamage:150,vehicleDamage:45,cooldown:33,propDamage:2},
  yachtGun:{name:'Solana bow gun',speed:76,range:160,damage:100,cooldown:3,propDamage:100},
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
function glassContact(from,delta,pane,doors){
  const acrossX=pane.widthAxis==='x', thickness=.024;
  return box(from,delta,{x:pane.x,y:pane.bottom,z:paneCenter(pane,doors)},
    acrossX?pane.width:thickness,pane.top-pane.bottom,acrossX?thickness:pane.width);
}

// The chase camera's stepped depth probe can skip a thin leaf at a shallow
// angle. Use the same swept pane geometry as rounds within the visible span.
export function firstPaneHit(world,from,delta){
  let t=Infinity,target=null;
  const consider=(hit,pane)=>{if(hit<t){t=hit;target=pane;}};
  if(CITY)for(const b of MAP.buildings){
    const entry=box(from,delta,{x:b.x,y:.82,z:b.z},b.w,3.8,b.d);
    if(entry===Infinity || entry>t)continue;
    visitRoundGlass(b,world.doors,pane=>consider(glassContact(from,delta,pane,world.doors),pane));
  }
  for(const p of world.doors?.estateBreaches?.length ? roundBarriers(world.doors) : staticPanes){
    if(!p.paneId)continue;
    if(world.doors?.brokenPanes?.[p.paneId] || Math.abs(p.z-from.z)>Math.abs(delta.z)+p.d/2 || Math.abs(p.x-from.x)>Math.abs(delta.x)+p.w/2)continue;
    consider(box(from,delta,p,p.w,p.h,p.d),{id:p.paneId,x:p.x,z:p.z,bottom:p.y,top:p.y+p.h});
  }
  visitTowerGlass(towerGlass,from,delta,world.doors?.brokenPanes,box,consider);
  return {t,target};
}
export function aimGlassPoint(world,from,direction,range){
  if(range<=0)return null;
  const delta={x:direction.x*range,y:direction.y*range,z:direction.z*range};
  const {t}=firstPaneHit(world,from,delta);
  return t===Infinity?null:{x:from.x+t*delta.x,y:from.y+t*delta.y,z:from.z+t*delta.z};
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

// Split the GT body at its wheel wells so tire sidewalls are exposed.
const sportBody=[
  [0,.08,0,1.38,.52,4.55],[0,.67,0,2.00,.09,4.18],
  [0,.22,0,2.01,.45,2.19],[0,.19,-2.04,1.89,.40,.38],
  [0,.19,2.04,1.89,.40,.38],[0,.73,0,1.43,.50,1.83],
];

// Resolve the closest game collider before deciding if the impact belongs
// to the wheel or the body. Axle-space coordinates rotate with either rover.
export function roverRoundContact(rover,start,delta){
  if(!rover || rover.wrecked)return null;
  const c=Math.cos(rover.yaw),s=Math.sin(rover.yaw),x=start.x-rover.x,z=start.z-rover.z;
  const point={x:x*c+z*s,y:start.y-rover.y,z:-x*s+z*c};
  const step={x:delta.x*c+delta.z*s,y:delta.y,z:-delta.x*s+delta.z*c};
  const sport=rover.kind==='supercar', wheelStations=wheelsFor(rover);
  if(box(point,step,{x:0,y:-.34,z:0},sport?2.18:1.84,2.34,sport?4.68:3.56)===Infinity)return null;
  // Sheet metal above the axles, narrower underbody, and the end bumpers.
  // Their overlaps leave the four visually exposed wheel wells selectable.
  let t=Infinity,wheel=null;
  for(const [x,y,z,w,h,d] of (sport?sportBody:roverBody))t=Math.min(t,box(point,step,{x,y,z},w,h,d));
  const across={x:point.y,y:point.x,z:point.z}, travel={x:step.y,y:step.x,z:step.z};
  for(let i=0;i<wheelStations.length;i++){
    const [side,length]=wheelStations[i],height=(sport?supercarLayout.tire:.368)+(rover.suspension?.wheels[i] ?? 0);
    const value=column(across,travel,{x:height,y:side-(sport?.128:.14),z:length},sport?supercarLayout.tire:.36,sport?.256:.28);
    if(value<t){t=value;wheel=i;}
  }
  return t===Infinity ? null : {t,wheel};
}
export function supercarRoundContact(car,from,delta){
  return roverRoundContact(car,from,delta)?.t??Infinity;
}
const towerGlass=CITY?towerGlassIndex(MAP.buildings):[];
const cabinPanes=cabinPieces.filter(p=>p.paneId);
const trunks=[...MAP.trees,...MAP.rocks].map(p=>({...p,y:groundHeight(p.x,p.z)}));
const crates=BREAKABLES.map(p=>({...p,y:groundHeight(p.x,p.z)}));
const roundSolids=parts=>parts.map(p=>({...p,y:terrainHeight(p.x,p.z)+(p.bottom??0),h:p.h-(p.bottom??0)}));
// The board, lights and brackets all share the HP of their supporting posts.
const barriers=roundSolids(MAP.barriers);
const roundCache=new WeakMap();
function roundBarriers(doors){
  if(!doors?.estateBreaches?.length)return barriers;
  const parts=estateSolids(MAP.barriers,doors);
  if(!roundCache.has(parts))roundCache.set(parts,roundSolids(parts));
  return roundCache.get(parts);
}
const staticPanes=barriers.filter(p=>p.paneId);
const postParts=barriers.filter(p=>p.postId!=null || p.lamp!=null);
const panel=(postId,x,y,z,w,h,d,yaw=0,woodId)=>({postId,x,y,z,w,h,d,yaw,woodId});
if(CITY){
  for(const p of postParts.filter(p=>p.lamp!=null))
    postParts.push({...p,x:p.x-p.side*.60,y:p.y+4.22,w:.81,h:.23,d:.31});
  for(const x of avenues)for(const z of streets){
    const {postId}=signalPost(x,z);
    postParts.push(panel(postId,x-2.2,5.03,z-5.8,8,.12,.12),panel(postId,x+1.5,4.265,z-5.8,.34,.87,.32));
  }
  harborSigns.forEach(([x,z],i)=>postParts.push(panel('harbor-'+i,x,3.18,z,3.82,.88,.14)));
  beachSigns.forEach(([x,z,yaw],i)=>postParts.push(panel('beach-'+i,x,2.665,z,4.64,.95,.14,yaw,'sign-'+i)));
  lanternSigns.forEach(({x,z},i)=>postParts.push(panel('lantern-sign-'+i,x,2.935,z,4.53,1.25,.14)));
}else{
  for(const p of trailMarkers)postParts.push(panel(p.postId,p.x,terrainHeight(p.x,p.z)+1.395,p.z,1.13,.31,.2,p.heading));
}
export function postContact(world,from,d){
  let t=Infinity,target=null;
  for(const p of postParts){
    if(postDown(world.doors,p) || world.doors?.beachWood?.[p.woodId])continue;
    const hit=box(from,d,p,p.w,p.h,p.d,p.yaw);
    if(hit<t){t=hit;target=p;}
  }
  return {t,target};
}
export function blastPosts(world,center,radius,damage,team){
  const hit=new Set();
  for(const p of postParts){
    const id=p.postId??p.lamp;
    if(hit.has(id) || postDown(world.doors,p))continue;
    const dy=Math.max(0,p.y-center.y,center.y-p.y-p.h);
    if(Math.hypot(center.x-p.x,dy,center.z-p.z)>radius)continue;
    damagePost(world.doors,p,damage);hit.add(id);
    if(postDown(world.doors,p))world.rules?.brokenPost(team,p);
  }
}
export function segmentContact(world,round,d,actors,previous,actorIntersection){
  let t=Infinity,target=null,hitKind=null,headshot=false,hitPart=null,visualT=Infinity,wheel=null;
  function accept(value,obj,kind,head=false,part=null,visual=value,wheelIndex=null){
    if(value>=0 && value<=1 && value<t){t=value;target=obj;hitKind=kind;headshot=head;hitPart=part;visualT=visual;wheel=wheelIndex;}
  }
  for(const lot of world.match?.lots??[]){
    if(lot.hp && lot.carrier==null)accept(box(round,d,lot,lotWidth,lotHeight,lotWidth),lot,'insured');
  }
  visitTowerGlass(towerGlass,round,d,world.doors?.brokenPanes,box,(hit,p)=>accept(hit,p,'glass'));
  for(const p of trunks)accept(column(round,d,p,p.radius,p.height),null,'scenery');
  const post=postContact(world,round,d);
  if(post.target)accept(post.t,post.target,post.target.lamp!=null?'lamp':'post');
  for(const p of roundBarriers(world.doors)){
    if(p.postId!=null || p.lamp!=null || world.doors?.beachWood?.[p.woodId] || p.netting || (p.net!=null && world.doors?.nets?.[p.net]))continue;
    if(world.doors?.brokenSills?.[p.sillPaneId])continue;
    if(p.paneId){
      if(!world.doors?.brokenPanes?.[p.paneId])accept(box(round,d,p,p.w,p.h,p.d),{id:p.paneId,x:p.x,z:p.z,bottom:p.y,top:p.y+p.h},'glass');
    }else accept(box(round,d,p,p.w,p.h,p.d),null,'scenery');
  }
  for(const b of MAP.buildings){
    const height=b.eave+b.rise;
    const base={x:b.x,y:b.base-2,z:b.z},span=[0,1];
    if(!slab(round.x-base.x,d.x,-b.w/2,b.w/2,span)||!slab(round.z-base.z,d.z,-b.d/2,b.d/2,span))continue;
    if(!slab(round.y-base.y,d.y,0,height+2,span))continue;
    // Traverse ground-floor rooms using the same furnishings and glass as movement.
    if(CITY && round.y+Math.min(0,d.y)<4.74){
      visitRoundGlass(b,world.doors,pane=>accept(glassContact(round,d,pane,world.doors),pane,'glass'));
      const length=Math.hypot(d.x,d.y,d.z)*(span[1]-span[0]);
      const steps=Math.max(1,Math.ceil(length/.045));
      for(let i=0;i<=steps;i++){
        const f=span[0]+(span[1]-span[0])*i/steps;
        const x=round.x+f*d.x,y=round.y+f*d.y,z=round.z+f*d.z;
        if(y<=podiumTop(b,x,z,0,y,b.base+height,world.doors,true)){
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
  const sportHit=roverRoundContact(world.supercar,round,d);
  if(sportHit)accept(sportHit.t,world.supercar,'supercar',false,null,sportHit.t,sportHit.wheel);
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
  // Sample the stepped stern, side decks and tapered hull at the same spatial
  // interval as terrain. The shooter's muzzle stays above their own deck.
  if(world.yacht && !world.yacht.wrecked && Math.hypot(round.x-world.yacht.x,round.z-world.yacht.z)<24+Math.hypot(d.x,d.z)){
    const yacht=world.yacht,origin=yachtLocal(yacht,round.x,round.z);
    const end=yachtLocal(yacht,round.x+d.x,round.z+d.z),delta={x:end.x-origin.x,y:d.y,z:end.z-origin.z};
    for(const p of cabinPanes){
      if(yacht.brokenGlass?.[p.paneId])continue;
      const hit=box({...origin,y:round.y-yacht.y},delta,{...p,y:p.y-p.h/2},p.w,p.h,p.d);
      accept(hit,{vehicle:yacht,paneId:p.paneId},'vehicleGlass');
    }
    const count=Math.max(1,Math.ceil(Math.hypot(d.x,d.y,d.z)/.12));
    const inside=f=>{
      const y=round.y+d.y*f;
      return yachtSolidAt(world.yacht,round.x+d.x*f,y,round.z+d.z*f);
    };
    for(let i=0;i<=count && (i-1)/count<t;i++)if(inside(i/count)){
      let lo=Math.max(0,(i-1)/count),hi=i/count;
      for(let j=0;j<6;j++){const mid=(lo+hi)/2;if(inside(mid))hi=mid;else lo=mid;}
      accept(hi,world.yacht,world.yacht.id);break;
    }
  }
  const above=f=>{
    const x=round.x+f*d.x,y=round.y+f*d.y,z=round.z+f*d.z;
    return y-Math.max(MAP.waterY,groundHeight(x,z,y,world.doors),CITY ? parapetTop(x,z,0,y,world.doors) : -Infinity);
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
