import { MAP, blocked, groundHeight, solidTopAt } from './world.js';

// Movement and contact are resolved on the server. The pose uses the same clock on every client.
export function startFall(actor, tick, impulse, cause) {
  const s = actor.state;
  s.vx = (s.vx || 0) + impulse.x;
  s.vz = (s.vz || 0) + impulse.z;
  s.vy = (s.vy || 0) + impulse.y;
  s.grounded = false;
  delete s.parachute;
  const speed = Math.hypot(s.vx, s.vz);
  actor.life.fall = { cause, started: tick, yaw: speed > .05 ? Math.atan2(s.vx, -s.vz) : actor.yaw || 0,
    speed, settled: null };
  actor.moving = actor.sprint = false;
}

export function advanceFall(actor, tick, dt, hp) {
  const f = actor.life.fall;
  if (!f) return false;
  const s = actor.state;
  if (f.settled !== null) {
    if (actor.life.hp && tick - f.settled >= 16) delete actor.life.fall;
    return true;
  }
  for (const [axis, velocity] of [['x', 'vx'], ['z', 'vz']]) {
    const next = s[axis] + s[velocity] * dt;
    if (Math.abs(next) >= MAP.bounds || blocked(axis === 'x' ? next : s.x, s.y, axis === 'z' ? next : s.z, hp)) s[velocity] = 0;
    else s[axis] = next;
  }
  const top = solidTopAt(s.x, s.z, hp, .32);
  const floor = s.y >= top - .05 ? top : groundHeight(s.x, s.z);
  s.vy -= 19 * dt;
  s.y += s.vy * dt;
  s.grounded = s.y <= floor;
  if (s.grounded) {
    s.y = floor;
    s.vy = 0;
  }
  const drag = Math.exp(-(s.grounded ? 6 : .8) * dt);
  s.vx *= drag;
  s.vz *= drag;
  if (s.grounded && Math.hypot(s.vx, s.vz) < .13) {
    s.vx = s.vz = 0;
    f.settled = tick;
  }
  return true;
}
