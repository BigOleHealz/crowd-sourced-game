import {avenues,streets} from './brickell-map.js';
import {signalPost} from './scenery-layout.js';
import {civilianProfiles} from './civilian-fleet.js';

export const junctions=avenues.flatMap((x,col)=>streets.map((z,row)=>({
  x,z,id:signalPost(x,z).postId,offset:(row*123+col*71)%600,
})));
// Main and side approaches have an amber interval and a shared red clearance.
// Every client reads the existing authoritative simulation tick.
export function junctionLamp(tick,junction,alongAvenue){
  const t=(Math.max(0,tick)+junction.offset)%960;
  if(alongAvenue)return t<390?2:t<465?1:0;
  return t<495?0:t<855?2:t<930?1:0;
}
export function signalGap(car,tick,doors){
  const s=Math.sin(car.yaw),c=-Math.cos(car.yaw),avenue=Math.abs(c)>Math.abs(s);
  const profile=civilianProfiles[car.model];
  // A vehicle already over the line clears the intersection.
  for(const j of junctions){
    const side=avenue?j.x-car.x:j.z-car.z;
    if(Math.abs(side)>5.65 || doors?.posts?.[j.id]===0)continue;
    const along=(avenue?j.z-car.z:j.x-car.x)*Math.sign(avenue?c:s);
    const gap=along-(avenue?6.72:7.4)-profile.halfLength;
    if(gap<-.12 || gap>19)continue;
    const lamp=junctionLamp(tick,j,avenue);
    if(lamp===2 || (lamp===1 && gap<car.speed*car.speed/8+.16))continue;
    return Math.max(0,gap);
  }
  return Infinity;
}
