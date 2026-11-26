import {yachtLocal,yachtPoint} from './yacht-layout.js';

const routes={
  water:{bottom:[0,-.72,22.1],top:[0,.8,21.1],seconds:1.45},
  stern:{bottom:[0,.8,21.05],top:[0,2.61,19.55],seconds:1.65},
  upper:{bottom:[0,2.63,16.45],top:[0,5.43,14.9],seconds:2.25},
};

export function yachtLadderAt(yacht,feet){
  if(!yacht || yacht.wrecked || !feet || feet.dead || feet.fall || feet.ride ||
    feet.stance || feet.parachute || feet.liftTravel)return;
  const p=yachtLocal(yacht,feet.x,feet.z),h=feet.y-yacht.y;
  if(Math.abs(p.x)>.78)return;
  if(feet.swimming && h>=-1.4 && h<=.15 && p.z>=21.65 && p.z<=23.25)
    return {route:'water',down:false,label:'Climb aboard'};
  if(!feet.grounded)return;
  if(Math.abs(h-.8)<.23 && p.z>=20.65 && p.z<=21.6)
    return {route:p.z>21.3?'water':'stern',down:p.z>21.3,label:p.z>21.3?'Enter water':'Climb to deck'};
  if(Math.abs(h-2.62)<.24 && p.z>=19.1 && p.z<=20.1)
    return {route:'stern',down:true,label:'Descend to swim platform'};
  if(Math.abs(h-2.63)<.24 && p.z>=15.7 && p.z<=17.1)
    return {route:'upper',down:false,label:'Climb to upper deck'};
  if(Math.abs(h-5.43)<.24 && p.z>=14.45 && p.z<=15.45)
    return {route:'upper',down:true,label:'Descend to main deck'};
}

export function stepYachtLadder(yacht,state,input,dt){
  if(!yacht || yacht.wrecked)return;
  let climb=state.climb;
  if(climb?.kind!=='yachtLadder'){
    if(climb || (!input.jump && !(state.swimming && input.swimY===1)) || input.seat || input.interact)return;
    const found=yachtLadderAt(yacht,state);
    if(!found)return;
    climb={kind:'yachtLadder',route:found.route,down:found.down,t:0};
  }
  const route=routes[climb.route],from=climb.down?route.top:route.bottom,
    to=climb.down?route.bottom:route.top;
  if(!route)return;
  const t=Math.min(1,climb.t+dt/route.seconds);
  const smooth=t*t*(3-2*t),point=yachtPoint(yacht,
    from[0]+(to[0]-from[0])*smooth,
    from[1]+(to[1]-from[1])*smooth,
    from[2]+(to[2]-from[2])*smooth);
  const inWater=t===1 && climb.down && climb.route==='water';
  return {...point,vx:0,vy:0,vz:0,grounded:t===1 && !inWater,
    ...(inWater?{swimming:true,swimDepth:0}:{onYacht:true}),
    ...(t<1?{climb:{...climb,t}}:{})};
}
