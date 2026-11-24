// The shared host only receives ordinary walking/jumping guests. The simulation
// that gets flown, damaged and reset below has its own process and loopback port.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import {inflateSync} from 'node:zlib';
import { BREAKABLES, HELIPAD, groundHeight } from '../public/world.js';

const guests = [];
async function until(read, label, timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = read();
    if (result) return result;
    await delay(15);
  }
  throw new Error('Timed out waiting for ' + label);
}

async function join(host, options, packed = false) {
  const url = new URL('/world', host);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const g = { ws: new WebSocket(url, options), frames: [], seq: 0 };
  guests.push(g);
  g.ws.on('error', e => { g.error = e; });
  if (packed) g.ws.on('open', () => g.ws.send(JSON.stringify({type:'snapshotEncoding', encoding:'deflate'})));
  g.ws.on('message', (raw,binary) => {
    if (binary) {assert(packed); g.receivedPacked = true;}
    const m = JSON.parse(binary ? inflateSync(raw) : raw);
    if (m.type === 'welcome') {
      g.id = m.id;
      g.welcome = m;
    }
    if (m.type === 'snapshot') g.frames.push(m);
  });
  await until(() => {
    if (g.error) throw g.error;
    return g.id && g.frames.length;
  }, 'introduction and first snapshot');
  return g;
}

async function leave(guest) {
  const closed = once(guest.ws, 'close');
  guest.ws.close();
  await closed;
}
const player = (viewer, id = viewer.id) => viewer.frames.at(-1).players.find(p => p.id === id);
const world = viewer => viewer.frames.at(-1).world;
async function drive(guest, input, ticks = 1) {
  for (let i = 0; i < ticks; i++) {
    guest.ws.send(JSON.stringify({ type: 'input', seq: ++guest.seq, x: 0, z: 0, yaw: 0, ...input }));
    await delay(34);
  }
  await until(() => player(guest)?.ack === guest.seq, 'input acknowledgement');
}

async function checkMotion(actor, observer) {
  const start = await until(() => player(observer, actor.id), 'remote spawn');
  const firstFrame = observer.frames.length;
  await drive(actor, { z: 1, sprint: true, jump: true });
  await drive(actor, { z: 1, sprint: true }, 17);
  await until(() => {
    const p = player(observer, actor.id);
    return p?.ack === actor.seq && p.grounded && p.z - start.z > 2;
  }, 'remote movement and landing');
  const states = observer.frames.slice(firstFrame).flatMap(f => f.players.filter(p => p.id === actor.id));
  assert.ok(states.some(p => !p.grounded && p.y > start.y + .5), 'observer sees jump');
}

async function walkTo(guest, destination) {
  for (let i = 0; i < 40; i++) {
    const p = player(guest);
    const dx = destination.x - p.x, dz = destination.z - p.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .4) return;
    await drive(guest, { x: dx / distance, z: dz / distance }, Math.min(6, Math.ceil(distance * 6)));
  }
  throw new Error('Could not walk to ' + JSON.stringify(destination));
}

