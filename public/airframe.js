import { MAP, HELIPAD, BOARD_RANGE, blocked, groundHeight, solidTopAt, spawn } from './world.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const AIRFRAME_HP = 500;
export const RECOVERY_SECONDS = 6;
const COAST_SECONDS = 1.5;

// Velocity and contact history belong to the server, not its public snapshots.
const flightStates = new WeakMap();

export function parkedHelicopter() {
  const heli = {
    ...HELIPAD, y: groundHeight(HELIPAD.x, HELIPAD.z), yaw: 0, pilot: null, grounded: true,
    hp: AIRFRAME_HP, maxHp: AIRFRAME_HP, abandonedFor: null, wrecked: false, recoverySeconds: 0,
  };
  flightStates.set(heli, { vx: 0, vy: 0, vz: 0, sideContact: false, floorContact: false });
  return heli;
}

export function damageHelicopter(world, damage, players, shooterId = null) {
  const heli = world.heli;
  if (heli.wrecked || !(damage > 0) || !Number.isFinite(damage)) return false;
  if (shooterId != null && shooterId === heli.pilot) return false;
  heli.hp = Math.max(0, heli.hp - damage);
  if (heli.hp === 0) {
    const pilot = players?.get(heli.pilot);
    if (pilot) {
      pilot.state = spawn(pilot.id - 1);
      pilot.moving = false;
      pilot.sprint = false;
      pilot.inputs.length = 0;
    }
    heli.pilot = null;
    heli.abandonedFor = null;
    heli.wrecked = true;
    heli.recoverySeconds = RECOVERY_SECONDS;
  }
  return true;
}

// Advance the same airframe after the seat is released, even without pilot input.
function driftAfterBailout(world, dt) {
  const h = world.heli, motion = flightStates.get(h);
  h.abandonedFor += dt;
  const coasting = h.abandonedFor <= COAST_SECONDS;
  // A hovering craft tips gently forward. A moving craft retains its existing course.
  if (coasting && Math.hypot(motion.vx, motion.vz) < 3) {
    motion.vx += Math.sin(h.yaw) * 2 * dt;
    motion.vz -= Math.cos(h.yaw) * 2 * dt;
  }
  motion.vy = coasting ? approach(motion.vy, -.35, 3*dt) : Math.max(-14, motion.vy-7*dt);
  h.yaw += (coasting ? .09 : .48) * dt;
  const x = clamp(h.x + motion.vx*dt, -32, 32), z = clamp(h.z + motion.vz*dt, -32, 32);
  const y = Math.min(23, h.y + motion.vy*dt);
  const floor = flightFloor(x, z, world.hp);
  if (y <= floor) {
    // At a side impact retain the last clear position instead of jumping atop the obstacle.
    if (h.y >= floor) Object.assign(h, {x, y:floor, z});
    damageHelicopter(world, h.hp);
    return;
  }
  Object.assign(h, {x,y,z});
}

export function recoverHelicopter(world, dt) {
  const heli = world.heli;
  if (heli.abandonedFor != null) return driftAfterBailout(world, dt);
  if (!heli.wrecked) return;
  const ground = Math.max(groundHeight(heli.x, heli.z), MAP.waterY);
  heli.y = Math.max(ground, heli.y - dt * 6);
  heli.grounded = heli.y <= ground;
  heli.recoverySeconds = Math.max(0, heli.recoverySeconds - dt);
  if (heli.recoverySeconds < 0.0001) world.heli = parkedHelicopter();
}

// Only the stopped component of a motion counts. A skimming hit loses less
// hull than a square impact; slow taps can land without losing any hull.
export function impactDamage(stoppedSpeed) {
  return Math.max(0, Math.round((stoppedSpeed - 3) * 12));
}

function approach(current, target, maxDelta) {
  return current + clamp(target - current, -maxDelta, maxDelta);
}

function landingSite(x, z, hp) {
  const y = groundHeight(x, z);
  if (y < MAP.waterY + 0.45 || solidTopAt(x, z, hp, 1.8) > y + 0.05) return false;
  // Both skids need a reasonably level patch of terrain. Keep the narrow bridge clear.
  if (Math.abs(x) < MAP.bridge.width / 2 + 1 && Math.abs(z) < MAP.bridge.length / 2 + 1) return false;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) =>
    Math.abs(groundHeight(x + dx, z + dz) - y) < 0.45);
}

function flightFloor(x, z, hp) {
  const surface = Math.max(groundHeight(x, z), MAP.waterY + 0.6);
  const clearance = solidTopAt(x, z, hp, 1.8);
  // The woodland has low-poly canopies broader than the trunks used for walkers.
  let floor = Math.max(surface, clearance);
  for (const tree of MAP.trees) {
    if (Math.hypot(tree.x - x, tree.z - z) < tree.height * 0.18 + 1.65) {
      floor = Math.max(floor, groundHeight(tree.x, tree.z) + tree.height + 0.2);
    }
  }
  if (Math.abs(x) <= MAP.bridge.width / 2 + 1.65 && Math.abs(z) <= MAP.bridge.length / 2 + 1.65) {
    floor = Math.max(floor, MAP.bridge.y + 1.12);
  }
  return floor;
}

