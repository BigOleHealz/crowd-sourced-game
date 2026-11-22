// Short one-shots use the same spatial mixer as the rest of the waterfront.
// A rolling contour and a soft harmonic keep the whistle distinct from a siren.
export function dolphinSound(context,kind,variant=0){
  const rate=context.sampleRate,whistle=kind==='whistle';
  const duration=whistle ? .48+.065*variant : .40+.045*variant;
  const buffer=context.createBuffer(1,Math.ceil(duration*rate),rate);
  const samples=buffer.getChannelData(0),tau=2*Math.PI;
  if(whistle){
    let phase=0;
    for(let i=0;i<samples.length;i++){
      const t=i/rate,u=t/duration;
      const contour=Math.sin(Math.PI*u)+.16*Math.sin(tau*(1.8*u+.13*variant))*Math.sin(Math.PI*u);
      const hz=1510+variant*240+1060*contour+35*Math.sin(tau*17*t);
      phase+=tau*hz/rate;
      const envelope=Math.sin(Math.PI*u)**1.65;
      samples[i]=envelope*(.45*Math.sin(phase)+.055*Math.sin(2*phase));
    }
  }else{
    const count=7+variant;
    for(let click=0;click<count;click++){
      const u=click/(count-1);
      const start=Math.round(rate*(.012+(duration-.040)*(.15*u+.85*u**1.33)));
      const hz=3500+210*variant+380*Math.cos(click*1.73);
      for(let j=0;j<rate*.010&&start+j<samples.length;j++){
        const t=j/rate,attack=Math.min(1,t/.0005),decay=Math.exp(-t*720);
        samples[start+j]=.8*attack*decay*Math.sin(tau*(hz*t-42000*t*t))*(.75+.19*Math.cos(click));
      }
    }
  }
  return buffer;
}

export function dolphinCalls(previous,current,listener,play){
  if(!previous || !current)return;
  current.forEach((animal,index)=>{
    const last=previous[index];
    if(!last || !(animal.callSeq>last.callSeq))return;
    if(animal.callKind!=='whistle' && animal.callKind!=='clicks')return;
    const distance=Math.hypot(animal.x-listener.x,animal.y-listener.y,animal.z-listener.z);
    const audibleRange=animal.callKind==='whistle'?32:21;
    if(distance>=audibleRange)return;
    const gain=(animal.callKind==='whistle'?.52:.74)*Math.min(1,(audibleRange-distance)/7);
    play(animal.callKind,animal,gain,animal.callSeq+index);
  });
}
