import assert from 'node:assert/strict';
import {boatLoop,boatMix} from '../public/boat-audio.js';

const context={sampleRate:24000,createBuffer(channels,length){
  assert.equal(channels,1);
  const samples=new Float32Array(length);
  return {getChannelData:()=>samples};
}};
const engine=boatLoop(context,'outboard').getChannelData(0);
const water=boatLoop(context,'wake').getChannelData(0);
for(const samples of [engine,water]){
  const rms=Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/samples.length);
  assert(rms>.07 && rms<.5);
  assert(Math.abs(samples.at(-1)-samples[0])<.35);
  assert(samples.every(x=>Number.isFinite(x)&&Math.abs(x)<1));
}
assert.notDeepEqual(engine,water);
const idle=boatMix({speed:0,throttle:0}),rev=boatMix({speed:0,throttle:1});
const underway=boatMix({speed:13,throttle:1}),coast=boatMix({speed:13,throttle:0});
assert.equal(idle.wakeVolume,0);
assert(rev.motorRate>idle.motorRate && rev.wakeVolume>0);
assert(underway.motorRate>rev.motorRate && coast.wakeVolume>rev.wakeVolume);
assert.deepEqual(underway,boatMix({speed:-13,throttle:-1}));
console.log('Boat motor and wake synthesis and response passed.');
