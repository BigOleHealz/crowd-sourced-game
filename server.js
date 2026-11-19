import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { spawn, stepPlayer } from './public/world.js';
import { newExpedition } from './public/expedition.js';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, 'public');
const threeBuild = join(root, 'node_modules/three/build');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || '4173');
const capacity = 16;
const step = 1 / 30;
const players = new Map();
let world = newExpedition();
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

async function serve(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const vendorFiles = ['/vendor/three.module.js', '/vendor/three.core.js'];
  let file;
  if (vendorFiles.includes(pathname)) {
    file = join(threeBuild, pathname.slice('/vendor/'.length));
  } else {
    file = resolve(publicDir, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(publicDir + sep) || pathname.includes('\0')) {
      response.writeHead(404).end();
      return;
    }
  }
  try {
    const metadata = await stat(file);
    if (!metadata.isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Content-Length': metadata.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
}

const server = createServer(serve);
const sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 });
server.on('upgrade', (request, socket, head) => {
  const origin = request.headers.origin;
  const validOrigin = !origin || origin === 'http://' + request.headers.host ||
    origin === 'https://' + request.headers.host;
  if (request.url !== '/world' || !validOrigin) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  sockets.handleUpgrade(request, socket, head, ws => sockets.emit('connection', ws));
});

function playerState(player) {
  return { ...player.state, id: player.id, yaw: player.yaw, moving: player.moving,
    sprint: player.sprint, ack: player.ack };
}

function publish() {
  if (!players.size) return;
  const message = JSON.stringify({ type: 'snapshot', players: [...players.values()].map(playerState), world });
  for (const { ws } of players.values()) {
    if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 64 * 1024) ws.send(message);
  }
}

function acceptInput(player, data, binary) {
  if (binary) return;
  let input;
  try {
    input = JSON.parse(data);
  } catch {
    return;
  }
  if (input?.type !== 'input' || !Number.isSafeInteger(input.seq) ||
      input.seq <= player.lastSeq || !Number.isFinite(input.x) ||
      !Number.isFinite(input.z) || !Number.isFinite(input.yaw)) return;
  const scale = Math.max(1, Math.hypot(input.x, input.z));
  player.lastSeq = input.seq;
  // Limit latency after a stalled connection. Input never controls simulation time.
  if (player.inputs.length >= 8) player.inputs.shift();
  player.inputs.push({
    seq: input.seq, x: input.x / scale, z: input.z / scale,
    yaw: input.yaw % (Math.PI * 2), sprint: input.sprint === true, jump: input.jump === true,
  });
}

sockets.on('connection', ws => {
  ws.on('error', () => ws.terminate());
  if (players.size >= capacity) {
    ws.send(JSON.stringify({ type: 'full' }));
    ws.close(1013, 'World full');
    return;
  }
  let id = 1;
  while (players.has(id)) id++;
  const player = {
    id, ws, state: { ...spawn(id - 1), grounded: true, vy: 0 },
    yaw: 0, moving: false, sprint: false, inputs: [], ack: 0, lastSeq: 0, alive: true,
  };
  players.set(id, player);
  ws.on('message', (data, binary) => acceptInput(player, data, binary));
  ws.on('pong', () => { player.alive = true; });
  ws.on('close', () => {
    players.delete(id);
    if (!players.size) world = newExpedition();
    publish();
  });
  ws.send(JSON.stringify({ type: 'welcome', id, state: playerState(player), world }));
  publish();
});

const idle = { x: 0, z: 0, jump: false, sprint: false };
let ticks = 0;
function tick() {
  for (const player of players.values()) {
    const input = player.inputs.shift();
    player.state = stepPlayer(player.state, input || idle, step, world.hp);
    if (input) {
      player.ack = input.seq;
      player.yaw = input.yaw;
      player.moving = Math.hypot(input.x, input.z) > 0.01;
      player.sprint = player.moving && input.sprint;
    } else {
      player.moving = false;
      player.sprint = false;
    }
  }
  if (++ticks % 2 === 0) publish();
}

let previous = performance.now();
let accumulated = 0;
setInterval(() => {
  const now = performance.now();
  accumulated += Math.min((now - previous) / 1000, step * 4);
  previous = now;
  while (accumulated >= step) {
    tick();
    accumulated -= step;
  }
}, 8).unref();

setInterval(() => {
  for (const player of players.values()) {
    if (!player.alive) player.ws.terminate();
    else {
      player.alive = false;
      player.ws.ping();
    }
  }
}, 20000).unref();

server.listen(port, host, () => {
  console.log(`Shared world listening at http://${host}:${server.address().port}/`);
});
