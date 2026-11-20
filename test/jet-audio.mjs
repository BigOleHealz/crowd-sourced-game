import assert from 'node:assert/strict';
import {jetLoop,jetMix} from '../public/jet-audio.js';
const context={sampleRate:24000,createBuffer(n,length){const data=new Float32Array(length);return {getChannelData:()=>data};}};
for(const roar of [true,false]){
  const w=jetLoop(context,roar).getChannelData(0);
  assert(w.every(x=>Number.isFinite(x) && Math.abs(x)<=1));
  assert(w.some(x=>Math.abs(x)>.30));
  assert(Math.abs(w.at(-1)-w[0])<.3);
}
const j={speed:18,x:0,z:0,yaw:0},ear={x:0,z:10};
assert(jetMix(j,ear,20).fanRate>jetMix(j,ear,-20).fanRate);
assert(jetMix({...j,burner:true},ear,0).exhaustGain>jetMix(j,ear,0).exhaustGain);
console.log('PASS jet audio loop levels, flyby pitch and afterburner mix');
