import assert from 'node:assert/strict';
import {floatingBody,marineBlastCalls} from '../public/marine-float.js';
import {createManatees,damageManatee} from '../public/manatee-swim.js';
import {createSharks,damageShark} from '../public/shark-swim.js';
import {brickellMap} from '../public/brickell-map.js';
const water=brickellMap.waterY;
for(const kind of ['shot','blast']){
  const m=createManatees({},water),s=createSharks();
  for(const [herd,hit] of [[m,damageManatee],[s,damageShark]]){
    const a=herd.state[0],before=structuredClone(herd.state);
    a.y=water-2;hit(herd.state,0,1000,kind);
    let calls=0;marineBlastCalls(before,herd.state,()=>calls++);marineBlastCalls(herd.state,herd.state,()=>calls++);
    assert.equal(calls,kind==='blast'?1:0);
  }
  for(let i=0;i<300;i++){m.step(1/30);s.step(1/30,new Map(),i,()=>{});}
  for(const a of [m.state[0],s.state[0]]){
    assert.equal(a.hp,0);assert(Math.abs(a.y-water)<.2);assert(floatingBody(a.deathY,water,1,a.ageSinceHit).roll>3);
  }
}
console.log('Both species surface belly-up after both defeat types and play one cue per fresh blast.');
