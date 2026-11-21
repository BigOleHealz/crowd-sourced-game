import assert from 'node:assert/strict';
import {createBasketball} from '../basketball-game.js';
import {basketballCourt as court,basketballChargeRate,basketballUse,hoopHeading,shotWindow} from '../public/basketball-layout.js';

import {touchLayout} from '../public/touch-controls.js';

const dt=1/30;
const touch={role:'basketball',active:true,use:'Leave basketball'};
assert.deepEqual(touchLayout({...touch,shoot:true}).quick,[['KeyE','Leave basketball'],['KeyF','Shoot']]);
assert.deepEqual(touchLayout({...touch,shoot:false}).quick,[['KeyE','Leave basketball']]);
function gameFixture() {
  const world={},players=new Map();
  const game=createBasketball(world,players);
  world.basketball=game.state;
  const advance=(count,fn=()=>{})=>{
    for(let tick=0;tick<count;tick++){fn();game.step(dt);}
  };
  const player=(id,offset=0)=>{
    const state={x:court.x,y:court.y,z:court.z+offset,grounded:true};
    const p={id,state,life:{hp:100},yaw:hoopHeading(state)};
    players.set(id,p);
    return p;
  };
  return {world,players,game,advance,player};
}

{
  const {game,advance}=gameFixture();
  advance(900);
  assert(game.state.scores.every(score=>score>0),'The unattended NPCs score on both sides');
  assert(game.state.ball.y>=court.y);
}

{
  const {world,players,game,advance,player}=gameFixture();
  const a=player(1),b=player(2,1.8),c=player(3);
  c.state.x+=60;
  assert.equal(basketballUse(world,c.state,c.id),null,'Distant players cannot join');
  assert.equal(basketballUse(world,a.state,a.id).role,'join');
  world.volleyball=[{players:[a.id,null,null,null]}];
  assert.equal(basketballUse(world,a.state,a.id),null,'A volleyball player cannot join');
  world.volleyball=undefined;
  game.interact(a,'join');
  game.interact(b,'join');
  assert.deepEqual(game.state.players,[1,2]);
  assert.equal(basketballUse(world,a.state,a.id).role,'leave');
  assert.equal(basketballUse(world,b.state,99),null,'Both roster slots are full');

  // A non-possessing player cannot begin a charge.
  advance(25,()=>game.input(b,{hoopShot:true}));
  assert.equal(game.state.charge,0);
  const shot=(p,chargeTicks)=>{
    advance(chargeTicks,()=>game.input(p,{hoopShot:true}));
    game.input(p,{hoopShot:false});
    advance(70);
    return game.state.result;
  };
  const middle=shotWindow(a.state).center;
  assert.equal(shot(a,Math.round(middle/basketballChargeRate/dt)).points,2);
  assert.deepEqual(game.state.scores,[2,0],'A made shot only scores once');
  advance(30);
  assert.equal(game.state.turn,1,'The next possession goes to the other side');
  assert.equal(shot(b,1).points,0,'A short release misses');
  advance(30);
  assert.equal(game.state.turn,0);
  a.yaw=Math.PI/2;
  assert.equal(shot(a,Math.round(middle/basketballChargeRate/dt)).points,0,'A sideways shot misses');
  advance(30);
  const long=shotWindow(b.state).center;
  assert.equal(shot(b,Math.round(long/basketballChargeRate/dt)).points,3,'Long shots earn three points');
  advance(30);

  game.interact(a,'leave');
  assert.equal(game.state.players[0],null);
  players.delete(b.id);
  advance(900);
  assert.deepEqual(game.state.players,[null,null]);
  assert(game.state.scores[0]>2 && game.state.scores[1]>3,'Both NPCs resume after leave/disconnect');
}

{
  const {game,advance,player}=gameFixture();
  const a=player(1);
  game.interact(a,'join');
  advance(12,()=>game.input(a,{hoopShot:true}));
  assert(game.state.charge>0);
  advance(18);
  assert.equal(game.state.charge,0,'A stalled hold is retired without firing');
  assert.equal(game.state.phase,'held');
  a.state.x+=20;
  advance(1);
  assert.equal(game.state.players[0],null,'Walking away frees the slot');
}

console.log('Basketball possession, scoring and NPC pickup passed');
