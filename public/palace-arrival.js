// Ground-level links occupy the two southern hotel blocks. The original casino
// is the northern block, reached from the west colonnade across the casino street.
export const palaceQuays=[
  {west:-76,east:-32.4,north:72.55,south:99},
  {west:-32.4,east:-6.10,north:72.55,south:80.25},
];
export const arrivalDoor={x:-57,z:78.7};
export const arrivalLoop={x:-57,z:88.3,rx:13.25,rz:7.45};
export const arrivalDeck=2.55;
export const promenades=[
  {name:'Imperial Arrival Hall',west:-74.6,east:-43.65,north:65.6,south:78.7},
  {name:'Oasis Palm Gallery',west:-32.35,east:-6.65,north:65.6,south:78.7},
];
// Below the western tower frontage a covered dogleg stays landward of the seawall
// and beyond the public avenue. Guests can reach the original major halls under cover.
export const westArcades=[
  {name:'Aurora Colonnade',west:-83.35,east:-72.55,north:61,south:65.23},
  {name:'Aurora Colonnade',west:-75.94,east:-72.55,north:65.23,south:71.33},
];
const occupiedQuarters=[...promenades,...westArcades];
function eased(t){const u=Math.max(0,Math.min(1,t));return u*u*(3-2*u);}
export function onArrivalQuay(x,z){
  return palaceQuays.some(q=>x>=q.west && x<=q.east && z>=q.north && z<=q.south);
}
export function arrivalGround(x,z){
  const stem=x>=-43.65 && x<=-32.35;
  if(!(stem && z>=67 && z<=72.55) && !onArrivalQuay(x,z))return;
  const centerline=.70+(arrivalDeck-.70)*eased((z-67)/13.5);
  const side=.80+(arrivalDeck-.80)*eased((z-72.55)/6.00);
  const shoulder=eased((Math.abs(x+38)-3.45)/2.15);
  return centerline+(side-centerline)*shoulder;
}
export function courtRoom(x,y,z){
  if(y<.52 || y>=8.48)return;
  return occupiedQuarters.find(p=>x>=p.west && x<=p.east && z>=p.north && z<=p.south);
}
export function loopPoint(angle){
  return {x:arrivalLoop.x+Math.cos(angle)*arrivalLoop.rx,z:arrivalLoop.z+Math.sin(angle)*arrivalLoop.rz};
}
const walls=[],piers=[],roofs=[];
function segment(p,side,start,end){
  if(end<=start)return;
  const horizontal=side==='north'||side==='south',len=end-start,m=(start+end)/2;
  walls.push({kind:'wall',x:horizontal?m:p[side],z:horizontal?p[side]:m,w:horizontal?len:.28,d:horizontal?.28:len,base:.78,top:8.48});
}
function facade(p,side,gaps){
  const horizontal=side==='north'||side==='south';
  let cursor=horizontal?p.west:p.north;
  for(const [mid,width] of gaps){segment(p,side,cursor,mid-width/2);cursor=mid+width/2;}
  segment(p,side,cursor,horizontal?p.east:p.south);
}
for(const [i,p] of promenades.entries()){
  // Expose the existing tower's door and breakable display windows inside the new arcade.
  facade(p,'north',i?[[-29.4,2.4],[-18,6.1]]:[[-69,3.15],[-56,6.1]]);
  facade(p,'south',i?[[-18,4.4]]:[[-57,5.1]]);
  facade(p,'west',i?[[75.6,3.25]]:[[69.7,3.0]]);
  facade(p,'east',i?[[75.6,3.25]]:[[75.6,3.25]]);
  // The roof surrounds the working tower. Its older apartment balconies, roof
  // access and aircraft contacts remain operable inside the central cutout.
  const tx=i?-18:-56,tw=i?15:13;
  const left=tx-tw/2-1.9,right=tx+tw/2+1.9;
  const slab=(x,z,w,d)=>roofs.push({kind:'roof',x,z,w,d,base:8.48,top:9.18});
  slab((p.west+left)/2,(p.north+p.south)/2,left-p.west,p.south-p.north);
  slab((p.east+right)/2,(p.north+p.south)/2,p.east-right,p.south-p.north);
  slab(tx,(74.5+p.south)/2,right-left,p.south-74.5);
}
// Colonnade supports flank the carriage opening. No pier sits in its drive lane.
for(const x of [-64.20,-49.80])for(const z of [78.35,85.38])piers.push({kind:'pier',x,z,w:.92,d:.92,base:arrivalDeck,top:8.6});
export const arrivalTrees=[[-73.65,92.8],[-73.6,96.4],[-65.1,97.85],[-60.1,98.12],[-53.9,98.12],[-49.2,97.9],[-35.4,92.6],[-35.5,97.25]];
export const palaceFurnishings=[
  {kind:'desk',x:-47.6,z:76.95,w:4.50,d:.82,h:1.21},
  {kind:'desk',x:-25.0,z:77.15,w:4.24,d:.84,h:1.21},
  ...[[-68.65,77.35],[-73.2,71.84],[-10.95,77.22],[-30.25,69.47]].map(([x,z])=>({kind:'seat',x,z,w:2.42,d:.78,h:1.01})),
  ...arrivalTrees.map(([x,z])=>({kind:'cypress',x,z,w:1.30,d:1.30,h:.92})),
];
for(const p of westArcades){
  roofs.push({kind:'arcade',x:(p.west+p.east)/2,z:(p.north+p.south)/2,w:p.east-p.west,d:p.south-p.north,base:5.95,top:6.38});
}
for(const [x,z] of [[-83.11,61.56],[-83.11,64.90],[-78.2,64.93],[-72.80,64.90],[-75.71,66.1],[-75.71,70.98]]){
  piers.push({kind:'arcade',x,z,w:.36,d:.36,base:.80,top:5.95});
}
export const arrivalArchitecture={walls,piers,roofs};
export const arrivalSolids=[...walls,...piers,...roofs,
  {x:-57,z:81.30,w:24,d:6.6,base:8.6,top:9.55},
  {x:-38,z:74.5,w:12.1,d:5.8,base:8.15,top:12.22},
  ...palaceFurnishings.map(p=>{const base=arrivalGround(p.x,p.z)??.80;return {...p,base,top:base+p.h};}),
].map(p=>{
  const floor=arrivalGround(p.x,p.z)??.8;
  return {x:p.x,z:p.z,w:p.w,d:p.d,bottom:p.base-floor,h:p.top-floor,flushEdge:p.kind==='roof' || p.kind==='arcade'};
});
