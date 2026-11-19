// The server advances every actor's lifecycle on the same 30 Hz clock.
import { groundHeight, stepPlayer } from './world.js';

import { startFall, advanceFall } from './falls.js';

const MAX_HP = 100;
const RESPAWN_TICKS = 90;
const SHIELD_TICKS = 60;
const patrols = [
  { id: 'rival-fern', name: 'Fern', points: [[-3.5, 8], [-2.8, 7.6], [-3.3, 6.7]] },
  { id: 'rival-rowan', name: 'Rowan', points: [[10, 13], [11, 12], [12, 13.5]] },
];

export function newLife(tick, shield = true) {
  return { hp: MAX_HP, returnAt: 0, immuneUntil: shield ? tick + SHIELD_TICKS : 0 };
}

export function healthView(actor, tick) {
  const life = actor.life;
  const f = life.fall;
  const fall = f ? { cause: f.cause, yaw: f.yaw, speed: f.speed, age: (tick-f.started)/30,
    settled: f.settled !== null, recovery: life.hp && f.settled !== null ? Math.min(1,(tick-f.settled)/16) : 0 } : null;
  return { fall, hp: life.hp, maxHp: MAX_HP, dead: life.hp === 0,
    protected: tick < life.immuneUntil, respawnIn: Math.max(0, (life.returnAt - tick) / 30) };
}

// Returns true only on the transition to zero, even if several shots arrive together.
export function damageActor(actor, amount, tick, direction) {
  const life = actor.life;
  if (life.hp === 0 || tick < life.immuneUntil) return false;
  life.hp = Math.max(0, life.hp - amount);
  if (life.hp !== 0) return false;
  life.returnAt = tick + RESPAWN_TICKS;
  actor.moving = actor.sprint = false;
  if (!life.fall) startFall(actor, tick, { x: (direction?.x ?? Math.sin(actor.yaw || 0)) * 1.5,
    z: (direction?.z ?? -Math.cos(actor.yaw || 0)) * 1.5, y: 1.2 }, 'defeat');
  return true;
}

export function respawnDue(actor, tick) {
  return actor.life.hp === 0 && tick >= actor.life.returnAt;
}

function patrolStart(route) {
  const [x, z] = route.points[0];
  return { x, y: groundHeight(x, z), z, vy: 0, grounded: true };
}

export function newRivals() {
  return patrols.map(route => ({ id: route.id, name: route.name, route, next: 1, pauseUntil: 0,
    state: patrolStart(route), yaw: Math.PI, moving: false, weapon: 1, life: newLife(0, false) }));
}

export function updateRival(actor, tick, dt, hp) {
  if (respawnDue(actor, tick)) {
    actor.state = patrolStart(actor.route);
    actor.next = 1;
    actor.life = newLife(tick);
    actor.pauseUntil = tick + 30;
  }
  if (advanceFall(actor, tick, dt, hp) || actor.life.hp === 0 || tick < actor.pauseUntil) return;
  const [x, z] = actor.route.points[actor.next];
  const dx = x - actor.state.x, dz = z - actor.state.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.12) {
    actor.next = (actor.next + 1) % actor.route.points.length;
    actor.pauseUntil = tick + 55;
    actor.state.vx=actor.state.vz=0;
    actor.moving = false;
    return;
  }
  actor.yaw = Math.atan2(dx, -dz);
  actor.moving = true;
  actor.state = stepPlayer(actor.state, { x: dx / distance * .17, z: dz / distance * .17 }, dt, hp);
}

export function rivalView(actor, tick) {
  return { id: actor.id, name: actor.name, ...actor.state, yaw: actor.yaw,
    moving: actor.moving, weapon: actor.weapon, ...healthView(actor, tick) };
}

export function vehicleContacts(world, kind, before, actors, tick, dt) {
  const vehicle = world[kind];
  const vx = (vehicle.x - before.x) / dt, vz = (vehicle.z - before.z) / dt;
  const descent = Math.max(0, (before.y - vehicle.y) / dt);
  const speed = Math.hypot(vx, vz, descent);
  if (vehicle.wrecked || speed < 1.8) return;
  const c = Math.cos(vehicle.yaw), s = Math.sin(vehicle.yaw);
  const crew = [world.rover.driver, world.rover.gunner, world.heli.pilot, world.heli.gunner];
  for (const actor of actors) {
    if (crew.includes(actor.id) || !actor.life.hp || actor.life.fall || tick < actor.life.immuneUntil) continue;
    const p = actor.state, dx = p.x - vehicle.x, dz = p.z - vehicle.z;
    const side = dx*c + dz*s, along = dx*s - dz*c;
    const rover = kind === 'rover';
    if (Math.abs(side) > (rover ? 1.06 : 1.44) || Math.abs(along) > (rover ? 1.80 : 2.1) ||
        p.y > vehicle.y + (rover ? 1.58 : 1.95) || p.y + 1.72 < vehicle.y) continue;
    const outward = descent / Math.max(.1, Math.hypot(dx, dz));
    const impulse = { x: vx * 1.25 + dx*outward, z: vz * 1.25 + dz*outward, y: 1 + speed*.53 };
    startFall(actor, tick, impulse, kind);
    damageActor(actor, Math.round(speed * 18), tick);
  }
}
