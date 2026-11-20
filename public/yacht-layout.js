import {inGuestSuite,inLowerHatch,lowerSole,mainSole,cabinTop,cabinSupport,cabinCeiling,cabinIntersects,cabinDepth} from './solana-interior.js';
// Local dimensions are metres above the waterline. Negative Z points to the bow.
export const yachtBerth={x:75.4,z:-364,yaw:Math.PI};
export const yachtSections=[[-20,.35],[-18,2.45],[-14,4.6],[-9,6.0],[-3,6.4],[12,6.4],[15,6.15],[18,5.45],[19,4.9]];
export const yachtDeckY=mainSole;
export const yachtCabin={west:-4.2,east:4.2,fore:-12,aft:1,bottom:yachtDeckY,top:cabinTop};
export const yachtPad={x:0,z:9.3,y:yachtDeckY,halfWidth:5.75,fore:2.5,aft:15};
export const yachtHelm={x:0,y:yachtDeckY,z:-14.1};
export const yachtStairs={halfWidth:2.1,fore:15,aft:19,steps:12,bottom:.30,top:yachtDeckY};
export const yachtPlatform={halfWidth:4.35,fore:19,aft:21,y:.30};
export const yachtLadder={halfWidth:.79,fore:20.88,aft:22.0,top:.30,bottom:-1.02};
export const yachtGangway={inner:5.9,outer:9.02,centerZ:10.5,halfWidth:.86,top:yachtDeckY,bottom:.94};
export const yachtMaxHp=2000;
export const yachtGun={x:0,z:-17.6,y:yachtDeckY+1.24};
export const yachtSmoking=y=>!!y && !y.wrecked && y.hp>0 && y.hp<=y.maxHp*.30;
export function yachtHalfBeam(z){
  if(z<yachtSections[0][0] || z>yachtSections.at(-1)[0])return 0;
  for(let i=1;i<yachtSections.length;i++){
    const [a,w]=yachtSections[i-1],[b,v]=yachtSections[i];
    if(z<=b)return w+(v-w)*(z-a)/(b-a);
  }
  return 0;
}
export function yachtLocal(yacht,x,z){
  const dx=x-yacht.x,dz=z-yacht.z,c=Math.cos(yacht.yaw),s=Math.sin(yacht.yaw);
  return {x:c*dx+s*dz,z:-s*dx+c*dz};
}
export function yachtPoint(yacht,x,y,z){
  const c=Math.cos(yacht.yaw),s=Math.sin(yacht.yaw);
  return {x:yacht.x+c*x-s*z,y:yacht.y+y,z:yacht.z+s*x+c*z};
}
export function yachtHelmFeet(yacht){return yachtPoint(yacht,yachtHelm.x,yachtHelm.y,yachtHelm.z);}
function localDeck(yacht,x,z){
  const g=yachtGangway,pl=yachtPlatform,st=yachtStairs,l=yachtLadder;
  if(yacht.gangway && Math.abs(z-g.centerZ)<=g.halfWidth && x>=g.inner && x<=g.outer)
    return g.top+(g.bottom-g.top)*(x-g.inner)/(g.outer-g.inner);
  if(Math.abs(x)<=l.halfWidth && z>=l.fore && z<=l.aft)return l.top+(l.bottom-l.top)*(z-l.fore)/(l.aft-l.fore);
  if(Math.abs(x)<=pl.halfWidth && z>=pl.fore && z<=pl.aft)return pl.y;
  if(Math.abs(x)<=st.halfWidth && z>=st.fore && z<st.aft)
    return st.top-(st.top-st.bottom)*Math.floor(st.steps*(z-st.fore)/(st.aft-st.fore))/st.steps;
  const width=yachtHalfBeam(z);
  return width && Math.abs(x)<=width ? yachtDeckY : -Infinity;
}
export function yachtDeckHeight(yacht,x,z){
  if(!yacht || yacht.wrecked || Math.abs(x-yacht.x)>25 || Math.abs(z-yacht.z)>25)return -Infinity;
  const local=yachtLocal(yacht,x,z);
  return yacht.y+localDeck(yacht,local.x,local.z);
}
function nearCabin(yacht,x,z){
  return yacht && !yacht.wrecked && Math.abs(x-yacht.x)<14 && Math.abs(z-yacht.z)<14;
}
export function yachtFloorAt(yacht,x,y,z){
  const deck=yachtDeckHeight(yacht,x,z);
  if(!nearCabin(yacht,x,z))return deck;
  const p=yachtLocal(yacht,x,z);
  const h=y-yacht.y;
  const cut=inGuestSuite(p.x,p.z) && (h<mainSole-.31 || inLowerHatch(p.x,p.z));
  return Math.max(cut ? -Infinity : deck,yacht.y+cabinSupport(p.x,h,p.z,0,yacht.brokenGlass));
}
export function yachtCeilingAt(yacht,x,y,z){
  if(!nearCabin(yacht,x,z))return Infinity;
  const p=yachtLocal(yacht,x,z);
  return yacht.y+cabinCeiling(p.x,y-yacht.y,p.z,yacht.brokenGlass);
}
export function yachtRoomDepth(yacht,x,y,z){
  if(!nearCabin(yacht,x,z))return -1;
  const p=yachtLocal(yacht,x,z);
  return cabinDepth(p.x,y-yacht.y,p.z);
}
export function yachtSolidAt(yacht,x,y,z,r=0){
  if(!yacht || yacht.wrecked || y<yacht.y-1.25-r)return false;
  const inHull=y<=yachtDeckHeight(yacht,x,z)+r;
  if(!nearCabin(yacht,x,z))return inHull;
  const p=yachtLocal(yacht,x,z),h=y-yacht.y;
  if(inHull && (!inGuestSuite(p.x,p.z) || h<=lowerSole+r))return true;
  return cabinIntersects(p.x,h-r,p.z,h+r,r,false,yacht.brokenGlass);
}
// Aircraft clearance includes its footprint around the superstructure.
export function yachtTopAt(yacht,x,z,padding=0){
  const deck=yachtDeckHeight(yacht,x,z);
  if(!nearCabin(yacht,x,z))return deck;
  const p=yachtLocal(yacht,x,z);
  return Math.max(deck,yacht.y+cabinSupport(p.x,Infinity,p.z,padding,yacht.brokenGlass));
}
export function carryOnYacht(from,to,feet){
  const p=yachtLocal(from,feet.x,feet.z);
  return {...feet,...yachtPoint(to,p.x,feet.y-from.y,p.z)};
}
export function aboardYacht(yacht,feet){
  return feet?.grounded && Math.abs(feet.y-yachtFloorAt(yacht,feet.x,feet.y,feet.z))<.27;
}
export function yachtPrompt(world,feet,id){
  const y=world?.yacht;
  if(!y || y.wrecked || id==null)return null;
  if(y.driver===id)return 'leave';
  if(y.gunner===id)return 'leaveGun';
  if(!aboardYacht(y,feet))return null;
  const h=yachtHelmFeet(y);
  const gun=yachtPoint(y,yachtGun.x,yachtDeckY,yachtGun.z);
  const gunRange=Math.hypot(gun.x-feet.x,gun.z-feet.z,gun.y-feet.y);
  const helmRange=Math.hypot(h.x-feet.x,h.z-feet.z,h.y-feet.y);
  if(gunRange<=1.8 && gunRange<helmRange)return y.gunner==null?'gun':'gunOccupied';
  if(helmRange>2.35)return null;
  return y.driver==null?'helm':'occupied';
}

