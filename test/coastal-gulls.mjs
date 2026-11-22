import assert from 'node:assert/strict';
import {createGulls,damageGull,gullContact} from '../public/gull-flight.js';
const flock=createGulls(),replica=createGulls(),bird=flock.state[0],initial={...bird};
let flap=false,glide=false;
for(let i=0;i<600;i++){
  flock.step(1/30);replica.step(1/30);
  assert.deepEqual(flock.state,replica.state);
  flap||=!bird.gliding;glide||=bird.gliding;
  assert(bird.y>2 && bird.y<7);
}
assert(flap && glide);
assert(Math.hypot(bird.x-initial.x,bird.z-initial.z)>1);
const above={...bird,y:bird.y+4},below={...bird,y:bird.y-4};
assert.equal(gullContact(flock.state,above,below).index,0);
assert(damageGull(flock.state,0,25,'shot'));
const featherOrigin=[bird.x,bird.y,bird.z];
flock.step(1/30);
assert.deepEqual([bird.x,bird.y,bird.z],featherOrigin);
assert.equal(bird.deathKind,'shot');
assert(!damageGull(flock.state,0,50,'blast'));
assert.equal(bird.hitSeq,1);
for(let i=0;i<2701;i++)flock.step(1/30);
assert.equal(bird.hp,bird.maxHp);
assert.equal(bird.ageSinceHit,null);
assert.equal(bird.deathKind,null);
console.log('PASS deterministic coastal flight, flapping, gliding, feather event and repopulation.');
