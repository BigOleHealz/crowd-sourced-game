import { createScene } from './scene.js';
import { MAP, stepPlayer } from './world.js';

const byId = id => document.getElementById(id);
const canvas = byId('game');
const step = 1 / 30;
const camera = { yaw: 0, pitch: -0.15, distance: 5.6 };
const held = new Set();
let lastPointer = null;
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
let seq = 0, pending = [], samples = [], queuedJump = false, retry = 500;
let accumulator = 0, lastTime = performance.now(), nextHud = 0;
const controls = new Set(['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ArrowLeft','ArrowRight','ArrowUp','ArrowDown']);

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
function clearInput() { held.clear(); queuedJump = false; }
function stopLook() { lastPointer = null; edgeYaw = 0; edgePitch = 0; }
function pauseControls() { clearInput(); stopLook(); }
byId('help').onclick = () => setGuide(byId('guide').hidden);
byId('close-guide').onclick = () => setGuide(false);
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '?' && !e.repeat) setGuide(byId('guide').hidden);
  if (e.code === 'Escape') setGuide(false);
  if (!byId('guide').hidden || !controls.has(e.code) || e.target.closest?.('button')) return;
  e.preventDefault();
  held.add(e.code);
  if (e.code === 'Space' && !e.repeat) queuedJump = true;
});
window.addEventListener('keyup', e => held.delete(e.code));
// A visible embedded document can receive pointer events before it has keyboard focus.
window.addEventListener('blur', () => { windowBlurred = true; pauseControls(); });
window.addEventListener('focus', () => { windowBlurred = false; });
document.addEventListener('visibilitychange', pauseControls);
canvas.addEventListener('pointerleave', stopLook);
canvas.addEventListener('pointercancel', stopLook);

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
  socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/world');
  let full = false;
  socket.onmessage = ({data}) => {
    const m = JSON.parse(data);
    if (m.type === 'full') { full = true; return; }
    if (m.type === 'welcome') {
      id = m.id; self = previous = m.state; facing = m.state.yaw;
      seq = 0; pending = []; samples = []; accumulator = 0; retry = 500;
      notice(); clearInput();
      byId('presence').parentElement.classList.add('online');
    } else if (m.type === 'snapshot' && id != null) {
      const authoritative = m.players.find(p => p.id === id);
      if (!authoritative) return;
      pending = pending.filter(cmd => cmd.seq > authoritative.ack);
      const corrected = pending.reduce((state, cmd) => stepPlayer(state, cmd, step), authoritative);
      // Keep sub-tick rendering continuous as an acknowledgement updates the simulation base.
      previous = { ...previous, x: previous.x + corrected.x - self.x,
        y: previous.y + corrected.y - self.y, z: previous.z + corrected.z - self.z };
      self = corrected;
      samples.push({ time: performance.now(), players: m.players.filter(p => p.id !== id) });
      if (samples.length > 8) samples.shift();
      const label = m.players.length === 1 ? '1 hiker online' : m.players.length + ' hikers online';
      if (byId('presence').textContent !== label) byId('presence').textContent = label;
    }
  };
  socket.onclose = () => {
    id = null; pending = []; samples = [];
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
  sprint = moving && (held.has('ShiftLeft') || held.has('ShiftRight'));
  if (moving) facing = Math.atan2(x, -z);
  const cmd = { type: 'input', seq: ++seq, x, z, jump: queuedJump, yaw: facing, sprint };
  queuedJump = false;
  socket.send(JSON.stringify(cmd));
  pending.push(cmd);
  if (pending.length > 150) { socket.close(); return; }
  previous = self;
  self = stepPlayer(self, cmd, step);
}

function remoteFrame(time) {
  if (!samples.length) return [];
  const target = time - 100;
  let after = samples.findIndex(s => s.time >= target);
  if (after < 0) return samples.at(-1).players;
  if (after === 0) return samples[0].players;
  const a = samples[after - 1], b = samples[after];
  const t = clamp((target - a.time) / Math.max(1, b.time - a.time), 0, 1);
  return b.players.map(p => {
    const q = a.players.find(q => p.id === q.id);
    if (!q || Math.hypot(q.x - p.x, q.z - p.z) > 5) return p;
    return { ...p, x: mix(q.x,p.x,t), y: mix(q.y,p.y,t), z: mix(q.z,p.z,t), yaw: angleMix(q.yaw,p.yaw,t) };
  });
}

function drawMap(player, remotes) {
  const w = map.width, h = map.height;
  const sx = x => w / 2 + x * 3.25, sy = z => h * .57 + z * 3.25;
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
  ctx.fillStyle = '#e8bb71'; ctx.fillRect(sx(MAP.lookout.x)-4,sy(MAP.lookout.z)-4,8,8);
  for (const remote of remotes) {
    ctx.fillStyle = '#b3e6ec'; ctx.beginPath(); ctx.arc(sx(remote.x),sy(remote.z),5,0,Math.PI*2); ctx.fill();
  }
  ctx.save(); ctx.translate(sx(player.x),sy(player.z)); ctx.rotate(camera.yaw);
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
    const local = { ...self, id, yaw: facing, moving, sprint,
      x: mix(previous.x,self.x,t), y: mix(previous.y,self.y,t), z: mix(previous.z,self.z,t) };
    const remotes = remoteFrame(time);
    scene.render(local, remotes, camera, dt);
    if (time >= nextHud) {
      nextHud = time + 80;
      const direction = (Math.round(camera.yaw / (Math.PI / 4)) % 8 + 8) % 8;
      byId('bearing').textContent = headings[direction];
      byId('left-bearing').textContent = headings[(direction + 7) % 8];
      byId('right-bearing').textContent = headings[(direction + 1) % 8];
      byId('location').textContent = Math.hypot(local.x - MAP.lookout.x, local.z - MAP.lookout.z) < 6 ? 'The Lookout'
        : Math.abs(local.z) < 5.2 ? (Math.abs(local.x) < 2.5 ? 'Timber Bridge' : 'Cedar Creek')
        : local.z < -5 ? 'Summit Trail' : Math.hypot(local.x,local.z - 15) < 6 ? 'Trailhead' : 'Pine Loop';
      drawMap(local, remotes);
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
