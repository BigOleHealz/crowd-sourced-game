// This starts a private loopback server. No player in the normal game is targeted.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import WebSocket from 'ws';

const server = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit'],
});
const exited = once(server, 'exit');
let output = '';
server.stdout.on('data', chunk => { output += chunk; });
const sockets = [];

async function until(read, label) {
  const deadline = Date.now() + 6500;
  while (Date.now() < deadline) {
    const result = read();
    if (result) return result;
    await delay(15);
  }
  throw new Error('Timed out waiting for ' + label);
}
async function join(url) {
  const ws = new WebSocket(url), guest = { ws, seq: 0 };
  sockets.push(ws);
  ws.on('message', raw => {
    const frame = JSON.parse(raw);
    if (frame.type === 'welcome') { guest.welcome = frame; guest.id = frame.id; }
    if (frame.type === 'snapshot') guest.frame = frame;
  });
  await until(() => guest.id && guest.frame, 'new guest');
  return guest;
}
function actor(observer, id) {
  return [...observer.frame.players, ...observer.frame.world.npcs].find(p => p.id === id);
}
async function input(a, extra) {
  const seq = ++a.seq;
  a.ws.send(JSON.stringify({ type: 'input', seq, yaw: 0, x: 0, z: 0, ...extra }));
  await until(() => actor(a, a.id).ack >= seq, 'input acknowledgement');
}
async function shoot(a, id, weapon = 1) {
  const target = actor(a, id), self = actor(a, a.id);
  const dx = target.x - self.x, dz = target.z - self.z;
  const aimPitch = Math.atan2(target.y + .95 - (self.y + 1.3), Math.hypot(dx,dz));
  await input(a, { weapon, fire: true, aimYaw: Math.atan2(dx,-dz), aimPitch });
}
try {
  const host = await until(() => output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0], 'isolated server');
  const url = host.replace('http:', 'ws:') + '/world';
  const a = await join(url), b = await join(url), fern = a.frame.world.npcs[0].id;
  const initial = actor(a, fern);
  assert.equal(initial.maxHp,100);
  assert.equal(initial.hp,100);
  await until(() => Math.hypot(actor(a, fern).x - initial.x, actor(a, fern).z - initial.z) > .05, 'NPC patrol');
  for (const expected of [75,50,25,0]) {
    await delay(230);
    await shoot(a,fern);
    await until(() => actor(a,fern).hp===expected && actor(b,fern).hp===expected,'shared NPC damage');
  }
  assert(actor(b,fern).dead && !actor(b,fern).moving);
  const joined = await join(url);
  assert(joined.welcome.world.npcs.find(n=>n.id===fern).dead,'welcome includes current NPC defeat');
  await until(()=>actor(joined,fern).protected && actor(joined,fern).hp === 100,'NPC respawn');
  console.log('PASS: NPC patrol, replicated damage and defeat, late joining, timed recovery and shield.');
} finally {
  for (const ws of sockets) ws.terminate();
  server.kill();
  await exited;
}
