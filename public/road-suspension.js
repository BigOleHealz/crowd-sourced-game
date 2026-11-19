import { groundHeight } from './world.js';

import { wheelStations,flatWheelDrop,isFlat } from './road-wheel-layout.js';
const springs=new WeakMap();
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const rounded=v=>Math.round(v*10000)/10000 || 0;

export function stepSuspension(rover,dt,surface=groundHeight) {
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
  const pitchLoad=clamp((ax*s-az*c)*.012,-.60,.60);
  const rollLoad=clamp((ax*c+az*s)*.010,-.40,.40);
  for(let i=0;i<4;i++) {
    const [width,length]=wheelStations[i];
    const target=ground[i]-length*pitchLoad+width*rollLoad;
    // Four damped springs support the body. Substeps also resolve an abrupt
    // stop in one 30 Hz server tick without an unstable rebound.
    const substeps=Math.max(1,Math.ceil(dt*120)), h=dt/substeps;
    for(let n=0;n<substeps;n++) {
      const force=125*(target-state.heights[i])-13*state.rates[i];
      state.rates[i]+=force*h;
      state.heights[i]+=state.rates[i]*h;
    }
    state.heights[i]=clamp(state.heights[i],ground[i]-.22,ground[i]+.24);
  }
  const [lf,lr,rf,rr]=state.heights;
  const center=(lf+lr+rf+rr)/4;
  const pitch=Math.atan2((lf+rf-lr-rr)/2,1.89);
  const roll=Math.atan2((rf+rr-lf-lr)/2,1.40);
  rover.suspension={heave:rounded(center-rover.y),pitch:rounded(pitch),roll:rounded(roll),
    wheels:ground.map((contact,i)=>{
      const [x,z]=wheelStations[i];
      const body=center-z*Math.sin(pitch)+x*Math.sin(roll);
      return rounded(clamp(contact,body-.24,body+.22)-rover.y);
    })};
}

export function interpolateSuspension(a,b,t) {
  if(!a || !b) return b;
  const mix=(x,y)=>x+(y-x)*t;
  return {heave:mix(a.heave,b.heave),pitch:mix(a.pitch,b.pitch),roll:mix(a.roll,b.roll),
    wheels:b.wheels.map((height,i)=>mix(a.wheels[i],height))};
}
