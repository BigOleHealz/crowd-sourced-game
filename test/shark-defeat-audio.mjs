import assert from 'node:assert/strict';
import {fatalBiteCalls,sharkDefeatSound} from '../public/shark-defeat-audio.js';

const ear={x:0,y:0,z:0},event={id:'a',tick:100,x:4,y:0,z:0},calls=[];
const hear=(previous,current,tick)=>fatalBiteCalls(previous,current,tick,ear,e=>calls.push(e.id));
hear(undefined,undefined,100);hear([],[],100);
hear([event],[event],101); // Welcome snapshot already had this defeat.
hear([],[event],120); // A stale snapshot after suspension.
hear([],[event],101);hear([event],[event],102);
hear([],[{...event,id:'far',x:90}],101);
hear([event],[event,{...event,id:'b',tick:109}],109);
assert.deepEqual(calls,['a','b']);

for(const rate of [24000,48000]){
  const context={sampleRate:rate,createBuffer(channels,length){
    assert.equal(channels,1);
    const samples=new Float32Array(length);return {getChannelData:()=>samples};
  }};
  const samples=sharkDefeatSound(context).getChannelData(0);
  assert(samples.every(x=>Number.isFinite(x)&&Math.abs(x)<.91));
  function rms(start,end){
    const first=Math.round(rate*start),last=Math.round(rate*end);
    let sum=0;for(let i=first;i<last;i++)sum+=samples[i]**2;
    return Math.sqrt(sum/(last-first));
  }
  const cry=rms(.18,.53),submerged=rms(.88,1.06),bubbles=rms(1.12,1.45);
  assert(cry>.16 && submerged>0 && submerged<cry*.55);
  assert(bubbles>.015 && bubbles<cry*.40);
  assert(rms(1.72,1.77)<.001);
}
console.log('Fatal bite cues deduplicate across snapshots and fade from a voiced cry to quieter bubbles.');
