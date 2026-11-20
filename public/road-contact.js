import {raisedRoadAt} from './bridge-driving.js';
import {supercarLayout} from './supercar-layout.js';
import {visitRoadPodium} from './frontage-glass.js';
import {stations} from './beach-layout.js';
import {postDown} from './street-lamps.js';
import { nearbyHull } from './patrol-boats.js';
import { BREAKABLES, CITY, MAP, groundHeight, terrainHeight } from './world.js';

// Round the corners of each chassis. Flat faces stay at the modeled extents.
const pickup={halfWidth:.82,halfLength:CITY?1.69:1.55,corner:.16};
const shapeFor=vehicle=>vehicle?.kind==='supercar'?supercarLayout:pickup;
const props=[...MAP.rocks,...MAP.trees,...BREAKABLES];
const bridgeRails=MAP.bridge?[-1,1].map(side=>({
  x:MAP.bridge.x+side*MAP.bridge.width/2,z:MAP.bridge.z,w:.10,d:9.6,h:1,
})):[];
const stationFootprints=stations.map(s=>({x:s.x-.52,z:s.z,w:4.42,d:3.06,woodId:s.number}));
const wood=new Set(MAP.trees);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));

function boxContact(x,z,s,c,b,shape,other=null){
  const {halfWidth,halfLength,corner}=shape, hw=halfWidth-corner,hl=halfLength-corner;
  const dx=x-b.x,dz=z-b.z,bw=other?.halfWidth??b.w/2,bl=other?.halfLength??b.d/2;
  const bc=other?Math.cos(b.yaw):1,bs=other?Math.sin(b.yaw):0;
  const extent=halfLength+halfWidth;
  if(Math.abs(dx)>bw*Math.abs(bc)+bl*Math.abs(bs)+extent||Math.abs(dz)>bw*Math.abs(bs)+bl*Math.abs(bc)+extent)return;
  let depth=Infinity,nx=0,nz=0;
  // Test the road axes and the chassis axes. The shallowest separating
  // translation supplies a stable physical normal along an entire facade.
  for(const [ax,az] of [[bc,bs],[-bs,bc],[c,s],[-s,c]]){
    const dist=dx*ax+dz*az;
    const overlap=bw*Math.abs(ax*bc+az*bs)+bl*Math.abs(az*bc-ax*bs)+hw*Math.abs(ax*c+az*s)+hl*Math.abs(az*c-ax*s)+corner-Math.abs(dist);
    if(overlap<=0)return;
    if(overlap<depth){depth=overlap;const sign=dist<0?-1:1;nx=ax*sign;nz=az*sign;}
  }
  return {nx,nz,depth,object:b};
}

function roundContact(x,z,s,c,prop,radius,shape){
  const {halfWidth,halfLength,corner}=shape, hw=halfWidth-corner,hl=halfLength-corner;
  if(Math.abs(x-prop.x)>halfLength+halfWidth+radius||Math.abs(z-prop.z)>halfLength+halfWidth+radius)return;
  const dx=prop.x-x,dz=prop.z-z;
  const lx=dx*c+dz*s,lz=dz*c-dx*s;
  let ax=clamp(lx,-hw,hw)-lx,az=clamp(lz,-hl,hl)-lz,len=Math.hypot(ax,az);
  let depth=radius+corner-len;
  if(depth<=0)return;
  if(len>.0001){ax/=len;az/=len;}
  else if(hw-Math.abs(lx)<hl-Math.abs(lz)){depth+=hw-Math.abs(lx);ax=lx>0?-1:1;az=0;}
  else{depth+=hl-Math.abs(lz);ax=0;az=lz>0?-1:1;}
  return {nx:ax*c-az*s,nz:ax*s+az*c,depth,object:prop,wood:wood.has(prop)};
}

