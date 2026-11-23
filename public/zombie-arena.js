export const zombieMode = 'zombies';
export const arena = {west:-26, east:-11, north:-223, south:-194};

export function confineToArena(state) {
  const x = Math.max(arena.west, Math.min(arena.east, state.x));
  const z = Math.max(arena.north, Math.min(arena.south, state.z));
  if (x !== state.x) { state.x = x; state.vx = 0; }
  if (z !== state.z) { state.z = z; state.vz = 0; }
  return state;
}
