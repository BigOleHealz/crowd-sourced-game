// Render world snapshots on simulation time. Arrival intervals can bunch up
// after a late packet even if the server integrated evenly spaced positions.
export class SnapshotClock{
  reset(sim,arrival){
    this.offset=arrival-sim;this.jitter=0;
    this.playhead=sim-105;this.frame=arrival;this.lastSim=sim;this.lastArrival=arrival;
  }
  accept(sim,arrival){
    if(this.lastSim==null || sim<this.lastSim || arrival-this.lastArrival>1200){
      this.reset(sim,arrival);return;
    }
    if(sim===this.lastSim)return;
    const elapsed=arrival-this.lastArrival,interval=sim-this.lastSim;
    const variation=Math.abs(elapsed-interval);
    this.jitter+=.12*(Math.min(190,variation)-this.jitter);
    this.offset=Math.min(arrival-sim,this.offset+Math.max(0,elapsed)*.012);
    this.lastSim=sim;this.lastArrival=arrival;
  }
  target(now){
    const dt=Math.max(0,Math.min(100,now-this.frame));
    this.frame=now;
    const wanted=now-this.offset-105-Math.min(120,2.4*this.jitter);
    const rate=Math.max(.78,Math.min(1.14,1+(wanted-this.playhead-dt)/420));
    this.playhead=Math.min(this.lastSim,this.playhead+dt*rate);
    return this.playhead;
  }
}
