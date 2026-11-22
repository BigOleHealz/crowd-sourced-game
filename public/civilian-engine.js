// One seamless one-second loop per timbre, shared by all cars of that model.
// Integer harmonics preserve phase at the loop boundary.
const engines={
  falco:{pulse:68,harmonics:[.23,.35,.19,.13,.075,.025],gears:[9,16,24,30],rev:2.1},
  veloce:{pulse:52,harmonics:[.43,.25,.11,.13,.05,.03],gears:[8,15,22,28],rev:2.2},
  hatchback:{pulse:47,harmonics:[.24,.31,.19,.14,.08,.04],gears:[5.4,10,16],rev:1.9},
  engine:{pulse:21,harmonics:[.45,.21,.11,.23,.08,.03],gears:[3,6.5,10],rev:1.25},
  sedan:{pulse:38,harmonics:[.44,.31,.15,.065,.03,.005],gears:[6,12,19],rev:1.75},
  van:{pulse:26,harmonics:[.36,.17,.12,.21,.04,.1],gears:[4,8,12],rev:1.5},
};
export function civilianEngineLoop(context,model){
  const {pulse,harmonics}=engines[model],rate=context.sampleRate;
  const buffer=context.createBuffer(1,rate,rate),wave=buffer.getChannelData(0);
  for(let i=0;i<rate;i++){
    const phase=i*2*Math.PI/rate;
    let sample=0;
    for(let k=0;k<harmonics.length;k++)sample+=harmonics[k]*Math.sin(phase*pulse*(k+1)+.3*k);
    wave[i]=sample*(.82+.18*Math.cos(phase*(model==='van'?13:5)));
  }
  return buffer;
}
export function civilianEngineMix(car){
  const profile=engines[car.model],speed=Math.abs(car.speed),load=Math.min(1,Math.max(0,car.engineLoad??0));
  const next=profile.gears.findIndex(shift=>speed<shift);
  const gear=next<0?profile.gears.length:next,lower=gear?profile.gears[gear-1]:0;
  const upper=profile.gears[gear]??lower*1.55;
  const revs=Math.min(1,(speed-lower)/(upper-lower));
  return {rate:1+(gear ? .38 : 0)+profile.rev*revs+.32*load,gain:.12+.095*load+.05*revs};
}
