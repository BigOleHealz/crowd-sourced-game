// Only the artwork sinks. The simulation retires collision and hands occupants
// back to swimming immediately; the replicated recovery clock also works for late joiners.
export function sinkingHull(boat,depth,seconds=6){
  if(!boat?.wrecked)return {drop:0,list:0,trim:0};
  const t=Math.min(1,Math.max(0,1-(boat.recoverySeconds??seconds)/seconds));
  const settle=t*t*(3-2*t),flood=Math.min(1,t/.84),roll=flood*flood*(3-2*flood);
  return {drop:depth*(.12*t+.88*settle),list:-.40*roll,trim:.19*roll};
}
