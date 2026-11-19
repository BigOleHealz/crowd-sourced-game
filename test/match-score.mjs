import assert from 'node:assert/strict';
import {newExpedition,fire,advanceRounds} from '../public/expedition.js';
import {damageActor,newLife} from '../public/rivals.js';
const world=newExpedition();
function participant(id,z){
  return {id,weapon:1,state:{x:0,y:50,z,grounded:true},life:newLife(0,false),
    score:{kills:0,deaths:0},fireReady:0};
}
const shooter=participant(1,0),victim=participant(2,-6),players=new Map([[1,shooter],[2,victim]]);
victim.life.hp=20;
fire(world,shooter,{aimYaw:0,aimPitch:0},1,players,[]);
const replacement=participant(1,0);players.set(1,replacement);
for(let tick=2;tick<15;tick++)advanceRounds(world,players,[],tick);
assert.deepEqual(shooter.score,{kills:1,deaths:0});
assert.deepEqual(replacement.score,{kills:0,deaths:0});
assert.deepEqual(victim.score,{kills:0,deaths:1});
assert.equal(damageActor(victim,100,15),false);
victim.life=newLife(20);assert.equal(damageActor(victim,100,21),false);
assert.equal(victim.score.deaths,1);
console.log('PASS defeat credited once to the actual shooter, including a shot in flight when the numeric slot changes hands.');
