// All base footprints are shared by terrain, aircraft, the chart and scenery.
import {carrierRamp} from './eisenhower-carrier-layout.js';
export const militaryIsland={west:-250,east:-133,north:-309,south:-151};
export const militaryShore=[
  [-238,-309],[-145,-309],[-133,-297],[-133,-163],
  [-145,-151],[-238,-151],[-250,-163],[-250,-297],
];
export const militaryRunway={west:-234,east:-216,north:-297,south:-163};
export const militaryTaxiway={west:-216,east:-187,north:-254,south:-246};
export const militaryHangar={x:-174,z:-250,w:32,d:24};
export const militaryNorthTaxiway={west:-216,east:-187,north:-286,south:-278};
export const militaryNorthHangar={x:-174,z:-282,w:32,d:24};
export const militaryTaxiways=[militaryTaxiway,militaryNorthTaxiway];
export const militaryHangars=[militaryHangar,militaryNorthHangar];
export const militaryHelipads=[{x:-169,z:-209,r:9},{x:-169,z:-176,r:9}];
// The 72 m channel matches the Harbor Key to Lantern Point crossing.
export const militaryBridge={
  west:militaryIsland.east,east:-61,north:-235,south:-225,
  height(x){const t=Math.max(0,Math.min(1,(x-this.west)/(this.east-this.west)));
    return .8+4.4*Math.sin(Math.PI*t)**2;},
};
export const militaryAccessRoad={west:-190,east:militaryIsland.east,north:-235,south:-225};
export const militaryDock={
  ramp:{west:-133,east:-127,north:-255,south:-249},
  pier:{west:-127,east:-109,north:-255,south:-249},
  fingers:[
    {west:-112,east:-109,north:-271,south:-255},
    {west:-112,east:-109,north:-249,south:-233},
  ],
  height:.56,
};
export const militaryDecks=[militaryDock.ramp,militaryDock.pier,...militaryDock.fingers];
// Four-metre bays keep collision, blast damage and the rendered fence in sync.
// The road and dock have clear entrances rather than an invisible barrier.
export const militaryFence=[];
function fenceRun(axis,fixed,start,end,openings=[]){
  for(let at=start;at<end-.01;at+=4){
    const last=Math.min(at+4,end),middle=(at+last)/2;
    if(openings.some(([a,b])=>middle>a && middle<b))continue;
    const id='military-fence-'+militaryFence.length;
    militaryFence.push(axis==='x'
      ? {fenceId:id,x:middle,z:fixed,w:last-at,d:.18,h:2.55}
      : {fenceId:id,x:fixed,z:middle,w:.18,d:last-at,h:2.55});
  }
}
fenceRun('x',-301,-246,-137);
fenceRun('z',-137,-301,-159,[[-257,-247],[-237,-223]]);
fenceRun('x',-159,-246,-137);
// The carrier shore ramp passes through this opening in the west perimeter.
const rampGateZ=carrierRamp.shore.z+(-246-carrierRamp.shore.x)*
  (carrierRamp.turn.z-carrierRamp.shore.z)/(carrierRamp.turn.x-carrierRamp.shore.x);
fenceRun('z',-246,-301,-159,[[rampGateZ-7,rampGateZ+7]]);
export const fenceDown=(doors,id)=>Boolean(doors?.militaryFence?.[id]);
export function breakMilitaryFence(doors,id){
  if(!doors || !id || fenceDown(doors,id))return false;
  (doors.militaryFence??={})[id]=true;
  return true;
}
export function blastMilitaryFence(doors,point,radius){
  let broken=0;
  for(const bay of militaryFence){
    const dx=Math.max(0,Math.abs(point.x-bay.x)-bay.w/2);
    const dz=Math.max(0,Math.abs(point.z-bay.z)-bay.d/2);
    const dy=Math.max(0,.8-point.y,point.y-(.8+bay.h));
    if(Math.hypot(dx,dy,dz)<=radius && breakMilitaryFence(doors,bay.fenceId))broken++;
  }
  return broken;
}
export const militaryBarriers=[
  ...militaryFence,
  ...militaryHangars.flatMap(h=>[
    ...[-1,1].map(side=>({x:h.x,z:h.z+side*(h.d/2-.4),w:h.w,d:.8,h:6.8})),
    // The taxiway-facing west end is open for aircraft and players.
    {x:h.x+h.w/2-.4,z:h.z,w:.8,d:h.d,h:6.8},
    {x:h.x,z:h.z,w:h.w,d:h.d,bottom:6.1,h:7.0},
  ]),
  ...[-268,-236].map(z=>({x:-110.5,z,w:.38,d:.38,bottom:.56,h:1.13})),
];
export const insideMilitary=(x,z)=>{
  const {west,east,north,south}=militaryIsland;
  if(x<west || x>east || z<north || z>south)return false;
  const edge=Math.min(x-west,east-x);
  return z>=north+12-edge && z<=south-12+edge;
};
export function militaryShoreDistance(x,z){
  if(x<militaryIsland.west-10 || x>militaryIsland.east+10 ||
    z<militaryIsland.north-10 || z>militaryIsland.south+10)return Infinity;
  let distance=Infinity;
  for(let i=0;i<militaryShore.length;i++){
    const [ax,az]=militaryShore[i],[bx,bz]=militaryShore[(i+1)%militaryShore.length];
    const dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    distance=Math.min(distance,Math.hypot(x-ax-t*dx,z-az-t*dz));
  }
  return distance;
}
export const onMilitaryRockShore=(x,z)=>!insideMilitary(x,z) &&
  militaryShoreDistance(x,z)<=10 && !onMilitaryBridge(x,z) && militaryDockHeight(x,z)===undefined;
const inside=(r,x,z)=>x>=r.west&&x<=r.east&&z>=r.north&&z<=r.south;
export const onMilitaryBridge=(x,z)=>inside(militaryBridge,x,z);
export function militaryDockHeight(x,z){
  if(inside(militaryDock.ramp,x,z))return .8-(.8-militaryDock.height)*(x-militaryDock.ramp.west)/(militaryDock.ramp.east-militaryDock.ramp.west);
  return militaryDecks.slice(1).some(r=>inside(r,x,z))?militaryDock.height:undefined;
}
