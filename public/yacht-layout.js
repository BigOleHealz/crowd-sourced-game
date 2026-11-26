// Dimensions follow the unmodified 40 m CC BY superyacht. Local -Z is the bow.
export const yachtBerth={x:75.4,z:-364,yaw:Math.PI};
export const yachtArrival={x:64,y:.8,z:-374.5,yaw:116*Math.PI/180};
export const yachtModelYaw=Math.PI;
export const yachtModelYOffset=-1.73;
export const yachtSections=[[-20,.2],[-19,.8],[-16,1.75],[-14,2.45],[-10,3.15],[-8,3.6],[-5,4.1],[0,4.25],[10,4.2],[16,4.1],[19,3.85],[20.5,3.8],[21.6,3.8]];
const sheer=[[-20,3.89],[-16,3.51],[-14,3.31],[-10,3.04],[-8,2.95],[-5,2.84],[0,2.71],[5,2.67],[10,2.66],[16,2.63],[19,2.61],[20.5,2.58]];
export const yachtDeckY=2.66;
export const yachtKeelY=-1.73;
export const yachtCabin={west:-2.7,east:2.7,fore:-9,aft:13,bottom:2.66,top:8.1};
export const yachtFlybridge={halfWidth:1.6,fore:-6,aft:10,top:13.73};
export const yachtHelm={x:0,y:3.31,z:-14};
export const yachtPlatform={halfWidth:3.8,fore:20.5,aft:21.6,y:.8};
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
export function yachtFloorAt(yacht,x,y,z){return yachtDeckHeight(yacht,x,z);}
export function yachtCeilingAt(yacht,x,y,z){
  const deck=yachtDeckHeight(yacht,x,z);
  return Number.isFinite(deck) && y<yacht.y+yachtKeelY ? yacht.y+yachtKeelY : Infinity;
}
export function yachtRoomDepth(){return -1;}
function modelTopLocal(x,z,padding=0){
  const side=Math.abs(x);
  if(z>=-6-padding && z<=6+padding){
    if(side<=1.6+padding)return 13.73;
    if(side<=2.3+padding)return 12.8;
  }
  if(z>=yachtCabin.fore-padding && z<=yachtCabin.aft+padding && side<=yachtCabin.east+padding)
    return yachtCabin.top;
  return -Infinity;
}
export function yachtSolidAt(yacht,x,y,z,r=0){
  if(!yacht || yacht.wrecked || y<yacht.y+yachtKeelY-r)return false;
  const deck=yachtDeckHeight(yacht,x,z);if(y<=deck+r)return true;
  const p=yachtLocal(yacht,x,z),h=y-yacht.y;
  return h<=modelTopLocal(p.x,p.z,r)+r;
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
  // The source model's cabin is enclosed; keep players on its side decks.
  if(h<modelTopLocal(p.x,p.z) && h+bodyHeight>localDeck(yacht,p.x,p.z)+.25)return true;
  return false;
}
