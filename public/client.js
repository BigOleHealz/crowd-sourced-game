import {firearmSpecs} from './rounds.js';
import {seatVehicle,seatChoices} from './seat-selection.js';
import { onBeach, beach } from './beach-layout.js';
import { updateSupplyHud, drawSupplyMap } from './supply-view.js';
import { interpolateSuspension } from './road-suspension.js';
import { createScene } from './scene.js';
import { gunnerVehicle, gunnerFeet } from './mounts.js';
import { nearestVehicle } from './rover.js';
import { avenues, streets, coast, harbor, causeway } from './brickell-map.js';
import { CITY, MAP, BREAKABLES, BOARD_RANGE, stepPlayer } from './world.js';

const byId = id => document.getElementById(id);
const canvas = byId('game');
const selector=byId('map-choice');
selector.value=CITY ? 'brickell' : 'outpost';
selector.addEventListener('change',()=>{ location.href=selector.value==='brickell' ? '/?map=brickell' : '/'; });
if(CITY) {
  document.title='Brickell · Pinewatch';
  document.querySelector('.map-title span').textContent='District map';
  byId('map').setAttribute('aria-label','Brickell streets, waterfront and player locations');
}
const step = 1 / 30;
const camera = { yaw: 0, pitch: -0.15, distance: 5.6 };
let roverView = null;
const held = new Set();
let lastPointer = null, pressedAim = null;
const canAim = () => self && !vitals.dead && !vitals.fall && !self.swimming && !self.parachute && !isPilot() && !isDriving() && !gunnerRole();
function showSight(active) {
  camera.sighted = active;
  byId('weapon-sight').hidden = !active || weapon!==1;
  canvas.classList.toggle('sighted', active);
}
let windowBlurred = false;
let edgeYaw = 0, edgePitch = 0;
const footer = document.querySelector('footer');
const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const map = byId('map');
const ctx = map.getContext('2d');
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const mix = (a, b, t) => a + (b - a) * t;
const angleMix = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
let scene, socket, id, self, previous, facing = 0, moving = false, sprint = false;
let vitals = {}, world = null, weapon = 1, queuedInteract = false, queuedFire = false, mouseFire = false;
const isDriving = () => id != null && world?.rover.driver === id;
const gunnerRole=()=>gunnerVehicle(world,id);
const isPilot = () => id != null && world?.heli.pilot === id;

