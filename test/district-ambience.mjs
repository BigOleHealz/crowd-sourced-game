import assert from 'node:assert/strict';
import {ambientScene,ambientBuffer} from '../public/district-ambience.js';
const sidewalk={x:40,y:.8,z:41},room={id:1,opening:.05};
const coast=ambientScene(true,sidewalk,'day'),inland=ambientScene(true,{x:0,y:1,z:12},'day');
assert.equal(coast.water.name,'tidal-lap');assert(coast.water.point.x>sidewalk.x);
assert(!inland.water);assert.equal(inland.bed.name,'neighborhood');
assert(ambientScene(true,sidewalk,'day',room).water.gain<coast.water.gain*.25);
assert(ambientScene(true,{...sidewalk,y:88},'day').bed.gain<.02);
const beach=ambientScene(true,{x:62,y:.2,z:-190},'dusk');
assert(beach.water && beach.water.gain>.2);
const creek=ambientScene(false,{x:5,y:.2,z:3},'day');
assert.equal(creek.water.name,'stream');assert(creek.water.point.z<2);
assert.equal(ambientScene(false,{x:0,y:4,z:-26},'night').bed.name,'night-woods');
assert(!ambientScene(false,{x:0,y:4,z:-26},'day').water);
const ctx={createBuffer:(_,frames,rate)=>{const pcm=new Float32Array(frames);return {getChannelData:()=>pcm,sampleRate:rate}}};
for(const kind of ['tidal-lap','stream','neighborhood','pine-wind','night-woods']){
  const pcm=ambientBuffer(ctx,kind).getChannelData(0);
  let square=0,peak=0;for(const x of pcm){square+=x*x;peak=Math.max(peak,Math.abs(x));}
  assert(square/pcm.length>.0008 && peak<=1,'Audible, unclipped '+kind);
  assert(Math.abs(pcm.at(-1)-pcm[0])<.3);
}
console.log('PASS shoreline and creek positions, indoor/altitude attenuation, night forest and five unclipped loops');
