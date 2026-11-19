import { MAP, HELIPAD, BOARD_RANGE, blocked, groundHeight, solidTopAt, spawn } from './world.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function parkedHelicopter() {
  return { ...HELIPAD, y: groundHeight(HELIPAD.x, HELIPAD.z), yaw: 0, pilot: null, grounded: true };
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

export function fly(world, input, dt) {
  const heli = world.heli;
  if (heli.grounded && input.lift <= 0) return;
  const currentFloor = flightFloor(heli.x, heli.z, world.hp);
  const canLand = landingSite(heli.x, heli.z, world.hp) && currentFloor <= groundHeight(heli.x, heli.z) + 0.08;
  const minY = currentFloor + (canLand ? 0 : 0.22);
  heli.y = clamp(heli.y + input.lift * 4.8 * dt, minY, 23);
  heli.grounded = canLand && heli.y <= minY + 0.025;
  if (heli.grounded) {
    heli.y = minY;
    return;
  }
  const x = clamp(heli.x + input.x * 7.6 * dt, -30, 30);
  const z = clamp(heli.z + input.z * 7.6 * dt, -30, 30);
  // The craft can hover; climbing gives clearance to cross a ridge or canopy.
  if (heli.y > flightFloor(x, z, world.hp) + 0.15) {
    heli.x = x;
    heli.z = z;
  }
  const turn = Math.atan2(Math.sin(input.aimYaw - heli.yaw), Math.cos(input.aimYaw - heli.yaw));
  heli.yaw += clamp(turn, -2.8 * dt, 2.8 * dt);
}

export function interact(world, player) {
  const heli = world.heli;
  if (!heli.grounded) return;
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
