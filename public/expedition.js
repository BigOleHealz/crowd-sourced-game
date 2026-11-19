// The server owns this transient expedition state. It survives individual joins.
import { BREAKABLES, groundHeight, solidTopAt } from './world.js';
import { damageActor } from './rivals.js';
import { damageHelicopter, parkedHelicopter } from './airframe.js';
export { parkedHelicopter, fly, interact } from './airframe.js';

const clearCrystals = Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, 0]));
let nextShotId = 1;

export function newExpedition() {
  return {
    heli: parkedHelicopter(),
    hp: Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, crystal.hp])),
    shots: [],
  };
}

function insideBody(point, feet, radius, height, halo) {
  return Math.hypot(point.x - feet.x, point.z - feet.z) <= radius + halo &&
    point.y >= feet.y - halo && point.y <= feet.y + height + halo;
}

function withinBurst(center, feet, centerHeight) {
  return Math.hypot(feet.x - center.x, feet.y + centerHeight - center.y, feet.z - center.z) <= 3.5;
}

export function fire(world, player, input, tick, players, npcs) {
  if (player.life.hp === 0 || tick < player.fireReady || world.heli.pilot === player.id) return;
  const bloom = player.weapon === 2;
  player.fireReady = tick + (bloom ? 21 : 6);
  const { x, y, z } = player.state;
  const from = { x, y: y + 1.3, z };
  const horizontal = Math.cos(input.aimPitch);
  const dx = Math.sin(input.aimYaw) * horizontal;
  const dy = Math.sin(input.aimPitch);
  const dz = -Math.cos(input.aimYaw) * horizontal;
  const actors = [...players.values(), ...npcs].filter(actor =>
    actor !== player && actor.id !== world.heli.pilot && actor.life.hp > 0);
  let target = null, hitKind = null, to;
  // Step one common arcade pulse through the world; scenery and nearer targets
  // intercept it before anything farther along the same beam.
  for (let d = 0.2; d <= (bloom ? 18 : 27); d += 0.2) {
    to = { x: x + dx * d, y: from.y + dy * d, z: z + dz * d };
    if (to.y <= solidTopAt(to.x, to.z, clearCrystals)) break;
    const halo = Math.min(0.7, d * 0.05);
    target = BREAKABLES.find(crystal => world.hp[crystal.id] > 0 &&
      insideBody(to, { ...crystal, y: groundHeight(crystal.x, crystal.z) }, crystal.radius, crystal.height, halo));
    if (target) { hitKind = 'crystal'; break; }
    if (!world.heli.wrecked && insideBody(to, world.heli, 1.15, 1.95, halo)) {
      target = world.heli; hitKind = 'heli'; break;
    }
    target = actors.find(actor => insideBody(to, actor.state, 0.39, 1.72, halo));
    if (target) { hitKind = typeof target.id === 'number' ? 'player' : 'npc'; break; }
  }
  if (hitKind) {
    // Center a crystal burst on the formation so the visible cluster clears together.
    const center = hitKind === 'crystal' ? { x: target.x, y: groundHeight(target.x, target.z) + target.height / 2, z: target.z } : to;
    for (const crystal of BREAKABLES) {
      if (crystal === target || (bloom && withinBurst(center, { ...crystal, y: groundHeight(crystal.x, crystal.z) }, crystal.height / 2))) {
        world.hp[crystal.id] = Math.max(0, world.hp[crystal.id] - (bloom ? 2 : 1));
      }
    }
    for (const actor of actors) {
      if (actor === target || (bloom && withinBurst(center, actor.state, .9))) {
        damageActor(actor, bloom ? 40 : 25, tick);
      }
    }
    if (hitKind === 'heli' || (bloom && withinBurst(center, world.heli, 1))) {
      damageHelicopter(world, bloom ? 40 : 25, players, player.id);
    }
  }
  world.shots.push({ id: nextShotId++, shooter: player.id, weapon: player.weapon, from, to,
    hit: Boolean(hitKind), hitKind, targetId: hitKind === 'heli' ? 'heli' : target?.id ?? null, tick });
}
