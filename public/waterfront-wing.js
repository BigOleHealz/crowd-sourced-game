// Absolute elevations shared by the west quay's architecture, physics and camera.
export const casinoQuay={west:-91,east:-71.49,north:30,south:65};
export const wingFloor=.80,wingGallery=4.75,wingRoof=9.35;
export const wingBounds={west:-90.65,east:-72,north:30.4,south:61};
export const wingStair={west:-86.10,east:-82.70,north:42,south:51.24,count:22};
export const wingEntrances={
  lobby:{x:-72,z:46.5,width:2.60},
  avenue:{x:-72,z:58.75,width:3.50},
  terrace:{x:-80.4,z:61,width:4},
};
const {west,east,north,south}=wingBounds;
const cx=(west+east)/2, cz=(north+south)/2;
export const wingPlan={x:cx,z:cz,w:east-west,d:south-north};
const box=(kind,x,z,w,d,bottom,top)=>({kind,x,z,w,d,bottom,top});
const walls=[],slabs=[],rails=[],steps=[];
function facade(side,start,end,openings=[]){
  const vertical=side==='east'||side==='west',fixed=wingBounds[side];
  function segment(a,b,lo,hi){
    const center=(a+b)/2,span=b-a;
    walls.push(box(side,vertical?fixed:center,vertical?center:fixed,vertical?.20:span,vertical?span:.20,lo,hi));
  }
  let cursor=start;
  for(const door of openings){
    const at=vertical?door.z:door.x,left=at-door.width/2,right=at+door.width/2;
    segment(cursor,left,wingFloor,9.05);segment(left,right,4.0,9.05);
    cursor=right;
  }
  segment(cursor,end,wingFloor,9.05);
}
facade('west',north,south);facade('north',west,east);
facade('east',north,south,[wingEntrances.lobby,wingEntrances.avenue]);facade('south',west,east,[wingEntrances.terrace]);
slabs.push(box('quay',(casinoQuay.west+casinoQuay.east)/2,(casinoQuay.north+casinoQuay.south)/2,casinoQuay.east-casinoQuay.west,casinoQuay.south-casinoQuay.north,-.80,wingFloor));
slabs.push(box('gallery',cx,(north+wingStair.north)/2,east-west,wingStair.north-north,wingGallery-.22,wingGallery));
slabs.push(box('roof',cx,cz,east-west,south-north,9.05,wingRoof));
for(const [a,b] of [[west,wingStair.west],[wingStair.east,east]]){
  rails.push(box('balustrade',(a+b)/2,wingStair.north,b-a,.12,wingGallery,wingGallery+1.04));
}
for(let i=0;i<wingStair.count;i++){
  const depth=(wingStair.south-wingStair.north)/wingStair.count,z=wingStair.south-(i+.5)*depth;
  const top=wingFloor+(wingGallery-wingFloor)*(i+1)/wingStair.count;
  steps.push(box('tread',(wingStair.west+wingStair.east)/2,z,wingStair.east-wingStair.west,depth,wingFloor,top));
  for(const x of [wingStair.west,wingStair.east])rails.push(box('stair',x,z,.08,depth,top,top+.95));
}
export const wingArchitecture={walls,slabs,rails,steps};
export const wingSolids=[...walls,...rails,...slabs.filter(s=>s.kind!=='quay')].map(s=>({
  x:s.x,z:s.z,w:s.w,d:s.d,bottom:s.bottom-wingFloor,h:s.top-wingFloor,
  flushEdge:s.kind==='gallery'||s.kind==='roof',
}));
// The bodies beneath the polished treads are solid. A smooth walking surface
// prevents camera chatter while the actual tread rises stay below a stride.
export function wingSurface(x,z,probe){
  if(!inWing(x,z))return;
  if(probe>=wingRoof-.15)return wingRoof;
  if(z<=wingStair.north && probe>=wingGallery-.16)return wingGallery;
  if(z>=wingStair.north && z<=wingStair.south && x>=wingStair.west && x<=wingStair.east){
    return wingFloor+(wingGallery-wingFloor)*(wingStair.south-z)/(wingStair.south-wingStair.north);
  }
  return wingFloor;
}
function inWing(x,z){
  return x>=west && x<=east && z>=north && z<=south;
}
export function inWaterfrontSalon(x,y,z){
  return inWing(x,z) && y>=wingFloor-.23 && y<9.05;
}
export function wingCeiling(y,z){
  return z<=wingStair.north && y<wingGallery-.23 ? wingGallery-.22 : 9.05;
}
