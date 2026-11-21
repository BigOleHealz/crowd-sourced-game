import assert from 'node:assert/strict';
import {civilianEngineLoop,civilianEngineMix} from '../public/civilian-engine.js';
const context={sampleRate:8000,createBuffer(channels,length){
  const data=new Float32Array(length);
  return {getChannelData:()=>data};
}};
const signatures=[];
for(const model of ['hatchback','sedan','van']){
  const samples=civilianEngineLoop(context,model).getChannelData(0);
  assert(samples.every(v=>Number.isFinite(v) && Math.abs(v)<=1));
  assert(Math.abs(samples[0]-samples.at(-1))<.09);
  let crossings=0;
  for(let i=1;i<samples.length;i++)if(samples[i-1]<=0 && samples[i]>0)crossings++;
  signatures.push(crossings);
  const mix=(speed,engineLoad)=>civilianEngineMix({model,speed,engineLoad});
  assert(mix(3,0).rate>mix(0,0).rate);
  assert(mix(3,1).rate>mix(3,0).rate && mix(3,1).gain>mix(3,0).gain);
  assert.deepEqual(mix(-3,1),mix(3,1));
}
assert.equal(new Set(signatures).size,3);
console.log('PASS three distinct civilian engine loops, smooth loop boundaries, revs and throttle response');
