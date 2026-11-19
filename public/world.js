// Coordinates are metres. Positions refer to the player's feet, with Y up.
// Both the authoritative server and the predicting client use this module.
export const MAP = {
  bounds: 38,
  waterY: -1.2,
  bridge: { x: 0, z: 0, width: 3.4, length: 10, y: 0.8 },
  lookout: { x: -4, z: -24 },
  trail: [
    [0, 15], [0.5, 10], [0, 5], [0, -5], [-2, -11],
    [-6, -17], [-4, -24], [3, -23], [10, -17], [15, -10],
    [16, -4], [16, 4], [14, 10], [9, 16], [4, 17], [0, 15],
  ],
  rocks: [
    { x: -4, z: 11.5, radius: 1.3, height: 1.45 },
    { x: 5, z: 7, radius: 1.6, height: 1.7 },
    { x: -7, z: 1.2, radius: 1.85, height: 2.3 },
    { x: 8.5, z: -1, radius: 1.05, height: 1.3 },
    { x: -8, z: -10, radius: 1.6, height: 2.1 },
    { x: -11, z: -19, radius: 2.4, height: 3.4 },
    { x: 1, z: -15.5, radius: 1.25, height: 1.35 },
    { x: -7, z: -28, radius: 1.6, height: 2.25 },
    { x: 6, z: -26, radius: 2.2, height: 2.8 },
    { x: 20, z: -11, radius: 1.5, height: 1.9 },
    { x: 19.5, z: 8, radius: 1.4, height: 1.55 },
    { x: 7, z: 21, radius: 1.5, height: 1.65 },
  ],
  trees: [],
};

export const BREAKABLES = [
  { id: 'trailhead', x: 0, z: 10, radius: 1.15, height: 2.6, hp: 3 },
  { id: 'twin', x: 2.1, z: 9.4, radius: 0.76, height: 1.7, hp: 3 },
  { id: 'switchback', x: -4, z: -14, radius: 1.35, height: 3, hp: 3 },
  { id: 'lookout', x: -3, z: -21, radius: 0.95, height: 2.1, hp: 3 },
  { id: 'ford', x: 16, z: 6.5, radius: 1.1, height: 2.4, hp: 3 },
  { id: 'creek', x: 17.8, z: 7.2, radius: 0.6, height: 1.5, hp: 3 },
];

// Deterministic groves. Keep foliage out of the spawn clearing, creek and path.
for (let i = 0; i < 9; i++) {
  for (let j = 0; j < 9; j++) {
    const x = -30 + i * 7.4 + Math.sin(i * 5 + j) * 2.2;
    const z = -30 + j * 7.4 + Math.cos(j * 4 + i) * 2.2;
    if (Math.abs(z) < 4.7 || Math.hypot(x, z - 16) < 5) continue;
    const byTrail = MAP.trail.some(([ax, az], k) => {
      if (k === 0) return false;
      const [bx, bz] = MAP.trail[k - 1];
      const dx = bx - ax;
      const dz = bz - az;
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(x - ax - t * dx, z - az - t * dz) < 4;
    });
    const byRock = MAP.rocks.some(rock => Math.hypot(x - rock.x, z - rock.z) < rock.radius + 1.2);
    if (byTrail || byRock) continue;
    const height = 5.6 + 2.8 * (0.5 + 0.5 * Math.sin(i * 3 + j * 9));
    MAP.trees.push({ x, z, height, radius: height * 0.035 });
  }
}

