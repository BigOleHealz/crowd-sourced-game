// Only a dispatched, occupied cruiser signals. Parked cars remain in the world
// while the same officer pursues on foot.
export const signalingCruiser=car=>car.active && car.npcDriver!=null && !car.wrecked && car.hp>0;

export function sirenLoop(context){
  const rate=context.sampleRate, period=2, count=Math.round(rate*period);
  const buffer=context.createBuffer(1,count,rate),wave=buffer.getChannelData(0);
  // The mean pitch completes an integer number of cycles at the loop seam.
  for(let i=0;i<count;i++){
    const cycle=2*Math.PI*i/count;
    const phase=1480*cycle-420*Math.sin(cycle);
    wave[i]=.48*Math.sin(phase)+.12*Math.sin(phase*2)+.05*Math.sin(phase*3);
  }
  return buffer;
}
