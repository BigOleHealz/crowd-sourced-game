import {nearestTraffic} from './city-traffic.js';
import {nearJet} from './jet.js';
import {driverPrediction} from './driver-prediction.js';
import {launcherSpec,lockLabel} from './handheld-launcher.js';
import {frozenPhase,modes,teamColors} from './island-rules.js';
import {drawMatchMap,updateMatchHud} from './island-hud.js';
import {church,churchPath,churchLot} from './ridge-church.js';
import {casaRoomAt} from './casa-luma.js';
import {inPalazzoMare} from './palazzo-mare.js';
import {lanternBuildings} from './lantern-buildings-layout.js';
import {lanternLand,lanternRoads,lanternBridge,ferrySlip,marketPiers,lanternLocation} from './lantern-point.js';
import {keyShores} from './offshore-keys.js';
import {viewPitch} from './view-pitch.js';
import {shotDamageVignette} from './shot-damage-vignette.js';
import {liveShots} from './shot-events.js';
import {retailRoom} from './frontage-glass.js';
import {galleryRoomAt} from './gallery-lobbies.js';
import {storefrontRoom} from './storefront-layout.js';
import {aboardYacht,carryOnYacht,yachtHelmFeet,yachtPrompt} from './yacht-layout.js';
import {nearBoat,crewBoat,helmFeet,localBoatFrame} from './patrol-boats.js';
import { createGameAudio } from './game-audio.js';
import {firearmSpecs} from './rounds.js';
const equipmentSpecs={...firearmSpecs,4:launcherSpec};
import {seatVehicle,seatChoices} from './seat-selection.js';
import { onBeach, beach } from './beach-layout.js';
import { updateSupplyHud, drawSupplyMap } from './supply-view.js';
import { interpolateSuspension } from './road-suspension.js';
import { createScene } from './scene.js';
import { gunnerVehicle, gunnerFeet, vehicleById } from './mounts.js';
import { drivenRoad, nearestVehicle } from './rover.js';
import { streetPlan, coast, harbor, causeway } from './brickell-map.js';
import { CITY, MAP, travelBounds, BREAKABLES, BOARD_RANGE, stepPlayer } from './world.js';

const byId = id => document.getElementById(id);
const damageEdges=shotDamageVignette(byId('damage-edges'));
const canvas = byId('game');
const audio=createGameAudio(byId('sound-mute'),byId('sound-volume'),byId('sound-level'));
window.addEventListener('pointerdown',audio.unlock,{capture:true});
window.addEventListener('keydown',audio.unlock,{capture:true});
window.addEventListener('pagehide',()=>audio.reset());
const selector=byId('map-choice');
const chosen=new URLSearchParams(location.search).get('mode');
const mode=CITY && Object.hasOwn(modes,chosen) ? chosen : null;
const modeGroup=document.createElement('optgroup');
modeGroup.label='Brickell team games';
for(const [key,rule] of Object.entries(modes))modeGroup.append(new Option(rule.name,key));
selector.append(modeGroup);
selector.value=mode ?? (CITY ? 'brickell' : 'outpost');
selector.addEventListener('change',()=>{ const url=new URL(location.href);if(Object.hasOwn(modes,selector.value)){url.searchParams.set('map','brickell');url.searchParams.set('mode',selector.value);}else{url.searchParams.set('map',selector.value);url.searchParams.delete('mode');}location.assign(url); });
if(CITY) {
  document.title='Brickell · Pinewatch';
  document.querySelector('.map-title span').textContent='District map';
  byId('map').setAttribute('aria-label','Brickell streets, waterfront and player locations');
}
const step = 1 / 30;
const camera = { yaw: 0, pitch: -0.15, distance: 5.6 };
let lastGlass=0;
let roverView = null, roadImpact=null;
const held = new Set();
let stickX=0, stickY=0;
const stickOutput=n=>Math.sign(n)*Math.max(0,Math.abs(n)-.06)/.94;
let lastPointer = null, pressedAim = null;
let lookPaused=false;
const locked=()=>document.pointerLockElement===canvas;
const canAim = () => self && !vitals.dead && !vitals.fall && !self.climb && !self.swimming && !self.parachute && !isPilot() && !isDriving() && !gunnerRole();
function showSight(active) {
  camera.sighted = active;
  canvas.classList.toggle('sighted', active);
}
let windowBlurred = false;
let edgeYaw = 0, edgePitch = 0;
const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const map = byId('map');
const ctx = map.getContext('2d');
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const mix = (a, b, t) => a + (b - a) * t;
const angleMix = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
let scene, socket, id, self, readShots, facing = 0, moving = false, sprint = false;
let vitals = {}, world = null, weapon = 1, queuedInteract = false, queuedFire = false, mouseFire = false;
const myBoat=()=>crewBoat(world,id);
const atYachtHelm=()=>id!=null && world?.yacht?.driver===id;
const myRoad = () => drivenRoad(world,id);
const carNames={hatchback:'Hatchback',sedan:'Sedan',van:'Delivery van'};
const unarmedRoad=()=>inGT() || Boolean(myRoad()?.model);
const inGT = () => myRoad()?.kind==='supercar';
const isDriving = () => id != null && (Boolean(myRoad()) || myBoat()?.driver===id || atYachtHelm());
const gunnerRole=()=>gunnerVehicle(world,id);
const jetPilot=()=>id!=null && world?.jet?.pilot===id;
const isPilot = () => id != null && (world?.heli.pilot === id || jetPilot());

function canChangeStance(state) {
  return state?.grounded && !state.swimming && !state.climb && !state.parachute &&
    !vitals.dead && !vitals.fall && !isPilot() && !isDriving() && !gunnerRole();
}

