import {sandHeight} from './beach-layout.js';
import {rideTravelYaw} from './street-rides.js';

export const skatePark={name:'South Beach Skate Park',west:38.9,east:47.1,north:-180.5,south:-154.5,y:1.03};
const p=skatePark;
export const parkBanks=[
  {x:41.38,w:3.4,profile:[[-176.4,0],[-173.8,.72],[-170.2,.72],[-167.5,0]]},
  {x:45.05,w:2.25,profile:[[-165.65,0],[-165.15,.44],[-164.9,.44],[-162.35,0]]},
  {x:41.25,w:3.35,profile:[[-163.4,0],[-161.2,.48],[-160.45,.48],[-158.2,0]]},
];
export const parkRails=[
  {id:'flat-bar',x:45.05,north:-173.65,south:-165.20,y:p.y+.45},
  {id:'box-rail',x:42.02,north:-173.83,south:-170.18,y:p.y+.72+.29},
];
const clamp=v=>Math.max(0,Math.min(1,v));
export function inSkatePark(x,z){
  return x>=p.west && x<=p.east && z>=p.north && z<=p.south;
}
export function bankRise(bank,x,z){
  const edge=(bank.w/2-Math.abs(x-bank.x))/.63;
  if(edge<=0)return 0;
  for(let i=1;i<bank.profile.length;i++){
    const [a,low]=bank.profile[i-1],[b,high]=bank.profile[i];
    if(z>=a && z<=b)return (low+(high-low)*(z-a)/(b-a))*clamp(edge);
  }
  return 0;
}
export function skateParkFloor(x,z){
  if(!inSkatePark(x,z))return undefined;
  const sand=sandHeight(x,z);
  const edge=Math.min(x-p.west,p.east-x,z-p.north,p.south-z);
  return sand+(p.y-sand)*clamp(edge/.65)+Math.max(...parkBanks.map(b=>bankRise(b,x,z)));
}
export function parkRides(ground){
  return [['board',45.05],['bike',41.38]].map(([kind,x])=>({
    id:'park-'+kind,kind,label:kind==='bike'?'bicycle':'skateboard',color:0xe58e4e,
    x,y:ground(x,-156.35),z:-156.35,yaw:0,rider:null,
  }));
}

// Both the client prediction and server resolve the trucks or pegs over the bar.
// Departure keeps the component of speed along the rail for a rolling exit.
export function rideParkRail(previous,next,input){
  const r=next.ride,old=previous.ride;
  const locked=parkRails.find(rail=>rail.id===old.grind);
  const rail=locked??parkRails.find(b=>Math.abs(next.x-b.x)<(r.kind==='bike'?.24:.29) &&
    next.z>=b.north && next.z<=b.south && previous.y>=b.y-.12 && next.y<=b.y+.14 && previous.vy<=.12 &&
    r.speed>1.45 && Math.abs(Math.cos(r.yaw))>.88 && (r.kind==='bike' || Math.abs(next.vz)>.88*r.speed));
  if(!rail)return;
  const sign=locked?Math.sign(Math.cos(rideTravelYaw(old))):r.kind==='board'?Math.sign(-next.vz):Math.sign(Math.cos(r.yaw));
  if(locked && (input.jump || next.z<rail.north || next.z>rail.south || r.speed<.55)){
    delete r.grind;
    next.grounded=false;next.y=Math.max(next.y,rail.y);
    return;
  }
  if(r.kind==='board' && sign*Math.cos(r.yaw)<0)r.reverse=true;
  else delete r.reverse;
  r.grind=rail.id;r.yaw=(r.reverse?-sign:sign)>0?0:Math.PI;
  next.x=rail.x;next.y=rail.y;next.vx=0;next.vy=0;next.vz=-sign*r.speed;next.grounded=true;
}
