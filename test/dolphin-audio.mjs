import assert from 'node:assert/strict';
import {dolphinCalls,dolphinSound} from '../public/dolphin-audio.js';

const ctx={sampleRate:24000,createBuffer(channels,length){
  assert.equal(channels,1);
  const samples=new Float32Array(length);return {getChannelData:()=>samples};
}};
for(let variant=0;variant<3;variant++){
  const clicks=dolphinSound(ctx,'clicks',variant).getChannelData(0);
  const whistle=dolphinSound(ctx,'whistle',variant).getChannelData(0);
  for(const wave of [clicks,whistle]){
    assert(wave.every(x=>Number.isFinite(x) && Math.abs(x)<1));
    assert(Math.max(...wave)>.4);
    assert(Math.abs(wave[0])+Math.abs(wave.at(-1))<.002);
  }
  assert(clicks.filter(x=>x===0).length>clicks.length*.7,'distinct separated click pulses');
  assert(whistle.filter(x=>Math.abs(x)>.02).length>whistle.length*.6,'sustained tonal whistle');
}
const listener={x:0,y:1,z:0},before=[{x:2,y:0,z:1,callSeq:8,callKind:'clicks'}];
const calls=[],emit=(...args)=>calls.push(args);
dolphinCalls(null,before,listener,emit);
dolphinCalls(before,before,listener,emit);
const after=[{...before[0],callSeq:9,callKind:'whistle'}];
dolphinCalls(before,after,listener,emit);
dolphinCalls(after,before,listener,emit);
dolphinCalls(before,after,{...listener,x:70},emit);
assert.equal(calls.length,1);assert.equal(calls[0][0],'whistle');
assert.equal(calls[0][1],after[0]);assert(calls[0][2]>0);
console.log('Spatial dolphin calls deduplicate snapshots, skip stale/far calls, and produce clean click and whistle waveforms.');