async function checkExpedition(host) {
  const a = await join(host), b = await join(host, { perMessageDeflate:false }, true);
  await until(() => b.receivedPacked, 'compressed snapshots without a WebSocket extension');
  assert.equal(a.ws.extensions, 'permessage-deflate');
  assert.equal(b.ws.extensions, '');
  const crystal = BREAKABLES.find(p => p.x === 0 && p.z === 10);
  assert.ok(crystal, 'crystal obstructs the trailhead approach');
  const hp = (state, prop) => state.hp[prop.id] ?? prop.hp;
  assert.equal(hp(a.welcome.world, crystal), crystal.hp);
  const start = player(a);
  const bystander = player(b);
  const towardBystander = Math.atan2(bystander.x - start.x, start.z - bystander.z);
  await drive(a, { aimYaw: towardBystander, aimPitch: 0, fire: true, weapon: 1 });
  await until(() => world(b).shots.some(shot => shot.weapon === 1), 'new guest observes pulse during spawn protection');
  assert.equal(player(b).hp, bystander.hp, 'spawn shield prevents damage on fresh join');
  assert.deepEqual(world(b).hp, a.welcome.world.hp, 'direct pulse absorbed by hiker leaves scenery intact');
  await drive(a, { z: -1 }, 40);
  const blockedZ = player(a).z;
  assert.ok(blockedZ > crystal.z && blockedZ < start.z - 2, 'hiker reaches the obstacle');
  await drive(a, { z: -1 }, 8);
  assert.equal(player(a).z, blockedZ, 'intact formation stops player movement');
  await walkTo(a, start);

  const aim = { aimYaw: 0, aimPitch: -.15, fire: true };
  await drive(a, { ...aim, weapon: 1 });
  await until(() => hp(world(b), crystal) === crystal.hp - 1, 'Pulse damage reaches observer');
  assert.ok(world(b).shots.some(s => s.weapon === 1 && s.hit));
  const beforeBloom = world(b);
  await drive(a, {}, 22);
  await drive(a, { ...aim, weapon: 2 });
  await until(() => hp(world(b), crystal) === 0, 'Bloom clears damaged formation');
  assert.ok(world(b).shots.some(s => s.weapon === 2 && s.hit));
  assert.ok(BREAKABLES.every(p => p === crystal || hp(world(b), p) === hp(beforeBloom, p)), 'Sidearm only affects its first target');
  await drive(a, { z: -1 }, 40);
  assert.ok(player(a).z < crystal.z - .5, 'player crosses the cleared collision volume');
  assert.equal(player(b, a.id).weapon, 2, 'observer sees equipped blaster');
  await walkTo(a, start);

  const padApproach = { x: HELIPAD.x - 1, z: HELIPAD.z + .5 };
  await walkTo(a, padApproach);
  await walkTo(b, padApproach);
  await drive(a, { interact: true });
  await until(() => world(b).heli.pilot === a.id, 'observer sees pilot board');
  await drive(b, { interact: true, lift: 1 });
  assert.equal(world(b).heli.pilot, a.id, 'occupied craft keeps the original pilot');
  await drive(a, { lift: 1 }, 25);
  await drive(a, { z: -1 }, 10);
  const airborne = world(a).heli;
  assert.ok(!airborne.grounded && airborne.y > groundHeight(airborne.x, airborne.z) + 1);
  assert.ok(airborne.z < HELIPAD.z - .35, 'helicopter travels over the ground');
  await until(() => Math.abs(world(b).heli.z - airborne.z) < .5 && !world(b).heli.grounded, 'observed aircraft motion');
  assert.equal(world(b).heli.gunner,b.id,'the second player owns the independent belly turret');
  await drive(a,{fire:true},3);
  await until(()=>world(b).shots.some(s=>s.weapon==='muzzle' && s.firedWeapon==='pilotGun'),'observer sees pilot gunfire');
  assert.equal(world(b).missiles.length,0,'pilot trigger fires guns without launching a missile');
  await drive(b,{fire:true,aimYaw:Math.PI,aimPitch:0},3);
  await until(()=>world(a).shots.some(s=>s.weapon==='muzzle' && s.firedWeapon==='turret'),'pilot sees passenger turret fire');
  await drive(a,{missile:true});
  await until(()=>world(b).shots.some(s=>s.weapon==='launch' && s.shooter===a.id),'observer sees pilot missile on separate input');

  const beforeArrival=world(a).heli;
  const late = await join(host);
  const arrival = late.welcome.world;
  assert.equal(arrival.heli.pilot, a.id);
  assert.equal(arrival.heli.grounded, false);
  assert.ok(Math.abs(arrival.heli.z - beforeArrival.z) < .6, 'late guest sees the current aircraft location');
  assert.deepEqual(arrival.hp, world(a).hp, 'late guest sees all previous scenery changes');
  await drive(a, { z: 1 }, 10);
  await drive(a, { lift: -1 }, 60);
  assert.ok(world(a).heli.grounded, 'pilot lands');
  await drive(a, { interact: true });
  await until(() => world(late).heli.pilot == null, 'late guest sees seat released');
  const dismounted = player(a);
  assert.ok(dismounted.grounded && Math.abs(dismounted.y - groundHeight(dismounted.x, dismounted.z)) < .3, 'exit leaves pilot on safe ground');

  await drive(a, { interact: true });
  await drive(a, { lift: 1 }, 80);
  await drive(a, { interact: true });
  await until(() => player(b, a.id).parachute === 'packed', 'observer sees free fall');
  await drive(a, {}, 9);
  assert.ok(player(a).vy < -4, 'packed chute allows accelerating free fall');
  const empty = world(b).heli;
  assert.equal(empty.pilot, null);
  assert.ok(empty.abandonedFor > 0 && !empty.wrecked && !empty.grounded);
  const beforeLanding = player(a).hp;
  await drive(a, { deploy: true });
  await until(() => player(b, a.id).parachute === 'open', 'observer sees manual deployment');
  assert.ok(player(a).vy >= -2.81, 'open canopy slows descent');
  await until(() => world(b).heli.wrecked && world(late).heli.wrecked, 'observers see the crash');
  assert.ok(Math.hypot(world(b).heli.x-empty.x, world(b).heli.z-empty.z) > 1);
  await until(() => player(a).grounded, 'safe parachute landing');
  assert.equal(player(a).hp, beforeLanding);
  assert.equal(player(a).parachute, undefined);
  console.log('PASS: airborne bailout, accelerating free fall, manual canopy deployment, replicated descent and full-health landing.');
  await until(() => !world(b).heli.wrecked && world(b).heli.grounded, 'replacement at the pad', 8000);
  await walkTo(b, padApproach);
  await drive(b, { interact: true });
  assert.equal(world(b).heli.pilot, b.id);
  await drive(b, { lift: 1 }, 20);
  await leave(b);
  await until(() => world(a).heli.pilot == null && world(a).heli.grounded, 'disconnected pilot recovery');
  assert.ok(Math.hypot(world(a).heli.x - HELIPAD.x, world(a).heli.z - HELIPAD.z) < .1, 'abandoned craft returns to the pad');
  assert.equal(hp(world(a), crystal), 0, 'remaining guests retain cleared path');
  await leave(a);
  await leave(late);
  const fresh = await join(host);
  assert.ok(BREAKABLES.every(p => hp(fresh.welcome.world, p) === p.hp), 'empty world resets scenery');
  assert.equal(fresh.welcome.world.heli.pilot, null);
  fresh.ws.send(JSON.stringify({type:'unstuck'}));
  fresh.ws.send(JSON.stringify({type:'unstuck'}));
  await until(()=>player(fresh)?.dead,'stuck player enters normal defeat');
  assert.deepEqual(player(fresh).score,{kills:0,deaths:1});
  await until(()=>!player(fresh).dead,'stuck player returns to spawn');
  assert.equal(player(fresh).hp,100);
  assert.equal(player(fresh).x,fresh.welcome.state.x);
  assert.equal(player(fresh).z,fresh.welcome.state.z);
  await leave(fresh);
  console.log('PASS: two blasters, collision removal, exclusive flight, late join, landing, pilot disconnect and empty-world reset.');
}

