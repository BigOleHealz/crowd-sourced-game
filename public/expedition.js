// The server owns this transient expedition state. It survives individual joins.
import { BREAKABLES, groundHeight, solidTopAt } from './world.js';

const clearCrystals = Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, 0]));
let nextShotId = 1;

export function newExpedition() {
  return { hp: Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, crystal.hp])), shots: [] };
}

export function fire(world, player, input, tick) {
  if (tick < player.fireReady) return;
  const bloom = player.weapon === 2;
  player.fireReady = tick + (bloom ? 21 : 6);
  const { x, y, z } = player.state;
  const from = { x, y: y + 1.3, z };
  const horizontal = Math.cos(input.aimPitch);
  const dx = Math.sin(input.aimYaw) * horizontal;
  const dy = Math.sin(input.aimPitch);
  const dz = -Math.cos(input.aimYaw) * horizontal;
  let hit, to;
  // Pulses only interact with crystal outcrops. A small aim halo makes close targets forgiving.
  for (let d = 0.4; d <= (bloom ? 18 : 27); d += 0.4) {
    to = { x: x + dx * d, y: from.y + dy * d, z: z + dz * d };
    if (to.y <= solidTopAt(to.x, to.z, clearCrystals)) break;
    const halo = Math.min(0.7, d * 0.05);
    hit = BREAKABLES.find(crystal => {
      if (!world.hp[crystal.id] || Math.hypot(to.x - crystal.x, to.z - crystal.z) > crystal.radius + halo) return false;
      const base = groundHeight(crystal.x, crystal.z);
      return to.y >= base - halo && to.y <= base + crystal.height + halo;
    });
    if (hit) break;
  }
  if (hit) {
    for (const crystal of BREAKABLES) {
      if (crystal === hit || (bloom && Math.hypot(crystal.x - hit.x, crystal.z - hit.z) <= 3.5)) {
        world.hp[crystal.id] = Math.max(0, world.hp[crystal.id] - (bloom ? 2 : 1));
      }
    }
  }
  world.shots.push({ id: nextShotId++, shooter: player.id, weapon: player.weapon, from, to, hit: Boolean(hit), tick });
}
