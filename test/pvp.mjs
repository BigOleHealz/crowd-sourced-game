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
  const a = await join(url), b = await join(url);
  await until(() => !actor(a, b.id).protected, 'initial shield expiry');
  await shoot(a,b.id,2);
  await until(() => actor(b,b.id).hp === 60, 'Bloom hits once');
  assert.equal(actor(a,a.id).hp,100,'no Bloom self-damage');
  await delay(760);
  for (const expected of [35,10,0]) {
    await shoot(a,b.id);
    await until(() => actor(b,b.id).hp === expected && actor(a,b.id).hp === expected,'player health on both sessions');
    await delay(215);
  }
  const dead = actor(a,b.id);
  assert(dead.dead && dead.respawnIn > 0);
  const late = await join(url);
  assert(actor(late,b.id).dead && actor(late,b.id).hp === 0);
  const lastDeathX = dead.x;
  await input(b,{x:1, fire:true, jump:true, interact:true});
  assert.equal(actor(b,b.id).x,lastDeathX);
  assert.equal(actor(a,a.id).hp,100,'defeated player could not damage the other guest');
  await shoot(a,b.id); // cannot restart a dead player's timer
  await until(() => !actor(b,b.id).dead && actor(b,b.id).protected, 'player respawn');
  assert.equal(actor(b,b.id).hp,100);
  await shoot(a,b.id);
  assert.equal(actor(b,b.id).hp,100, 'respawn shield absorbs pulse');

  console.log('PASS: PvP across peers, direct and splash damage, shooter immunity, defeated controls, late join, respawn and shield.');
} finally {
  for (const ws of sockets) ws.terminate();
  server.kill();
  await exited;
}
