import assert from 'node:assert/strict';
import {LagDiagnostics} from '../public/lag-diagnostics.js';

const diagnostics=new LagDiagnostics();
const pose=(x,y=0,grounded=true)=>({x,y,z:0,grounded});
const record=(receivedAt,sim,simTick,ack,from,to,pending=0,process=2)=>diagnostics.record({
  receivedAt,processedAt:receivedAt+process,sim,simTick,ack,beforeFoot:from,afterFoot:to,pending,
});
record(0,0,0,0,pose(0),pose(0));
record(3000,67,2,2,pose(0),pose(0));
record(3700,134,4,4,pose(0),pose(0));
record(3770,201,6,10,pose(0,1,false),pose(1.6,0),24,6);
assert.equal(diagnostics.worstGap.received,700);
assert.deepEqual(diagnostics.lastCorrection,{
  kind:'foot',metres:Math.hypot(1.6,1),horizontal:1.6,vertical:1,
  received:70,sim:67,process:6,pending:24,ackAdvance:6,tickAdvance:2,
  groundedFlip:'air→ground',at:3.77,
});
assert.match(diagnostics.summary(),/last correction foot 1.9 m \(xz\/y 1.6\/1.0\) @3.8s · gap\/sim 70\/67 ms · ack\/ticks 6\/2 · process 6 ms · pending 24 · air→ground/);
diagnostics.record({receivedAt:3840,processedAt:3841,sim:268,simTick:8,ack:12,
  beforeDriver:pose(0),afterDriver:pose(1),pending:8});
assert.equal(diagnostics.lastCorrection.kind,'driver');
assert.equal(diagnostics.lastCorrection.horizontal,1);
assert.equal(diagnostics.lastCorrection.vertical,0);
assert.equal(diagnostics.lastCorrection.groundedFlip,null);
diagnostics.reset();
assert.equal(diagnostics.lastCorrection,null);
console.log('PASS: correction timing stays attached to its own snapshot.');
// Ring rollover stays bounded, copies poses and keeps server message types
// from overwriting the event category used to correlate browser/server clocks.
for(let i=0;i<9000;i++)diagnostics.event('server',{type:'diagnostics',tick:i},i);
const saved=diagnostics.export();assert.equal(saved.events.length,8192);
assert.equal(saved.events[0].tick,808);assert.equal(saved.events.at(-1).tick,8999);
assert.equal(saved.events.at(-1).type,'server');
