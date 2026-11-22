// Snapshot contact IDs advance even when the listener is muted or off court.
export function courtContactAudio(){
  let seen=0;
  return {
    reset(game){seen=game?.contactId??0;},
    step(game,play){
      const shot=game?.shot;
      for(const cue of shot?.contacts??[]){
        if(cue.id>seen && shot.age-cue.age<.45)play(cue);
      }
      seen=Math.max(seen,game?.contactId??0);
    },
  };
}

// A short net hiss, a ringing steel rim, and the lower backboard impact.
export function courtContactBuffer(context,kind){
  const rate=context.sampleRate,length=kind==='rim'?.48:kind==='swish'?.29:.23;
  const buffer=context.createBuffer(1,Math.ceil(length*rate),rate),out=buffer.getChannelData(0);
  let seed=6713,low=0;
  for(let i=0;i<out.length;i++){
    const t=i/rate,a=t*Math.PI*2;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;low+=(noise-low)*.15;
    const edge=Math.min(1,t*850,(length-t)*80);
    if(kind==='swish'){
      const brush=Math.sin(Math.PI*t/length)**1.7*(.70+.30*Math.cos(a*21));
      out[i]=edge*brush*(noise-low)*.51;
    }else if(kind==='rim'){
      out[i]=edge*(.46*Math.sin(a*632)+.23*Math.sin(a*1013)+.12*Math.sin(a*1467))*Math.exp(-10*t);
    }else{
      out[i]=edge*(.59*Math.sin(a*119)*Math.exp(-21*t)+.31*low*Math.exp(-39*t)+.22*Math.sin(a*294)*Math.exp(-32*t));
    }
  }
  return buffer;
}
