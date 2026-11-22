export const batSlot=7,swordSlot=8;
export const isArcadeMelee=slot=>slot===batSlot || slot===swordSlot;

export function meleeAudioTracker(){
  let previous=new Map(),next=new Map();
  const recent=(tick,start,window)=>tick>=start && tick-start<=window;
  return {
    reset(){previous.clear();next.clear();},
    step(actors,tick,listener,play){
      const emit=(name,point,seq,range)=>{
        const gap=Math.hypot(listener.x-point.x,listener.y-point.y,listener.z-point.z);
        const gain=Math.max(0,Math.min(1,(range-gap)/9));
        if(gain)play('melee/'+name,point,gain,seq);
      };
      for(const actor of actors){
        const swing=actor.meleeSwing??null,last=previous.get(actor.id);
        next.set(actor.id,swing);
        if(last===undefined || !isArcadeMelee(swing?.weapon))continue;
        const fresh=last?.seq!==swing.seq;
        const tool=swing.weapon===batSlot?'bat':'sword';
        const hand={x:actor.x,y:actor.y+1.25,z:actor.z};
        if(fresh && recent(tick,swing.tick,6))emit(tool+'-swing',hand,swing.seq,22);
        if(swing.hit && (fresh || !last.hit) && recent(tick,swing.hitTick,7)){
          emit(tool+'-hit',swing.contact??hand,swing.seq,27);
        }
      }
      [previous,next]=[next,previous];next.clear();
    },
  };
}

export function meleeBuffer(context,name){
  const sword=name.startsWith('sword'),hit=name.endsWith('hit');
  const duration=hit?(sword?.22:.15):(sword?.14:.19),rate=context.sampleRate;
  const buffer=context.createBuffer(1,Math.ceil(rate*duration),rate),samples=buffer.getChannelData(0);
  const tau=Math.PI*2,lowpass=1-Math.exp(-tau*(sword?3800:950)/rate),bodyPass=1-Math.exp(-tau*180/rate);
  const modes=sword?[[1310,.47,25],[2170,.28,32],[3010,.17,42]]:[[157,.55,39],[388,.29,57],[691,.17,76]];
  let seed=8171,low=0,body=0;
  for(let i=0;i<samples.length;i++){
    const t=i/rate,u=t/duration;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=(noise-low)*lowpass;body+=(low-body)*bodyPass;
    if(hit){
      let resonant=0;
      for(const [hz,level,decay] of modes)resonant+=Math.sin(tau*hz*t)*level*Math.exp(-decay*t);
      const click=(low-body)*Math.exp(-(sword?96:125)*t);
      samples[i]=.72*Math.min(1,t*900,(1-u)*12)*(resonant+.47*click);
    }else{
      const crest=Math.sin(Math.PI*u)**(sword?2.1:1.5);
      samples[i]=crest*(sword?.62*(low-body)+.13*body:.44*low+.43*body);
    }
  }
  return buffer;
}