export function fly(world, input, dt, players) {
  const h = world.heli;
  if (h.wrecked || (h.grounded && input.lift <= 0)) return;
  const motion = flightStates.get(h);
  const oldFloor = flightFloor(h.x, h.z, world.hp);
  const landable = landingSite(h.x, h.z, world.hp) && oldFloor <= groundHeight(h.x, h.z) + 0.08;
  const minY = oldFloor + (landable ? 0 : 0.22);
  const liftTarget = input.lift * (input.lift < 0 ? 6 : 4.8);
  motion.vy = approach(motion.vy, liftTarget, (input.lift ? 9 : 22) * dt);
  const nextY = h.y + motion.vy * dt;
  const floorContact = nextY <= minY && motion.vy <= 0;
  if (floorContact && !motion.floorContact) {
    damageHelicopter(world, impactDamage(-motion.vy), players);
  }
  motion.floorContact = floorContact;
  h.y = clamp(nextY, minY, 23);
  if (floorContact || h.y === 23) motion.vy = 0;
  h.grounded = landable && floorContact;
  if (h.grounded || h.wrecked) {
    motion.vx = 0;
    motion.vz = 0;
    motion.sideContact = false;
    return;
  }

  const desiredX = input.x * 7.6, desiredZ = input.z * 7.6;
  // Accelerate into flight and brake quickly when the pilot releases movement.
  const deltaX = desiredX - motion.vx, deltaZ = desiredZ - motion.vz;
  const maxChange = (desiredX || desiredZ ? 18 : 40) * dt;
  const blend = Math.min(1, maxChange / (Math.hypot(deltaX, deltaZ) || 1));
  motion.vx += deltaX * blend;
  motion.vz += deltaZ * blend;
  const x = clamp(h.x + motion.vx * dt, -30, 30);
  const z = clamp(h.z + motion.vz * dt, -30, 30);
  const clear = (tx, tz) => h.y > flightFloor(tx, tz, world.hp) + 0.04;
  let stoppedX = 0, stoppedZ = 0;
  if (clear(x, z)) {
    h.x = x;
    h.z = z;
  } else {
    if (clear(x, h.z)) h.x = x;
    else { stoppedX = motion.vx; motion.vx = 0; }
    if (clear(h.x, z)) h.z = z;
    else { stoppedZ = motion.vz; motion.vz = 0; }
  }
  const stoppedSpeed = Math.hypot(stoppedX, stoppedZ);
  if (stoppedSpeed > 0 && !motion.sideContact) {
    damageHelicopter(world, impactDamage(stoppedSpeed), players);
  }
  motion.sideContact = stoppedSpeed > 0;
  const turn = Math.atan2(Math.sin(input.aimYaw - h.yaw), Math.cos(input.aimYaw - h.yaw));
  h.yaw += clamp(turn, -2.8 * dt, 2.8 * dt);
}

export function interact(world, player) {
  const heli = world.heli;
  if (heli.wrecked) return;
  if (!heli.grounded) {
    if (heli.pilot !== player.id) return;
    player.state = { x: heli.x, y: heli.y + .6, z: heli.z, vy: 0, grounded: false, parachute: 'packed' };
    // Step clear of the cabin so the jumper and aircraft separate visibly.
    for (const side of [1,-1]) {
      const x = heli.x + side * 1.85 * Math.cos(heli.yaw);
      const z = heli.z + side * 1.85 * Math.sin(heli.yaw);
      if (blocked(x, player.state.y, z, world.hp)) continue;
      Object.assign(player.state, {x,z});
      break;
    }
    heli.pilot = null;
    heli.abandonedFor = 0;
    return;
  }
  if (heli.pilot === null) {
    const range = Math.hypot(player.state.x - heli.x, player.state.z - heli.z, player.state.y - heli.y);
    if (range <= BOARD_RANGE && player.state.grounded) heli.pilot = player.id;
  } else if (heli.pilot === player.id) {
    // Try both sides and the fore/aft directions before using the safe trailhead.
    let exit = spawn(player.id - 1);
    for (let i = 0; i < 8; i++) {
      const angle = heli.yaw + i * Math.PI / 4;
      const x = heli.x + 2.15 * Math.cos(angle);
      const z = heli.z + 2.15 * Math.sin(angle);
      const y = groundHeight(x, z);
      if (y > MAP.waterY && Math.abs(y - heli.y) < 0.9 && !blocked(x, y, z, world.hp)) {
        exit = { x, y, z, vy: 0, grounded: true };
        break;
      }
    }
    heli.pilot = null;
    player.state = exit;
  }
}
