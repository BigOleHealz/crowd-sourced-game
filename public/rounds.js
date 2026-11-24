import {inTankOpening} from './tank-wall-cuts.js';
import {visitResortSolids} from './grand-resort-layout.js';
import {hasSwimmingWildlife,marineContact} from './marine-contacts.js';
import {roomDoorTop} from './building-interiors.js';
import {ruinedHouseAt} from './residential-sites.js';
import {civilianProfiles} from './civilian-fleet.js';
import {tankHull} from './tank-layout.js';
import {inTowerBreach,towerCollapsed} from './tower-damage.js';
import {lotHeight,lotWidth} from './island-rules.js';
import {estateSolids} from './estate-damage.js';
import {towerGlassIndex,visitTowerGlass} from './tower-glass.js';
import {cabinPieces} from './solana-interior.js';
import {yachtSolidAt,yachtLocal} from './yacht-layout.js';
import {supercarLayout} from './supercar-layout.js';
import {paneCenter,visitRoundGlass} from './frontage-glass.js';
import {postDown,damagePost} from './street-lamps.js';
import {flatWheelDrop,isFlat,wheelsFor} from './road-wheel-layout.js';
import {harborSigns,beachSigns,signalPost,trailMarkers} from './scenery-layout.js';
import {lanternSigns} from './lantern-point.js';
import { avenues, streets, parapetTop } from './brickell-map.js';
import { CITY, MAP, BREAKABLES, podiumTop, groundHeight, terrainHeight } from './world.js';
// World metres per second, shared by the server and client.
const carbineSpeed = 56;
export const firearmSpecs={
  1:{name:'Field carbine',speed:carbineSpeed,range:144,damage:25,cooldown:6,propDamage:1},
  2:{name:'Patrol sidearm',speed:39,range:84,damage:40,cooldown:21,propDamage:2},
  3:{name:'Meridian scoped rifle',speed:2 * carbineSpeed,range:204,damage:80,headshotDamage:150,vehicleDamage:45,cooldown:33,propDamage:2},
  yachtGun:{name:'Solana bow gun',speed:76,range:160,damage:80,cooldown:3,propDamage:80},
  turret:{name:'Vehicle turret',speed:62,range:160,damage:34,cooldown:7.5,propDamage:34},
  pilotGun:{name:'Helicopter forward guns',speed:80,range:160,damage:24,cooldown:2,propDamage:24},
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
export function tankRoundContact(tank,from,delta){
  return tank && !tank.wrecked ? box(from,delta,tank,2*tankHull.halfWidth,tankHull.height,2*tankHull.halfLength,tank.yaw) : Infinity;
}
function glassContact(from,delta,pane,doors){
  const acrossX=pane.widthAxis==='x', thickness=.024;
  return box(from,delta,{x:pane.x,y:pane.bottom,z:paneCenter(pane,doors)},
    acrossX?pane.width:thickness,pane.top-pane.bottom,acrossX?thickness:pane.width);
}

// The chase camera's stepped depth probe can skip a thin leaf at a shallow
// angle. Use the same swept pane geometry as rounds within the visible span.
function visitIntactTowerGlass(world,from,d,accept) {
  visitTowerGlass(towerGlass,from,d,world.doors,box,accept);
}
function visitResortHits(world,from,d,glassOnly,accept){
  if(!CITY)return;
  visitResortSolids(from,d,world.doors?.brokenPanes,p=>{
    if(glassOnly && !p.paneId)return;
    const hit=box(from,d,{x:p.x,y:p.base,z:p.z},p.w,p.h,p.d);
    if(hit===Infinity)return;
    const pane=p.paneId?{id:p.paneId,x:p.x,z:p.z,bottom:p.base,top:p.base+p.h}:null;
    accept(hit,pane,pane?'glass':'scenery');
  });
}
export function firstPaneHit(world,from,delta){
  let t=Infinity,target=null;
  const consider=(hit,pane)=>{if(hit<t && !inTankOpening(world.doors,from.x+hit*delta.x,from.y+hit*delta.y,from.z+hit*delta.z) && !ruinedHouseAt(world.doors,from.x+hit*delta.x,from.z+hit*delta.z) && !inTowerBreach(MAP.buildings,world.doors,from.x+hit*delta.x,from.y+hit*delta.y,from.z+hit*delta.z)){t=hit;target=pane;}};
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
  visitResortHits(world,from,delta,true,consider);
  visitIntactTowerGlass(world,from,delta,consider);
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

// A narrow underbody and split side panels leave the civilian wheel wells open.
// Each box starts at its lower surface. Tire centres match the visual axles.
const trafficBodies=Object.fromEntries(Object.entries(civilianProfiles).map(([model,p])=>{
  const w=p.bodyWidth,l=p.tail-p.nose,center=(p.tail+p.nose)/2,[front,rear]=p.axles,t=p.tire,arch=t+.05;
  if(p.cabin){
    const [cabinFront,cabinRear]=p.cabin,belt=p.belt;
    return [model,[
      [0,.18,center,2*(w-.21),belt-.18,l],
      [0,belt-.10,center,2*w,.10,l],
      [0,.20,(front+rear)/2,2*w,belt-.20,rear-front-2*arch],
      [0,.22,p.nose+.11,2*w-.34,belt-.22,.22],
      [0,.22,p.tail-.11,2*w-.26,belt-.22,.22],
      [0,belt,(cabinFront+cabinRear)/2,w*1.42,p.roof-belt,cabinRear-cabinFront],
    ]];
  }
  return [model,[
    [0,.25,center,2*(w-.23),.55,l],
    [0,2*t+.05,center,2*w,.24,l],
    [0,.28,(front+rear)/2,2*w,.60,rear-front-2*arch],
    [0,.31,p.nose+.10,2*w-.18,.39,.20],
    [0,.31,p.tail-.10,2*w-.18,.39,.20],
    [0,.92,model==='van'?.46:.06,2*w-.23,p.skinHeight-.92,model==='van'?2.85:1.86],
  ]];
}));
// Resolve the closest game collider before deciding if the impact belongs
// to the wheel or the body. Axle-space coordinates rotate with either rover.
export function roverRoundContact(rover,start,delta){
  if(!rover || rover.wrecked)return null;
  const dx=start.x-rover.x,dz=start.z-rover.z;
  if(Math.abs(dx)>3+Math.abs(delta.x) || Math.abs(dz)>3+Math.abs(delta.z))return null;
  const c=Math.cos(rover.yaw),s=Math.sin(rover.yaw);
  const point={x:dx*c+dz*s,y:start.y-rover.y,z:-dx*s+dz*c};
  const step={x:delta.x*c+delta.z*s,y:delta.y,z:-delta.x*s+delta.z*c};
  const sport=rover.kind==='supercar',profile=civilianProfiles[rover.model],wheelStations=wheelsFor(rover);
  const breadth=profile?2*(profile.bodyWidth+.18):sport?2.18:1.84;
  const length=profile?2*Math.max(-profile.nose,profile.tail):sport?4.68:3.56;
  if(box(point,step,{x:0,y:-.34,z:0},breadth,Math.max(2.34,(profile?.skinHeight??0)+.36),length)===Infinity)return null;
  // Sheet metal above the axles, narrower underbody, and the end bumpers.
  // Their overlaps leave the four visually exposed wheel wells selectable.
  let t=Infinity,wheel=null;
  for(const [x,y,z,w,h,d] of (trafficBodies[rover.model]??(sport?sportBody:roverBody)))t=Math.min(t,box(point,step,{x,y,z},w,h,d));
  const across={x:point.y,y:point.x,z:point.z}, travel={x:step.y,y:step.x,z:step.z};
  const radius=profile?.tire??(sport?supercarLayout.tire:.36),halfTread=profile?.halfTread??(sport?.128:.14);
  for(let i=0;i<wheelStations.length;i++){
    const [side,length]=wheelStations[i],drop=isFlat(rover,i)?flatWheelDrop:0;
    const height=(profile || sport ? radius : .368)+(rover.suspension?.wheels[i] ?? -drop);
    const value=column(across,travel,{x:height,y:side-halfTread,z:length},radius,2*halfTread);
    if(value<t){t=value;wheel=i;}
  }
  return t===Infinity ? null : {t,wheel};
}
export function civilianRoundContact(car,start,delta){
  return roverRoundContact(car,start,delta)?.t??Infinity;
}
export function supercarRoundContact(car,from,delta){
  return roverRoundContact(car,from,delta)?.t??Infinity;
}
const towerGlass=CITY?towerGlassIndex(MAP.buildings):[];
const cabinPanes=cabinPieces.filter(p=>p.paneId);
const trunks=[...MAP.trees,...MAP.rocks].map(p=>({...p,y:groundHeight(p.x,p.z)}));
const crates=BREAKABLES.map(p=>({...p,y:groundHeight(p.x,p.z)}));
const cellWidth=8,roundCells=new WeakMap(),emptyCell=[];
const boxExtent=p=>[p.w/2,p.d/2];
const columnExtent=p=>[p.radius,p.radius];
function postExtent(p){
  const c=Math.abs(Math.cos(p.yaw??0)),s=Math.abs(Math.sin(p.yaw??0));
  return [(c*p.w+s*p.d)/2,(s*p.w+c*p.d)/2];
}

// A round travels at most a few metres per tick. Narrow-phase tests only need
// the static geometry in the cells covered by its swept horizontal bounds.
function roundCandidates(parts,from,d,extent){
  const x0=Math.floor(Math.min(from.x,from.x+d.x)/cellWidth),x1=Math.floor(Math.max(from.x,from.x+d.x)/cellWidth);
  const z0=Math.floor(Math.min(from.z,from.z+d.z)/cellWidth),z1=Math.floor(Math.max(from.z,from.z+d.z)/cellWidth);
  if(x1-x0>1 || z1-z0>1) return parts;
  let index=roundCells.get(parts);
  if(!index || index.count!==parts.length || index.last!==parts.at(-1)){
    const cells=new Map(),order=new Map();
    for(const [i,p] of parts.entries()){
      order.set(p,i);
      const [w,l]=extent(p),pad=1e-8;
      const west=Math.floor((p.x-w-pad)/cellWidth),east=Math.floor((p.x+w+pad)/cellWidth);
      const north=Math.floor((p.z-l-pad)/cellWidth),south=Math.floor((p.z+l+pad)/cellWidth);
      for(let x=west;x<=east;x++)for(let z=north;z<=south;z++){
        const key=x+','+z;
        if(!cells.has(key))cells.set(key,[]);
        cells.get(key).push(p);
      }
    }
    index={cells,order,count:parts.length,last:parts.at(-1)};
    roundCells.set(parts,index);
  }
  if(x0===x1 && z0===z1)return index.cells.get(x0+','+z0)??emptyCell;
  const partsInSweep=new Set();
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
    for(const part of index.cells.get(x+','+z)??emptyCell)partsInSweep.add(part);
  }
  // Keeping map order preserves which collider wins when two contacts tie.
  return [...partsInSweep].sort((a,b)=>index.order.get(a)-index.order.get(b));
}
const roundSolids=parts=>parts.filter(p=>!p.resortShell).map(p=>({...p,y:terrainHeight(p.x,p.z)+(p.bottom??0),h:p.h-(p.bottom??0)}));
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
  for(const p of roundCandidates(postParts,from,d,postExtent)){
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
export const roundActorSweep=2.5;
export function segmentContact(world,round,d,actors,previous,actorIntersection){
  let t=Infinity,target=null,hitKind=null,headshot=false,hitPart=null,visualT=Infinity,wheel=null;
  function accept(value,obj,kind,head=false,part=null,visual=value,wheelIndex=null){
    if((kind==='glass' || kind==='scenery') && Number.isFinite(value) &&
      (inTankOpening(world.doors,round.x+d.x*value,round.y+d.y*value,round.z+d.z*value) || ruinedHouseAt(world.doors,round.x+d.x*value,round.z+d.z*value) || inTowerBreach(MAP.buildings,world.doors,round.x+d.x*value,round.y+d.y*value,round.z+d.z*value)))return;
    if(value>=0 && value<=1 && value<t){t=value;target=obj;hitKind=kind;headshot=head;hitPart=part;visualT=visual;wheel=wheelIndex;}
  }
  for(const lot of world.match?.lots??[]){
    if(lot.hp && lot.carrier==null)accept(box(round,d,lot,lotWidth,lotHeight,lotWidth),lot,'insured');
  }
  visitResortHits(world,round,d,false,accept);
  visitIntactTowerGlass(world,round,d,(hit,p)=>accept(hit,p,'glass'));
  for(const p of roundCandidates(trunks,round,d,columnExtent))accept(column(round,d,p,p.radius,p.height),null,'scenery');
  const post=postContact(world,round,d);
  if(post.target)accept(post.t,post.target,post.target.lamp!=null?'lamp':'post');
  for(const p of roundCandidates(roundBarriers(world.doors),round,d,boxExtent)){
    if(p.postId!=null || p.lamp!=null || world.doors?.beachWood?.[p.woodId] || p.netting || (p.net!=null && world.doors?.nets?.[p.net]))continue;
    if(world.doors?.brokenSills?.[p.sillPaneId])continue;
    if(p.paneId){
      if(!world.doors?.brokenPanes?.[p.paneId])accept(box(round,d,p,p.w,p.h,p.d),{id:p.paneId,x:p.x,z:p.z,bottom:p.y,top:p.y+p.h},'glass');
    }else accept(box(round,d,p,p.w,p.h,p.d),p.fireSite || p.woodId ? p : null,'scenery');
  }
  for(const b of roundCandidates(MAP.buildings,round,d,boxExtent)){
    const height=b.eave+b.rise;
    const base={x:b.x,y:b.base-2,z:b.z},span=[0,1];
    if(!slab(round.x-base.x,d.x,-b.w/2,b.w/2,span)||!slab(round.z-base.z,d.z,-b.d/2,b.d/2,span))continue;
    if(!slab(round.y-base.y,d.y,0,height+2,span))continue;
    // Traverse ground-floor rooms using the same furnishings and glass as movement.
    if(!CITY || (b.finish || b.housing || round.y+Math.min(0,d.y)<4.74 || (b.towerId!=null && (world.doors?.towerBreaches?.length || towerCollapsed(b,world.doors))))){
      visitRoundGlass(b,world.doors,pane=>accept(glassContact(round,d,pane,world.doors),pane,'glass'));
      const length=Math.hypot(d.x,d.y,d.z)*(span[1]-span[0]);
      const steps=Math.max(1,Math.ceil(length/.045));
      for(let i=0;i<=steps;i++){
        const f=span[0]+(span[1]-span[0])*i/steps;
        const x=round.x+f*d.x,y=round.y+f*d.y,z=round.z+f*d.z;
        if(y<=roomDoorTop(x,z,0,y,world.doors) || y<=podiumTop(b,x,z,0,y,b.base+height-b.rise*2*Math.abs(z-b.z)/b.d,world.doors,true)){
          accept(f,b.fireHome ? b : null,towerCollapsed(b,world.doors)?'rubble':'scenery');break;
        }
      }
      continue;
    }
    // Clip both pitched roof planes. Flat city roofs have zero rise.
    const slope=2*b.rise/b.d;
    if(slab(round.y+slope*(round.z-b.z),d.y+slope*d.z,-Infinity,b.base+height,span) &&
       slab(round.y-slope*(round.z-b.z),d.y-slope*d.z,-Infinity,b.base+height,span))accept(span[0],b.fireHome ? b : null,'scenery');
  }
  if(MAP.bridge){
    const b=MAP.bridge;
    for(const s of [-1,1])for(const height of [.39,.90])
      accept(box(round,d,{x:b.x+s*b.width/2,y:b.y+height-.065,z:b.z},.15,.13,b.length),null,'scenery');
  }
  for(const c of crates)if(world.hp[c.id]>0)accept(column(round,d,c,c.radius,c.height),c,'crystal');
  function considerRoad(car,kind){
    if(round.source===kind)return;
    const hit=roverRoundContact(car,round,d);
    if(hit)accept(hit.t,car,kind,false,null,hit.t,hit.wheel);
  }
  considerRoad(world.rover,'rover');
  considerRoad(world.supercar,'supercar');
  for(const car of world.traffic??[])considerRoad(car,car.id);
  for(const car of world.patrolCars??[])if(!car.wrecked && car.targetId===round.shooter)considerRoad(car,car.id);
  if(world.tank && round.source!=='tank')accept(tankRoundContact(world.tank,round,d),world.tank,'tank');
  const jet=world.jet;
  if(jet && !jet.wrecked && round.source!=='jet')accept(box(round,d,jet,2.35,1.95,5.7,jet.yaw),jet,'jet');
  const heli=world.heli;
  if(heli && !heli.wrecked && round.source!=='heli')accept(box(round,d,heli,1.85,2.15,3.38,heli.yaw),heli,'heli');
  for(const b of world.boats??[]) {
    if(!b.wrecked && b.id!==round.source)accept(box(round,d,{...b,y:b.y-.5},2.08,1.55,5.30,b.yaw),b,b.id);
  }
  for(const dog of world.dogs??[]){
    if(!dog.hp || dog.mode==='removed' || dog.carrier===round.shooter)continue;
    const scale=dog.size;
    accept(box(round,d,{x:dog.x,y:dog.y+.23*scale,z:dog.z},.32*scale,.45*scale,.83*scale,dog.yaw),dog,'dog',false,'torso');
    const nose=.4*scale;
    accept(box(round,d,{x:dog.x+Math.sin(dog.yaw)*nose,y:dog.y+.55*scale,z:dog.z-Math.cos(dog.yaw)*nose},
      .27*scale,.35*scale,.36*scale,dog.yaw),dog,'dog',true,'head');
  }
  for(const actor of actors){
    const now=actor.state, prev=previous.get(actor)??now;
    // Respawns are discontinuities; ordinary movers sweep relative to the bullet.
    const start=Math.hypot(now.x-prev.x,now.y-prev.y,now.z-prev.z)<roundActorSweep?prev:now;
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
  // In wildlife waters a firearm round can continue through the shallow layer.
  // Thrown items and fire still terminate at the surface.
  const firearmRound=Object.hasOwn(firearmSpecs,round.weapon);
  const waterStop=firearmRound && hasSwimmingWildlife(world) ? MAP.waterY-3.5 : MAP.waterY;
  if(firearmRound){
    const end={x:round.x+d.x,y:round.y+d.y,z:round.z+d.z};
    const contact=marineContact(world,round,end);
    if(contact)accept(contact.t,contact.target,contact.kind);
  }
  const above=f=>{
    const x=round.x+f*d.x,y=round.y+f*d.y,z=round.z+f*d.z;
    return y-Math.max(waterStop,groundHeight(x,z,y,world.doors),CITY ? parapetTop(x,z,0,y,world.doors) : -Infinity);
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
