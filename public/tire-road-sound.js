import {roadSurfaceAt} from './road-surface.js';
import {flatTireCount} from './road-wheel-layout.js';

export function tireMix(car){
  const speed=Math.abs(car.speed);
  if(car.wrecked || car.bridgeFlight || !(speed>.55))return null;
  return {surface:roadSurfaceAt(car.x,car.z),rate:Math.min(2.65,.55+speed*.075),
    volume:Math.min(.37,speed*.024),flat:flatTireCount(car)};
}

// Each loop covers one nominal second. The flat's short rubber slap is
// separate so the underlying surface stays audible through every revolution.
export function tireLoop(context,surface){
  const rate=context.sampleRate,out=context.createBuffer(1,rate,rate),data=out.getChannelData(0);
  const hz={asphalt:2000,gravel:3000,deck:850,grass:570,sand:770,flat:950}[surface];
  const filter=1-Math.exp(-2*Math.PI*hz/rate);
  let low=0,mid=0,seed=49782;
  for(let i=0;i<rate;i++){
    const t=i/rate;
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=(noise-low)*filter;mid+=(low-mid)*.018;
    let sound=low*.85;
    if(surface==='gravel')sound=(low-mid)*(.55+3.2*Math.max(0,noise-.75));
    if(surface==='sand')sound=1.6*mid+low*.34;
    if(surface==='deck')sound=low*.47+.24*Math.sin(t*2*Math.PI*78)*Math.exp(-10*(t*6%1));
    if(surface==='grass')sound=1.35*low*(.55+.26*Math.sin(2*Math.PI*t*9)+.15*Math.sin(2*Math.PI*t*17));
    if(surface==='flat'){
      const phase=t*3%1;
      sound=(.85*Math.sin(2*Math.PI*16*phase)+low*1.4)*Math.exp(-phase*15);
    }
    data[i]=Math.tanh(sound)*Math.min(1,i/64,(rate-i)/64);
  }
  return out;
}
