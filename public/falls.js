import {advanceJoints} from './ragdoll.js';
import { vehicleContact } from './vehicle-contact.js';
import { CITY, MAP, travelBounds, blocked, groundHeight, solidTopAt } from './world.js';

// Movement and contact are resolved on the server. The pose uses the same clock on every client.
export function startFall(actor, tick, impulse, cause) {
  const s = actor.state;
  s.vx = (s.vx || 0) + impulse.x;
  s.vz = (s.vz || 0) + impulse.z;
  s.vy = (s.vy || 0) + impulse.y;
  s.grounded = false;
  delete s.climb;
  delete s.grab;
  delete s.parachute;
  delete s.swimming;
  delete s.stance;
  const speed = Math.hypot(s.vx, s.vz);
  actor.life.fall = { cause, started: tick, yaw: speed > .05 ? Math.atan2(s.vx, -s.vz) : actor.yaw || 0,
    speed, settled: null };
  actor.moving = actor.sprint = false;
}

export function advanceFall(actor, tick, dt, hp, world) {
  const f = actor.life.fall;
  if (!f) return false;
  const s = actor.state;
  if (f.settled !== null) {
    if (actor.life.hp && tick - f.settled >= 16) delete actor.life.fall;
    return true;
  }
  const jointsResting=!f.ragdoll || f.ragdoll.quiet>=7 || advanceJoints(f.ragdoll,hp,world);
  for (const [axis, velocity] of [['x', 'vx'], ['z', 'vz']]) {
    const next = s[axis] + s[velocity] * dt;
    const limit=axis==='z' ? travelBounds.north : travelBounds.west;
    if (next<limit || next>(axis==='z'?travelBounds.south:travelBounds.east) || blocked(axis === 'x' ? next : s.x, s.y, axis === 'z' ? next : s.z, hp,world?.doors)) s[velocity] = 0;
    else s[axis] = next;
  }
  // Keep a falling body outside nearby hulls and let it settle on the roof,
  // terrain, or water surface it actually reaches.
  const contact=vehicleContact(s.x,s.y,s.z,world,CITY,.75);
  if(contact.depth && !blocked(s.x+contact.dx,s.y,s.z+contact.dz,hp,world?.doors)) {
    s.x+=contact.dx;s.z+=contact.dz;
  }
  const top = solidTopAt(s.x, s.z, hp, .32,s.y+.04,world?.doors);
  const land = Math.max(s.y >= top - .05 ? top : groundHeight(s.x,s.z),contact.floor);
  const floatY=MAP.waterY-.72, water=land<floatY;
  const floor=water ? floatY : land;
  s.vy -= 19 * dt;
  s.y += s.vy * dt;
  const rest=s.y<=floor;
  s.grounded=rest && !water;
  if(rest && water) s.swimming=true;
  if (rest) {
    s.y = floor;
    s.vy = 0;
  }
  const drag = Math.exp(-(rest ? 6 : .8) * dt);
  s.vx *= drag;
  s.vz *= drag;
  if (rest && Math.hypot(s.vx, s.vz) < .13) {
    s.vx = s.vz = 0;
    if(jointsResting) f.settled = tick;
  }
  return true;
}