let requestedStance;
let queuedSeat=null, queuedSeatKind=null;
let handleCase=false;
let queuedBomb=false,queuedMissile=false;
let queuedReplay = false, queuedDeploy = false;
let seq = 0, pending = [], samples = [], queuedJump = false, retry = 500;
let predictedDriver, nextFrame=0;
let accumulator = 0, lastTime = performance.now(), nextHud = 0;
const controls = new Set(['KeyB','KeyG','KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyR','Digit1','Digit2','Digit3','Digit4','KeyF','KeyE','KeyC','KeyZ']);

function notice(message = '') {
  byId('notice').textContent = message;
  byId('notice').hidden = !message;
}

function setGuide(open) {
  byId('guide').hidden = !open;
  if (open) byId('unstuck').disabled = !self || vitals.dead || (world?.match && frozenPhase(world.match.phase));
  if(open)releaseLook();
  byId('help').setAttribute('aria-expanded', String(open));
  clearInput();
  stopLook();
  if (!open) canvas.focus({ preventScroll: true });
}
function clearInput() {
  queuedBomb=queuedMissile=false;
  stickX=stickY=0;byId('flight-cursor').style.transform='';
  handleCase=false;
  showSight(false);
  held.clear();
  requestedStance = undefined;
  queuedSeat=queuedSeatKind=null;
  pressedAim = null;
  queuedReplay = queuedDeploy = false;
  queuedJump = queuedInteract = queuedFire = mouseFire = false;
}
function stopLook() { lastPointer = null; edgeYaw = 0; edgePitch = 0; }
function releaseLook(){
  lookPaused=true;
  canvas.classList.add('look-paused');
  if(locked())document.exitPointerLock();
  clearInput();stopLook();
}
document.addEventListener('pointerlockchange',()=>{
  canvas.classList.toggle('captured',locked());
  if(locked()){lookPaused=false;canvas.classList.remove('look-paused');stopLook();}
  else releaseLook();
});
function pauseControls() { releaseLook(); }
byId('sound-mute').onclick = e => {
  audio.toggleMute();
  if (e.detail && byId('guide').hidden) canvas.focus({ preventScroll: true });
};
byId('unstuck').onclick = () => {
  if (socket?.readyState !== WebSocket.OPEN || vitals.dead || !self) return;
  socket.send(JSON.stringify({type:'unstuck'}));
  setGuide(false);
};
byId('help').onclick = () => setGuide(byId('guide').hidden);
byId('close-guide').onclick = () => setGuide(false);
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key.toLowerCase() === 'm' && !e.target.closest?.('input, select, textarea, [contenteditable]')) {
    e.preventDefault();
    if (!e.repeat) audio.toggleMute();
    return;
  }
  if (e.key === '?' && !e.repeat) setGuide(byId('guide').hidden);
  if (e.code === 'Escape') {setGuide(false);releaseLook();return;}
  if (!byId('guide').hidden || !controls.has(e.code) || e.target.closest?.('button, select')) return;
  e.preventDefault();
  held.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Space') queuedDeploy = true;
  if (e.code === 'Space' && !isPilot() && !isDriving() && !gunnerRole()) queuedJump = true;
  if ((e.code === 'KeyC' || e.code === 'KeyZ') && canChangeStance(self)) {
    const target = e.code === 'KeyC' ? 'crouch' : 'prone';
    requestedStance = (requestedStance ?? self.stance) === target ? 'stand' : target;
  }
  if(e.code==='KeyG' && mode)handleCase=true;
  if (e.code === 'KeyE') queuedInteract = true;
  if (e.code === 'KeyF') queuedFire = true;
  if (e.code === 'KeyB' && jetPilot()) queuedBomb=true;
  if (e.code === 'KeyR' && jetPilot()) queuedMissile=true;
  if (e.code === 'KeyR' && !jetPilot() && world?.mission?.stage === 'complete') queuedReplay = true;
  if (!jetPilot() && !unarmedRoad() && ['Digit1','Digit2','Digit3','Digit4'].includes(e.code)) {
    const number=Number(e.code.at(-1));
    const kind=seatVehicle(world,id);
    if(atYachtHelm() || gunnerRole()==='superyacht')return;
    if(kind) {
      if(number<=2 && !vitals.dead){queuedSeat=number;queuedSeatKind=kind;}
    } else {weapon=number;if(camera.sighted)showSight(true);}
  }
});
window.addEventListener('keyup', e => held.delete(e.code));
// A visible embedded document can receive pointer events before it has keyboard focus.
window.addEventListener('blur', () => { windowBlurred = true; pauseControls(); });
window.addEventListener('focus', () => { windowBlurred = false; });
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseControls();});
function releasePointer() { stopLook(); mouseFire = false; }
canvas.addEventListener('pointerleave', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
canvas.addEventListener('contextmenu', e => e.preventDefault());
function pressButton(e) {
  if (!byId('guide').hidden || (e.button !== 0 && e.button !== 2)) return;
  lookPaused=false;canvas.classList.remove('look-paused');
  // Embedded browsers may reject capture. Canvas movement and edge turning
  // still control the same view in that case.
  if(!locked() && canvas.requestPointerLock){
    try{canvas.requestPointerLock()?.catch(()=>{});}catch{}
  }
  if (e.button === 2) {
    if (canAim()) {
      canvas.focus({ preventScroll: true });
      showSight(!camera.sighted);
    }
    return;
  }
  canvas.focus({ preventScroll: true });
  if (self && !isDriving() && !isPilot() && !vitals.dead && !vitals.fall)
    pressedAim = scene.aimAt(self,id,equipmentSpecs[gunnerRole() ? 'turret' : weapon].range,gunnerRole());
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
  if (lookPaused || e.pointerType === 'touch' || windowBlurred || document.hidden || !byId('guide').hidden) {
    stopLook();
    return;
  }
  if(jetPilot()){
    const rect=canvas.getBoundingClientRect();
    const radius=Math.max(36,Math.min(rect.width,rect.height)*.20);
    if(locked()){
      stickX=clamp(stickX+e.movementX/radius,-1,1);
      stickY=clamp(stickY-e.movementY/radius,-1,1);
    } else {
      stickX=clamp((e.clientX-rect.left-rect.width/2)/radius,-1,1);
      stickY=clamp((rect.top+rect.height/2-e.clientY)/radius,-1,1);
    }
    byId('flight-cursor').style.transform='translate('+stickX*radius+'px,'+-stickY*radius+'px)';
    stopLook();return;
  }
  if(locked()){
    camera.yaw+=e.movementX*.0028;
    camera.pitch=viewPitch(camera.pitch-e.movementY*.0024);
    return;
  }
  const x = e.clientX, y = e.clientY;
  if (lastPointer) {
    camera.yaw += (x - lastPointer.x) * 0.0028;
    camera.pitch = viewPitch(camera.pitch - (y - lastPointer.y) * 0.0024);
  }
  lastPointer = { x, y };
  const rect = canvas.getBoundingClientRect();
  edgeYaw = edgeRate(x - rect.left, rect.width) * 1.35;
  edgePitch = -edgeRate(y - rect.top, rect.height) * 0.65;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camera.distance = clamp(camera.distance + e.deltaY * 0.006, 2.6, 8.5);
}, { passive: false });

