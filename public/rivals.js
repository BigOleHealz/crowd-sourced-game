// The server advances every actor's lifecycle on the same 30 Hz clock.
import { groundHeight, stepPlayer } from './world.js';

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
  return { hp: life.hp, maxHp: MAX_HP, dead: life.hp === 0,
    protected: tick < life.immuneUntil, respawnIn: Math.max(0, (life.returnAt - tick) / 30) };
}

// Returns true only on the transition to zero, even if several shots arrive together.
export function damageActor(actor, amount, tick) {
  const life = actor.life;
  if (life.hp === 0 || tick < life.immuneUntil) return false;
  life.hp = Math.max(0, life.hp - amount);
  if (life.hp !== 0) return false;
  life.returnAt = tick + RESPAWN_TICKS;
  actor.moving = actor.sprint = false;
  actor.state.vy = 0;
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
  if (actor.life.hp === 0 || tick < actor.pauseUntil) return;
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
