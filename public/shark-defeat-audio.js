const tau=2*Math.PI;
const clamp=x=>Math.max(0,Math.min(1,x));

// Parallel resonators shape an irregular glottal pulse into an open vowel.
// As the voice submerges the resonances close and give way to rising bubbles.
export function sharkDefeatSound(context){
  const rate=context.sampleRate,duration=1.77;
  const buffer=context.createBuffer(1,Math.ceil(rate*duration),rate);
  const pcm=buffer.getChannelData(0);
  let seed=467821,phase=0,lastPulse=0,jitter=1,tension=1,breath=0,underwater=0;
  const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  const bands=[76,127,220].map(width=>({r:Math.exp(-Math.PI*width/rate),prev:0,older:0}));
  function resonance(band,hz,input){
    const output=(1-band.r)*input+2*band.r*Math.cos(tau*hz/rate)*band.prev-band.r*band.r*band.older;
    band.older=band.prev;band.prev=output;
    return output;
  }
  const damping=1-Math.exp(-tau*560/rate);
  for(let i=0;i<pcm.length;i++){
    const t=i/rate,wet=clamp((t-.52)/.38),mouth=clamp(t/.14)*(1-wet);
    const hz=203+125*Math.sin(Math.PI*Math.min(1,t/.72))**.8-89*wet+8*Math.sin(tau*5.3*t);
    phase+=hz*jitter/rate;
    if(phase>=1){phase-=1;jitter=.973+.054*random();tension=.88+.20*random();}
    const pulse=phase<.57 ? Math.sin(Math.PI*phase/.57)**1.25 : 0;
    const noise=random()*2-1;
    breath+=.34*(noise-breath);
    const opening=(pulse-lastPulse)*rate/950*tension;
    lastPulse=pulse;
    const source=opening+.28*(noise-breath)*(.3+.7*pulse);
    const vocal=.82*resonance(bands[0],480+380*mouth,source)
      +.63*resonance(bands[1],1110+270*mouth,source)
      +.36*resonance(bands[2],2380+230*mouth,source);
    underwater+=damping*(vocal-underwater);
    const voice=clamp(t/.045)*clamp((1.11-t)/.40)*(.91+.09*Math.sin(tau*12.1*t));
    const sputter=1-wet*(.47+.35*Math.sin(tau*13*t+.4*Math.sin(tau*4*t)));
    pcm[i]=voice*sputter*((1-wet)*vocal+.41*wet*underwater);
  }
  // A staggered stream of small cavities, with varying size, pitch and rise.
  for(let start=.54;start<1.6;start+=.038+.060*random()){
    const hz=210+random()*580,level=.12+.19*random();
    const length=.044+random()*.061,offset=Math.floor(start*rate);
    const gain=level*clamp((start-.47)/.27)*clamp((duration-start)/.46);
    for(let j=0;j<length*rate && offset+j<pcm.length;j++){
      const t=j/rate,u=t/length;
      const shape=Math.sin(Math.PI*clamp(t/.004)*.5)*Math.exp(-4.1*u)*clamp((1-u)*10);
      pcm[offset+j]+=gain*shape*Math.sin(tau*hz*(t+.70*t*u));
    }
  }
  for(let i=0;i<pcm.length;i++)pcm[i]=.90*Math.tanh(pcm[i]*1.35);
  return buffer;
}

// Surface slap, the water closing overhead, then the quieter churn of the tow.
export function sharkStrikeWaterSound(context){
  const rate=context.sampleRate,buffer=context.createBuffer(1,Math.ceil(rate*2.55),rate);
  const data=buffer.getChannelData(0);
  let seed=40839,wash=0,low=0;
  const impacts=[[.030,.78,380],[.37,.48,270],[.77,.37,205],[1.26,.36,130],[1.81,.22,90]];
  for(let i=0;i<data.length;i++){
    const t=i/rate,noise=2*((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)-1;
    let body=0,air=0;
    for(const [at,gain,hz] of impacts){
      const age=t-at;if(age<0||age>.64)continue;
      const env=(1-Math.exp(-age*115))*Math.exp(-age*7.5)*gain;
      body+=env*Math.sin(tau*(48*age+1.5*(1-Math.exp(-age*17))));
      air+=env*(hz/380);
    }
    wash+=(noise-wash)*(1-Math.exp(-tau*(1250-720*clamp(t/1.5))/rate));
    low+=(noise-low)*(1-Math.exp(-tau*240/rate));
    const bubbles=Math.max(0,Math.sin(t*33+Math.sin(t*13)*1.6));
    data[i]=.83*Math.tanh(.76*body+2.1*air*wash+.72*low*bubbles*clamp((t-.79)/.35)*clamp((2.52-t)/.55));
  }
  return buffer;
}

export function fatalBiteCalls(previous,current,tick,listener,emit){
  if(!current?.length)return;
  for(const event of current){
    if(tick-event.tick>15 || previous?.some(e=>e.id===event.id))continue;
    if(Math.hypot(event.x-listener.x,event.y-listener.y,event.z-listener.z)>48)continue;
    emit(event);
  }
}