// Outward-facing normal points from the obstacle into free space.
export function roadContact(world,x,z,yaw,fromX,fromZ,vehicle=world.rover){
  const shape=shapeFor(vehicle);
  const s=Math.sin(yaw),c=Math.cos(yaw),base=groundHeight(x,z,Infinity,world.doors);
  let result;
  const consider=hit=>{if(hit && (!result||hit.depth>result.depth))result=hit;};
  for(const b of MAP.buildings){
    if(CITY && world.doors)visitRoadPodium(b,x,z,world.doors,box=>consider(boxContact(x,z,s,c,box,shape)));
    else consider(boxContact(x,z,s,c,b,shape));
  }
  if(CITY)for(const stand of stationFootprints){
    if(!world.doors?.beachWood?.[stand.woodId])consider(boxContact(x,z,s,c,stand,shape));
  }
  const reach=shape.halfWidth+shape.halfLength;
  for(const b of MAP.barriers){
    if(Math.abs(x-b.x)>b.w/2+reach || Math.abs(z-b.z)>b.d/2+reach)continue;
    if(world.doors?.beachWood?.[b.woodId])continue;
    if(b.net!=null && world.doors?.nets?.[b.net])continue;
    if(postDown(world.doors,b))continue;
    if(b.bottom!=null && terrainHeight(b.x,b.z)+b.bottom>base+1.65)continue;
    if(b.h>.16)consider(boxContact(x,z,s,c,b,shape));
  }
  for(const rail of bridgeRails)consider(boxContact(x,z,s,c,rail,shape));
  for(const prop of props)if(!prop.id||world.hp?.[prop.id]!==0)
    consider(roundContact(x,z,s,c,prop,prop.radius,shape));
  const heli=world.heli;
  if(heli && heli.y-base<2)consider(roundContact(x,z,s,c,heli,1.55,shape));
  const parked=vehicle?.kind==='supercar'?world.rover:world.supercar;
  if(parked && parked!==vehicle)consider(boxContact(x,z,s,c,parked,shape,shapeFor(parked)));
  if(result)return result;
  const limit=MAP.flightLimit??32,north=MAP.flightNorth??-limit;
  if(x>limit)return {nx:-1,nz:0,depth:x-limit,object:'east'};
  if(x< -limit)return {nx:1,nz:0,depth:-limit-x,object:'west'};
  if(z>limit)return {nx:0,nz:-1,depth:z-limit,object:'south'};
  if(z<north)return {nx:0,nz:1,depth:north-z,object:'north'};
  const boat=base<MAP.waterY+.75 && nearbyHull(world.boats,null,x,z,yaw,shape.halfWidth,shape.halfLength);
  // Keep the prior shore/bridge traversal limits as terrain safeguards.
  const cliff=Math.abs(base-groundHeight(fromX,fromZ,Infinity,world.doors))>=.34 || [-.73,.73].some(along=>
    Math.abs(groundHeight(x+along*s,z-along*c,Infinity,world.doors)-base)>.67);
  if(boat || base<MAP.waterY+.2 || (cliff && !raisedRoadAt(world,x,z))){
    const dx=boat?x-boat.x:fromX-x,dz=boat?z-boat.z:fromZ-z,len=Math.hypot(dx,dz);
    return {nx:len?dx/len:0,nz:len?dz/len:1,depth:.01,object:boat||'terrain'};
  }
}

// Conservative substeps find even a narrow post, then bisect to the last clear
// position. No penetration correction is applied to the car's world position.
export function sweepRoad(world,r,dx,dz){
  if(Math.abs(dx)+Math.abs(dz)<1e-9)return {fraction:1};
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.25));
  for(let i=1;i<=steps;i++){
    let hi=i/steps,lo=(i-1)/steps;
    let hit=roadContact(world,r.x+hi*dx,r.z+hi*dz,r.yaw,r.x,r.z,r);
    if(!hit)continue;
    // A parked car can be overlapped by a moving aircraft. Let it drive out
    // when the movement decreases penetration without crossing a new obstacle.
    const start=roadContact(world,r.x,r.z,r.yaw,r.x,r.z,r);
    if(start?.object===hit.object && hit.depth<start.depth && dx*hit.nx+dz*hit.nz>0)continue;
    for(let n=0;n<9;n++){
      const t=(lo+hi)/2,probe=roadContact(world,r.x+t*dx,r.z+t*dz,r.yaw,r.x,r.z,r);
      if(probe){hi=t;hit=probe;}else lo=t;
    }
    return {fraction:lo,hit};
  }
  return {fraction:1};
}
