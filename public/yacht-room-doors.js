import {mainSole,upperSole,lowerSole,lowerStair} from './solana-interior.js';

export const yachtRoomDoors=[
  {x:0,y:mainSole,z:.88,w:2.83,label:'Main salon'},
  {x:0,y:mainSole,z:-11.85,w:2.83,label:'Forward salon'},
  {x:0,y:upperSole,z:-.88,w:2.83,label:'Upper lounge'},
  {x:0,y:upperSole,z:-10.05,w:2.83,label:'Chart room'},
  {x:(lowerStair.left+lowerStair.right)/2,y:lowerSole,z:lowerStair.aft+.20,w:lowerStair.right-lowerStair.left,label:'Guest suite'},
].map((d,id)=>({...d,id,h:1.96}));
export function yachtDoorNear(feet){
  return yachtRoomDoors.find(d=>Math.abs(feet.y-d.y)<.46 && Math.hypot(feet.x-d.x,feet.z-d.z)<1.55);
}
export function yachtDoorHit(d,x,lo,z,hi,pad){
  return hi>d.y+.015 && lo<d.y+d.h && Math.abs(x-d.x)<=d.w/2+pad && Math.abs(z-d.z)<=.033+pad;
}
export function closedCabinContact(mask,x,lo,z,hi,pad){
  return !!mask && yachtRoomDoors.some(d=>(mask & (1<<d.id)) && yachtDoorHit(d,x,lo,z,hi,pad));
}
