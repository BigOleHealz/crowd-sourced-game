// Dimensions follow the unmodified 40 m CC BY superyacht. Local -Z is the bow.
export const yachtBerth={x:75.4,z:-364,yaw:Math.PI};
export const yachtArrival={x:64,y:.8,z:-374.5,yaw:116*Math.PI/180};
export const yachtModelYaw=Math.PI;
export const yachtModelYOffset=-1.73;
export const yachtSections=[[-20,.2],[-19,.8],[-16,1.75],[-14,2.45],[-10,3.15],[-8,3.6],[-5,4.1],[0,4.25],[10,4.2],[16,4.1],[19,3.85],[20.5,3.8],[21.6,3.8]];
const sheer=[[-20,3.89],[-16,3.51],[-14,3.31],[-10,3.04],[-8,2.95],[-5,2.84],[0,2.71],[5,2.67],[10,2.66],[16,2.63],[19,2.61],[20.5,2.58]];
export const yachtDeckY=2.66;
export const yachtKeelY=-1.73;
export const yachtCabin={west:-3.2,east:3.2,fore:-9.5,aft:12,bottom:2.66,top:5.35};
export const yachtFlybridge={halfWidth:1.6,fore:-6,aft:10,top:13.73};
export const yachtHelm={x:0,y:2.67,z:8.5};
export const yachtPlatform={halfWidth:3.8,fore:20.5,aft:21.6,y:.8};
export const yachtUpperDeck={halfWidth:3.05,fore:8.2,aft:15.5,y:5.43};
export const yachtRearDoor={halfWidth:1.02,z:12,bottom:2.55,top:4.9};
export const yachtGangway={inner:4.0,outer:9.02,centerZ:10.5,halfWidth:.85,top:2.65,bottom:.56};
export const yachtMaxHp=2000;
export const yachtGun={x:0,z:-17.5,y:4.75};
export const yachtSmoking=y=>!!y && !y.wrecked && y.hp>0 && y.hp<=y.maxHp*.30;

