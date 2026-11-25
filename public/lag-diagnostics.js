// Session-wide diagnostics for ?perf=1. Keep the receive time separate from
// processing time so a browser decode backlog does not look like network lag.
const distance=(a,b)=>a && b && Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

export class LagDiagnostics {
  reset(){
    this.firstReceivedAt=this.lastReceivedAt=this.lastSim=null;
    this.worstGap={received:0,sim:0,at:0};
    this.lastCorrection=null;
  }
  constructor(){this.reset();}
  record({receivedAt,processedAt,sim,beforeFoot,afterFoot,beforeDriver,afterDriver,pending}){
    if(this.firstReceivedAt==null)this.firstReceivedAt=receivedAt;
    const receivedGap=this.lastReceivedAt==null ? 0 : receivedAt-this.lastReceivedAt;
    const simGap=this.lastSim==null ? 0 : sim-this.lastSim;
    // The first few seconds can include district startup, before play begins.
    if(this.lastReceivedAt!=null && this.lastReceivedAt-this.firstReceivedAt>=3000 &&
      receivedGap>this.worstGap.received){
      this.worstGap={received:receivedGap,sim:simGap,at:(receivedAt-this.firstReceivedAt)/1000};
    }
    const foot=distance(beforeFoot,afterFoot)||0,driver=distance(beforeDriver,afterDriver)||0;
    if(Math.max(foot,driver)>=.5) this.lastCorrection={
      kind:foot>=driver?'foot':'driver',metres:Math.max(foot,driver),received:receivedGap,
      sim:simGap,process:processedAt-receivedAt,pending,at:(receivedAt-this.firstReceivedAt)/1000,
    };
    this.lastReceivedAt=receivedAt;this.lastSim=sim;
  }
  summary(){
    const {received,sim,at}=this.worstGap;
    const correction=this.lastCorrection;
    return ` · max snapshot gap after 3s ${received.toFixed(0)}/${sim.toFixed(0)} ms @${at.toFixed(1)}s`+
      (correction ? ` · last correction ${correction.kind} ${correction.metres.toFixed(1)} m @${correction.at.toFixed(1)}s`+
        ` (gap/sim ${correction.received.toFixed(0)}/${correction.sim.toFixed(0)} ms, process ${correction.process.toFixed(0)} ms, pending ${correction.pending})`
        : ' · no correction ≥0.5 m');
  }
}
