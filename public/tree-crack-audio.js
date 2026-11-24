// A low trunk split followed by irregular, sharper branch snaps.
export function treeCrackBuffer(context){
  const rate=context.sampleRate,length=Math.ceil(rate*.72);
  const buffer=context.createBuffer(1,length,rate),wave=buffer.getChannelData(0);
  let seed=19391,low=0;
  const pulses=[[0,1],[.055,.74],[.13,.52],[.24,.30],[.37,.18]];
  for(let i=0;i<length;i++){
    const t=i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=(noise-low)*.13;
    let snap=0;
    for(const [at,gain] of pulses){
      const u=t-at;if(u<0)continue;
      snap+=gain*(.68*(noise-low)+.34*Math.sin(2*Math.PI*(145+at*190)*u))*Math.exp(-u/(at? .027:.085));
    }
    const creak=.20*Math.sin(2*Math.PI*(88-29*t)*t)*Math.exp(-5*t);
    wave[i]=Math.tanh(snap+creak)*Math.min(1,t*750,(.72-t)*35);
  }
  return buffer;
}
