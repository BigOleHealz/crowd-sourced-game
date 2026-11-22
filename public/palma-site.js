// The set-out uses the game's Y-up coordinates. Every dimension is in metres.
export const fanHall=[[-88.5,32],[-74,32],[-74,35.5],[-69,35.5],[-69,52],[-74,52],[-74,62],[-88.5,62]];
export const arcade=[[-73,70],[-48,70],[-48,76],[-35,76],[-35,95],[-73,95]];
export const supper=[[-28,66.5],[-9,66.5],[-9,77.25],[-28,77.25]];
export const tower=[[-88.5,32],[-74,32],[-74,62],[-88.5,62]];
export const bridge=[[-73,52],[-69.7,52],[-69.7,70],[-73,70]];
export const shorePads=[
  {west:-91,east:-71.49,north:30,south:65},
  {west:-76,east:-32.4,north:72.55,south:99},
  {west:-32.4,east:-6.1,north:72.55,south:80.25},
];
export const valet={x:-63.9,z:44}, fountain={x:-54.6,z:44,r:6.05};
// Salt Arcade curbside display bays. Each nose turns out toward the street.
export const displayBays=[
  {model:'falco',x:-62,z:67.35,yaw:-Math.PI*4/9,hp:200},
  {model:'veloce',x:-54,z:67.35,yaw:Math.PI*4/9,hp:195},
];
export const resortArrivals=new Map([
  ['palma',{x:-67.4,y:1.8,z:43.4,yaw:-Math.PI/2}],
  ['palma-pool',{x:-72.7,y:96.4,z:41.15,yaw:.48}],
]);
export const levelY=[1.8,6.8,11.8,16.8,21.8,...Array.from({length:16},(_,i)=>+(26.8+3.8*i).toFixed(2)),87.6,92,96.4];
export const floorNames=['Fan Hall','Overture · Slots','Listening Room · Poker bridge','Reading Gallery','Lantern Gallery',
  ...Array.from({length:16},(_,i)=>'Suites '+(i+6)),'Penthouse · Salon','Penthouse · Bedroom','Penthouse · Pool'];
export const rect=(x0,z0,x1,z1)=>({x:(x0+x1)/2,z:(z0+z1)/2,w:x1-x0,d:z1-z0});
export const inside=(r,x,z,pad=0)=>Math.abs(x-r.x)<=r.w/2+pad && Math.abs(z-r.z)<=r.d/2+pad;
export const fanDecks=[rect(-88.5,32,-74,62),rect(-74,35.5,-69,52)];
export const arcadeDecks=[rect(-73,70,-48,95),rect(-48,76,-35,95)];
export const supperDeck=rect(-28,66.5,-9,77.25),bridgeDeck=rect(-73,52,-69.7,70);
export const atriumVoid=rect(-87.8,38.1,-72.8,49.9);
export const poolTerrace=rect(-74,30.25,-64.6,45.3);
export const pool=rect(-71.85,32.0,-66.45,39.0);
export const falls=[39.3,48.8];
export const doors={
  lobby:{x:-69,z:44,axis:'z',width:4},quay:{x:-88.5,z:51,axis:'z',width:2.4},
  arcadeWest:{x:-73,z:74.4,axis:'z',width:2.8},arcadeNorth:{x:-67.1,z:70,axis:'x',width:2.6},
  arcadeEast:{x:-44,z:76,axis:'x',width:2.6},arcadeBay:{x:-60,z:95,axis:'x',width:3},
  dining:{x:-28,z:73.6,axis:'z',width:2.5},diningBay:{x:-20,z:77.25,axis:'x',width:2.5},
};
const clamp=v=>Math.max(0,Math.min(1,v));
function arc(cx,cz,r,a,b){
  return Array.from({length:13},(_,i)=>{const t=(a+(b-a)*i/12)*Math.PI/180;return [cx+r*Math.cos(t),cz+r*Math.sin(t)];});
}
const turn=73.5*Math.PI/180;
export const drive=[[-40.9,23],...arc(-47.2,27.6,6.3,0,90),...arc(-57.7,40.1,6.2,270,180),
  ...arc(-57.7,47.9,6.2,180,90),...arc(-47.2,60.35,6.25,270,343.5),
  ...arc(-47.2+12.5*Math.sin(turn),60.35-12.5*Math.cos(turn),6.25,163.5,90).slice(1),[-23,63.05]];