let queuedSeat=null, queuedSeatKind=null;
let queuedReplay = false, queuedDeploy = false;
let seq = 0, pending = [], samples = [], queuedJump = false, retry = 500;
let accumulator = 0, lastTime = performance.now(), nextHud = 0;
const controls = new Set(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyR','Digit1','Digit2','KeyF','KeyE']);

function notice(message = '') {
  byId('notice').textContent = message;
  byId('notice').hidden = !message;
}

function setGuide(open) {
  byId('guide').hidden = !open;
  byId('help').setAttribute('aria-expanded', String(open));
  clearInput();
  stopLook();
  if (!open) canvas.focus({ preventScroll: true });
}
function clearInput() {
  showSight(false);
  held.clear();
  queuedSeat=queuedSeatKind=null;
  pressedAim = null;
  queuedReplay = queuedDeploy = false;
  queuedJump = queuedInteract = queuedFire = mouseFire = false;
}
function stopLook() { lastPointer = null; edgeYaw = 0; edgePitch = 0; }
function pauseControls() { clearInput(); stopLook(); }
byId('help').onclick = () => setGuide(byId('guide').hidden);
byId('close-guide').onclick = () => setGuide(false);
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '?' && !e.repeat) setGuide(byId('guide').hidden);
  if (e.code === 'Escape') setGuide(false);
  if (!byId('guide').hidden || !controls.has(e.code) || e.target.closest?.('button, select')) return;
  e.preventDefault();
  held.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Space') queuedDeploy = true;
  if (e.code === 'Space' && !isPilot() && !isDriving() && !gunnerRole()) queuedJump = true;
  if (e.code === 'KeyE') queuedInteract = true;
  if (e.code === 'KeyF') queuedFire = true;
  if (e.code === 'KeyR' && world?.mission?.stage === 'complete') queuedReplay = true;
  if (e.code === 'Digit1' || e.code === 'Digit2') {
    const number=e.code==='Digit1' ? 1 : 2;
    const kind=seatVehicle(world,id);
    if(kind && !vitals.dead) {queuedSeat=number;queuedSeatKind=kind;}
    else {weapon=number;if(camera.sighted)showSight(true);}
  }
});
window.addEventListener('keyup', e => held.delete(e.code));
// A visible embedded document can receive pointer events before it has keyboard focus.
window.addEventListener('blur', () => { windowBlurred = true; pauseControls(); });
window.addEventListener('focus', () => { windowBlurred = false; });
document.addEventListener('visibilitychange', pauseControls);
function releasePointer() { stopLook(); mouseFire = false; }
canvas.addEventListener('pointerleave', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
canvas.addEventListener('contextmenu', e => e.preventDefault());
function pressButton(e) {
  if (!byId('guide').hidden || (e.button !== 0 && e.button !== 2)) return;
  if (e.button === 2) {
    if (canAim()) {
      canvas.focus({ preventScroll: true });
      showSight(!camera.sighted);
    }
    return;
  }
  canvas.focus({ preventScroll: true });
  lastPointer = {x: e.clientX, y: e.clientY};
  if (self && !isDriving() && !isPilot() && !vitals.dead && !vitals.fall)
    pressedAim = camera.sighted ? {yaw:camera.yaw,pitch:camera.pitch} : scene.aimAt(lastPointer,self,id,firearmSpecs[gunnerRole() ? 'turret' : weapon].range,gunnerRole());
  mouseFire = queuedFire = true;
}
// Mouse events report each button in a chord (pointerdown only reports the first).
let pointerType;
canvas.addEventListener('pointerdown', e => { pointerType = e.pointerType; });
canvas.addEventListener('mousedown', e => { if (pointerType !== 'touch') pressButton(e); });
window.addEventListener('mouseup', e => {
  if (e.button === 0) mouseFire = false;
});

// An unlocked cursor stops sending deltas at the window boundary. Continue
// turning gently in the outer band until the cursor moves inward or exits.
function edgeRate(position, extent) {
  const band = Math.min(48, extent * 0.07);
  if (position < band) return -Math.pow(clamp(1 - position / band, 0, 1), 2);
  if (position > extent - band) return Math.pow(clamp(1 - (extent - position) / band, 0, 1), 2);
  return 0;
}

canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch' || windowBlurred || document.hidden || !byId('guide').hidden) {
    stopLook();
    return;
  }
  const x = e.clientX, y = e.clientY;
  if (lastPointer) {
    camera.yaw += clamp(x - lastPointer.x, -120, 120) * 0.0028;
    camera.pitch = clamp(camera.pitch - clamp(y - lastPointer.y, -120, 120) * 0.0024, -0.95, 0.48);
  }
  lastPointer = { x, y };
  edgeYaw = edgeRate(x, canvas.clientWidth) * 1.35;
  edgePitch = -edgeRate(y, footer.offsetTop) * 0.65;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camera.distance = clamp(camera.distance + e.deltaY * 0.006, 2.6, 8.5);
}, { passive: false });

