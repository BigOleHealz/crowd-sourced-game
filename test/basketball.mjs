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

const {hoop}=await import('../public/basketball-layout.js');
const {dunkRelease}=await import('../public/basketball-dunk.js');
const {basketballPose}=await import('../public/basketball-pose.js');
const {createRangerRig,poseBasketball}=await import('../public/ranger-pose.js');
const THREE=await import('three');
for(const timing of ['gold','early','late','step out']){
  const {game,advance,player}=gameFixture(),a=player(1);
  game.interact(a,'join');
  const launch={x:hoop.x+.30,y:court.y,z:hoop.z+1.52};
  const ticks=timing==='early'?1:timing==='late'?42:Math.round(shotWindow(launch).center/basketballChargeRate/dt);
  // The release location selects the move even when the hold began farther away.
  advance(ticks,()=>game.input(a,{hoopShot:true}));
  Object.assign(a.state,launch);
  if(timing==='step out')a.state.z+=.75;
  game.input(a,{hoopShot:false});advance(1);
  if(timing==='step out'){assert.equal(game.state.shot.kind,undefined);continue;}
  assert.equal(game.state.shot.kind,'dunk');
  assert.equal(game.state.result,null,'scoring waits for the downward rim crossing');
  const avatar=createRangerRig();
  advance(13);
  const snap=JSON.parse(JSON.stringify(game.state));
  const action=basketballPose(snap,{...a.state,id:a.id},0);
  const otherViewer=basketballPose(snap,{...a.state,id:a.id},120);
  assert.deepEqual(action,otherViewer,'the shot age synchronizes spectators independently of their clock');
  poseBasketball(avatar,a.state,action);
  assert(avatar.root.position.y>court.y+1.1,'feet leave the court');
  assert(snap.shot.age<dunkRelease && snap.ball.y>hoop.y,'ball rises above the hoop while held');
  assert(Math.hypot(snap.ball.x-action.dunk.hand.x,snap.ball.y-action.dunk.hand.y,snap.ball.z-action.dunk.hand.z)<.001);
  for(const limb of avatar.limbs){
    const palm=limb.forearm.localToWorld(new THREE.Vector3(0,-.265,0));
    assert(palm.distanceTo(snap.ball)<.18,'both visible hands follow the ball');
  }
  advance(18);
  assert.equal(game.state.result.kind,'dunk');
  assert.equal(game.state.result.points,timing==='gold'?2:0);
  assert.equal(game.state.result.timing,timing==='gold'?'Perfect':timing==='early'?'Early':'Late');
  advance(65);
  assert.equal(game.state.turn,1);assert.deepEqual(game.state.scores,[timing==='gold'?2:0,0]);
}
console.log('Close releases dunk, gold scores two, early and late rim out, both hands rise with the ball, normal shots resume outside the lane.');

for(const response of ['idle','drive','shoot','other player joins']){
  const {game,advance,player}=gameFixture(),a=player(1),guard=game.state.npcs[1];
  game.interact(a,'join');
  const initially=Math.hypot(guard.x-a.state.x,guard.z-a.state.z);
  let ticks=0;
  while(!game.state.reach && ticks++<160)advance(1);
  const reach=game.state.reach;assert(reach,'NPC closes to attempt a steal');
  assert.equal(reach.target,a.id);assert.equal(reach.side,1);
  assert(Math.hypot(guard.x-a.state.x,guard.z-a.state.z)<initially-1);
  const pose=basketballPose(JSON.parse(JSON.stringify(game.state)),guard,0);
  assert(pose.reach && pose.reach.lift>0);
  if(response==='drive')advance(22,()=>{a.state.x+=.14;});
  else if(response==='shoot'){
    advance(3,()=>game.input(a,{hoopShot:true}));game.input(a,{hoopShot:false});advance(18);
    assert.equal(game.state.phase,'flight');
  }else if(response==='other player joins'){
    game.interact(player(2),'join');advance(24);
  }else{
    advance(18);
    assert.deepEqual(game.state.steal,{side:1,from:a.id});
    assert.equal(game.state.turn,1);assert.deepEqual(game.state.scores,[0,0]);
    assert.equal(game.state.charge,0);assert.equal(game.state.reach,undefined);
    advance(1);assert(Math.hypot(game.state.ball.x-guard.x,game.state.ball.z-guard.z)<.50);
    advance(220);assert(game.state.result?.side===1,'after stealing the NPC can take its own shot');
    continue;
  }
  assert.equal(game.state.reach,undefined);assert.equal(game.state.steal,undefined);assert.equal(game.state.turn,0);
}
console.log('NPC closes, visibly reaches and steals from an idle carrier. Driving away, releasing a shot and a second human joining interrupt the steal.');
