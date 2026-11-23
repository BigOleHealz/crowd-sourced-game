import assert from 'node:assert/strict';
import {tankDriveLoop,tankDriveMix} from '../public/tank-drive-audio.js';

const listener={x:8,y:1,z:14};
const tank={...listener,driver:12,fuel:75,speed:0,turnRate:0};
const idle=tankDriveMix(tank,listener);
assert(idle.engineGain>0);
assert.equal(idle.trackGain,0);
const moving=tankDriveMix({...tank,speed:6},listener);
assert(moving.engineRate>idle.engineRate && moving.trackGain>0);
assert.deepEqual(tankDriveMix({...tank,speed:-6},listener),moving);
assert(tankDriveMix({...tank,turnRate:.7},listener).trackGain>0);
assert.equal(tankDriveMix({...tank,fuel:0},listener).engineGain,0);
for(const update of [{x:100},{driver:null},{wrecked:true},{sinking:true}])
  assert.equal(tankDriveMix({...tank,...update},listener),null);

const context={sampleRate:24000,createBuffer:(_,len)=>{const data=new Float32Array(len);return {getChannelData:()=>data};}};
for(const tracks of [true,false]){
  const samples=tankDriveLoop(context,tracks).getChannelData(0);
  const rms=Math.sqrt(samples.reduce((total,s)=>total+s*s,0)/samples.length);
  assert(rms>.035 && rms<.5);
  assert(samples.every(s=>Math.abs(s)<1));
  assert(Math.abs(samples[0]-samples.at(-1))<.035);
}
