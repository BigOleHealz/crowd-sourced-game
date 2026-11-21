import {boardingDoorAngle} from './road-cabin.js';

// Sample the actual door animation in snapshots. Reversed egress and a takeover
// both cross the same physical opening and closing angles.
const angle=car=>Math.abs(boardingDoorAngle(car.takeover?.progress??car.boarding?.progress??0));
export function doorCue(previous,car){
  if(!previous || car.wrecked || car.sling)return;
  const before=angle(previous),after=angle(car);
  if(before<.13 && after>=.13)return 'door-open';
  if(before>=.13 && after<.13)return 'door-close';
}
export function doorBuffer(context,close){
  const rate=context.sampleRate,duration=close?.28:.17;
  const buffer=context.createBuffer(1,Math.round(duration*rate),rate),wave=buffer.getChannelData(0);
  let seed=7397,filtered=0,previous=0;
  const tau=Math.PI*2;
  for(let i=0;i<wave.length;i++){
    const t=i/rate;
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    filtered+=(noise-filtered)*(1-Math.exp(-tau*680/rate));
    const click=(noise-previous)*Math.exp(-t*245);
    previous=noise;
    const u=Math.max(0,t-(close?.014:.034)),attack=Math.min(1,u*700);
    const panel=(Math.sin(tau*(close?94:184)*u)+.39*Math.sin(tau*(close?171:287)*u))*Math.exp(-u*(close?26:49));
    wave[i]=Math.tanh(.24*click+attack*((close?.44:.18)*panel+.26*filtered*Math.exp(-u*60)))*Math.min(1,t*1800,(duration-t)*190);
  }
  return buffer;
}