function connect() {
  byId('presence').textContent = 'Connecting';
  socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + (CITY ? '/world?map=brickell' : '/world'));
  let full = false;
  socket.onmessage = ({data}) => {
    const m = JSON.parse(data);
    if (m.type === 'full') { full = true; return; }
    if (m.type === 'welcome') {
      id = m.id; self = previous = m.state; facing = m.state.yaw;
      world = m.world; vitals = m.state; weapon = m.state.weapon;
      seq = 0; pending = []; samples = []; accumulator = 0; retry = 500;
      notice(); clearInput();
      byId('presence').parentElement.classList.add('online');
    } else if (m.type === 'snapshot' && id != null) {
      const authoritative = m.players.find(p => p.id === id);
      if (!authoritative) return;
      pending = pending.filter(cmd => cmd.seq > authoritative.ack);
      const wasPilot = isPilot(), wasDriving = isDriving(), wasGunner=gunnerRole();
      const changedLife = !!vitals.dead !== !!authoritative.dead;
      vitals = authoritative;
      world = m.world;
      if (wasDriving && !isDriving() && roverView) {
        camera.yaw = roverView.yaw;
        camera.pitch = roverView.pitch;
        roverView = null;
      }
      const gunner=gunnerRole();
      if(gunner && gunner!==wasGunner) {camera.yaw=world[gunner].turretYaw;camera.pitch=0;stopLook();}
      if (changedLife) clearInput();
      if (camera.sighted && (!canAim() || authoritative.parachute || authoritative.swimming)) showSight(false);
      const corrected = isPilot() || isDriving() || gunner || vitals.dead || vitals.fall ? authoritative : pending.reduce(
        (state, cmd) => stepPlayer(state, cmd, step, world.hp, world), authoritative);
      // Keep sub-tick rendering continuous as an acknowledgement updates the simulation base.
      previous = { ...previous, x: previous.x + corrected.x - self.x,
        y: previous.y + corrected.y - self.y, z: previous.z + corrected.z - self.z };
      if (wasPilot !== isPilot() || wasDriving !== isDriving() || wasGunner!==gunner || changedLife) previous = corrected;
      self = corrected;
      samples.push({ time: performance.now(), bullets:world.bullets, heli: world.heli, rover: world.rover, npcs: world.npcs, players: m.players.filter(p => p.id !== id) });
      if (samples.length > 8) samples.shift();
      const label = m.players.length === 1 ? '1 hiker online' : m.players.length + ' hikers online';
      if (byId('presence').textContent !== label) byId('presence').textContent = label;
    }
  };
  socket.onclose = () => {
    canvas.classList.remove('armed');
    roverView = null;
    id = null; self = null; world = null; pending = []; samples = [];
    byId('presence').parentElement.classList.remove('online');
    byId('presence').textContent = full ? 'World full' : 'Reconnecting';
    notice(full ? 'All 16 places are taken. Retrying shortly…' : 'Connection lost. Rejoining the trail…');
    clearInput();
    setTimeout(connect, full ? 5000 : retry);
    retry = Math.min(retry * 2, 5000);
  };
}

function tick() {
  if (socket?.readyState !== WebSocket.OPEN || id == null) return;
  const right = held.has('KeyD') || held.has('ArrowRight');
  const left = held.has('KeyA') || held.has('ArrowLeft');
  const up = held.has('KeyW') || held.has('ArrowUp');
  const down = held.has('KeyS') || held.has('ArrowDown');
  const lateral = Number(right) - Number(left);
  const forward = Number(up) - Number(down);
  const length = Math.max(1, Math.hypot(lateral, forward));
  const x = (lateral * Math.cos(camera.yaw) + forward * Math.sin(camera.yaw)) / length;
  const z = (lateral * Math.sin(camera.yaw) - forward * Math.cos(camera.yaw)) / length;
  moving = Boolean(lateral || forward);
  sprint = moving && !self.swimming && (held.has('ShiftLeft') || held.has('ShiftRight'));
  const pilot = isPilot();
  const driving = isDriving();
  const fire = !self.swimming && !vitals.dead && !vitals.fall && (queuedFire || mouseFire || held.has('KeyF'));
  const gunner=gunnerRole();
  const aim=(!driving && !pilot && (fire || gunner) &&
    (pressedAim || (camera.sighted ? camera : null) || scene.aimAt(lastPointer,self,id,firearmSpecs[gunner ? 'turret' : weapon].range,gunner))) || camera;
  pressedAim = null;
  if (fire) facing = aim.yaw;
  else if (moving) facing = Math.atan2(x, -z);
  const descending = held.has('ShiftLeft') || held.has('ShiftRight');
  const cmd = { type: 'input', seq: ++seq, x, z, jump: queuedJump && !pilot && !driving, yaw: facing,
    sprint: sprint && !pilot, weapon, fire, interact: queuedInteract, seat:queuedSeat, seatKind:queuedSeatKind,
    throttle: driving ? forward : 0, steer: driving ? lateral : 0,
    lift: pilot ? Number(held.has('Space')) - Number(descending) : 0,
    deploy: queuedDeploy, replaySupply: queuedReplay, aimYaw: aim.yaw, aimPitch: aim.pitch };
  queuedReplay = queuedDeploy = false;
  queuedJump = queuedInteract = queuedFire = false;
  queuedSeat=queuedSeatKind=null;
  socket.send(JSON.stringify(cmd));
  pending.push(cmd);
  if (pending.length > 150) { socket.close(); return; }
  previous = self;
  if (!pilot && !driving && !gunner && !vitals.dead && !vitals.fall) self = stepPlayer(self, cmd, step, world.hp, world);
}