let connectedBuild,previousScoreKey;
let canUnpack = typeof DecompressionStream === 'function';
const scoreStorage=mode?'island-score-'+mode:CITY?'brickell-match-score':'outpost-match-score';
try{previousScoreKey=sessionStorage.getItem(scoreStorage);}catch{}
function connect() {
  byId('presence').textContent = 'Connecting';
  socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + (CITY ? '/world?map=brickell'+(mode?'&mode='+mode:'') : '/world'));
  let full = false;
  const connection = socket;
  let incoming = Promise.resolve();
  connection.onopen = () => {
    if (canUnpack && !connection.extensions.includes('permessage-deflate')) {
      connection.send(JSON.stringify({type:'snapshotEncoding', encoding:'deflate'}));
    }
  };
  // WebSocket delivers binary frames as Blobs. Keep snapshot order across
  // asynchronous decompression, and discard work belonging to closed sockets.
  connection.onmessage = ({data}) => {
    incoming = incoming.then(async () => {
      if (connection !== socket || connection.readyState === WebSocket.CLOSED) return;
      let text = data;
      if (typeof data !== 'string') {
        try {
          const stream = data.stream().pipeThrough(new DecompressionStream('deflate'));
          text = await new Response(stream).text();
        } catch {
          canUnpack = false;
          connection.close();
          return;
        }
      }
      if (connection === socket && connection.readyState !== WebSocket.CLOSED) receive(JSON.parse(text));
    }).catch(error => {console.error(error); connection.close();});
  };
  function receive(m) {
    if (m.type === 'full') { full = true; return; }
    if (m.type === 'welcome') {
      if(connectedBuild && m.build && connectedBuild!==m.build){location.reload();return;}
      connectedBuild=m.build;
      if(previousScoreKey)socket.send(JSON.stringify({type:'resumeScore',key:previousScoreKey}));
      previousScoreKey=m.scoreKey;
      try{sessionStorage.setItem(scoreStorage,m.scoreKey);}catch{}
      id = m.id; self = m.state; facing = m.state.yaw;
      damageEdges.reset();
      canvas.classList.remove('bow-sight');
      world = m.world; roadImpact=null; lastGlass=world.doors?.glassSeq??0; readShots=liveShots(world.shots); audio.reset(world); vitals = m.state; weapon = m.state.weapon;
      predictedDriver=null;
      seq = 0; pending = []; samples = []; accumulator = 0; retry = 500;
      notice(); clearInput();
      byId('presence').parentElement.classList.add('online');
    } else if (m.type === 'snapshot' && id != null) {
      const authoritative = m.players.find(p => p.id === id);
      if (!authoritative) return;
      pending = pending.filter(cmd => cmd.seq > authoritative.ack);
      if(m.world.match?.phase!==world.match?.phase){
        clearInput();pending=[];samples=[];
      }
      const wasJet=jetPilot();
      const wasDriving = isDriving(), wasGunner=gunnerRole();
      const changedLife = !!vitals.dead !== !!authoritative.dead;
      if(vitals.dead && !authoritative.dead)damageEdges.reset();
      else damageEdges.update(vitals,authoritative);
      vitals = authoritative;
      const road=myRoad(), bump=drivenRoad(m.world,id)?.contactSound;
      if(road && bump?.damage>0 && bump.id!==road.contactSound?.id){
        roadImpact={message:bump.panel+' impact −'+bump.damage+' HP',until:performance.now()+1800};
      }
      world = m.world;
      if(wasJet!==jetPilot()){
        stickX=stickY=0;stopLook();
        byId('flight-cursor').style.transform='';
        camera.yaw=world.jet.yaw;
        camera.pitch=-.10;
      }
      predictedDriver = !vitals.dead && !vitals.fall && !frozenPhase(world.match?.phase) ? driverPrediction(world,id) : null;
      if(predictedDriver)for(const cmd of pending.slice(-8))predictedDriver.step(cmd,step);
      if (wasDriving && !isDriving() && roverView) {
        camera.yaw = roverView.yaw;
        camera.pitch = roverView.pitch;
        roverView = null;
      }
      const gunner=gunnerRole();
      canvas.classList.toggle('bow-sight',gunner==='superyacht' && !vitals.dead);
      if(gunner && gunner!==wasGunner) {camera.yaw=vehicleById(world,gunner).turretYaw;camera.pitch=0;stopLook();}
      if (changedLife) clearInput();
      if (camera.sighted && (!canAim() || authoritative.parachute || authoritative.swimming)) showSight(false);
      const corrected = isPilot() || isDriving() || gunner || vitals.dead || vitals.fall ? authoritative : pending.reduce(
        (state, cmd) => stepPlayer(state, cmd, step, world.hp, world), authoritative);
      self = corrected;
      const shots=readShots(world.shots);
      for(const e of world.doors?.glassSounds??[])if(e.seq>lastGlass)scene.glassBurst(e);
      lastGlass=world.doors?.glassSeq??0;
      scene.showShots(shots);
      audio.events(world,authoritative,roverView?.yaw ?? camera.yaw,shots);
      samples.push({ time: performance.now(), bullets:world.bullets, traffic:world.traffic, jet:world.jet, boats:world.boats, yacht:world.yacht, heli: world.heli, supercar:world.supercar, rover: world.rover, npcs: world.npcs, players: m.players.filter(p => p.id !== id) });
      if (samples.length > 8) samples.shift();
      const label = m.players.length === 1 ? '1 hiker online' : m.players.length + ' hikers online';
      if (byId('presence').textContent !== label) byId('presence').textContent = label;
    }
  }
  socket.onclose = () => {
    damageEdges.reset();
    canvas.classList.remove('armed');
    roverView = null;
    audio.reset();
    byId('match-card').hidden=true;
    byId('flight-cursor').hidden=true;
    id = null; self = null; world = null; pending = []; samples = [];
    byId('presence').parentElement.classList.remove('online');
    byId('presence').textContent = full ? 'World full' : 'Reconnecting';
    notice(full ? 'All 16 places are taken. Retrying shortly…' : 'Connection lost. Rejoining the trail…');
    clearInput();
    setTimeout(connect, full ? 5000 : retry);
    retry = Math.min(retry * 2, 5000);
  };
}

