import {roadCabin} from './road-cabin.js';
import {drivenRoad} from './rover.js';
import {mountPosition} from './mounts.js';

export const sidearmSlot = 2;
export function sidearmCar(world,id){
  if(id==null || !world)return null;
  const car=world.rover?.gunner===id ? world.rover : drivenRoad(world,id);
  return car && !car.sinking && !car.wrecked && !car.boarding && !car.takeover ? car : null;
}
export function hasMountedTool(car){
  return !car.model && car.kind!=='supercar' || car.model==='engine';
}
export const carSource=car=>car.id??car.kind??'rover';
// The grip sits at the open side window in the same chassis frame as the seat.
export function carPistolGrip(car,id){
  if(car.gunner===id)return mountPosition(car,[-.40,1.82,.95]);
  const {handle,seat,scale}=roadCabin(car);
  return mountPosition(car,[handle[0],seat[1]+1.38*scale,seat[2]-.12]);
}
export function carPistolOrigin(car,id,yaw,pitch){
  const grip=carPistolGrip(car,id),forward=.24*Math.cos(pitch)-.14*Math.sin(pitch);
  return {x:grip.x+Math.sin(yaw)*forward,y:grip.y+.24*Math.sin(pitch)+.14*Math.cos(pitch),
    z:grip.z-Math.cos(yaw)*forward};
}
