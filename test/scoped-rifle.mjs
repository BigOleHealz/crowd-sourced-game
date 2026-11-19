import assert from 'node:assert/strict';
import {firearmSpecs} from '../public/rounds.js';
import {fire,advanceRounds,newExpedition} from '../public/expedition.js';
import {newLife} from '../public/rivals.js';
import {createRangerRig,poseRig} from '../public/ranger-pose.js';

const world=newExpedition(), spec=firearmSpecs[3];
assert.ok(spec.range>firearmSpecs[1].range);
assert.ok(spec.cooldown>firearmSpecs[2].cooldown);
const shooter={id:1,weapon:3,state:{x:0,y:180,z:0,grounded:true},yaw:0,life:newLife(0,false),fireReady:0};
const target={id:2,weapon:1,state:{x:0,y:180,z:-160,grounded:true},yaw:0,life:newLife(0,false),inputs:[]};
const players=new Map([[1,shooter],[2,target]]),aim={aimYaw:0,aimPitch:0};
const rig=createRangerRig();
for(const slot of [1,3,2,3,1]){
  poseRig(rig,{...shooter.state,id:1,weapon:slot,yaw:0},1/30);
  assert.deepEqual(rig.tools.map(tool=>tool.visible),[1,2,3].map(id=>id===slot));
}
fire(world,shooter,aim,0,players,[]);
fire(world,shooter,aim,spec.cooldown-1,players,[]);
assert.equal(world.bullets.length,1);
assert.equal(world.bullets[0].weapon,3);
const flightTicks=Math.ceil(160/(spec.speed/30));
for(let tick=1;tick<flightTicks;tick++)advanceRounds(world,players,[],tick);
assert.equal(target.life.hp,100);
advanceRounds(world,players,[],flightTicks);
assert.equal(target.life.hp,20);
assert.equal(spec.vehicleDamage,45);
assert.equal(world.bullets.length,0);
assert.equal(world.shots.at(-1).targetId,2);
fire(world,shooter,aim,flightTicks,players,[]);
assert.equal(world.bullets.length,1);
for(const [slot,expected] of [[1,75],[3,150]]){
  const game=newExpedition();
  shooter.weapon=slot;shooter.fireReady=0;
  target.life={...newLife(0,false),hp:200};
  target.state.z=-8;
  fire(game,shooter,{aimYaw:0,aimPitch:Math.atan2(.39,8)},0,players,[]);
  for(let tick=1;tick<10;tick++)advanceRounds(game,players,[],tick);
  assert(game.shots.at(-1).headshot);
  assert.equal(target.life.hp,200-expected);
}
console.log('PASS slot 3 shares the rendered and authoritative pose, respects its cadence and lands one finite-flight body hit beyond carbine range.');
