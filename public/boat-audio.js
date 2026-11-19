// Closed, periodic outboard exhaust strokes and a separate band of turbulent spray.
export function boatLoop(context, name) {
  const rate=context.sampleRate, length=rate*2, overlap=Math.round(rate*.04);
  const buffer=context.createBuffer(1,length,rate), samples=buffer.getChannelData(0);
  const tail=new Float32Array(overlap);
  let seed=21111, smooth=0, slow=0;
  for(let i=0;i<length+overlap;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1, t=i/rate, phase=2*Math.PI*t;
    smooth+=(noise-smooth)*(1-Math.exp(-2*Math.PI*1850/rate));
    slow+=(smooth-slow)*(1-Math.exp(-2*Math.PI*195/rate));
    let sample;
    if(name==='outboard') {
      const crank=phase*29+.09*Math.sin(phase*3);
      const stroke=(1+Math.cos(2*crank))*.5;
      sample=.29*Math.sin(crank)+.22*Math.sin(2*crank+.3)+
        stroke*stroke*(.19*Math.sin(4*crank)+.18*smooth);
    } else {
      const wash=.70+.17*Math.sin(phase*2)+.10*Math.cos(phase*3.5);
      sample=Math.tanh(1.65*(smooth-slow)*wash+.22*slow);
    }
    if(i<length)samples[i]=sample;
    else tail[i-length]=sample;
  }
  for(let i=0;i<overlap;i++) {
    const amount=i/overlap;
    samples[i]=tail[i]*(1-amount)+samples[i]*amount;
  }
  return buffer;
}

export function boatMix(boat) {
  const speed=Math.min(1,Math.abs(boat.speed)/15), load=Math.min(1,Math.abs(boat.throttle));
  return {
    motorRate:.80+1.05*load+.84*speed, motorVolume:.22+.12*load+.10*speed,
    wakeRate:.73+.50*speed+.08*load, wakeVolume:.43*speed**.75+.10*load,
  };
}
