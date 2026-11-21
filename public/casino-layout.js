export const casinoName='Lantern Club Casino';
export const casinoSeat={x:33.5,y:1.07,z:-393.15};
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
