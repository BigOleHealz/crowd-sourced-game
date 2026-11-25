import assert from 'node:assert/strict';

globalThis.location={search:''};
const {usePlayerScan}=await import('../public/player-scan.js');
const {useNathan}=await import('../public/player-nathan.js');
const available=new Set(['mike','pink']);

for(const character of ['mike','pink'])for(const lostParts of [
  {head:{tick:1}}, {leftArm:{tick:1}}, {rightLeg:{tick:1}},
]){
  const player={id:1,character,lostParts,dead:true};
  assert.equal(usePlayerScan(player,available),character);
  assert.equal(usePlayerScan({...player,dead:false},available),character);
}
assert.equal(useNathan({id:1,character:'nathan',dead:true,lostParts:{head:{tick:1}}},true),true);
assert.equal(usePlayerScan({id:'rival-fern',character:'mike'},available),null);
assert.equal(usePlayerScan({id:1,character:'classic'},available),null);
console.log('Player appearance stays selected through fatal and nonfatal lost-part states.');