function movementInput() {
  const right = held.has('KeyD') || held.has('ArrowRight');
  const left = held.has('KeyA') || held.has('ArrowLeft');
  const up = held.has('KeyW') || held.has('ArrowUp');
  const down = held.has('KeyS') || held.has('ArrowDown');
  const lateral = Number(right) - Number(left);
  const forward = Number(up) - Number(down);
  const length = Math.max(1, Math.hypot(lateral, forward));
  const x = (lateral * Math.cos(camera.yaw) + forward * Math.sin(camera.yaw)) / length;
  const z = (lateral * Math.sin(camera.yaw) - forward * Math.cos(camera.yaw)) / length;
  const moving = Boolean(lateral || forward);
  const effectiveStance = requestedStance ?? self.stance;
  const sprint = moving && (!effectiveStance || effectiveStance === 'stand') && !self.swimming && (held.has('ShiftLeft') || held.has('ShiftRight'));
  return {x,z,lateral,forward,moving,sprint};
}

function tick() {
  if (socket?.readyState !== WebSocket.OPEN || id == null) return;
  if(world?.match && frozenPhase(world.match.phase)){moving=sprint=false;handleCase=false;return;}
  const {x,z,lateral,forward,...motion}=movementInput();
  moving=motion.moving;sprint=motion.sprint;
  const pilot = isPilot();
  const driving = isDriving();
  const fire = !unarmedRoad() && !self.swimming && !self.climb && !vitals.dead && !vitals.fall && (queuedFire || mouseFire || held.has('KeyF'));
  const gunner=gunnerRole();
  const aim=(!driving && !pilot && (fire || gunner || (!lookPaused && canAim())) &&
    (pressedAim || scene.aimAt(self,id,equipmentSpecs[gunner ? 'turret' : weapon].range,gunner))) || camera;
  pressedAim = null;
  if (fire || (!lookPaused && canAim())) facing = aim.yaw;
  else if (moving) facing = Math.atan2(x, -z);
  else if (queuedJump && self.swimming) facing = camera.yaw;
  const descending = held.has('ShiftLeft') || held.has('ShiftRight');
  const cmd = { type: 'input', seq: ++seq, handleCase, x, z, jump: queuedJump && !pilot && !driving, yaw: facing,
    stance: canChangeStance(self) ? requestedStance : undefined,
    sprint: sprint && !pilot, weapon, fire:fire && !atYachtHelm(), interact: queuedInteract, seat:queuedSeat, seatKind:queuedSeatKind,
    bomb:jetPilot() && queuedBomb,
    missile:jetPilot() && (queuedMissile || held.has('KeyR')),
    throttle: driving || jetPilot() ? forward : 0, steer:jetPilot()?stickOutput(stickX):driving?lateral:0,
    jetPitch:jetPilot()?stickOutput(stickY):undefined,
    lift: pilot && !jetPilot() ? Number(held.has('Space')) - Number(descending) : 0,
    tracking:weapon===4 && camera.sighted && canAim() && !lookPaused,
    deploy: queuedDeploy, replaySupply: queuedReplay, aimYaw: aim.yaw, aimPitch: aim.pitch };
  queuedReplay = queuedDeploy = false;
  queuedJump = queuedInteract = queuedFire = false;
  queuedSeat=queuedSeatKind=null;
  requestedStance = undefined;
  handleCase=false;
  queuedBomb=queuedMissile=false;
  socket.send(JSON.stringify(cmd));
  pending.push(cmd);
  predictedDriver?.step(cmd,step);
  if (pending.length > 150) { socket.close(); return; }
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
  if (!samples.length) return { players: [], traffic:world.traffic, jet:world.jet, npcs: world.npcs, boats:world.boats, yacht:world.yacht, heli: world.heli, supercar:world.supercar, rover: world.rover };
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
      const fall=p.fall?.joints && q.fall?.started===p.fall.started ? {...p.fall,
        joints:p.fall.joints.map((n,i)=>mix(q.fall.joints[i],n,t)),age:mix(q.fall.age,p.fall.age,t)} : p.fall;
      const climb = q.climb && p.climb ? {...p.climb,t:mix(q.climb.t,p.climb.t,t)} : p.climb;
      return { ...p, climb, fall, x: mix(q.x,p.x,t), y: mix(q.y,p.y,t), z: mix(q.z,p.z,t), yaw: angleMix(q.yaw,p.yaw,t) };
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
  function roadFrame(old,car) {
    if(!old || !car || old.driver!==car.driver || old.wrecked!==car.wrecked)return car;
    return {...car,x:mix(old.x,car.x,t),y:mix(old.y,car.y,t),z:mix(old.z,car.z,t),
      yaw:angleMix(old.yaw,car.yaw,t),steer:mix(old.steer??0,car.steer??0,t),
      suspension:interpolateSuspension(old.suspension,car.suspension,t)};
  }
  const supercar=roadFrame(a.supercar,b.supercar);
  const traffic=b.traffic?.map(car=>{
    const old=a.traffic?.find(v=>v.id===car.id),frame=roadFrame(old,car);
    if(car.takeover && old?.takeover?.npcId===car.takeover.npcId)
      return {...frame,takeover:{...car.takeover,progress:mix(old.takeover.progress,car.takeover.progress,t)}};
    return frame;
  });
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
  const boats=(b.boats??[]).map(boat=>{
    const old=a.boats?.find(v=>v.id===boat.id);
    if(!old || old.wrecked!==boat.wrecked)return boat;
    return {...boat,x:mix(old.x,boat.x,t),y:mix(old.y,boat.y,t),z:mix(old.z,boat.z,t),yaw:angleMix(old.yaw,boat.yaw,t),
      pitch:mix(old.pitch,boat.pitch,t),roll:mix(old.roll,boat.roll,t),turretYaw:angleMix(old.turretYaw,boat.turretYaw,t),
      turretPitch:mix(old.turretPitch,boat.turretPitch,t)};
  });
  let yacht=b.yacht;
  if(a.yacht && yacht && a.yacht.wrecked===yacht.wrecked){
    yacht={...yacht,x:mix(a.yacht.x,yacht.x,t),z:mix(a.yacht.z,yacht.z,t),yaw:angleMix(a.yacht.yaw,yacht.yaw,t),
      turretYaw:angleMix(a.yacht.turretYaw,yacht.turretYaw,t),turretPitch:mix(a.yacht.turretPitch,yacht.turretPitch,t)};
  }
  let jet=b.jet;
  if(jet && a.jet?.pilot===jet.pilot && a.jet.wrecked===jet.wrecked){
    jet={...jet};
    for(const key of ['x','y','z','pitch','roll'])jet[key]=mix(a.jet[key],jet[key],t);
    jet.yaw=angleMix(a.jet.yaw,jet.yaw,t);
  }
  return { players, npcs, heli, rover, supercar, boats, yacht, jet, traffic };
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
  const heli = jetPilot()?world.jet:world.heli;
  const pilot = isPilot();
  const distance = Math.hypot(local.x - heli.x, local.y - heli.y, local.z - heli.z);
  const boat=myBoat(),nearby=nearBoat(world,local);
  const trafficCar=myRoad()?.model && myRoad();
  const nearbyTraffic=local.grounded && !isDriving() && !isPilot() && !gunnerRole() && nearestTraffic(world,local);
  const cleared = BREAKABLES.filter(p => world.hp[p.id] === 0).length;
  const gunner=gunnerRole();
  byId('match-kills').textContent=vitals.score?.kills??0;
  byId('match-deaths').textContent=vitals.score?.deaths??0;
  byId('kit').textContent = jetPilot() ? 'Strike jet · Cannon, missiles and bombs' : atYachtHelm() ? 'Solana · Yacht helm' : boat ? (gunner?'Boat turret':'Patrol boat helm') : gunner ? (gunner==='superyacht' ? 'Solana · Bow gun' : gunner==='heli' ? 'Helicopter turret' : 'Rover turret') : trafficCar ? carNames[trafficCar.model] : inGT() ? 'Vesper GT' : isDriving() ? 'Rover missiles' : pilot ? 'Helicopter missiles' : weapon+' · '+equipmentSpecs[weapon].name;
  byId('progress').textContent = cleared + ' / ' + BREAKABLES.length + ' roadblocks cleared';
  canvas.classList.toggle('armed', !local.swimming && !pilot && !isDriving() && !vitals.dead && byId('guide').hidden);
  const health = ((atYachtHelm() || gunner==='superyacht') && world.yacht) || boat || (pilot ? heli : myRoad() || vitals);
  const hp = health.hp;
  const maxHp = health.maxHp || 100;
  byId('hp-meter').max = maxHp; byId('hp-meter').value = hp ?? maxHp;
  byId('hp-label').textContent = (boat || atYachtHelm() || gunner==='superyacht' ? 'Hull ' : pilot ? 'Airframe ' : trafficCar ? carNames[trafficCar.model]+' ' : inGT() ? 'Vesper GT ' : isDriving() ? 'Rover ' : 'Health ') + (hp ?? maxHp) + '/' + maxHp;
  byId('flight-cursor').hidden=!jetPilot() || vitals.dead || !byId('guide').hidden || lookPaused;
  byId('life-status').textContent = vitals.dead ? 'Down · Respawning in ' + Math.ceil(vitals.respawnIn) + 's' : gunner ? 'Hull '+vehicleById(world,gunner).hp+'/'+vehicleById(world,gunner).maxHp : myRoad() && roadImpact?.until>performance.now() ? roadImpact.message : unarmedRoad() ? Math.round(Math.abs(myRoad().speed)*3.6)+' km/h' : vitals.protected ? 'Spawn shield' : '';
  byId('space-action').parentElement.hidden = isDriving() || jetPilot() || !!gunner;
  byId('shift-action').parentElement.hidden = local.swimming || isDriving() || jetPilot() || !!gunner;
  byId('space-action').textContent = pilot ? 'Climb' : local.swimming ? 'Climb ashore' : local.parachute === 'packed' ? 'Deploy parachute' : 'Jump';
  if (local.parachute === 'open') byId('space-action').parentElement.hidden = true;
  byId('shift-action').textContent = pilot ? 'Descend' : 'Sprint';
  const showStances = canChangeStance(local);
  byId('prone-shortcut').hidden = byId('crouch-shortcut').hidden = !showStances;
  byId('crouch-action').textContent = local.stance === 'crouch' ? 'Stand' : 'Crouch';
  byId('prone-action').textContent = local.stance === 'prone' ? 'Stand' : 'Prone';
  if (local.stance) byId('shift-action').parentElement.hidden = true;
  const kind=seatVehicle(world,id);
  byId('tool-shortcut').hidden=jetPilot() || unarmedRoad() || atYachtHelm() || gunner==='superyacht' || local.swimming || vitals.dead;
  byId('number-action').textContent=kind ? 'Seats' : 'Weapons';
  byId('third-tool-key').hidden=byId('fourth-tool-key').hidden=Boolean(kind);
  const tracking=byId('launcher-status'),lock=vitals.launcherLock;
  tracking.hidden=weapon!==4 || !canAim() || !!kind;
  if(!tracking.hidden)tracking.textContent=lock ? (lock.progress===1?'Locked · ':'Locking '+Math.round(lock.progress*100)+'% · ')+lockLabel(lock.key) :
    camera.sighted?'Aim at a vehicle to lock · F fires straight':'Right-click to lock · F / click fires straight';
  byId('fire-shortcut').hidden = unarmedRoad() || atYachtHelm() || local.swimming || !!local.climb || vitals.dead || (boat && !gunner);
  const prompt = byId('field-prompt');
  const helmPrompt=yachtPrompt(world,local,id);
  if (local.climb) prompt.textContent = 'Pulling up…';
  else if (vitals.fall && !vitals.dead) prompt.textContent='Knocked down · Getting back up…';
  else if (vitals.dead) prompt.textContent = 'Returning to the trailhead…';
  else if(jetPilot())prompt.textContent='Hold cursor up/down to loop · Center to hold pitch · W/S throttle · F / click cannon · R missile · B drop bomb · E exit';
  else if(!pilot && !isDriving() && !gunner && nearJet(world.jet,local))prompt.textContent='E · Pilot strike jet';
  else if (helmPrompt==='leave') prompt.textContent='W/S throttle  ·  A/D steer  ·  E leave helm';
  else if (helmPrompt==='helm') prompt.textContent='E  ·  Take Solana’s helm';
  else if (helmPrompt==='gun') prompt.textContent='E  ·  Use Solana’s bow gun';
  else if (helmPrompt==='gunOccupied') prompt.textContent='Solana’s bow gun is occupied';
  else if (helmPrompt==='leaveGun') prompt.textContent='Look to aim  ·  Hold F / click to fire  ·  E leave bow gun';
  else if (helmPrompt==='occupied') prompt.textContent='Solana’s helm is occupied';
  else if (boat && !gunner) prompt.textContent='W/S throttle  ·  A/D steer  ·  E disembark';
  else if (trafficCar) prompt.textContent=trafficCar.takeover?'Taking the wheel…':'W/S accelerate or brake  ·  A/D steer  ·  E exit';
  else if (inGT()) prompt.textContent='W/S accelerate or brake  ·  A/D steer  ·  E exit Vesper GT';
  else if (!boat && nearby && !kind) prompt.textContent=nearby.driver!=null?'E  ·  Board patrol boat turret':'E  ·  Take patrol boat helm';
  else if (local.swimming) prompt.textContent='Swim toward a bank or dock  ·  Space to climb out';
  else if (local.parachute === 'packed') prompt.textContent = 'Free fall  ·  Press Space to deploy parachute';
  else if (local.parachute === 'open') prompt.textContent = 'Parachute open  ·  WASD / arrows to steer';
  else if (gunner) prompt.textContent = 'Look around to aim  ·  Hold F / click to fire  ·  E '+(gunner==='heli' && !heli.grounded ? 'bail out' : 'exit');
  else if (isDriving()) prompt.textContent = 'W/S drive  ·  A/D steer  ·  E park and exit';
  else if (!pilot && nearestVehicle(world,local)==='supercar') prompt.textContent='E  ·  Drive Vesper GT';
  else if (!pilot && nearestVehicle(world,local)==='rover') prompt.textContent = world.rover.driver!=null ? 'E  ·  Join rover turret' : 'E  ·  Drive trail rover';
  else if (nearbyTraffic && !nearestVehicle(world,local)) prompt.textContent=nearbyTraffic.npcDriver?'E  ·  Take the wheel of the '+carNames[nearbyTraffic.model].toLowerCase():'E  ·  Drive '+carNames[nearbyTraffic.model].toLowerCase();
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
  const centerX=CITY ? player.x-clamp(player.x,-67,67) : 0;
  const centerZ=CITY ? Math.min(0,player.z+36)+Math.max(0,player.z-48) : Math.min(0,player.z+16);
  const sx = x => w / 2 + (x-centerX) * scale, sy = z => h * (CITY ? .48 : .57) + (z-centerZ) * scale;
  if(CITY) {
    ctx.fillStyle='#467e87';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#82a6aa';ctx.lineWidth=1;
    ctx.strokeRect(sx(travelBounds.west),sy(travelBounds.north),
      (travelBounds.east-travelBounds.west)*scale,(travelBounds.south-travelBounds.north)*scale);
    ctx.fillStyle='#899676';
    for(const {chart} of keyShores){
      ctx.beginPath();chart.forEach(([x,z],i)=>i?ctx.lineTo(sx(x),sy(z)):ctx.moveTo(sx(x),sy(z)));
      ctx.closePath();ctx.fill();
    }
    ctx.fillStyle='#69716b';ctx.fillRect(sx(coast.west),sy(coast.north),(coast.east-coast.west)*scale,(coast.south-coast.north)*scale);
    ctx.fillRect(sx(harbor.west),sy(harbor.north),(harbor.east-harbor.west)*scale,(harbor.south-harbor.north)*scale);
    for(const r of [...lanternLand,ferrySlip,...marketPiers])ctx.fillRect(sx(r.west),sy(r.north),(r.east-r.west)*scale,(r.south-r.north)*scale);
    ctx.fillStyle='#d3bb8c';ctx.fillRect(sx(beach.west),sy(beach.north),25*scale,(beach.south-beach.north)*scale);
    ctx.fillStyle='#b1aba0';
    for(const road of [causeway,lanternBridge,...streetPlan.roads,...lanternRoads])
      ctx.fillRect(sx(road.west),sy(road.north),(road.east-road.west)*scale,(road.south-road.north)*scale);
    ctx.fillStyle='#3b4b4c';
    for(const b of [...MAP.buildings,...lanternBuildings]) ctx.fillRect(sx(b.x-b.w/2),sy(b.z-b.d/2),b.w*scale,b.d*scale);
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
  for(const path of [MAP.trail,MAP.northTrail,churchPath]){
    ctx.beginPath();path.forEach(([x,z],i)=>i?ctx.lineTo(sx(x),sy(z)):ctx.moveTo(sx(x),sy(z)));ctx.stroke();
  }
  }
  if(!CITY){
    ctx.fillStyle='#f2dfc2';ctx.font='bold 11px sans-serif';ctx.textAlign='center';
    ctx.fillText('Church',sx(church.x),sy(church.z));
  }
  ctx.fillStyle = '#e8bb71'; ctx.fillRect(sx(MAP.lookout.x)-4,sy(MAP.lookout.z)-4,8,8);
  for (const piece of BREAKABLES) {
    if (world.hp[piece.id] === 0) continue;
    ctx.fillStyle = '#acdbcf'; ctx.fillRect(sx(piece.x)-2,sy(piece.z)-2,4,4);
  }
  const heli = world.heli;
  ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffae60'; ctx.fillText('H', sx(heli.x), sy(heli.z) - 4);
  if(world.jet){ctx.fillStyle='#9de3ff';ctx.fillText('J',sx(world.jet.x),sy(world.jet.z)-4);}
  ctx.fillStyle = '#ffe085'; ctx.fillText('R',sx(world.rover.x),sy(world.rover.z)-4);
  if(world.supercar){ctx.fillStyle='#ff9651';ctx.fillText('GT',sx(world.supercar.x),sy(world.supercar.z)-4);}
  for(const b of world.boats??[]){
    ctx.fillStyle=b.wrecked?'#7b8181':'#eff3df';ctx.fillText('B',sx(b.x),sy(b.z));
  }
  if(world.yacht){ctx.fillStyle='#f5dba7';ctx.fillText('Y',sx(world.yacht.x),sy(world.yacht.z)-4);}
  if(world.match)drawMatchMap(ctx,sx,sy,world.match,vitals.team);
  else drawSupplyMap(ctx,sx,sy,world,player,id);
  for (const remote of remotes) {
    ctx.fillStyle = teamColors[remote.team] ?? '#b3e6ec'; ctx.beginPath(); ctx.arc(sx(remote.x),sy(remote.z),5,0,Math.PI*2); ctx.fill();
  }
  ctx.save(); ctx.translate(sx(player.x),sy(player.z)); ctx.rotate(yaw);
  ctx.fillStyle = '#fcf5ce'; ctx.strokeStyle = '#19291f'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(7,7); ctx.lineTo(0,4); ctx.lineTo(-7,7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}

function frame(time) {
  // On high-refresh displays keep the prototype's visual workload near 60 frames/s.
  if (time+.75 < nextFrame) { requestAnimationFrame(frame); return; }
  const interval=1000/60;
  nextFrame=nextFrame && time-nextFrame<interval ? nextFrame+interval : time+interval;
  const dt = clamp((time - lastTime) / 1000, 0, .14);
  lastTime = time;
  if (edgeYaw || edgePitch) {
    if (!windowBlurred && !document.hidden && canvas.matches(':hover')) {
      camera.yaw += edgeYaw * dt;
      camera.pitch = viewPitch(camera.pitch + edgePitch * dt);
    } else {
      stopLook();
    }
  }
  accumulator += dt;
  while (accumulator >= step) { tick(); accumulator -= step; }
  if (self) {
    const t = accumulator / step;
    const free=!vitals.dead && !vitals.fall && !self.climb && !isPilot() && !isDriving() && !gunnerRole() && !frozenPhase(world.match?.phase);
    const motion=free ? movementInput() : null;
    const display=free ? stepPlayer(self,{...motion,jump:queuedJump,yaw:facing,stance:requestedStance,deploy:queuedDeploy},accumulator,world.hp,world) : self;
    const local = { ...display, team:vitals.team, lostParts:vitals.lostParts, hp: vitals.hp, maxHp: vitals.maxHp, dead: vitals.dead, protected: vitals.protected, id, yaw: self.fall ? self.yaw : facing,
      moving:motion?.moving??moving, sprint:motion?.sprint??sprint };
    const traffic={...remoteFrame(time)};
    if(predictedDriver){
      const kind=predictedDriver.kind, pose=predictedDriver.pose(t);
      if(kind==='boat')traffic.boats=world.boats.map(b=>b.driver===id ? {...b,...pose} : traffic.boats.find(v=>v.id===b.id)??b);
      else if(predictedDriver.vehicleId){
        traffic.traffic=world.traffic.map(v=>v.id===predictedDriver.vehicleId?{...v,...pose}:traffic.traffic?.find(c=>c.id===v.id)??v);
      }else traffic[kind]={...world[kind],...pose};
    }
    const {players:remotes,npcs,heli,rover,supercar,yacht:sampledYacht,boats:sampledBoats=[],jet:remoteFrameJet}=traffic;
    const yacht=world.yacht?.driver!==sampledYacht?.driver || world.yacht?.gunner!==sampledYacht?.gunner ? world.yacht : sampledYacht;
    const shownJet=remoteFrameJet?.pilot===world.jet?.pilot ? remoteFrameJet : world.jet;
    const aircraft=jetPilot()?shownJet:heli;
    const assigned=myBoat();
    const boats=localBoatFrame(sampledBoats,assigned,id);
    const boat=assigned && boats.find(b=>b.id===assigned.id);
    const cars=traffic.traffic??[];
    const road=myRoad()?.model ? cars.find(c=>c.driver===id)??myRoad() : inGT() ? supercar : rover;
    local.weapon = weapon;
    if (isPilot()) Object.assign(local, { x: aircraft.x, y: aircraft.y, z: aircraft.z, yaw: aircraft.yaw });
    if(boat?.driver===id)Object.assign(local,helmFeet(boat),{yaw:boat.yaw});
    else if (atYachtHelm() && yacht)Object.assign(local,yachtHelmFeet(yacht),{yaw:yacht.yaw});
    else if (isDriving()) Object.assign(local, { x: road.x, y: road.y, z: road.z, yaw: road.yaw });
    if(yacht && !atYachtHelm() && !isPilot() && aboardYacht(world.yacht,local))Object.assign(local,carryOnYacht(world.yacht,yacht,local));
    const role=gunnerRole();
    if(role) Object.assign(local,gunnerFeet(role==='superyacht'?yacht:boat??(role==='rover' ? rover : heli),role));
    const view = jetPilot() ? {...camera,yaw:aircraft.yaw,pitch:aircraft.pitch} : isDriving() ? drivingView(atYachtHelm() ? yacht??world.yacht : boat??road, dt) : camera;
    audio.trafficEngines(local,view.yaw,cars);
    audio.engines(local,view.yaw,heli,rover,boats,world.heli.chainFiring && world.heli.gunner!=null && !world.heli.wrecked,supercar);
    audio.yachtEngine(local,view.yaw,yacht);
    audio.jetEngine(local,view.yaw,shownJet,dt);
    scene.render(local, remotes, view, dt, { ...world, traffic:cars, jet:shownJet, heli, rover, supercar, boats, yacht, npcs, bullets:roundFrame(time) });
    if (time >= nextHud) {
      nextHud = time + 80;
      const direction = (Math.round(view.yaw / (Math.PI / 4)) % 8 + 8) % 8;
      byId('bearing').textContent = headings[direction];
      byId('degrees').textContent=String((Math.round(view.yaw*180/Math.PI)%360+360)%360).padStart(3,'0')+'°';
      byId('left-bearing').textContent = headings[(direction + 7) % 8];
      byId('right-bearing').textContent = headings[(direction + 1) % 8];
      const interior=CITY && (storefrontRoom(local.x,local.y,local.z) || retailRoom(local.x,local.y,local.z) || galleryRoomAt(local.x,local.y,local.z) || (casaRoomAt(local.x,local.y,local.z) && {name:'Casa de Luma'}));
      byId('location').textContent = (atYachtHelm() || aboardYacht(yacht,local)) ? 'Solana · Superyacht' : interior ? interior.name : CITY && inPalazzoMare(local.x,local.y,local.z) ? 'Palazzo Mare' : CITY ? (lanternLocation(local.x,local.z) ?? (onBeach(local.x,local.z) ? 'Harbor Key Beach' : local.z<harbor.south ? 'Harbor Key' : local.z<coast.north ? 'North Causeway' : local.x>24 || local.z < -48 ? 'Biscayne Bayfront' : 'Brickell Avenue')) : Math.hypot(local.x - MAP.lookout.x, local.z - MAP.lookout.z) < 6 ? 'The Lookout'
        : Math.abs(local.z) < 5.2 ? (Math.abs(local.x) < 2.5 ? 'Timber Bridge' : 'Cedar Creek')
        : churchLot(local.x,local.z) ? 'North Meadow Church' : local.z< -68 ? 'Granite Ridge' : local.z< -37 ? 'North Meadow' : local.z < -5 ? 'Summit Trail' : Math.hypot(local.x,local.z - 15) < 6 ? 'Trailhead' : 'Pine Loop';
      updateEquipment(local);
      if(world.match)updateMatchHud(world.match,vitals.team,local);
      else updateSupplyHud(world,local,id);
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
