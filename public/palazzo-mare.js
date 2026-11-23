import {mareSpiral,outsideWell,spiralSupport,spiralCeiling} from './residential-spirals.js';
import {identifyPane} from './pane-damage.js';
// Heights are above the Lantern Point quay. The view, player, camera and
// vehicle barriers all use this plan, including the two cuts in the slabs.
export const mareBase={id:'limestone-ground-floor',x:25,z:-444,w:29,d:14,h:4.1,bottom:0};
export const mareUpper=[
  {id:'limestone-piano-nobile',x:24,z:-445.2,w:25,d:11.4,h:7.9,bottom:4.1},
  {id:'limestone-penthouse',x:21.8,z:-446.3,w:16.5,d:8.9,h:10.9,bottom:7.9},
];
const tiers=[mareBase,...mareUpper];
const quay=.80;
export const mareParts=[],mareFurniture=[],mareGuards=[];
const rect=(x,z,w,d,bottom,h)=>({x,z,w,d,bottom,h});
function part(kind,x,z,w,d,bottom,h){
  const p={...rect(x,z,w,d,bottom,h),kind,flushEdge:kind==='slab'};
  mareParts.push(kind==='glass'?identifyPane(p,quay):p);
}
function slab(west,east,north,south,y,thickness){
  if(east>west && south>north)part('slab',(west+east)/2,(north+south)/2,east-west,south-north,y-thickness,y);
}
function floorPlate(b,y,hole){
  const l=b.x-b.w/2-.32,r=b.x+b.w/2+.32,n=b.z-b.d/2-.32,s=b.z+b.d/2+.32;
  if(!hole){slab(l,r,n,s,y,y===.07?.09:.24);return;}
  for(const p of outsideWell({x:(l+r)/2,z:(n+s)/2,w:r-l,d:s-n},mareSpiral)){
    slab(p.x-p.w/2,p.x+p.w/2,p.z-p.d/2,p.z+p.d/2,y,.24);
  }
}
floorPlate(mareBase,.07);
for(const [i,b] of tiers.entries())floorPlate(b,b.h,i<2);

// Leave masonry returns at corners and around each floor-to-ceiling opening.
function facade(b,alongX,side,doorways){
  const center=alongX?b.x:b.z,span=alongX?b.w:b.d;
  const edge=(alongX?b.z:b.x)+side*(alongX?b.d:b.w)/2;
  const course=(kind,start,end,depth,lo,hi)=>{
    const mid=(start+end)/2,length=end-start;
    if(length>.001)part(kind,alongX?mid:edge,alongX?edge:mid,alongX?length:depth,alongX?depth:length,lo,hi);
  };
  const lo=b.bottom||.07,hi=b.h-.24;
  const windowBay=(a,c)=>{
    if(c-a<.35)return;
    const bays=Math.max(1,Math.round((c-a)/3.8)),step=(c-a)/bays;
    for(let j=0;j<bays;j++){
      const start=a+j*step,end=start+step;
      course('stone',start,start+.27,.25,lo,hi);
      course('stone',end-.27,end,.25,lo,hi);
      course('sill',start+.27,end-.27,.22,lo,lo+.62);
      const sill=mareParts.at(-1);
      course('glass',start+.27,end-.27,.055,lo+.62,hi-.25);
      sill.sillPaneId=mareParts.at(-1).paneId;
      course('stone',start+.27,end-.27,.22,hi-.25,hi);
    }
  };
  let start=center-span/2;
  for(const door of doorways){
    const a=door-1.36,c=door+1.36;
    windowBay(start,a);course('lintel',a,c,.30,lo+2.63,hi);
    for(const end of [a,c])course('jamb',end-.063,end+.063,.34,lo,lo+2.64);
    start=c;
  }
  windowBay(start,center+span/2);
}
for(const [i,b] of tiers.entries()){
  facade(b,true,-1,[]);facade(b,false,-1,[]);
  facade(b,true,1,[[15.4,28.2],[32.6],[]][i]);
  facade(b,false,1,[[-441],[],[-444.9]][i]);
}
function partition(x,z,w,d,level){
  const b=tiers[level];
  part('plaster',x,z,w,d,b.bottom||.07,b.h-.24);
}
// Kitchen and dining room, the library and writing room, and the dressing room.
partition(31.2,-447.3,.20,6.9,0);
partition(35.95,-445.1,6.9,.18,0);
partition(28.2,-448.8,.18,3.85,1);
partition(28.2,-440.85,.18,2.7,1);
partition(18.25,-447.32,.16,1.28,2);
partition(18.25,-442.9,.16,2.16,2);

