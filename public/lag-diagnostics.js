// Session-wide diagnostics for ?perf=1. Keep the receive time separate from
// processing time so a browser decode backlog does not look like network lag.
const distance=(a,b)=>a && b && Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);

export class LagDiagnostics {
  reset(){
    this.firstReceivedAt=this.lastReceivedAt=this.lastSim=null;
    this.worstGap={received:0,sim:0,at:0};
    this.maxProcessDelay=0;
    this.maxFootCorrection=this.maxDriverCorrection=0;
    this.maxPending=0;
  }
  constructor(){this.reset();}
  record({receivedAt,processedAt,sim,beforeFoot,afterFoot,beforeDriver,afterDriver,pending}){
    if(this.firstReceivedAt==null)this.firstReceivedAt=receivedAt;
    // The first few seconds can include district startup, before play begins.
    if(this.lastReceivedAt!=null && receivedAt-this.firstReceivedAt>=3000 &&
      receivedAt-this.lastReceivedAt>this.worstGap.received){
      this.worstGap={received:receivedAt-this.lastReceivedAt,
        sim:sim-this.lastSim,at:(receivedAt-this.firstReceivedAt)/1000};
    }
    this.lastReceivedAt=receivedAt;this.lastSim=sim;
    this.maxProcessDelay=Math.max(this.maxProcessDelay,processedAt-receivedAt);
    this.maxFootCorrection=Math.max(this.maxFootCorrection,distance(beforeFoot,afterFoot)||0);
    this.maxDriverCorrection=Math.max(this.maxDriverCorrection,distance(beforeDriver,afterDriver)||0);
    this.maxPending=Math.max(this.maxPending,pending);
  }
  summary(){
    const {received,sim,at}=this.worstGap;
    return ` · max snapshot gap after 3s ${received.toFixed(0)} ms / ${sim.toFixed(0)} sim @${at.toFixed(1)}s`+
      ` · process ${this.maxProcessDelay.toFixed(0)} ms · snap foot/drive ${this.maxFootCorrection.toFixed(1)}/${this.maxDriverCorrection.toFixed(1)} m · pending ${this.maxPending}`;
  }
}
