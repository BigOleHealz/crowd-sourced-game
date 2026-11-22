// A continuously driven jet: slow pressure fluctuations under an airy turbulent hiss.
// Blend the tail into the lead-in so a held trigger has no audible loop boundary.
export function projectorRoar(context){
  const rate=context.sampleRate, length=Math.round(2.4*rate), overlap=Math.round(.09*rate);
  const buffer=context.createBuffer(1,length,rate), out=buffer.getChannelData(0);
  const lead=new Float32Array(overlap);
  let seed=36159,low=0,mid=0,previous=0;
  const filter=hz=>1-Math.exp(-2*Math.PI*hz/rate);
  const bass=filter(112),air=filter(2200);
  for(let i=0;i<length+overlap;i++){
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    const white=seed/2147483648-1,t=i/rate;
    low+=bass*(white-low);mid+=air*(white-mid);
    const flutter=.82+.12*Math.sin(13*t+.6*Math.sin(t*5))+.06*Math.sin(t*41);
    const value=Math.tanh(4.2*low+.77*mid+.085*(white-previous))*flutter;
    previous=white;
    if(i<overlap)lead[i]=value;
    else out[i-overlap]=value;
    if(i>=length){
      const j=i-length,k=j/(overlap-1);
      out[i-overlap]=value*(1-k)+lead[j]*k;
    }
  }
  return buffer;
}
