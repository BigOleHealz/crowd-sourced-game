import assert from 'node:assert/strict';
import {advanceRounds,fire,newExpedition,tracePulse} from '../public/expedition.js';
import {newLife} from '../public/rivals.js';
import {stanceMuzzleHeight} from '../public/world.js';

const standingFeet = {x:0,y:18,z:0,grounded:true};
for (const stance of ['crouch','prone']) {
  for (const yaw of [0,Math.PI/2,-Math.PI/2]) {
    const world=newExpedition();
    const victim={id:2,life:newLife(0,false),yaw,state:{...standingFeet,stance}};
    const horizontal=stance==='prone' ? 1.69*Math.sin(1.38)-.96 : 0;
    const head={x:Math.sin(yaw)*horizontal,z:-Math.cos(yaw)*horizontal,
      y:standingFeet.y+(stance==='prone' ? .14+1.69*Math.cos(1.38) : 1.69-.49)};
    const ray={x:-Math.cos(yaw),y:0,z:-Math.sin(yaw)};
    const origin={x:head.x-4*ray.x,y:head.y,z:head.z-4*ray.z};
    const pick=tracePulse(world,[victim],origin,ray,6,false);
    assert.equal(pick.target,victim);
    assert.equal(pick.headshot,true);
    assert.equal(tracePulse(world,[victim],{...origin,y:standingFeet.y+1.69},ray,6,false).hitKind,null);

    const shooter={id:1,weapon:1,life:newLife(0,false),fireReady:0,
      state:{...origin,stance,y:origin.y-stanceMuzzleHeight({stance})}};
    const players=new Map([[1,shooter],[2,victim]]);
    fire(world,shooter,{aimYaw:Math.atan2(ray.x,-ray.z),aimPitch:0},1,players,[]);
    assert.equal(world.shots[0].from.y,origin.y);
    for(let t=2;t<=6;t++)advanceRounds(world,players,[],t);
    assert.equal(victim.life.hp,25);
    assert.equal(world.shots.at(-1).headshot,true);
  }
}
console.log('PASS cursor picking and traveling rounds share the lowered crouch and oriented prone head at three headings.');