function smoothstep(start, end, position) {
  const t = Math.max(0, Math.min(1, (position - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function terrainHeight(x, z) {
  const creekCenter = 0.7 * Math.sin(x * 0.15);
  const bank = smoothstep(1.2, 4.8, Math.abs(z - creekCenter));
  const ford = 1 - smoothstep(0.9, 3.5, Math.abs(x - 16));
  const ridge = 4.8 * smoothstep(5, 24, -z) *
    (1 - smoothstep(7, 27, Math.abs(x + 4)));
  const relief = smoothstep(6, 14, Math.abs(z)) *
    (0.32 * Math.sin(x * 0.17) + 0.24 * Math.sin(z * 0.3));
  const lip = smoothstep(33, MAP.bounds, Math.max(Math.abs(x), Math.abs(z)));
  return 0.8 - (1 - bank) * (3.0 - 2.6 * ford) + ridge + relief - lip * 17;
}

export function groundHeight(x, z) {
  const bridge = MAP.bridge;
  if (Math.abs(x - bridge.x) <= bridge.width / 2 &&
      Math.abs(z - bridge.z) <= bridge.length / 2) {
    return bridge.y;
  }
  return terrainHeight(x, z);
}

export function spawn(index = 0) {
  const slot = Math.abs(Math.trunc(index)) % 16;
  const x = [-0.475, 0.475, -1.425, 1.425][slot % 4];
  const z = 15 + Math.floor(slot / 4) * 0.95;
  return { x, y: groundHeight(x, z), z, vy: 0, grounded: true };
}

const PLAYER_RADIUS = 0.32;
const GRAVITY = 19;
const JUMP_SPEED = 7.1;

const obstacles = [...MAP.rocks, ...MAP.trees, ...BREAKABLES].map(prop => ({
  ...prop, top: terrainHeight(prop.x, prop.z) + prop.height,
}));

function overlaps(x, z, obstacle, padding) {
  const dx = x - obstacle.x;
  const dz = z - obstacle.z;
  const radius = obstacle.radius + padding;
  return dx * dx + dz * dz < radius * radius;
}

export function solidTopAt(x, z, hp, padding = 0) {
  let top = groundHeight(x, z);
  for (const obstacle of obstacles) {
    if (obstacle.id && hp?.[obstacle.id] === 0) continue;
    if (overlaps(x, z, obstacle, padding)) top = Math.max(top, obstacle.top);
  }
  return top;
}

export function blocked(x, y, z, hp) {
  if (groundHeight(x, z) > y + 0.3) return true;
  const bridge = MAP.bridge;
  const rail = Math.abs(Math.abs(x - bridge.x) - bridge.width / 2) < PLAYER_RADIUS + 0.05 &&
    Math.abs(z - bridge.z) <= 4.8 && y < bridge.y + 0.9 && y + 1.7 >= bridge.y;
  if (rail) return true;
  return solidTopAt(x, z, hp, PLAYER_RADIUS) > Math.max(y, groundHeight(x, z)) + 0.001;
}

export function stepPlayer(state, input, dt, hp) {
  const speed = input.sprint ? 7.4 : 4.6;
  const ix = Number.isFinite(input.x) ? input.x : 0;
  const iz = Number.isFinite(input.z) ? input.z : 0;
  const scale = speed * dt / Math.max(1, Math.hypot(ix, iz));
  let { x, y, z, vy = 0, grounded = false } = state;
  if (input.jump && grounded) {
    grounded = false;
    vy = JUMP_SPEED;
  }
  // Resolving each horizontal axis separately lets players slide along a wall.
  if (!blocked(x + ix * scale, y, z, hp)) x += ix * scale;
  if (!blocked(x, y, z + iz * scale, hp)) z += iz * scale;
  let floor = groundHeight(x, z);
  const top = solidTopAt(x, z, hp, PLAYER_RADIUS);
  if (y >= top) floor = top;
  if (grounded && y - floor <= 0.28) {
    y = floor;
    vy = 0;
  } else {
    grounded = false;
    vy -= GRAVITY * dt;
    y += vy * dt;
    if (y <= floor && vy <= 0) {
      y = floor;
      vy = 0;
      grounded = true;
    }
  }
  if (y < -8 || Math.max(Math.abs(x), Math.abs(z)) > MAP.bounds) return spawn();
  return { x, y, z, vy, grounded };
}
