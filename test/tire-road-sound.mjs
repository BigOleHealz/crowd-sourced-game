import assert from 'node:assert/strict';
import {roadSurfaceAt} from '../public/road-surface.js';
import {tireMix,tireScreechMix,tireLoop} from '../public/tire-road-sound.js';
const city=process.env.GOY_THEFT_AUTO_MAP==='brickell';
assert.equal(roadSurfaceAt(0,city?-100:0),'deck');
assert.equal(roadSurfaceAt(city?0:-21,city?-190:10.2),city?'asphalt':'gravel');
const car={x:0,z:0,speed:-4,flatTires:5};
assert.equal(tireMix(car).flat,2);assert(tireMix(car).volume>0);
assert.equal(tireMix({...car,bridgeFlight:{vy:-2}}),null);
assert.equal(tireMix({...car,speed:0}),null);
assert.equal(tireScreechMix({...car,speed:6,steer:1,braking:true}),null);
assert.equal(tireScreechMix({...car,speed:15,steer:.02,braking:false,lateralSpeed:0}),null);
assert(tireScreechMix({...car,speed:15,steer:.35,braking:false,lateralSpeed:0}).volume>.2);
assert(tireScreechMix({...car,speed:15,steer:0,braking:true,lateralSpeed:0}).volume>.2);
assert.equal(tireScreechMix({...car,speed:15,steer:.35,wrecked:true}),null);
const samples=[],context={sampleRate:12000,createBuffer:()=>{const data=new Float32Array(12000);return {getChannelData:()=>data};}};
for(const kind of ['asphalt','gravel','grass','sand','deck','flat']){
  const signal=tireLoop(context,kind).getChannelData(0);assert(signal.some(v=>Math.abs(v)>.1));samples.push(signal);
}
for(let i=0;i<samples.length;i++)for(let j=0;j<i;j++)assert.notDeepEqual(samples[i],samples[j]);
console.log('PASS surface classification, flat counts, movement, airborne silence and six distinct tire signatures.');
