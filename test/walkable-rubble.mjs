import assert from 'node:assert/strict';
import test from 'node:test';

process.env.GOY_THEFT_AUTO_MAP='brickell';
const {MAP,groundHeight,stepPlayer}=await import('../public/world.js');

test('a player walks across a collapsed tower lot without jumping',()=>{
  const building=MAP.buildings.find(b=>b.towerId!=null);
  const doors={collapsedTowers:[building.towerId]};
  const start=building.x-building.w/2-2;
  let player={x:start,y:groundHeight(start,building.z,Infinity,doors),z:building.z,
    vx:0,vz:0,vy:0,grounded:true};
  let crest=player.y;
  for(let tick=0;tick<Math.ceil((building.w+4)/4.6*30)+10;tick++){
    player=stepPlayer(player,{x:1,z:0},1/30,{}, {doors});
    crest=Math.max(crest,player.y);
    assert.equal(player.climb,undefined);
  }
  assert(crest>building.base+1,'walks up the visible mound');
  assert(player.x>building.x+building.w/2+1,'walks back down the far side');
  assert.equal(player.grounded,true);
});