function furnishing(kind,x,z,w,d,level,height,reverse=false){
  const bottom=tiers[level].bottom||.07;
  mareFurniture.push({...rect(x,z,w,d,bottom,bottom+height),kind,reverse});
}
furnishing('planter',11.32,-445.85,.61,.61,0,.68);
furnishing('planter',29.30,-447.43,.54,.54,2,.67);
furnishing('sofa',13.25,-444.75,3.05,.94,0,.91);
furnishing('coffee',13.25,-443.45,1.65,.72,0,.40);
furnishing('cocktailBar',14.25,-449.74,3.08,.90,0,1.06);
for(const x of [13.55,14.95])furnishing('barstool',x,-448.74,.52,.52,0,.76);
furnishing('console',19.6,-438.0,3,.52,0,.88);
furnishing('table',33.4,-443.12,3.40,1.08,0,.82);
for(const x of [32.3,33.4,34.5])for(const side of [-1,1])furnishing('chair',x,-443.12+side*.93,.54,.54,0,.92,side<0);
furnishing('kitchen',35.25,-450.18,6.36,.94,0,1.0);
furnishing('island',35.6,-447.74,3.03,1.02,0,.98);
furnishing('library',13.86,-443.72,.52,3.45,1,2.37);
furnishing('sofa',19.7,-440.38,3.48,.94,1,.91,true);
furnishing('coffee',19.7,-441.8,1.75,.75,1,.40);
furnishing('vitrine',32.55,-450.19,2.9,.54,1,2.33);
furnishing('desk',32.55,-447.85,2.45,.90,1,.80);
furnishing('chair',32.55,-448.89,.58,.61,1,.98,true);
furnishing('console',35.69,-442.65,.48,1.85,1,.89);
furnishing('bed',26.96,-448.48,2.54,2.96,2,1.18);
for(const x of [25.38,28.60])furnishing('nightstand',x,-449.56,.70,.73,2,.57);
furnishing('bench',15.38,-447.89,1.62,.48,2,.50);
furnishing('wardrobe',16.16,-442.43,2.54,.70,2,2.18);
furnishing('sofa',26.7,-442.64,2.52,.81,2,.85,true);
furnishing('console',20.3,-442.46,1.65,.52,2,.88);

// Continue the existing arcade rail along the open perimeter of each setback.
for(const [level,west,east,north,south] of [[4.1,10.32,39.68,-451.18,-436.84],[7.9,11.32,36.68,-451.08,-439.32]]){
  for(const x of [west,east])mareGuards.push(rect(x,(north+south)/2,.07,south-north,level,level+.94));
  mareGuards.push(rect((west+east)/2,north,east-west,.07,level,level+.94));
  if(level===7.9)mareGuards.push(rect((west+east)/2,south,east-west,.07,level,level+.94));
}
for(const x of [11.0,39.0])mareGuards.push(rect(x,-435.08,.07,3.6,4.12,5.06));
export const mareLoggiaRoof={...rect(25,-435.5,28.2,4.6,3.86,4.12),kind:'slab',flushEdge:true,id:'limestone-loggia'};
const terraceFixtures=[
  mareLoggiaRoof,
  rect(20.8,-436.55,13.6,.72,4.10,4.84),
  rect(25,-433.29,26.4,.065,4.12,5.10),
  rect(22.4,-439.95,19,.72,7.90,8.60),
  rect(33.1,-439.85,5.4,.065,7.90,8.90),
  ...[30.8,35.6].flatMap(x=>[-448.7,-442.1].map(z=>rect(x,z,.13,.13,7.9,10.12))),
  ...[32.1,34.25].map(x=>rect(x,-444.1,.87,1.86,7.9,8.65)),
];
const slabParts=[...mareParts.filter(p=>p.kind==='slab'),mareLoggiaRoof];
export const mareBarriers=[...mareParts,...mareFurniture,...mareGuards,...terraceFixtures];


const on=(p,x,z)=>Math.abs(x-p.x)<=p.w/2+.00001 && Math.abs(z-p.z)<=p.d/2+.00001;
const nearby=(x,z)=>x>=10 && x<=40 && z>=-452 && z<=-436;
export function mareFloor(x,z,probe){
  if(z<-452 || z>-433 || x<10 || x>40)return -Infinity;
  let top=-Infinity;
  for(const p of slabParts)if(quay+p.h<=probe+.00001 && on(p,x,z))top=Math.max(top,quay+p.h);
  const stair=spiralSupport(mareSpiral,x,z,probe);
  if(stair!==undefined)top=Math.max(top,stair);
  return top;
}
export function mareCeiling(x,y,z,support=Infinity){
  if(z<-452 || z>-433 || x<10 || x>40)return Infinity;
  let limit=Infinity;
  for(const p of slabParts)if(on(p,x,z) && quay+p.h<=support && y<quay+p.bottom)limit=Math.min(limit,quay+p.bottom);
  limit=Math.min(limit,spiralCeiling(mareSpiral,x,y,z));
  return limit;
}
export function inPalazzoMare(x,y,z){
  return nearby(x,z) && tiers.some(b=>on(b,x,z) && y>=quay+b.bottom-.06 && y<quay+b.h-.12);
}