export function laneHeight(x,z){
  if(x> -40.9)return .7;
  return .7+1.1*clamp((-40.9-x)/22.3);
}
// Sample both verges once. The stone coping, lamps and collision follow the same curves.
const stations=[];
for(let i=1;i<drive.length;i++){
  const [ax,az]=drive[i-1],[bx,bz]=drive[i],length=Math.hypot(bx-ax,bz-az);
  const count=Math.ceil(length/.64);
  for(let k=0;k<count;k++)stations.push([ax+(bx-ax)*k/count,az+(bz-az)*k/count]);
}
stations.push(drive.at(-1));
export const arrivalSections=stations.map(([x,z],i)=>{
  const a=stations[Math.max(0,i-1)],b=stations[Math.min(stations.length-1,i+1)];
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  return {x,z,nx:dz/length,nz:-dx/length,y:Math.max(.81,laneHeight(x,z)+.012)};
});
export const arrivalPoint=(p,offset,height)=>[p.x+p.nx*offset,height,p.z+p.nz*offset];
export const arrivalWalls=[];
for(let i=1;i<arrivalSections.length;i++)for(const side of [-1,1]){
  const a=arrivalSections[i-1],b=arrivalSections[i],x=(a.x+b.x)/2,z=(a.z+b.z)/2;
  if(x>-44.05 || z>55.25)continue;
  if(side===-1 && x<-62.7 && z>39.0 && z<49.0)continue;
  const from=arrivalPoint(a,side*2.38,a.y),to=arrivalPoint(b,side*2.38,b.y);
  // The two display bays open onto the inner verge; reserve their pull-out width.
  const edgeX=(from[0]+to[0])/2,edgeZ=(from[2]+to[2])/2;
  if(edgeX>-53.5 && edgeX<-42.0 && ((edgeZ>35.2 && edgeZ<38.1) || (edgeZ>50.0 && edgeZ<52.85)))continue;
  const ht=(side===1?.48:.73)*Math.min(1,(-44.05-x)/3,(55.25-z)/2.1);
  if(ht>.025)arrivalWalls.push({side,from,to,ht});
}
export const arrivalBarriers=arrivalWalls.map(({from:a,to:b,ht})=>{
  const x=(a[0]+b[0])/2,z=(a[2]+b[2])/2,top=(a[1]+b[1])/2+ht;
  return {x,z,w:Math.abs(a[0]-b[0])+.22,d:Math.abs(a[2]-b[2])+.22,h:top-(resortGround(x,z)??.80),arrivalWall:true};
});
export function onDrive(x,z){
  if(x< -66.2 || x> -22 || z<21 || z>65.4)return false;
  return drive.some(([ax,az],i)=>{
    if(!i)return false;
    const [bx,bz]=drive[i-1],dx=bx-ax,dz=bz-az;
    const t=clamp(((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1));
    return Math.hypot(x-ax-dx*t,z-az-dz*t)<2.22;
  });
}
export function resortGround(x,z){
  if(x< -91 || x> -9 || z<23 || z>99)return;
  if(x<=-88.5 && z>=49.5 && z<=64.8)return 1.8-clamp((z-51.2)/12);
  if(fanDecks.some(r=>inside(r,x,z)) || (x>=-69 && x<=-65.9 && z>=39.8 && z<=48.2))return 1.8;
  if(x>=-64 && x<=-49.35 && z>=97.25)return .8-.48*clamp((x+64)/5.76)*clamp((-49.35-x)/1.5);
  if(onDrive(x,z))return laneHeight(x,z);
}