// Interpolate only live rounds. An impact snapshot immediately retires its tracer.
function roundFrame(time) {
  const newest=samples.at(-1),older=samples.at(-2);
  if(!older || !newest?.bullets?.length) return world.bullets;
  const duration=Math.max(1,newest.time-older.time),blend=clamp((time-newest.time)/duration,0,1);
  return newest.bullets.map(r=>{
    const old=older.bullets?.find(v=>v.id===r.id);
    const back=Math.min(r.age/30,duration/1000);
    return {...r,x:mix(old?.x ?? r.x-r.vx*back,r.x,blend),
      y:mix(old?.y ?? r.y-r.vy*back,r.y,blend),z:mix(old?.z ?? r.z-r.vz*back,r.z,blend)};
  });
}

function remoteFrame(time) {
  if (!samples.length) return { players: [], npcs: world.npcs, heli: world.heli, rover: world.rover };
  const target = time - 100;
  let after = samples.findIndex(s => s.time >= target);
  if (after < 0) return samples.at(-1);
  if (after === 0) return samples[0];
  const a = samples[after - 1], b = samples[after];
  const t = clamp((target - a.time) / Math.max(1, b.time - a.time), 0, 1);
  function interpolateActors(older, newer) {
    return newer.map(p => {
      const q = older.find(q => p.id === q.id);
      if (!q || q.dead !== p.dead || Math.hypot(q.x - p.x, q.z - p.z) > 5) return p;
      return { ...p, x: mix(q.x,p.x,t), y: mix(q.y,p.y,t), z: mix(q.z,p.z,t), yaw: angleMix(q.yaw,p.yaw,t) };
    });
  }
  const players = interpolateActors(a.players,b.players);
  const npcs = interpolateActors(a.npcs || [],b.npcs || []);
  let heli = b.heli;
  if (a.heli.pilot === b.heli.pilot && a.heli.wrecked === b.heli.wrecked) {
    heli = { ...b.heli, x: mix(a.heli.x,b.heli.x,t), y: mix(a.heli.y,b.heli.y,t),
      pitch: mix(a.heli.pitch,b.heli.pitch,t), roll: mix(a.heli.roll,b.heli.roll,t),
    z: mix(a.heli.z,b.heli.z,t), yaw: angleMix(a.heli.yaw,b.heli.yaw,t),
      abandonedFor: b.heli.abandonedFor == null ? null : mix(a.heli.abandonedFor ?? 0,b.heli.abandonedFor,t) };
  }
  let rover = b.rover;
  if(a.rover.driver===b.rover.driver && a.rover.wrecked===b.rover.wrecked) {
    rover = { ...b.rover, x: mix(a.rover.x,b.rover.x,t), y: mix(a.rover.y,b.rover.y,t),
      z: mix(a.rover.z,b.rover.z,t), yaw: angleMix(a.rover.yaw,b.rover.yaw,t),
      suspension:interpolateSuspension(a.rover.suspension,b.rover.suspension,t) };
  }
  for(const [kind,v] of [['heli',heli],['rover',rover]]) {
    if(v.gunner!=null && a[kind].gunner===v.gunner) {
      v.turretYaw=angleMix(a[kind].turretYaw,b[kind].turretYaw,t);
      v.turretPitch=mix(a[kind].turretPitch,b[kind].turretPitch,t);
    }
  }
  return { players, npcs, heli, rover };
}

