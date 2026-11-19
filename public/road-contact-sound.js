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
