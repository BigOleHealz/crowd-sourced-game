// Run against an already-running shared world. Two temporary guest slots are used.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const url = new URL('/world', process.env.GAME_URL || 'http://127.0.0.1:4173');
url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
const guests = [];
async function until(read, label) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    const result = read();
    if (result) return result;
    await delay(15);
  }
  throw new Error('Timed out waiting for ' + label);
}
function join() {
  const g = { ws: new WebSocket(url), id: null, frames: [], seq: 0 };
  guests.push(g);
  g.ws.on('error', e => { g.error = e; });
  g.ws.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.type === 'welcome') g.id = m.id;
    if (m.type === 'snapshot') g.frames.push(m.players);
  });
  return g;
}
async function checkMotion(actor, observer) {
  const frame = () => observer.frames.at(-1)?.find(p => p.id === actor.id);
  const start = await until(frame, 'remote spawn');
  const firstFrame = observer.frames.length;
  for (let i = 0; i < 18; i++) {
    actor.ws.send(JSON.stringify({ type: 'input', seq: ++actor.seq, x: 0, z: -1,
      yaw: 0, sprint: true, jump: i === 3 }));
    await delay(34);
  }
  await until(() => {
    const p = frame();
    return p?.ack === actor.seq && p.grounded && start.z - p.z > 2;
  }, 'remote movement and landing');
  const states = observer.frames.slice(firstFrame).flatMap(f => f.filter(p => p.id === actor.id));
  assert.ok(states.some(p => !p.grounded && p.y > start.y + .5), 'observer sees jump');
}
try {
  const first = join(), second = join();
  await until(() => {
    for (const g of guests) if (g.error) throw g.error;
    return first.id && second.id;
  }, 'two introductions');
  assert.notEqual(first.id, second.id);
  await checkMotion(first, second);
  await checkMotion(second, first);
  const left = once(first.ws, 'close');
  first.ws.close();
  await left;
  await until(() => !second.frames.at(-1)?.some(p => p.id === first.id), 'disconnect propagation');
  console.log('PASS: two guests independently observed peer movement, jump, landing and removal.');
} finally {
  for (const g of guests) g.ws.terminate();
}
