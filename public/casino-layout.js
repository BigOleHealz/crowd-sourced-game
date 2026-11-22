import {resortLevelAt} from './grand-resort-layout.js';
export const casinoName='Lantern Club Casino';
export const casinoHall={x:-59,z:47,w:26,d:16,floor:.80,ceiling:5.6};
export const casinoEntrance={x:-55,z:55};
export const casinoSideDoor={x:-46,z:46};
export const casinoSeat={x:-55,y:casinoHall.floor,z:44.7};
export const tableZ=casinoSeat.z-1.35;

// Keep the south and east thresholds clear from the sidewalk to the tables.
const wall=(x,z,w,d)=>({x,z,w,d,h:casinoHall.ceiling-casinoHall.floor});
export const resortBarriers=[
  wall(-72,42.1,.26,6.2),wall(-72,51.4,.26,7.2),wall(-67.4,39,9.2,.26),wall(-52.6,39,13.2,.26),
  wall(-64.5,55,15,.26),wall(-49.5,55,7,.26),
  wall(-46,41.75,.26,5.5),wall(-46,51.25,.26,7.5),

  {x:-44,z:53,w:2.64,d:2.64,h:.52},
  ...[-60.35,-49.65].map(x=>({x,z:56.35,w:.35,d:.38,h:3.7})),
  {x:casinoSeat.x,z:tableZ-.21,w:2.96,d:.50,h:.96},
  {x:casinoSeat.x,z:tableZ+.21,w:2.62,d:.36,h:.96},
  {x:casinoSeat.x,z:tableZ+.51,w:1.84,d:.25,h:.96},
];
export function insideCasino(x,y,z){
  return !!resortLevelAt(x,y,z,.25);
}
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
