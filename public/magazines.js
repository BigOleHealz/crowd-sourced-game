// Game balance in rounds (or projector bursts) and 30 Hz simulation ticks.
export const magazineSpecs = {
  1: { capacity: 24, reloadTicks: 45 },
  2: { capacity: 12, reloadTicks: 33 },
  3: { capacity: 5, reloadTicks: 52 },
  4: { capacity: 1, reloadTicks: 66 },
  5: { capacity: 48, reloadTicks: 60 }
};

export function magazineView(player, tick, weapon = player.weapon) {
  const { life } = player;
  const spec = magazineSpecs[weapon];
  if (!spec) return undefined;
  const rounds = life.magazines?.[weapon] ?? spec.capacity;
  const reloading = life.reload?.weapon === weapon;
  return { weapon, rounds, capacity: spec.capacity, ...(reloading && { reloadTicks: Math.max(0, life.reload.end - tick) }) };
}

export function spendRound(player, weapon = player.weapon) {
  const { life } = player;
  const spec = magazineSpecs[weapon];
  if (!spec) return true;
  const magazines = life.magazines ??= {};
  const rounds = magazines[weapon] ?? spec.capacity;
  if (life.reload || rounds === 0) return false;
  magazines[weapon] = rounds - 1;
  return true;
}

export function startReload(player, tick, weapon = player.weapon) {
  const { life } = player;
  const spec = magazineSpecs[weapon];
  if (!spec || life.reload) return;
  const rounds = life.magazines?.[weapon] ?? spec.capacity;
  if (rounds >= spec.capacity) return;
  life.reload = { weapon, end: tick + spec.reloadTicks };
}

export function advanceReload(player, tick, interrupted, weapon = player.weapon) {
  const { life } = player;
  const reload = life.reload;
  if (!reload) return;
  if (interrupted || weapon !== reload.weapon) delete life.reload;
  else if (tick >= reload.end) {
    life.magazines[weapon] = magazineSpecs[weapon].capacity;
    delete life.reload;
  }
}