// Reject overlapping rectangles (RHIB, pickup or aircraft) against the tapered
// offshore hull. A separating axis from either convex outline is sufficient.
const waterline=[...yachtSections,[21,yachtPlatform.halfWidth]];
const outline=waterline.map(([z,x])=>[x,z]).concat(waterline.map(([z,x])=>[-x,z]).reverse());
export function yachtOverlap(yacht,x,z,yaw,halfWidth,halfLength){
  if(!yacht || yacht.wrecked || Math.hypot(x-yacht.x,z-yacht.z)>23+Math.hypot(halfWidth,halfLength))return false;
  const p=yachtLocal(yacht,x,z),a=yaw-yacht.yaw,c=Math.cos(a),s=Math.sin(a);
  const separated=(nx,nz)=>{
    const at=nx*p.x+nz*p.z,r=halfWidth*Math.abs(nx*c+nz*s)+halfLength*Math.abs(-nx*s+nz*c);
    let lo=Infinity,hi=-Infinity;
    for(const [vx,vz] of outline){const t=nx*vx+nz*vz;lo=Math.min(lo,t);hi=Math.max(hi,t);}
    return at+r<=lo || at-r>=hi;
  };
  if(separated(c,s) || separated(-s,c))return false;
  return !outline.some(([vx,vz],i)=>{const next=outline[(i+1)%outline.length];return separated(vz-next[1],next[0]-vx);});
}

// Each rail run is continuous. The two starboard runs leave a full-width gate
// at the gangway. The stern terraces finish at the open boarding staircase.
export const yachtRailTop=3.42;
const railStops=[...new Set([...yachtSections.filter(([z])=>z<=15).map(([z])=>z),
  ...Array.from({length:17},(_,i)=>-17+i*2),9.48,11.52])].sort((a,b)=>a-b);
const railRun=(side,stops)=>stops.map(z=>[side*Math.max(.07,yachtHalfBeam(z)-.13),z]);
export const yachtRailRuns=[railRun(-1,railStops),railRun(1,railStops.filter(z=>z<=9.48)),railRun(1,railStops.filter(z=>z>=11.52))];
function nearSegment(x,z,[ax,az],[bx,bz]){
  const dx=bx-ax,dz=bz-az;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  return (x-ax-t*dx)**2+(z-az-t*dz)**2<.345**2;
}
export function yachtWalkBlocked(yacht,x,y,z,bodyHeight){
  if(!yacht || yacht.wrecked || Math.abs(x-yacht.x)>25 || Math.abs(z-yacht.z)>25)return false;
  const feet=y-yacht.y,p=yachtLocal(yacht,x,z);
  if(yachtDeckHeight(yacht,x,z)>y+.30 && (!inGuestSuite(p.x,p.z) || feet<lowerSole-.31))return true;
  if(p.z>=-12.4 && p.z<=1.4 && Math.abs(p.x)<4.6 &&
      cabinIntersects(p.x,feet+.30,p.z,feet+bodyHeight-.01,.26,true,yacht.brokenGlass))return true;
  if(feet<yachtRailTop+.02 && feet+bodyHeight>yachtDeckY && p.z<=15.35 && Math.abs(p.x)>yachtHalfBeam(p.z)-.65){
    for(const run of yachtRailRuns)for(let i=1;i<run.length;i++)
      if(nearSegment(p.x,p.z,run[i-1],run[i]))return true;
  }
  if(yacht.gangway && p.x>=yachtGangway.inner && p.x<=yachtGangway.outer){
    const f=(p.x-yachtGangway.inner)/(yachtGangway.outer-yachtGangway.inner);
    const h=yachtGangway.top+(yachtGangway.bottom-yachtGangway.top)*f;
    if(feet<h+.87 && feet+bodyHeight>h && Math.abs(Math.abs(p.z-yachtGangway.centerZ)-.84)<.33)return true;
  }
  return false;
}
