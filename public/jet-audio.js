// Two seamless, cached loops. Fan harmonics rise with speed while turbulent
// exhaust gets louder aft of the nozzles and under afterburner.
export function jetLoop(context,roar){
  const rate=context.sampleRate,length=rate*2,crossfade=Math.round(rate*.04);
  const buffer=context.createBuffer(1,length,rate),wave=buffer.getChannelData(0);
  let seed=91372,bass=0,mid=0,air=0;
  const pole=hz=>1-Math.exp(-2*Math.PI*hz/rate);
  const low=pole(92),band=pole(870),high=pole(4900);
  for(let i=0;i<length+crossfade;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const white=seed/2147483648-1;
    bass+=low*(white-bass);mid+=band*(white-mid);air+=high*(white-air);
    const t=2*Math.PI*i/rate;
    const sweep=.22*Math.sin(2*t)+.11*Math.sin(3.5*t);
    const whine=.18*Math.sin(333*t+sweep)+.085*Math.sin(666*t+2*sweep)+.035*Math.sin(999*t+3*sweep);
    const sample=roar ? Math.tanh(4.1*bass+1.8*mid+.7*air)*(.85+.12*Math.sin(5*t+sweep))
      : whine+.28*(air-mid)+.15*Math.sin(71*t+.5*Math.sin(4*t))+.6*mid;
    if(i<length)wave[i]=sample;
    else {
      const k=i-length,f=k/crossfade;
      wave[k]=wave[k]*f+sample*(1-f);
    }
  }
  return buffer;
}
export function jetMix(j,listener,closing){
  const speed=Math.min(1,Math.abs(j.speed)/32),dx=listener.x-j.x,dz=listener.z-j.z;
  const aft=Math.max(0,(dz*Math.cos(j.yaw)-dx*Math.sin(j.yaw))/Math.max(1,Math.hypot(dx,dz)));
  const shift=Math.max(.86,Math.min(1.16,1+closing*.003));
  return {fanRate:(.70+.69*speed)*shift,fanGain:.20+.12*speed,
    exhaustRate:(.74+.37*speed)*shift,exhaustGain:(.19+.36*speed+(j.burner?.29:0))*(.78+.44*aft)};
}
