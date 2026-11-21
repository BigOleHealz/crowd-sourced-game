import {furnishingSupported} from './estate-damage.js';

// The two safes sit on existing console tables, facing the public side.
export const estateSafes=[
  {id:'casa',bit:1,x:-15.7,y:1.07,z:-408.1,table:.88,side:1,cash:225},
  {id:'mare',bit:2,x:19.6,y:.87,z:-438,table:.88,side:-1,cash:300},
];
export function safeInReach(feet,doors){
  if(!feet?.grounded || feet.swimming || feet.climb || feet.parachute)return;
  return estateSafes.find(s=>{
    const front=(feet.z-s.z)*s.side;
    return front>.35 && front<1.70 && Math.abs(feet.x-s.x)<.86 && Math.abs(feet.y-s.y)<.35 &&
      furnishingSupported(s.id,s.x,s.y,s.z,doors);
  });
}
