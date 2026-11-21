// A close bumper tap is mostly a damped thud. Harder contacts add a brief
// low chassis resonance and a handful of irregular panel rattles.
export function roadContactSound(context,hard,wood) {
  const rate=context.sampleRate,len=hard?.61:.20;
  const buffer=context.createBuffer(1,Math.ceil(len*rate),rate),data=buffer.getChannelData(0);
  let seed=wood?3171:7411,lo=0,mid=0;
  const filter=f=>1-Math.exp(-2*Math.PI*f/rate),a=filter(170),b=filter(hard?2000:700);
  for(let i=0;i<data.length;i++){
    const t=i/rate;
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    const n=seed/2147483648-1;
    lo+=a*(n-lo);mid+=b*(n-mid);
    let x=(.56*Math.sin((wood?108:79)*2*Math.PI*t)+2*lo)*Math.exp(-t/(hard?.12:.048));
    x+=(mid-lo)*Math.exp(-t/(hard?.092:.027))*(hard?2.1:.65);
    if(hard) for(const delay of [.021,.056,.107,.172]){
      const u=t-delay;if(u<=0)continue;
      x+=(.40*mid+.15*Math.sin((wood?190:324)*2*Math.PI*u))*Math.exp(-u/.025)*Math.exp(-delay*7);
    }
    data[i]=Math.tanh(x)*Math.min(1,t*960,(len-t)*50);
  }
  return buffer;
}

// A tyre slap followed by the damped suspension settling. The second pulse
// arrives slightly later on a hard landing as the rear axle loads up.
export function roadLandingSound(context,hard){
  const rate=context.sampleRate,length=hard?.52:.24;
  const buffer=context.createBuffer(1,Math.ceil(rate*length),rate),wave=buffer.getChannelData(0);
  let seed=7429,low=0;
  for(let i=0;i<wave.length;i++){
    const t=i/rate;
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=(noise-low)*(1-Math.exp(-2*Math.PI*650/rate));
    let pressure=0;
    for(const delay of [0,hard?.055:.032]){
      const u=t-delay;
      if(u>=0)pressure+=(delay?.46:1)*(.68*Math.sin(2*Math.PI*(hard?58:86)*u)+.65*low)*Math.exp(-u/(hard?.09:.044));
    }
    const settle=hard?.16*noise*Math.exp(-Math.abs(t-.095)/.036):0;
    wave[i]=Math.tanh(pressure+settle)*Math.min(1,t*1200,(length-t)*120);
  }
  return buffer;
}
