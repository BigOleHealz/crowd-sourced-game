import {CITY,groundHeight} from './world.js';
import {roadHullFor} from './road-contact.js';

const sites=CITY ? [[-5.55,9.5],[36.9,38],[-32.65,-30],[5.8,-197],[26.9,-247],
  [5.8,-391],[42.7,-374.6],[-44.1,-440]] : [[-7.9,20.8],[13.4,1.2],[12.6,-51.4]];
export const hydrants=sites.map(([x,z],id)=>({id,x,z,y:groundHeight(x,z)}));
export const repairTicks=900,sprayTicks=360;

function touches(car,p){
  if(Math.abs(car.x-p.x)>3.5 || Math.abs(car.z-p.z)>3.5 || car.y>p.y+.66 || car.y+1<p.y)return false;
  const dx=p.x-car.x,dz=p.z-car.z,c=Math.cos(car.yaw),s=Math.sin(car.yaw),hull=roadHullFor(car);
  return Math.abs(dx*c+dz*s)<hull.halfWidth+.13 && Math.abs(dz*c-dx*s)<hull.halfLength+.13;
}

// The room owns the pressure timer. Shutting off, repairing and joining
// midway all derive from the same small replicated count on the broken base.
export function stepHydrants(world){
  const cars=[world.rover,world.supercar,world.tank,...(world.traffic??[])].filter(car=>car && !car.crushed);
  for(const point of hydrants){
    const state=world.doors.hydrants,remaining=state?.[point.id];
    if(remaining!=null){
      if(remaining>1)state[point.id]--;
      else if(!cars.some(car=>touches(car,point)))delete state[point.id];
    }else if(cars.some(car=>!car.wrecked && Math.abs(car.speed)>.15 && touches(car,point))){
      (world.doors.hydrants??={})[point.id]=repairTicks;
    }
  }
}
