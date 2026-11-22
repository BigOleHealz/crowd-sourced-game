import {inSkatePark,skateParkFloor} from './skate-park.js';

export const settleTime=.32;
export function advanceRideLanding(previous,next,dt){
  const ride=next.ride,old=previous.ride.landing;
  if(!previous.grounded && next.grounded && !ride.grind && previous.vy<-.45 && inSkatePark(next.x,next.z)){
    ride.landing={age:0,impact:Math.min(1,-previous.vy/4.5)};
  }else if(old && old.age+dt<settleTime && next.grounded && !ride.grind){
    ride.landing={age:old.age+dt,impact:old.impact};
  }else delete ride.landing;
}
export function wheelContactPose(state){
  const r=state.ride;
  if(!r)return {y:state.y+.007,pitch:0,bend:0};
  if(!state.grounded)return {y:state.y+.007,pitch:.13*Math.tanh(state.vy),bend:.27};
  if(r.grind)return {y:state.y-(r.kind==='bike'?.07:.043),pitch:0,bend:.28};
  if(!inSkatePark(state.x,state.z))return {y:state.y+.007,pitch:0,bend:0};
  const bike=r.kind==='bike',half=bike?.535:.25;
  const dx=half*Math.sin(r.yaw),dz=-half*Math.cos(r.yaw);
  const front=skateParkFloor(state.x+dx,state.z+dz)??state.y;
  const back=skateParkFloor(state.x-dx,state.z-dz)??state.y;
  const pitch=Math.atan2(front-back,2*half),land=r.landing;
  const progress=land?Math.min(1,land.age/settleTime):1;
  // Rear wheels meet the deck first; settle the front axle without burying the rear.
  const nose=(1-progress)**2*(land?.impact??0)*.14;
  const bend=land?land.impact*Math.sin(Math.PI*Math.sqrt(progress)):0;
  const y=(front+back)/2+half*Math.sin(nose)+(bike?.007:.014);
  return {y,pitch:pitch+(r.reverse?-nose:nose),bend};
}
export function recordWheelContact(item,state,tick){
  const landing=state.ride?.landing;
  if(landing?.age===0 && item.wheelHit?.tick!==tick)
    item.wheelHit={tick,x:state.x,y:state.y,z:state.z,impact:landing.impact};
}
export function wheelContactSounds(previous,current,tick,play){
  if(!previous || !current || previous===current)return;
  for(const item of current){
    const event=item.wheelHit;
    if(!event || tick-event.tick>12 || event.tick>tick)continue;
    const old=previous.find(r=>r.id===item.id);
    if(old && event.tick>(old.wheelHit?.tick??-1))play(item.kind,event);
  }
}
export function wheelLandingBuffer(context,bike){
  const rate=context.sampleRate,span=bike?.19:.16;
  const buffer=context.createBuffer(1,Math.ceil(rate*span),rate),out=buffer.getChannelData(0);
  let seed=6571,low=0;
  for(let i=0;i<out.length;i++){
    const t=i/rate,u=t-.039;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;low+=(noise-low)*.16;
    const pair=Math.exp(-t*(bike?28:46))+(u>0?.64*Math.exp(-u*(bike?35:62)):0);
    const strike=bike?.61*Math.sin(t*(780-1250*t))+.24*low:
      .38*Math.sin(t*2280)+.30*Math.sin(t*4370)+.27*(noise-low);
    out[i]=Math.min(1,t*1000,(span-t)*100)*pair*strike;
  }
  return buffer;
}
