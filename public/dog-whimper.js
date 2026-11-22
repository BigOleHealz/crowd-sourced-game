// Compare authoritative snapshots. A cold join starts with the current state,
// so a listener never hears an older encounter merely by entering the district.
export function dogWhimpers(previous,current,tick,play){
  if(!previous || !current || previous===current)return;
  for(const dog of current){
    const event=Math.max(dog.lastShotTick??-1,dog.lastKickTick??-1);
    if(event<0 || tick<event || tick-event>15)continue;
    const before=previous.find(d=>d.id===dog.id);
    if(before && event>Math.max(before.lastShotTick??-1,before.lastKickTick??-1))play(dog,event);
  }
}

// A short voiced yelp falls into a softer, breathy whine. Cache one buffer
// per size band in the normal spatial mixer, which also handles mute and walls.
export function dogWhimper(context,small){
  const rate=context.sampleRate,duration=small?.46:.53;
  const buffer=context.createBuffer(1,Math.ceil(rate*duration),rate),samples=buffer.getChannelData(0);
  let phase=0,seed=2923,breath=0;
  for(let i=0;i<samples.length;i++){
    const t=i/rate,u=t/duration;
    const base=(small?630:475)+260*Math.exp(-((u-.16)**2)/.015)-170*u;
    phase+=2*Math.PI*base*(1+.027*Math.sin(t*98))/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    breath+=(seed/2147483648-1-breath)*.19;
    const voice=.55*Math.sin(phase)+.24*Math.sin(2*phase)+.1*Math.sin(3*phase);
    const envelope=Math.min(1,t/.017)*((1-u)**1.8)*(.73+.27*Math.cos(10*u));
    samples[i]=envelope*(voice+.18*breath);
  }
  return buffer;
}
