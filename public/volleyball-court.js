import {courts,sandHeight} from './beach-layout.js';

export const volleyballTeams=[
  {name:'Surf',color:0x126986,light:0x62dbe3},
  {name:'Coral',color:0xb05035,light:0xffa87a},
];
export const courtHalfWidth=4,courtHalfLength=8,ballRadius=.125;
export const returnCueLead=5;
export const courtSide=(court,z)=>z<court.z?0:1;
export const slotSide=slot=>Math.floor(slot/2);
export const sideSign=side=>side===0?-1:1;
export const netTop=(court,x)=>sandHeight(court.x,court.z)+2.40-.078*(1-((x-court.x)/4.28)**2);

export function atVolleyballCourt(feet,court,margin=0){
  return Math.abs(feet.x-court.x)<=courtHalfWidth+margin &&
    Math.abs(feet.z-court.z)<=courtHalfLength+margin &&
    Math.abs(feet.y-sandHeight(feet.x,feet.z))<.6;
}

export function volleyballMember(states,id){
  if(id==null || !states)return null;
  for(const [index,state] of states.entries()){
    const slot=state.players.indexOf(id);
    if(slot!==-1)return {state,court:courts[index],index,slot,side:slotSide(slot)};
  }
  return null;
}

export function nearbyVolleyballCourt(states,feet){
  if(!feet || !states)return -1;
  return courts.findIndex(court=>atVolleyballCourt(feet,court,1.65));
}

export function volleyballServiceSpot(court,slot){
  return {x:court.x+(slot%2?.93:-.93),z:court.z+sideSign(slotSide(slot))*8.34};
}

export function canServeVolleyball(court,slot,feet){
  return atVolleyballCourt(feet,court,1.6) && courtSide(court,feet.z)===slotSide(slot) &&
    Math.abs(feet.x-court.x)<=courtHalfWidth && Math.abs(feet.z-court.z)>=courtHalfLength;
}

// The authoritative flight is a single parabola reproduced in the client
// between snapshots. Times are in server ticks (30/s).
export function sampleVolleyball(flight,tick){
  const t=Math.max(0,Math.min(1,(tick-flight.tick)/flight.duration));
  const [x,y,z]=flight.from,[dx,dy,dz]=flight.to;
  return {
    x:x+(dx-x)*t,
    y:y+(dy-y)*t+4*flight.lift*t*(1-t),
    z:z+(dz-z)*t,
    descending:dy-y+4*flight.lift*(1-2*t)<0,
  };
}

export function canReturnVolleyball(court,side,feet,ball){
  return ball.descending && courtSide(court,feet.z)===side && courtSide(court,ball.z)===side &&
    atVolleyballCourt(feet,court,1.65) && ball.y-feet.y>=.40 && ball.y-feet.y<=3.04 &&
    Math.hypot(feet.x-ball.x,feet.z-ball.z)<1.74;
}
