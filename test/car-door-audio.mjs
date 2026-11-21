import assert from 'node:assert/strict';
import {doorCue,doorBuffer} from '../public/car-door-sound.js';
const pose=t=>t===null?{}:{boarding:{progress:t}};
for(const frames of [[null,.1,.55,.8,.94,null],[null,.94,.8,.55,.1,null]]){
  const cues=frames.slice(1).map((t,i)=>doorCue(pose(frames[i]),pose(t))).filter(Boolean);
  assert.deepEqual(cues,['door-open','door-close']);
}
assert.equal(doorCue(undefined,pose(.6)),undefined);
assert.equal(doorCue(pose(.6),{wrecked:true}),undefined);
const context={sampleRate:24000,createBuffer(n,len){const data=new Float32Array(len);return {getChannelData:()=>data};}};
const open=doorBuffer(context,false).getChannelData(0),close=doorBuffer(context,true).getChannelData(0);
assert(close.length>open.length);
for(const wave of [open,close]){
  assert(wave.every(x=>Number.isFinite(x) && Math.abs(x)<1));
  assert(Math.max(...wave)>.13);assert(Math.abs(wave.at(-1))<.005);
}
console.log('PASS synchronized latch and door closure, reverse exit, join suppression and bounded audio.');
