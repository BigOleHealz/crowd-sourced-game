import assert from 'node:assert/strict';
import {activeCast,fishingAction,fishingDetail,fishingLabel,fishingSpot,fishingSpots,reelReady,stepFishing} from '../public/pier-fishing.js';
import {fishSpecies} from '../public/reef-fish.js';
import {touchLayout} from '../public/touch-controls.js';
import {cityGround,brickellMap} from '../public/brickell-map.js';
const a={id:1,state:{...fishingSpots[0],grounded:true}},b={id:2,state:{...a.state}};
for(const s of fishingSpots) {
  assert.ok(fishingSpot({...s,grounded:true}));
  assert.equal(cityGround(s.x,s.z),s.y);
  assert.ok(cityGround(s.x+4,s.z,brickellMap.waterY)<brickellMap.waterY);
}
const act=(p,action,tick)=>fishingAction(p,action,tick,true,()=>.5);
act(a,'cast',0);act(b,'cast',0);
assert.ok(activeCast(a.fishing));assert.notEqual(a.fishing,b.fishing);
act(a,'hook',1);assert.equal(a.fishing.phase,'waiting');
stepFishing(b,b.fishing.bite+76,true);assert.equal(b.fishing.phase,'lost');
act(a,'hook',a.fishing.bite);assert.equal(a.fishing.phase,'reel');
for(let i=0;i<3;i++){
  const tick=a.fishing.pull;
  assert.ok(!reelReady(a.fishing,tick-1));assert.ok(reelReady(a.fishing,tick));
  act(a,'reel',tick);
}
assert.equal(a.fishing.phase,'landed');
assert.ok(fishingDetail(a.fishing,400).includes(fishSpecies[a.fishing.species].name));
assert.equal(b.fishing.phase,'lost');
act(b,'cast',400);act(b,'hook',b.fishing.bite);act(b,'reel',b.fishing.pull-1);
assert.equal(b.fishing.phase,'lost');assert.match(b.fishing.reason,/tension/);
act(b,'cast',560);act(b,'hook',b.fishing.bite);stepFishing(b,b.fishing.pull+32,true);
assert.equal(b.fishing.phase,'lost');
for(const phase of ['waiting','bite','reel','landed','lost']){
  const label=fishingLabel({phase});
  assert.ok(touchLayout({role:'foot',active:true,fishAction:label}).quick.some(([code,text])=>code==='KeyG' && text===label));
}
b.state.x-=10;stepFishing(b,900,true);
assert.ok(!b.fishing);act(b,'cast',902);assert.ok(!b.fishing);
console.log('PASS valid pier casts, independent anglers, missed bite, snapped line, timed pulls, species, recast, exit and touch controls.');
