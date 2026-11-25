import assert from 'node:assert/strict';
import {LagDiagnostics} from '../public/lag-diagnostics.js';

const diagnostics=new LagDiagnostics();
const pose=x=>({x,y:0,z:0});
const record=(receivedAt,sim,from,to,pending=0,process=2)=>diagnostics.record({
  receivedAt,processedAt:receivedAt+process,sim,beforeFoot:pose(from),afterFoot:pose(to),pending,
});
record(0,0,0,0);
record(3000,67,0,0);
record(3700,134,0,0);
record(3770,201,0,1.6,24,6);
assert.equal(diagnostics.worstGap.received,700);
assert.deepEqual(diagnostics.lastCorrection,{
  kind:'foot',metres:1.6,received:70,sim:67,process:6,pending:24,at:3.77,
});
assert.match(diagnostics.summary(),/last correction foot 1.6 m @3.8s \(gap\/sim 70\/67 ms, process 6 ms, pending 24\)/);
diagnostics.reset();
assert.equal(diagnostics.lastCorrection,null);
console.log('PASS: correction timing stays attached to its own snapshot.');
