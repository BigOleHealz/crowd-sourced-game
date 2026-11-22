import {supercarLayout as gt} from './supercar-layout.js';
import { groundHeight } from './world.js';

import { wheelsFor,flatWheelDrop,isFlat } from './road-wheel-layout.js';
const springs=new WeakMap();
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const rounded=v=>Math.round(v*10000)/10000 || 0;

export function stepSuspension(rover,dt,surface=groundHeight) {
  const wheelStations=wheelsFor(rover);
  const s=Math.sin(rover.yaw),c=Math.cos(rover.yaw);
  const forward=rover.speed || 0,side=rover.lateralSpeed || 0;
  const vx=forward*s+side*c,vz=-forward*c+side*s;
  const ground=wheelStations.map(([width,length],i)=>{
    const x=rover.x+width*c-length*s,z=rover.z+width*s+length*c;
    // A 36 cm tire begins climbing a curb before its axle reaches the lip.
    const reach=.22, arc=.36-Math.sqrt(.36**2-reach**2);
    return Math.max(surface(x,z),surface(x+s*reach,z-c*reach)-arc,
      surface(x-s*reach,z+c*reach)-arc) - (isFlat(rover,i) ? flatWheelDrop : 0);
  });
  let state=springs.get(rover);
  if(!state) {
    state={vx,vz,heights:[...ground],rates:[0,0,0,0]};
    springs.set(rover,state);
  }
  const ax=(vx-state.vx)/dt,az=(vz-state.vz)/dt;
  state.vx=vx;state.vz=vz;
  const sport=rover.kind==='supercar';
  const pitchLoad=clamp((ax*s-az*c)*(sport?.005:.012),sport?-.12:-.60,sport?.09:.60);
  const rollLoad=clamp((ax*c+az*s)*.010,-.40,.40);
  for(let i=0;i<4;i++) {
    const [width,length]=wheelStations[i];
    const target=ground[i]-length*pitchLoad+width*rollLoad;
    // Four damped springs support the body. Substeps also resolve an abrupt
    // stop in one 30 Hz server tick without an unstable rebound.
    const substeps=Math.max(1,Math.ceil(dt*120)), h=dt/substeps;
    for(let n=0;n<substeps;n++) {
      const force=125*(target-state.heights[i])-(sport?18:13)*state.rates[i];
      state.rates[i]+=force*h;
      state.heights[i]+=state.rates[i]*h;
    }
    const lower=ground[i]-(sport?gt.bumpTravel:.22),upper=ground[i]+(sport?.145:.24);
    state.heights[i]=clamp(state.heights[i],lower,upper);
    if(sport && ((state.heights[i]===lower && state.rates[i]<0) || (state.heights[i]===upper && state.rates[i]>0)))state.rates[i]=0;
  }
  const [lf,lr,rf,rr]=state.heights;
  const center=(lf+lr+rf+rr)/4;
  const pitch=Math.atan2((lf+rf-lr-rr)/2,wheelStations[1][1]-wheelStations[0][1]);
  const roll=Math.atan2((rf+rr-lf-lr)/2,wheelStations[2][0]-wheelStations[0][0]);
  if(sport){
    // All four arches ride on one rigid chassis. A diagonally raised wheel
    // needs its own bump stop even when the mean axle height barely changes.
    const cp=Math.cos(pitch),sp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);
    const upY=cp*cr;
    let bodyY=center;
    for(let i=0;i<4;i++){
      const [x,z]=wheelStations[i],stationY=cp*sr*x-sp*z;
      bodyY=Math.max(bodyY,ground[i]+gt.tire-stationY-upY*(gt.tire+gt.bumpTravel));
    }
    rover.suspension={heave:rounded(bodyY-rover.y),pitch:rounded(pitch),roll:rounded(roll),
      wheels:ground.map((contact,i)=>{
        const [x,z]=wheelStations[i];
        const lowest=bodyY+cp*sr*x-sp*z+upY*(gt.tire-.24)-gt.tire;
        return rounded(Math.max(contact,lowest)-rover.y);
      })};
    return;
  }
  rover.suspension={heave:rounded(center-rover.y),pitch:rounded(pitch),roll:rounded(roll),
    wheels:ground.map((contact,i)=>{
      const [x,z]=wheelStations[i];
      const body=center-z*Math.sin(pitch)+x*Math.sin(roll);
      return rounded(clamp(contact,body-.24,body+.22)-rover.y);
    })};
}

// Replay starts between server ticks. Restore the chassis' current attitude
// before integrating the next input instead of reseating it on all four tyres.
export function seedRoadSuspension(car){
  const pose=car.suspension;
  if(!pose || car.bridgeFlight)return;
  const s=Math.sin(car.yaw),c=Math.cos(car.yaw),f=car.speed||0,side=car.lateralSpeed||0;
  const heights=wheelsFor(car).map(([x,z])=>car.y+pose.heave-z*Math.tan(pose.pitch)+x*Math.tan(pose.roll));
  springs.set(car,{vx:f*s+side*c,vz:-f*c+side*s,heights,rates:[0,0,0,0]});
}

export function interpolateSuspension(a,b,t) {
  if(!a || !b) return b;
  const mix=(x,y)=>x+(y-x)*t;
  return {heave:mix(a.heave,b.heave),pitch:mix(a.pitch,b.pitch),roll:mix(a.roll,b.roll),
    wheels:b.wheels.map((height,i)=>mix(a.wheels[i],height))};
}