// Follow the same interpolated heading as the rendered body, once per frame.
function drivingView(rover, dt) {
  if (!roverView) {
    roverView = { yaw: camera.yaw, pitch: camera.pitch, heading: rover.yaw };
    camera.yaw = rover.yaw;
  }
  const turn = Math.atan2(Math.sin(rover.yaw-roverView.heading), Math.cos(rover.yaw-roverView.heading));
  roverView.heading = rover.yaw;
  camera.yaw += turn;
  const blend = 1 - Math.exp(-16 * dt);
  roverView.yaw = angleMix(roverView.yaw + turn, camera.yaw, blend);
  roverView.pitch = mix(roverView.pitch, camera.pitch, blend);
  roverView.distance = camera.distance;
  return roverView;
}

function updateEquipment(local) {
  const heli = world.heli;
  const pilot = isPilot();
  const distance = Math.hypot(local.x - heli.x, local.y - heli.y, local.z - heli.z);
  const cleared = BREAKABLES.filter(p => world.hp[p.id] === 0).length;
  const gunner=gunnerRole();
  byId('kit').textContent = gunner ? (gunner==='heli' ? 'Helicopter turret' : 'Rover turret') : isDriving() ? 'Rover missiles' : pilot ? 'Helicopter missiles' : weapon === 1 ? 'Field carbine' : 'Patrol sidearm';
  byId('progress').textContent = cleared + ' / ' + BREAKABLES.length + ' roadblocks cleared';
  canvas.classList.toggle('armed', !local.swimming && !pilot && !isDriving() && !vitals.dead && byId('guide').hidden);
  const health = pilot ? heli : isDriving() ? world.rover : vitals;
  const hp = health.hp;
  const maxHp = health.maxHp || 100;
  byId('hp-meter').max = maxHp; byId('hp-meter').value = hp ?? maxHp;
  byId('hp-label').textContent = (pilot ? 'Airframe ' : isDriving() ? 'Rover ' : 'Health ') + (hp ?? maxHp) + '/' + maxHp;
  byId('life-status').textContent = vitals.dead ? 'Down · Respawning in ' + Math.ceil(vitals.respawnIn) + 's' : gunner ? 'Hull '+world[gunner].hp+'/'+world[gunner].maxHp : vitals.protected ? 'Spawn shield' : '';
  byId('space-action').parentElement.hidden = byId('shift-action').parentElement.hidden = local.swimming || isDriving() || !!gunner;
  byId('space-action').textContent = pilot ? 'Climb' : local.parachute === 'packed' ? 'Deploy parachute' : 'Jump';
  if (local.parachute === 'open') byId('space-action').parentElement.hidden = true;
  byId('shift-action').textContent = pilot ? 'Descend' : 'Sprint';
  const kind=seatVehicle(world,id);
  byId('tool-shortcut').hidden=local.swimming || vitals.dead;
  byId('number-action').textContent=kind ? 'Seats' : 'Weapons';
  byId('fire-shortcut').hidden = local.swimming || vitals.dead;
  const prompt = byId('field-prompt');
  if (vitals.fall && !vitals.dead) prompt.textContent='Knocked down · Getting back up…';
  else if (vitals.dead) prompt.textContent = 'Returning to the trailhead…';
  else if (local.swimming) prompt.textContent='Swimming  ·  WASD / arrows to swim to shore';
  else if (local.parachute === 'packed') prompt.textContent = 'Free fall  ·  Press Space to deploy parachute';
  else if (local.parachute === 'open') prompt.textContent = 'Parachute open  ·  WASD / arrows to steer';
  else if (gunner) prompt.textContent = 'Look around to aim  ·  Hold F / click to fire  ·  E '+(gunner==='heli' && !heli.grounded ? 'bail out' : 'exit');
  else if (isDriving()) prompt.textContent = 'W/S drive  ·  A/D steer  ·  E park and exit';
  else if (!pilot && nearestVehicle(world,local)==='rover') prompt.textContent = world.rover.driver!=null ? 'E  ·  Join rover turret' : 'E  ·  Drive trail rover';
  else if (heli.wrecked) prompt.textContent = 'Helicopter recovering · ' + Math.ceil(heli.recoverySeconds) + 's';
  else if (pilot) prompt.textContent = heli.grounded ? 'Space to lift off  ·  E to exit' : 'Space to climb  ·  Shift to descend  ·  E to bail out';
  else if (heli.pilot != null) prompt.textContent = nearestVehicle(world,local)==='heli' ? 'E  ·  Join helicopter turret' : heli.gunner!=null ? 'Helicopter crew full' : 'Helicopter in use';
  else if (distance <= BOARD_RANGE && local.grounded && heli.grounded) prompt.textContent = 'E  ·  Pilot helicopter';
  else prompt.textContent = 'Helicopter  ·  ' + Math.round(distance) + ' m';
  if(kind && !vitals.dead) prompt.textContent += '  ·  '+seatChoices(world,kind,id);
}

