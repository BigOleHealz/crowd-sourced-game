import {marinaModel} from './marina-fleet-layout.js';
import {cityGround} from './brickell-map.js';

const tau=2*Math.PI,clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const ease=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

// Open-water routes leave room for beach waders, the ferry ramp and boats
// berthed alongside the East Quay fingers. The adults and juvenile vary in size.
export const manateeHabitats=[
  {name:'Harbor Key shallows',x:71.9,z:-237.5,rx:2.5,rz:7.6,size:1.04,phase:1.4,turn:.105,breath:56,offset:47,tint:0x818784,minX:66.8},
  {name:'Harbor Key north shore',x:75.5,z:-263.4,rx:2.1,rz:6.6,size:.79,phase:2.3,turn:.118,breath:49,offset:20,tint:0x79817e,minX:69.5},
  {name:'Lantern Point ferry approach',x:82.8,z:-390.7,rx:3.4,rz:5.1,size:1,phase:3.55,turn:.111,breath:61,offset:51,tint:0x848985,minX:78.8},
  {name:'East Quay south',x:95.9,z:-422.2,rx:3.9,rz:7.4,size:1.06,phase:2.35,turn:.102,breath:54,offset:38,tint:0x808884,minX:91.05},
  {name:'East Quay north',x:98.0,z:-440.4,rx:3.6,rz:7.7,size:.91,phase:2.64,turn:.091,breath:63,offset:60,tint:0x7c8580,minX:91.05},
];

function orbit(h,t) {
  const a=h.phase+t*h.turn+.15*Math.sin(t*.19+h.phase);
  return {x:h.x+h.rx*Math.cos(a)+.40*Math.sin(a*2),z:h.z+h.rz*Math.sin(a)};
}

export function manateeFloor(h,x,z) {
  const reach=1.92*h.size;
  return Math.max(cityGround(x,z),cityGround(x-reach,z),cityGround(x+reach,z),
    cityGround(x,z-reach),cityGround(x,z+reach));
}
function canSwim(h,x,z,water) {
  return x>=h.minX && x<106.5 && Math.abs(x-h.x)<h.rx+8 && Math.abs(z-h.z)<h.rz+7 &&
    manateeFloor(h,x,z)<water-1.22;
}

// A signed distance to the vessel's oriented waterline gives a closest safe
// direction even when a boat crosses the animal's course at speed.
function hullBasis(boat,x,z,yacht,lookAhead) {
  const c=Math.cos(boat.yaw),s=Math.sin(boat.yaw);
  const ahead=clamp((boat.speed||0)*lookAhead,-4,12);
  const dx=x-boat.x-s*ahead,dz=z-boat.z+c*ahead;
  const model=marinaModel(boat);
  return {c,s,u:c*dx+s*dz,v:c*dz-s*dx,w:yacht?6.55:(model?.halfWidth??1.14),l:yacht?21.6:(model?.halfLength??2.86)};
}
export function manateeHullClearance(boat,x,z,yacht=false,lookAhead=0) {
  const {c,s,u,v,w,l}=hullBasis(boat,x,z,yacht,lookAhead);
  let ax=u-clamp(u,-w,w),az=v-clamp(v,-l,l);
  let distance=Math.hypot(ax,az);
  if(distance<.0001){
    if(w-Math.abs(u)<l-Math.abs(v)){
      ax=Math.sign(u)||1;az=0;distance=Math.abs(u)-w;
    }else{
      ax=0;az=Math.sign(v)||1;distance=Math.abs(v)-l;
    }
  }else {ax/=distance;az/=distance;}
  return {x:c*ax-s*az,z:s*ax+c*az,distance};
}
function escape(boat,h,x,z,water,yacht,side,padding,lookAhead=0){
  const margin=padding+.018,shift=Math.max(.14,margin-side.distance);
  const preferred={x:x+side.x*shift,z:z+side.z*shift};
  if(canSwim(h,preferred.x,preferred.z,water))return preferred;
  const {c,s,u,v,w,l}=hullBasis(boat,x,z,yacht,lookAhead);
  const sides=[[-w-margin-u,0],[w+margin-u,0],[0,-l-margin-v],[0,l+margin-v]];
  sides.sort((a,b)=>Math.abs(a[0]+a[1])-Math.abs(b[0]+b[1]));
  for(const [dx,dz] of sides){
    const tx=x+c*dx-s*dz,tz=z+s*dx+c*dz;
    if(canSwim(h,tx,tz,water))return {x:tx,z:tz};
  }
  return null;
}

function breathing(h,time){
  const elapsed=(time+h.offset)%h.breath;
  const since=elapsed-(h.breath-6.2);
  const lift=ease(0,2.4,since)*(1-ease(3.55,6.15,since));
  return {lift,air:since>=1.95?since-1.95:-1};
}
const round=v=>Math.round(v*1000)/1000;

