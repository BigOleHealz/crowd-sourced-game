import assert from 'node:assert/strict';

process.env.PINEWATCH_MAP = 'brickell';
const { MAP, solidTopAt, stepPlayer } = await import('../public/world.js');
const { newExpedition, interact, fly } = await import('../public/expedition.js');
const { recoverHelicopter } = await import('../public/airframe.js');
const { selectSeat } = await import('../public/seat-selection.js');

const tower = MAP.buildings.find(b => b.x === 15 && b.z === -30);
const deck = {x: tower.x - 4, z: tower.z};
const deckY = tower.base + tower.eave;
const dt = 1/30;

function approachRoof({x, z}, altitude, yaw = 0) {
  const world = newExpedition(), h = world.heli;
  const pilot = {id: 1, state: {...h}, inputs: []};
  const players = new Map([[pilot.id, pilot]]);
  interact(world, pilot);
  assert.equal(h.pilot, pilot.id);
  Object.assign(h, {x, z, y: altitude, yaw, grounded: false});
  function control(ticks, input = {}) {
    for (let i = 0; i < ticks; i++) {
      recoverHelicopter(world, dt, players);
      if (h.pilot === pilot.id) fly(world, {x: 0, z: 0, lift: 0, aimYaw: yaw, ...input}, dt, players);
    }
  }
  return {world, h, pilot, control};
}

function gentleLanding(site, y, yaw) {
  const {world, h, pilot, control} = approachRoof(site, y + .5, yaw);
  for (let i = 0; i < 12; i++) {
    control(5, {lift: -1});
    control(5);
  }
  assert.ok(h.grounded);
  assert.equal(h.y, y);
  assert.equal(h.hp, 500);
  const parked = {...h};
  control(300, {lift: -1, x: 1});
  assert.deepEqual(h, parked);
  assert.ok(selectSeat(world, pilot, 'heli', 2));
  control(180);
  assert.ok(selectSeat(world, pilot, 'heli', 1));
  interact(world, pilot);
  assert.equal(h.abandonedFor, null);
  assert.ok(pilot.state.grounded);
  assert.ok(Math.hypot(pilot.state.x-h.x, pilot.state.z-h.z) <= 2.16);
  pilot.state = stepPlayer(pilot.state, {}, dt, world.hp, world);
  assert.ok(pilot.state.grounded);
  assert.equal(pilot.state.y, y);
  control(900);
  assert.deepEqual(h, {...parked, pilot: null, turretYaw: yaw});
  interact(world, pilot);
  assert.equal(h.pilot, pilot.id);
  control(30, {lift: 1});
  assert.ok(!h.grounded && h.y > y + 3);
  assert.equal(h.hp, 500);
}

gentleLanding(deck, deckY, 0);
const housing = tower.housing;
const upper = {x: housing.x, z: housing.z - 1};
const upperY = solidTopAt(upper.x, upper.z, {});
assert.ok(upperY > deckY + 1);
gentleLanding(upper, upperY, 0);
gentleLanding({x: housing.x + 1.5, z: housing.z}, upperY, Math.PI / 2);

const hard = approachRoof(deck, deckY + 8);
hard.control(120, {lift: -1});
assert.ok(hard.h.grounded);
assert.equal(hard.h.hp, 464);
hard.control(120, {lift: -1});
assert.equal(hard.h.hp, 464);

const fatal = approachRoof(deck, deckY + 8);
fatal.h.hp = 30;
fatal.control(55, {lift: -1});
assert.ok(fatal.h.wrecked && fatal.h.hp === 0);

const sliding = approachRoof({x: tower.x - 4.4, z: tower.z - 7}, deckY + 1);
sliding.control(26, {z: 1});
sliding.control(30, {lift: -1, z: 1});
assert.ok(sliding.h.grounded && sliding.h.hp < hard.h.hp);

// A padded facade or a deck with the tail wheel hanging off cannot park the craft.
for (const site of [
  {x: tower.x - tower.w/2 - .6, z: tower.z},
  {x: deck.x, z: tower.z + tower.d/2 - 2},
]) {
  const edge = approachRoof(site, deckY + .4);
  edge.control(90, {lift: -1});
  assert.ok(!edge.h.grounded && edge.h.y > deckY);
}

const wall = approachRoof({x: tower.x - tower.w/2 - 13, z: tower.z}, deckY - 3);
wall.control(100, {x: 1});
assert.ok(wall.h.x < tower.x - tower.w/2 && wall.h.hp < 480);
const afterImpact = wall.h.hp;
wall.control(100, {x: 1});
assert.equal(wall.h.hp, afterImpact);
console.log('PASS: Brickell roof and housing landings, occupied and empty parking, exit, reboard, lift-off, unsupported edges, hard touchdowns and wall impacts.');
