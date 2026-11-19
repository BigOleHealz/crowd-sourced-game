// Offline, seeded sound design. Cache the short reports, reflections and motor wash.
const reports={
  carbine:{duration:.53,thud:116,body:.065,crack:.018,tail:.14},
  sidearm:{duration:.37,thud:162,body:.047,crack:.012,tail:.105},
  turret:{duration:.49,thud:91,body:.078,crack:.022,tail:.125},
};
export function weaponSound(context,name,variant) {
  const spec=reports[name],launch=name==='launch',rate=context.sampleRate;
  const buffer=context.createBuffer(1,Math.round(rate*(launch?.86:spec.duration)),rate);
  const out=buffer.getChannelData(0),dry=new Float32Array(out.length);
  const factor=rate=>1-Math.exp(-2*Math.PI*rate/context.sampleRate);
  const a=factor(265),b=factor(1300),c=factor(6400);
  let seed=1783+variant*877,low=0,mid=0,hi=0;
  for(let i=0;i<out.length;i++){
    const t=i/rate;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const n=seed/2147483648-1;
    low+=a*(n-low);mid+=b*(n-mid);hi+=c*(n-hi);
    if(launch){
      const ignite=Math.exp(-t/.032),rise=1-Math.exp(-t/.05);
      const sustain=rise*Math.exp(-Math.max(0,t-.13)/.19);
      const ripple=1+.13*Math.sin(t*91+1.3*Math.sin(t*37));
      dry[i]=ignite*(1.05*(hi-mid)+2.2*low)+sustain*ripple*(2.8*low+1.15*(mid-low)+.31*(hi-mid));
    } else {
      const snap=(hi-mid)*Math.exp(-t/spec.crack);
      const weight=(1.7*low+.60*Math.sin(2*Math.PI*spec.thud*t)*Math.exp(-t/.028))*Math.exp(-t/spec.body);
      const air=(mid+.40*low)*Math.exp(-t/spec.tail);
      dry[i]=1.45*snap+weight+.78*air;
    }
    dry[i]*=Math.min(1,t*4500);
  }
  const delays=(launch?[.041,.083,.124]:[.018,.041,.076]).map(t=>Math.round(t*rate));
  let peak=.001;
  for(let i=0;i<out.length;i++){
    const echo=(dry[i-delays[0]]??0)*.27+(dry[i-delays[1]]??0)*.14+(dry[i-delays[2]]??0)*.07;
    out[i]=Math.tanh(1.4*(dry[i]+echo))*Math.min(1,(out.length-i)/(.018*rate));peak=Math.max(peak,Math.abs(out[i]));
  }
  for(let i=0;i<out.length;i++)out[i]*=.91/peak;
  return buffer;
}