function interpolate(stations,z){
  if(z<stations[0][0] || z>stations.at(-1)[0])return -Infinity;
  for(let i=1;i<stations.length;i++){
    const [a,w]=stations[i-1],[b,v]=stations[i];
    if(z<=b)return w+(v-w)*(z-a)/(b-a);
  }
  return stations.at(-1)[1];
}
export function yachtHalfBeam(z){return Math.max(0,interpolate(yachtSections,z));}
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
  const g=yachtGangway;
  if(yacht.gangway && Math.abs(z-g.centerZ)<=g.halfWidth && x>=g.inner && x<=g.outer)
    return g.top+(g.bottom-g.top)*(x-g.inner)/(g.outer-g.inner);
  if(z>=yachtPlatform.fore && z<=yachtPlatform.aft && Math.abs(x)<=yachtPlatform.halfWidth)return yachtPlatform.y;
  const width=yachtHalfBeam(z);
  return width && Math.abs(x)<=width ? interpolate(sheer,Math.min(z,sheer.at(-1)[0])) : -Infinity;
}
export function yachtDeckHeight(yacht,x,z){
  if(!yacht || yacht.wrecked || Math.abs(x-yacht.x)>25 || Math.abs(z-yacht.z)>25)return -Infinity;
  const p=yachtLocal(yacht,x,z);return yacht.y+localDeck(yacht,p.x,p.z);
}
function upperDeckAt(p){
  return p.z>=yachtUpperDeck.fore && p.z<=yachtUpperDeck.aft &&
    Math.abs(p.x)<=yachtUpperDeck.halfWidth;
}
export function yachtFloorAt(yacht,x,y,z){
  const deck=yachtDeckHeight(yacht,x,z);
  if(!Number.isFinite(deck))return deck;
  const p=yachtLocal(yacht,x,z);
  return upperDeckAt(p) && y>=yacht.y+yachtUpperDeck.y-.34
    ? yacht.y+yachtUpperDeck.y : deck;
}
export function yachtCeilingAt(yacht,x,y,z){
  const deck=yachtDeckHeight(yacht,x,z);
  if(!Number.isFinite(deck))return Infinity;
  const p=yachtLocal(yacht,x,z);
  if(y<yacht.y+yachtKeelY)return yacht.y+yachtKeelY;
  if(y<yacht.y+5.27 && p.z>=-8.6 && p.z<=15.4 &&
    Math.abs(p.x)<cabinSide(p.z)-.2)return yacht.y+5.27;
  return Infinity;
}
function cabinSide(z){return interpolate([[-10,1.92],[-8,2.64],[-5,3.07],[0,3.28],[10,3.27],[12,3.24]],z);}
export function yachtRoomDepth(yacht,x,y,z){
  if(!yacht || yacht.wrecked)return -1;
  const p=yachtLocal(yacht,x,z),h=y-yacht.y,side=cabinSide(p.z);
  return h>2.55 && h<5.25 && p.z>=-9.4 && p.z<11.8 &&
    Math.abs(p.x)<side-.25 ? Math.min(side-Math.abs(p.x),p.z+9.4,11.8-p.z): -1;
}
function modelTopLocal(x,z,padding=0){
  const side=Math.abs(x);
  if(z>=-6-padding && z<=6+padding){
    if(side<=1.6+padding)return 13.73;
    if(side<=2.3+padding)return 12.8;
  }
  if(z>=yachtCabin.fore-padding && z<=yachtCabin.aft+padding && side<=cabinSide(Math.max(-10,Math.min(12,z)))+padding)
    return 8.1;
  return -Infinity;
}
export function yachtSolidAt(yacht,x,y,z,r=0){
  if(!yacht || yacht.wrecked || y<yacht.y+yachtKeelY-r)return false;
  const deck=yachtDeckHeight(yacht,x,z);if(y<=deck+r)return true;
  const p=yachtLocal(yacht,x,z),h=y-yacht.y;
  if(h>=5.27-r && h<=5.53+r && upperDeckAt(p))return true;
  if(h>=2.55-r && h<=5.35+r && p.z>=-10-r && p.z<=12+r){
    const side=cabinSide(Math.max(-10,Math.min(12,p.z)));
    if(Math.abs(Math.abs(p.x)-side)<.12+r)return true;
    if(Math.abs(p.z-12)<.12+r && Math.abs(p.x)>yachtRearDoor.halfWidth-r && Math.abs(p.x)<side+r)return true;
    if(Math.abs(p.z+10)<.12+r && Math.abs(p.x)<side+r)return true;
  }
  if(h>5.53 && h<=modelTopLocal(p.x,p.z,r)+r && p.z<=8 &&
    Math.abs(Math.abs(p.x)-Math.min(2.7,cabinSide(Math.max(-10,p.z))))<.2+r)return true;
  return false;
}
export function yachtTopAt(yacht,x,z,padding=0){
  const deck=yachtDeckHeight(yacht,x,z);if(!Number.isFinite(deck))return deck;
  const p=yachtLocal(yacht,x,z);
  return Math.max(deck,yacht.y+modelTopLocal(p.x,p.z,padding));
}
export function carryOnYacht(from,to,feet){
  const p=yachtLocal(from,feet.x,feet.z);
  return {...feet,...yachtPoint(to,p.x,feet.y-from.y,p.z)};
}
export function aboardYacht(yacht,feet){
  return feet?.grounded && Math.abs(feet.y-yachtFloorAt(yacht,feet.x,feet.y,feet.z))<.27;
}
export function yachtPrompt(world,feet,id){
  const y=world?.yacht;if(!y || y.wrecked || id==null)return null;
  if(y.driver===id)return 'leave';
  if(!aboardYacht(y,feet))return null;
  const helm=yachtHelmFeet(y);
  const helmRange=Math.hypot(helm.x-feet.x,helm.z-feet.z,helm.y-feet.y);
  if(helmRange>2.35)return null;
  return y.driver==null?'helm':'occupied';
}

const outline=yachtSections.map(([z,x])=>[x,z]).concat(yachtSections.map(([z,x])=>[-x,z]).reverse());
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
export function yachtWalkBlocked(yacht,x,y,z,bodyHeight){
  if(!yacht || yacht.wrecked || Math.abs(x-yacht.x)>25 || Math.abs(z-yacht.z)>25)return false;
  const p=yachtLocal(yacht,x,z),h=y-yacht.y;
  if(h+bodyHeight<=yachtKeelY)return false;
  if(h<localDeck(yacht,p.x,p.z)-.3)return true;
  const radius=.29;
  if(h<5.36 && h+bodyHeight>2.7 && p.z>=-10.25 && p.z<=12.3){
    const side=cabinSide(Math.max(-10,Math.min(12,p.z)));
    if(Math.abs(Math.abs(p.x)-side)<radius+.08)return true;
    if(Math.abs(p.z-12)<radius+.08 && Math.abs(p.x)>yachtRearDoor.halfWidth-radius && Math.abs(p.x)<side+radius)return true;
    if(Math.abs(p.z+10)<radius+.08 && Math.abs(p.x)<side+radius)return true;
  }
  // The aft upper terrace has a rail except at its central ladder opening.
  if(h>=5.1 && h<7.2 && Math.abs(p.x)<3.3 && p.z>15.48 && p.z<15.85 && Math.abs(p.x)>.62)return true;
  return false;
}
