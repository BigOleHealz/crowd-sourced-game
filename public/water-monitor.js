import {CITY} from './world.js';
export const engineBay=CITY?{x:20,z:18}:{x:-5,z:21};
export const waterRange=34,monitorHeight=2.67;

// Distance along the original bore axis. The display and contact checks
// reconstruct the same gravity curve from the replicated end of the jet.
export const nozzleLength=.68;
export const waterDrop=d=>.0033*Math.max(0,d-nozzleLength)**2;
export function jetPoint(car,end,t,out={}){
  const begin=nozzleLength/Math.max(nozzleLength,end.d);
  t=begin+(1-begin)*t;
  out.x=car.x+(end.x-car.x)*t;
  out.z=car.z+(end.z-car.z)*t;
  out.y=car.y+monitorHeight+(end.y-car.y-monitorHeight)*t+t*waterDrop(end.d)-waterDrop(end.d*t);
  return out;
}

export function jetPassage(car,end,x,z){
  const dx=end.x-car.x,dz=end.z-car.z,h2=dx*dx+dz*dz;
  if(h2<.001)return;
  const t=((x-car.x)*dx+(z-car.z)*dz)/h2,begin=nozzleLength/end.d;
  if(t<begin || t>1.001 || begin>=1)return;
  const at=jetPoint(car,end,Math.min(1,(t-begin)/(1-begin)));
  return {side:Math.hypot(x-at.x,z-at.z),height:at.y};
}