function drawMap(player, remotes, yaw) {
  const w = map.width, h = map.height;
  const scale=CITY ? 1.34 : 3.25;
  const centerZ=CITY ? Math.min(0,player.z+36) : 0;
  const sx = x => w / 2 + x * scale, sy = z => h * (CITY ? .48 : .57) + (z-centerZ) * scale;
  if(CITY) {
    ctx.fillStyle='#467e87';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#69716b';ctx.fillRect(sx(coast.west),sy(coast.north),(coast.east-coast.west)*scale,(coast.south-coast.north)*scale);
    ctx.fillRect(sx(harbor.west),sy(harbor.north),(harbor.east-harbor.west)*scale,(harbor.south-harbor.north)*scale);
    ctx.fillStyle='#d3bb8c';ctx.fillRect(sx(beach.west),sy(beach.north),25*scale,(beach.south-beach.north)*scale);
    ctx.fillStyle='#b1aba0';
    ctx.fillRect(sx(-6),sy(harbor.north),12*scale,(causeway.south-harbor.north)*scale);
    ctx.fillRect(sx(harbor.west),sy(harbor.crossing-4.5),(harbor.east-harbor.west)*scale,9*scale);
    for(const x of avenues) ctx.fillRect(sx(x-5.7),sy(coast.north),11.4*scale,(coast.south-coast.north)*scale);
    for(const z of streets) ctx.fillRect(sx(coast.west),sy(z-4.1),(coast.east-coast.west)*scale,8.2*scale);
    ctx.fillStyle='#3b4b4c';
    for(const b of MAP.buildings) ctx.fillRect(sx(b.x-b.w/2),sy(b.z-b.d/2),b.w*scale,b.d*scale);
  } else {
  ctx.fillStyle = '#31473a'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#a8bdaa25'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < w; x += 24) { ctx.moveTo(x,0); ctx.lineTo(x,h); }
  for (let y = 0; y < h; y += 24) { ctx.moveTo(0,y); ctx.lineTo(w,y); }
  ctx.stroke();
  ctx.strokeStyle = '#638e8b'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(0,sy(0)); ctx.lineTo(w,sy(0)); ctx.stroke();
  ctx.strokeStyle = '#c1ac7f'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  ctx.beginPath(); MAP.trail.forEach(([x,z], i) => i ? ctx.lineTo(sx(x),sy(z)) : ctx.moveTo(sx(x),sy(z))); ctx.stroke();
  }
  ctx.fillStyle = '#e8bb71'; ctx.fillRect(sx(MAP.lookout.x)-4,sy(MAP.lookout.z)-4,8,8);
  for (const piece of BREAKABLES) {
    if (world.hp[piece.id] === 0) continue;
    ctx.fillStyle = '#acdbcf'; ctx.fillRect(sx(piece.x)-2,sy(piece.z)-2,4,4);
  }
  const heli = world.heli;
  ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffae60'; ctx.fillText('H', sx(heli.x), sy(heli.z) - 4);
  ctx.fillStyle = '#ffe085'; ctx.fillText('R',sx(world.rover.x),sy(world.rover.z)-4);
  drawSupplyMap(ctx,sx,sy,world,player,id);
  for (const remote of remotes) {
    ctx.fillStyle = '#b3e6ec'; ctx.beginPath(); ctx.arc(sx(remote.x),sy(remote.z),5,0,Math.PI*2); ctx.fill();
  }
  ctx.save(); ctx.translate(sx(player.x),sy(player.z)); ctx.rotate(yaw);
  ctx.fillStyle = '#fcf5ce'; ctx.strokeStyle = '#19291f'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(7,7); ctx.lineTo(0,4); ctx.lineTo(-7,7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}

function frame(time) {
  // On high-refresh displays keep the prototype's visual workload near 60 frames/s.
  if (time - lastTime < 1000 / 60 - 0.75) { requestAnimationFrame(frame); return; }
  const dt = clamp((time - lastTime) / 1000, 0, .14);
  lastTime = time;
  if (edgeYaw || edgePitch) {
    if (!windowBlurred && !document.hidden && canvas.matches(':hover')) {
      camera.yaw += edgeYaw * dt;
      camera.pitch = clamp(camera.pitch + edgePitch * dt, -0.95, 0.48);
    } else {
      stopLook();
    }
  }
  accumulator += dt;
  while (accumulator >= step) { tick(); accumulator -= step; }
  if (self) {
    const t = accumulator / step;
    const local = { ...self, lostParts:vitals.lostParts, hp: vitals.hp, maxHp: vitals.maxHp, dead: vitals.dead, protected: vitals.protected, id, yaw: self.fall ? self.yaw : facing, moving, sprint,
      x: mix(previous.x,self.x,t), y: mix(previous.y,self.y,t), z: mix(previous.z,self.z,t) };
    const { players: remotes, npcs, heli, rover } = remoteFrame(time);
    local.weapon = weapon;
    if (isPilot()) Object.assign(local, { x: heli.x, y: heli.y, z: heli.z, yaw: heli.yaw });
    if (isDriving()) Object.assign(local, { x: rover.x, y: rover.y, z: rover.z, yaw: rover.yaw });
    const role=gunnerRole();
    if(role) Object.assign(local,gunnerFeet(role==='rover' ? rover : heli,role));
    const view = isDriving() ? drivingView(rover, dt) : camera;
    scene.render(local, remotes, view, dt, { ...world, heli, rover, npcs, bullets:roundFrame(time) });
    if (time >= nextHud) {
      nextHud = time + 80;
      const direction = (Math.round(view.yaw / (Math.PI / 4)) % 8 + 8) % 8;
      byId('bearing').textContent = headings[direction];
      byId('degrees').textContent=String((Math.round(view.yaw*180/Math.PI)%360+360)%360).padStart(3,'0')+'°';
      byId('left-bearing').textContent = headings[(direction + 7) % 8];
      byId('right-bearing').textContent = headings[(direction + 1) % 8];
      byId('location').textContent = CITY ? (onBeach(local.x,local.z) ? 'Harbor Key Beach' : local.z<harbor.south ? 'Harbor Key' : local.z<coast.north ? 'North Causeway' : local.x>24 || local.z < -48 ? 'Biscayne Bayfront' : 'Brickell Avenue') : Math.hypot(local.x - MAP.lookout.x, local.z - MAP.lookout.z) < 6 ? 'The Lookout'
        : Math.abs(local.z) < 5.2 ? (Math.abs(local.x) < 2.5 ? 'Timber Bridge' : 'Cedar Creek')
        : local.z < -5 ? 'Summit Trail' : Math.hypot(local.x,local.z - 15) < 6 ? 'Trailhead' : 'Pine Loop';
      updateEquipment(local);
      updateSupplyHud(world,local,id);
      drawMap(local, remotes, view.yaw);
    }
  }
  requestAnimationFrame(frame);
}

try {
  scene = createScene(canvas);
  window.addEventListener('resize', () => scene.resize());
  scene.resize();
  connect();
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  byId('presence').textContent = 'Unavailable';
  notice('Pinewatch could not initialize 3D graphics. Open it in a desktop browser with WebGL 2 enabled.');
}
