// Session-wide diagnostics for ?perf=1. Keep the receive time separate from
// processing time so a browser decode backlog does not look like network lag.
const displacement=(a,b)=>a && b && {
  horizontal:Math.hypot(a.x-b.x,a.z-b.z),vertical:Math.abs(a.y-b.y),
  metres:Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),
};

export class LagDiagnostics {
  reset(){
    this.firstReceivedAt=this.lastReceivedAt=this.lastSim=this.lastTick=this.lastAck=null;
    this.worstGap={received:0,sim:0,at:0};
    this.lastCorrection=null;
  }
  constructor(){this.reset();}
  record({receivedAt,processedAt,sim,simTick,ack,beforeFoot,afterFoot,beforeDriver,afterDriver,pending}){
    if(this.firstReceivedAt==null)this.firstReceivedAt=receivedAt;
    const receivedGap=this.lastReceivedAt==null ? 0 : receivedAt-this.lastReceivedAt;
    const simGap=this.lastSim==null ? 0 : sim-this.lastSim;
    // The first few seconds can include district startup, before play begins.
    if(this.lastReceivedAt!=null && this.lastReceivedAt-this.firstReceivedAt>=3000 &&
      receivedGap>this.worstGap.received){
      this.worstGap={received:receivedGap,sim:simGap,at:(receivedAt-this.firstReceivedAt)/1000};
    }
    const foot=displacement(beforeFoot,afterFoot),driver=displacement(beforeDriver,afterDriver);
    const kind=(foot?.metres??0)>=(driver?.metres??0)?'foot':'driver';
    const correction=kind==='foot'?foot:driver;
    // An ack can advance by at most one per server tick unless input sequences
    // were skipped (for example when the server's bounded queue overflowed).
    if(correction?.metres>=.5) this.lastCorrection={
      kind,...correction,received:receivedGap,sim:simGap,process:processedAt-receivedAt,pending,
      ackAdvance:this.lastAck==null?null:ack-this.lastAck,
      tickAdvance:this.lastTick==null?null:simTick-this.lastTick,
      groundedFlip:kind==='foot' && beforeFoot.grounded!==afterFoot.grounded
        ? `${beforeFoot.grounded?'ground':'air'}→${afterFoot.grounded?'ground':'air'}` : null,
      at:(receivedAt-this.firstReceivedAt)/1000,
    };
    this.lastReceivedAt=receivedAt;this.lastSim=sim;this.lastTick=simTick;this.lastAck=ack;
  }
  summary(){
    const {received,sim,at}=this.worstGap;
    const correction=this.lastCorrection;
    return correction ? ` · last correction ${correction.kind} ${correction.metres.toFixed(1)} m`+
      ` (xz/y ${correction.horizontal.toFixed(1)}/${correction.vertical.toFixed(1)}) @${correction.at.toFixed(1)}s`+
      ` · gap/sim ${correction.received.toFixed(0)}/${correction.sim.toFixed(0)} ms`+
      ` · ack/ticks ${correction.ackAdvance ?? '?'}/${correction.tickAdvance ?? '?'}`+
      ` · process ${correction.process.toFixed(0)} ms · pending ${correction.pending}`+
      (correction.groundedFlip ? ` · ${correction.groundedFlip}` : '')
      : ` · max snapshot gap after 3s ${received.toFixed(0)}/${sim.toFixed(0)} ms @${at.toFixed(1)}s · no correction ≥0.5 m`;
  }
}
