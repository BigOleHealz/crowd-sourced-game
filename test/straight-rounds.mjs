import assert from 'node:assert/strict';
import {newExpedition, fire, fireTurret, advanceRounds} from '../public/expedition.js';
import {firearmSpecs} from '../public/rounds.js';
import {newLife} from '../public/rivals.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7, `${a} differs from ${b}`);
for(const [weapon,spec] of Object.entries(firearmSpecs)) {
  for(const pitch of [0,.26,-.26]){
    const world=newExpedition();
    const player={id:1,weapon:Number(weapon),state:{x:0,y:180,z:0},life:newLife(0,false),fireReady:0};
    const players=new Map([[1,player]]);
    if(weapon==='turret'){
      Object.assign(world.heli,{x:0,y:180,z:0,gunner:1,turretYaw:.32,turretPitch:pitch});
      fireTurret(world,'heli',player,0,players,[]);
    }else fire(world,player,{aimYaw:.32,aimPitch:pitch},0,players,[]);
    const rounds=world.bullets.map(round=>({round,start:{...round}}));
    const start=rounds[0].start;
    near(Math.hypot(start.vx,start.vy,start.vz),spec.speed);
    near(start.vy,Math.sin(pitch)*spec.speed);
    const ticks=Math.ceil(spec.range/spec.speed*30);
    for(let tick=1;tick<=ticks+1;tick++){
      advanceRounds(world,players,[],tick);
      for(const {round,start} of rounds){
        const elapsed=Math.min((tick-(start.delay ?? 0))/30,spec.range/spec.speed);
        for(const axis of ['x','y','z'])near(round[axis],start[axis]+start['v'+axis]*elapsed);
        near(round.vy,start.vy);
        assert.equal(world.bullets.includes(round),elapsed<spec.range/spec.speed);
      }
    }
  }
}
console.log('PASS straight level, rising and falling rounds with finite time and exact range for every bullet weapon.');
