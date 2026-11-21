import {junctions,junctionLamp} from './junction-signals.js';
import {civilianProfiles} from './civilian-fleet.js';

export function sidewalkPace(index){
  return {speed:.245+((index*17)%13)*.0075,pause:24+(index*29)%74};
}

function crossingOccupied(car,x,z,span){
  if(!car || car.crushed || car.sling || (car.y??0)>3)return false;
  const along=Math.cos(car.yaw??0),side=Math.sin(car.yaw??0);
  const profile=civilianProfiles[car.model],length=profile?.halfLength??1.9,width=profile?.halfWidth??.87;
  const reachZ=Math.abs(along)*length+Math.abs(side)*width+.38;
  const reachX=Math.abs(side)*length+Math.abs(along)*width+.38;
  if(Math.abs(car.x-x)>span+reachX)return false;
  const dz=z-car.z,speedZ=-along*(car.speed??0);
  if(Math.abs(dz)<reachZ)return true;
  // Wait for vehicles already beyond the stop line, including player-driven cars.
  return Math.sign(dz)===Math.sign(speedZ) && Math.abs(dz)<reachZ+Math.abs(speedZ)*1.65;
}
export function curbWait(actor,tick,world){
  const cross=actor.route.crossing;
  if(!cross?.legs.includes(actor.next) || actor.crossing)return false;
  const j=junctions.find(j=>j.x===cross.x && j.z===cross.z);
  const [endX,z]=actor.route.points[actor.next];
  const span=Math.abs(endX-j.x);
  // A person already in the carriageway after a fright continues to the far curb.
  if(Math.abs(actor.state.x-j.x)>=span-.26){
    const ticksAcross=Math.ceil((2*span+.45)/(4.6*Math.max(.32,actor.sidewalk.speed))*30);
    if(world?.doors?.posts?.[j.id]!==0 &&
      (junctionLamp(tick,j,true)!==0 || junctionLamp(tick+ticksAcross,j,true)!==0))return true;
    const vehicles=[...(world?.traffic??[]),...(world?.patrolCars??[]),world?.rover,world?.supercar,world?.tank];
    if(vehicles.some(car=>crossingOccupied(car,j.x,z,span)))return true;
  }
  actor.crossing=true;return false;
}