async function withLocalServer(check) {
  const script = fileURLToPath(new URL('../server.js', import.meta.url));
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '0' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  const exited = once(child, 'exit');
  try {
    const host = await until(() => {
      if (child.exitCode !== null) throw new Error('Isolated server exited');
      return output.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
    }, 'isolated loopback server');
    await check(host);
  } finally {
    child.kill();
    await exited;
  }
}

async function checkPeerMovement(host) {
  const first = await join(host), second = await join(host);
  assert.notEqual(first.id, second.id);
  for(const [guest,observer] of [[first,second],[second,first]]) {
    const selected=guest.welcome.state.character;
    assert.ok(['classic','mike','pink'].includes(selected), 'join assigns an available character');
    await until(() => player(observer,guest.id)?.character===selected, 'character replication');
    assert.equal(player(guest).character,selected,'character remains stable in snapshots');
  }
  await checkMotion(first, second);
  await checkMotion(second, first);
  await leave(first);
  await until(() => !player(second, first.id), 'disconnect propagation');
  await leave(second);
  console.log('PASS: two guests independently observed peer movement, jump, landing and removal.');
}

try {
  if (process.env.GAME_URL) await checkPeerMovement(process.env.GAME_URL);
  else await withLocalServer(checkPeerMovement);
  await withLocalServer(checkExpedition);
  await import('./rivals.mjs');
  await import('./airframe.mjs');
} finally {
  for (const g of guests) g.ws.terminate();
}

await import('./rover.mjs');
await import('./supply-run.mjs');

await import('./mounted-combat.mjs');