export function createManatees(world,water) {
  let time=0;
  const motion=manateeHabitats.map(h=>{
    const p=orbit(h,0),ahead=orbit(h,.1);
    return {...p,y:water-.77,yaw:Math.atan2(ahead.x-p.x,p.z-ahead.z),vx:0,vz:0,roll:0,stroke:h.phase,air:-1,pitch:0};
  });
  const state=motion.map(s=>({x:round(s.x),y:round(s.y),z:round(s.z),yaw:round(s.yaw),pitch:0,roll:0,stroke:round(s.stroke),air:-1}));
  function step(dt) {
    time+=dt;
    const vessels=[...(world.boats??[]),...(world.yacht?[world.yacht]:[])].filter(b=>!b.wrecked && !b.sling);
    for(const [i,p] of motion.entries()){
      const h=manateeHabitats[i],goal=orbit(h,time+1.9),breath=breathing(h,time),padding=1.92*h.size;
      let ax=(goal.x-p.x)*.52,az=(goal.z-p.z)*.52,pressure=0,dive=0;
      const keel=boat=>(boat.y??water)+(boat===world.yacht?-1.25:(marinaModel(boat)?.keel??-.58))-.56*h.size;
      for(const boat of vessels){
        if(Math.hypot(p.x-boat.x,p.z-boat.z)>42)continue;
        const yacht=boat===world.yacht;
        const near=manateeHullClearance(boat,p.x,p.z,yacht);
        const ahead=manateeHullClearance(boat,p.x,p.z,yacht,1.4);
        const forecast=ahead.distance<near.distance,threat=forecast?ahead:near;
        const weight=1-ease(padding,8.2,threat.distance);
        if(!weight)continue;
        const clear=escape(boat,h,p.x,p.z,water,yacht,threat,padding+.8,forecast?1.4:0);
        const dx=clear ? clear.x-p.x : threat.x,dz=clear ? clear.z-p.z : threat.z;
        const length=Math.hypot(dx,dz);
        ax+=dx/length*weight*2.9;az+=dz/length*weight*2.9;
        pressure=Math.max(pressure,weight);
        const clearance=keel(boat);
        if(manateeFloor(h,p.x,p.z)+.48*h.size<clearance){
          const urgency=1-ease(padding+.3,padding+6.4,threat.distance);
          dive=Math.max(dive,(water-clearance)*urgency);
        }
      }
      for(const other of motion){
        if(other===p)continue;
        const dx=p.x-other.x,dz=p.z-other.z,d=Math.hypot(dx,dz);
        if(d>.02 && d<4){const f=(4-d)*.36/d;ax+=dx*f;az+=dz*f;}
      }
      const cap=.97+.67*pressure,scale=Math.max(1,Math.hypot(ax,az)/cap),blend=-Math.expm1(-(1.45+pressure*2)*dt);
      p.vx+=(ax/scale-p.vx)*blend;p.vz+=(az/scale-p.vz)*blend;
      let x=p.x+p.vx*dt,z=p.z+p.vz*dt;
      if(!canSwim(h,x,z,water)){
        if(canSwim(h,p.x,z,water)){x=p.x;p.vx=0;}
        else if(canSwim(h,x,p.z,water)){z=p.z;p.vz=0;}
        else {x=p.x;z=p.z;p.vx=p.vz=0;}
      }
      // A deep-water crossing can pass beneath a keel. Move sideways in
      // shallower water, where a dive cannot clear both hull and bottom.
      let ceiling=Infinity,floor=manateeFloor(h,x,z)+.48*h.size;
      for(const boat of vessels){
        if(Math.hypot(x-boat.x,z-boat.z)>27)continue;
        const away=manateeHullClearance(boat,x,z,boat===world.yacht);
        if(away.distance>=padding)continue;
        const clearance=keel(boat);
        if(floor<clearance){ceiling=Math.min(ceiling,clearance);continue;}
        const clear=escape(boat,h,x,z,water,boat===world.yacht,away,padding);
        if(clear){x=clear.x;z=clear.z;floor=manateeFloor(h,x,z)+.48*h.size;}
      }
      const lift=breath.lift*(1-ease(.16,.76,pressure));
      const depth=.76+.19*Math.sin(time*.14+h.phase*2)+.15*Math.sin(time*.071+h.phase);
      const normalY=water-depth+(.50+depth-.76)*lift-.35*pressure;
      const targetY=Math.max(floor,Math.min(normalY,water-dive,ceiling));
      const verticalRate=targetY<p.y && pressure>.40?3.1:1.62;
      p.y=clamp(p.y+(targetY-p.y)*(-Math.expm1(-verticalRate*dt)),floor,ceiling);
      const speed=Math.hypot(p.vx,p.vz),bearing=speed>.045?Math.atan2(p.vx,-p.vz):p.yaw;
      const turn=Math.atan2(Math.sin(bearing-p.yaw),Math.cos(bearing-p.yaw));
      p.yaw+=clamp(turn,-dt*.77,dt*.77);
      p.yaw=Math.atan2(Math.sin(p.yaw),Math.cos(p.yaw));
      p.stroke=(p.stroke+dt*(1.08+.74*speed))%tau;
      p.pitch=.055*Math.sin(time*.32+h.phase)+.145*lift-.10*pressure;
      p.roll+=(clamp(-turn*.20,-.26,.26)+.075*Math.sin(time*.28+h.phase)-p.roll)*(-Math.expm1(-2.2*dt));
      p.air=lift>.39 && p.y>water-.55 ? breath.air : -1;
      p.x=x;p.z=z;
      Object.assign(state[i],{x:round(x),y:round(p.y),z:round(z),yaw:round(p.yaw),pitch:round(p.pitch),
        roll:round(p.roll),stroke:round(p.stroke),air:round(p.air)});
    }
  }
  return {state,step};
}
