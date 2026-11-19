// Run directly with Node. No network, renderer or other player is required.
import assert from 'node:assert/strict';
import { damageHelicopter, fly, impactDamage, interact, parkedHelicopter, recoverHelicopter } from '../public/airframe.js';
import { HELIPAD, spawn } from '../public/world.js';

const dt = 1 / 30;
function expedition() {
  const heli = parkedHelicopter();
  const pilot = { id: 1, state: { ...spawn(), x: heli.x, y: heli.y, z: heli.z }, inputs: [] };
  const players = new Map([[pilot.id, pilot]]);
  const world = { heli, hp: {} };
  interact(world, pilot);
  assert.equal(heli.pilot, pilot.id);
  return { world, pilot, players };
}
function control({ world, players }, input, ticks) {
  const command = { x: 0, z: 0, lift: 0, aimYaw: 0, ...input };
  for (let n = 0; n < ticks; n++) fly(world, command, dt, players);
}

const hard = expedition();
control(hard, { lift: 1 }, 55);
control(hard, {}, 15);
control(hard, { lift: -1 }, 100);
assert.ok(hard.world.heli.grounded);
assert.equal(hard.world.heli.hp, 64, 'sustained descent costs 36 HP');
control(hard, { lift: -1 }, 90);
assert.equal(hard.world.heli.hp, 64, 'holding descent on the ground causes no additional damage');

const soft = expedition();
control(soft, { lift: 1 }, 20);
control(soft, {}, 15);
for (let n = 0; n < 40 && !soft.world.heli.grounded; n++) {
  control(soft, { lift: -1 }, 5);
  control(soft, {}, 5);
}
assert.ok(soft.world.heli.grounded);
assert.equal(soft.world.heli.hp, 100, 'short descent taps and braking preserve hull');

const obstacle = expedition();
control(obstacle, { lift: 1 }, 10);
control(obstacle, {}, 5);
control(obstacle, { z: -1 }, 100);
const afterImpact = obstacle.world.heli.hp;
assert.ok(afterImpact > 0 && afterImpact < 70, 'speed into solid scenery damages hull');
control(obstacle, { z: -1 }, 120);
assert.equal(obstacle.world.heli.hp, afterImpact, 'sustained solid contact damages once');
assert.equal(impactDamage(2), 0);
assert.ok(impactDamage(6) > impactDamage(4));

const combat = expedition();
const { world, pilot, players } = combat;
control(combat, { lift: 1 }, 30);
assert.equal(damageHelicopter(world, 40, players, pilot.id), false, 'ignore the pilot’s own shot');
assert.equal(world.heli.hp, 100);
damageHelicopter(world, 25, players, 2);
assert.equal(world.heli.hp, 75, 'Pulse hit');
damageHelicopter(world, impactDamage(3.4), players);
damageHelicopter(world, 40, players, 2);
assert.equal(world.heli.hp, 30, 'Bloom hit reaches the smoke threshold exactly');
damageHelicopter(world, 25, players, 2);
assert.equal(world.heli.hp, 5);
damageHelicopter(world, 40, players, 2);
assert.equal(world.heli.hp, 0);
assert.ok(world.heli.wrecked);
assert.equal(world.heli.pilot, null);
assert.deepEqual(pilot.state, spawn(pilot.id - 1));
assert.equal(damageHelicopter(world, 25, players, 2), false);
interact(world, pilot);
assert.equal(world.heli.pilot, null, 'a wreck cannot be boarded');
for (let n = 0; n < 179; n++) recoverHelicopter(world, dt);
assert.ok(world.heli.wrecked);
recoverHelicopter(world, dt);
assert.deepEqual(world.heli, parkedHelicopter());
assert.equal(world.heli.x, HELIPAD.x);
console.log('PASS: hard and gentle landings, repeated solid contact, pulse/bloom hull damage, ejection and six-second recovery.');

// Leave a moving aircraft while flying sideways to its nose.
const bailout = expedition();
control(bailout, { lift: 1 }, 100);
control(bailout, { x: 1 }, 16);
const abandoned = bailout.world.heli;
const departure = { ...abandoned };
interact(bailout.world, bailout.pilot);
assert.equal(bailout.pilot.state.parachute, 'packed');
assert.equal(abandoned.pilot, null);
assert.equal(bailout.world.heli, abandoned);
interact(bailout.world, bailout.pilot);
for (let i=0; i<24; i++) recoverHelicopter(bailout.world,dt);
assert.ok(abandoned.x > departure.x+3 && abandoned.y > departure.y-1);
assert.ok(!abandoned.wrecked && !abandoned.grounded && abandoned.pilot === null);
for (let i=0; i<180 && !abandoned.wrecked; i++) recoverHelicopter(bailout.world,dt);
assert.equal(abandoned.hp,0);
assert.ok(abandoned.wrecked && abandoned.x > departure.x+3);
assert.equal(abandoned.recoverySeconds,6);
for (let i=0; i<179; i++) recoverHelicopter(bailout.world,dt);
assert.equal(bailout.world.heli,abandoned);
recoverHelicopter(bailout.world,dt);
assert.deepEqual(bailout.world.heli,parkedHelicopter());
console.log('PASS: pilotless momentum, crash away from the pad, visible wreck and replacement.');
