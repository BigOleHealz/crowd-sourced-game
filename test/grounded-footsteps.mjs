import assert from 'node:assert/strict';
import {contactingFoot,bootSurface,stepBuffer} from '../public/footsteps.js';
import {CITY} from '../public/world.js';
const state={grounded:true},g={phase:.53,speed:3,weight:.95};
assert.equal(contactingFoot(.48,g,state),1);
assert.equal(contactingFoot(.54,{...g,phase:.60},state),0);
assert.equal(contactingFoot(.96,{...g,phase:.02},state),-1);
for(const change of [{swimming:true},{grounded:false},{stance:'prone'},{climb:{}},{dead:true}])
  assert.equal(contactingFoot(.48,g,{...state,...change}),0);
assert.equal(contactingFoot(undefined,g,state),0);assert.equal(contactingFoot(.48,{...g,speed:0},state),0);
assert.equal(bootSurface({x:0,y:2,z:0},{},true),'deck');
if(CITY){
  assert.equal(bootSurface({x:-3,y:.7,z:15},{}),'hard');
  assert.equal(bootSurface({x:52,y:.8,z:-261},{}),'sand');
  assert.equal(bootSurface({x:40,y:.81,z:14},{}),'grass');
}
const context={sampleRate:24000,createBuffer(ch,len){const data=new Float32Array(len);return {getChannelData:()=>data};}};
const energies=new Set();
for(const surface of ['hard','deck','gravel','grass','sand','water']){
  const wave=stepBuffer(context,surface,1).getChannelData(0);
  assert(wave.every(v=>Number.isFinite(v) && Math.abs(v)<=1));
  assert(Math.abs(wave.at(-1))<.003 && wave[0]===0);
  const energy=wave.reduce((sum,v)=>sum+v*v,0);assert(energy>1);energies.add(energy);
}
assert.equal(energies.size,6);
console.log('PASS alternating foot contacts, transition silence, ground surfaces and sampled variants');
