// The server owns this transient expedition state. It survives individual joins.
import { BREAKABLES } from './world.js';

export function newExpedition() {
  return { hp: Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, crystal.hp])) };
}
