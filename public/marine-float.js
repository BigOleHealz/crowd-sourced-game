// Use time since the server-confirmed final hit so late arrivals see the same pose.
export function floatingBody(depthY,water,size,age){
  const target=water-.09*size;
  const settle=1-Math.exp(-Math.max(0,age)*.70);
  return {
    y:depthY+(target-depthY)*settle+.025*settle*Math.sin(age*2.1+size),
    roll:Math.PI*settle+.042*settle*Math.sin(age*1.6+size)
  };
}

export function marineBlastCalls(previous,current,play){
  if(!previous || !current)return;
  for(const [i,s] of current.entries()){
    if(previous[i] && s.hitSeq!==previous[i].hitSeq && s.deathKind==='blast' && s.hp===0 && s.ageSinceHit<1)
      play(s);
  }
}

export function marineImpactSound(context){
  const rate=context.sampleRate,length=Math.ceil(rate*.46),buffer=context.createBuffer(1,length,rate);
  const out=buffer.getChannelData(0);let seed=9508,filtered=0,phase=0;
  for(let i=0;i<length;i++){
    const t=i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const n=seed/2147483648-1;
    filtered+=(n-filtered)*(1-Math.exp(-2*Math.PI*(440+1600*Math.exp(-24*t))/rate));
    phase+=2*Math.PI*(54+138*Math.exp(-22*t))/rate;
    const spray=.32*Math.exp(-11*t)+.40*Math.exp(-Math.abs(t-.073)*58)+.23*Math.exp(-Math.abs(t-.134)*61);
    out[i]=Math.min(1,t*260)*Math.min(1,(length-1-i)/(rate*.028))*(.67*Math.sin(phase)*Math.exp(-13*t)+filtered*spray);
  }
  return buffer;
}
