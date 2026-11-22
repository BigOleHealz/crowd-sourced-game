import {resortLevelAt,resortLevels} from './grand-resort-layout.js';
import {doors,resortGround,arrivalBarriers} from './palma-site.js';
import {fountainWalls} from './centaur-fountain-layout.js';
export const casinoName='Palma de Sal';
export const casinoHall={x:-78.75,z:47,w:19.5,d:30,floor:1.8,ceiling:26.58};
export const casinoEntrance=doors.lobby,casinoSideDoor=doors.quay;
export const casinoSeat={x:-68,y:.8,z:81.55},tableZ=80.2;
// Only street-level furniture and walls participate in road-vehicle contact.
// The per-storey index handles walking collision and upper levels.
export const resortBarriers=[...arrivalBarriers,...fountainWalls,
  ...resortLevels[0].parts.filter(p=>p.facade && p.base<3.5).map(p=>{
    const bottom=p.base-(resortGround(p.x,p.z)??.8);
    return {x:p.x,z:p.z,w:p.w,d:p.d,bottom,h:bottom+p.h,paneId:p.paneId,resortShell:true};
  }),
  {x:casinoSeat.x,z:tableZ,w:2.8,d:1.12,h:.96}];
export function insideCasino(x,y,z){return !!resortLevelAt(x,y,z);}
export const stakes=[0,10,20,50];
export function nearBlackjack(feet){
  return !!feet?.grounded && !feet.ride && !feet.swimming && !feet.climb && !feet.parachute && !feet.liftTravel &&
    Math.abs(feet.y-casinoSeat.y)<.45 && Math.hypot(feet.x-casinoSeat.x,feet.z-casinoSeat.z)<1.7;
}
export function handValue(cards){
  let value=0,aces=0;
  for(const card of cards){
    const rank=card%13;
    value+=rank===0?11:Math.min(rank+1,10);
    if(!rank)aces++;
  }
  while(value>21 && aces>0){value-=10;aces--;}
  return value;
}
export function cardName(card){
  return card<0?'Face down':['A','2','3','4','5','6','7','8','9','10','J','Q','K'][card%13]+['♣','♦','♥','♠'][Math.floor(card/13)];
}
