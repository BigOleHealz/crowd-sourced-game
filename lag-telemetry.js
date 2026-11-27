// Opt-in, bounded per-process measurements. No player names, addresses or tokens.
export class ServerLagTelemetry {
  constructor(){
    this.run=globalThis.crypto.randomUUID();this.connections=0;this.disconnects=0;
    this.cpu=process.cpuUsage();this.cpuAt=performance.now();this.cpuMs=0;this.cpuWallMs=0;
    this.tickMs=0;this.maxTickMs=0;this.roundMs=0;this.rounds=0;
    this.loopGapMs=0;this.debtMs=0;this.discardedMs=0;
    this.snapshot=0;this.publishMs=0;this.snapshotBytes=0;
    this.lastPublish=null;this.publishGapMs=0;
  }
  loop(now,previous,debt,discarded){
    this.loopGapMs=Math.max(this.loopGapMs,now-previous);
    this.debtMs=debt;this.discardedMs+=discarded;
  }
  tick(ms,tick){this.completedTick=tick;this.tickMs=ms;this.maxTickMs=Math.max(this.maxTickMs,ms);}
  publish(now,ms,bytes,tick){
    this.publishTick=tick;
    const cpu=process.cpuUsage();
    this.cpuMs=(cpu.user-this.cpu.user+cpu.system-this.cpu.system)/1000;this.cpuWallMs=now-this.cpuAt;
    this.cpu=cpu;this.cpuAt=now;
    this.publishGapMs=this.lastPublish==null?0:now-this.lastPublish;
    this.lastPublish=now;this.publishMs=ms;this.snapshotBytes=bytes;this.snapshot++;
  }
  sample(player,tick,now){
    return {run:this.run,connections:this.connections,disconnects:this.disconnects,now,tick,snapshot:this.snapshot+1,completedTick:this.completedTick,publishTick:this.publishTick,tickMs:this.tickMs,maxTickMs:this.maxTickMs,
      cpuMs:this.cpuMs,cpuWallMs:this.cpuWallMs,collision:this.collision,roundMs:this.roundMs,rounds:this.rounds,loopGapMs:this.loopGapMs,debtMs:this.debtMs,
      discardedMs:this.discardedMs,publishMs:this.publishMs,publishGapMs:this.publishGapMs,
      snapshotBytes:this.snapshotBytes,buffered:player.ws.bufferedAmount,
      queued:player.inputs.length,dropped:player.droppedInputs??0,ack:player.ack,
      received:player.lastSeq,rxMessages:player.rxMessages??0,rxBytes:player.rxBytes??0,
      skipped:player.skippedSnapshots??0};
  }
  clearWindow(){this.maxTickMs=0;this.loopGapMs=0;}
}
