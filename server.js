import {bridges} from './public/brickell-map.js';
import {raisedRoadAt} from './public/bridge-driving.js';
import {stepDrawbridges,bridgeMiddle,leafGeometry,leafLength} from './public/drawbridges.js';
import {interactYacht,stepYacht} from './public/superyacht.js';
import {stepFurniture} from './public/shop-furniture.js';
import {stepHotelDoors} from './public/maravela-hotel.js';
import {stepRetailDoors} from './public/frontage-glass.js';
import {stepStorefrontDoors} from './public/storefront-layout.js';
import {sampleRanger} from './public/ragdoll.js';
import {nearBoat,crewBoat,interactBoat,stepBoat,helmFeet} from './public/patrol-boats.js';
import {selectSeat} from './public/seat-selection.js';
import { fork } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat, readdir, readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';
import { CITY, MAP, groundHeight, spawn, stepPlayer } from './public/world.js';
import { reportVehicleWreck, newExpedition, parkedHelicopter, fly, interact, fire, advanceRounds, launchMissile, advanceMissiles, fireTurret } from './public/expedition.js';

import { gunnerVehicle, gunnerFeet, vehicleById, turretPitch } from './public/mounts.js';
import { parkedRover, nearestVehicle, driveRover, interactRover, recoverRover, drivenRoad } from './public/rover.js';
import { stepSuspension } from './public/road-suspension.js';
import { updateSupplyRun, replaySupplyRun } from './public/supply-run.js';
import { recoverHelicopter } from './public/airframe.js';
import { newLife, healthView, damageActor, respawnDue, newRivals, updateRival, rivalView, vehicleContacts } from './public/rivals.js';

import { advanceFall } from './public/falls.js';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, 'public');
// A reconnect can span a local Docker rebuild. Fingerprint the client and its
// assets once so an existing tab can recognize a different scene.
async function clientBuild(){
  const hash=createHash('sha256');
  const names=(await readdir(publicDir,{withFileTypes:true})).filter(f=>f.isFile()).map(f=>f.name).sort();
  for(const name of names)hash.update(name).update('\0').update(await readFile(join(publicDir,name)));
  hash.update(await readFile(join(root,'package-lock.json')));
  return hash.digest('hex').slice(0,20);
}
const build=await clientBuild();
const threeBuild = join(root, 'node_modules/three/build');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || '4173');
const capacity = 16;
const step = 1 / 30;
const players = new Map();
const departedScores=new Map();
let world = newExpedition();
let npcs = newRivals();
function worldView() {
  const bullets=CITY ? world.bullets.filter(r=>!r.hidden).map(r=>{
    if(r.source!=='heli')return r;
    const {id,weapon,x,y,z,vx,vy,vz,age}=r;
    return {id,weapon,x,y,z,vx,vy,vz,age};
  }) : world.bullets;
  const heli=world.heli;
  const heliView=CITY ? {...heli,chainFiring:!!heli.chainFiring && heli.gunner!=null && !heli.wrecked} : heli;
  return { ...world, bullets, heli:heliView, map: CITY ? 'brickell' : 'outpost', npcs: npcs.map(actor => rivalView(actor, ticks)) };
}
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
// Each district owns its authoritative timers, vehicles, NPCs and players.
let cityWorker;
function accept(request,socket,head) {
  sockets.handleUpgrade(request,socket,head,ws=>sockets.emit('connection',ws));
}
server.on('upgrade', (request, socket, head) => {
  const origin = request.headers.origin;
  const validOrigin = !origin || origin === 'http://' + request.headers.host ||
    origin === 'https://' + request.headers.host;
  if ((!['/world','/world?map=brickell'].includes(request.url)) || !validOrigin) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  if(request.url === '/world') return accept(request,socket,head);
  if(!cityWorker?.connected) {
    cityWorker=fork(fileURLToPath(import.meta.url),[],{env:{...process.env,PINEWATCH_MAP:'brickell'}});
    cityWorker.on('error',err=>console.error('City session:',err.message));
  }
  socket.pause();
  cityWorker.send({headers:request.headers,method:request.method,url:request.url,head:head.toString('base64')},socket,err=>{
    if(err) socket.destroy();
  });
});

function playerState(player) {
  return { ...player.state, id: player.id, yaw: player.yaw, moving: player.moving,
    sprint: player.sprint, score:player.score, ack: player.ack, weapon: player.weapon, ...healthView(player, ticks) };
}

function publish() {
  if (!players.size) return;
  const message = JSON.stringify({ type: 'snapshot', players: [...players.values()].map(playerState), world: worldView() });
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
  if(input?.type==='resumeScore' && !player.lastSeq && departedScores.has(input.key)){
    player.score=departedScores.get(input.key);departedScores.delete(input.key);return;
  }
  if (input?.type !== 'input' || !Number.isSafeInteger(input.seq) ||
      input.seq <= player.lastSeq || !Number.isFinite(input.x) ||
      !Number.isFinite(input.z) || !Number.isFinite(input.yaw)) return;
  const scale = Math.max(1, Math.hypot(input.x, input.z));
  player.lastSeq = input.seq;
  // Limit latency after a stalled connection. Input never controls simulation time.
  if (player.inputs.length >= 8) player.inputs.shift();
  player.inputs.push({
    replaySupply: input.replaySupply === true, deploy: input.deploy === true,
    stance: ['crouch', 'prone', 'stand'].includes(input.stance) ? input.stance : undefined,
    seq: input.seq, x: input.x / scale, z: input.z / scale,
    yaw: input.yaw % (Math.PI * 2), sprint: input.sprint === true, jump: input.jump === true,
    aimYaw: Number.isFinite(input.aimYaw) ? input.aimYaw % (Math.PI * 2) : input.yaw % (Math.PI * 2),
    aimPitch: Number.isFinite(input.aimPitch) ? Math.max(-Math.PI/2, Math.min(Math.PI/2, input.aimPitch)) : 0,
    weapon: [1,2,3].includes(input.weapon) ? input.weapon : null,
    seat: input.seat===1 || input.seat===2 ? input.seat : null,
    seatKind: typeof input.seatKind==='string' && !!vehicleById(world,input.seatKind) ? input.seatKind : null,
    fire: input.fire === true, interact: input.interact === true,
    throttle: Number.isFinite(input.throttle) ? Math.max(-1,Math.min(1,input.throttle)) : 0,
    steer: Number.isFinite(input.steer) ? Math.max(-1,Math.min(1,input.steer)) : 0,
    lift: input.lift === 1 || input.lift === -1 ? input.lift : 0,
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
    id, ws, score:{kills:0,deaths:0}, scoreKey:randomUUID(), life: newLife(ticks), state: { ...spawn(id - 1), grounded: true, vy: 0 },
    yaw: 0, moving: false, sprint: false, weapon: 1, fireReady: 0, inputs: [], ack: 0, lastSeq: 0, alive: true,
  };
  players.set(id, player);
  ws.on('message', (data, binary) => acceptInput(player, data, binary));
  ws.on('pong', () => { player.alive = true; });
  ws.on('close', () => {
    players.delete(id);
    if(world.yacht?.driver===id){world.yacht.driver=null;world.yacht.throttle=0;}
    if(!players.size)departedScores.clear();
    else if(player.score.kills || player.score.deaths || world.bullets.some(r=>r.shooter===id) || world.missiles.some(m=>m.shooter===id)){
      departedScores.set(player.scoreKey,player.score);
    }
    if (!players.size) {
      world = newExpedition();
      npcs = newRivals();
    }
    else if(world.heli.onYacht && world.heli.grounded && world.heli.pilot===id)world.heli.pilot=null;
    else if (world.heli.pilot === id) {
      const gunner=players.get(world.heli.gunner);
      if (gunner) interact(world,gunner);
      world.heli=Object.assign(parkedHelicopter(),{hp:world.heli.hp,cargo:world.heli.cargo});
    } else if (world.rover.driver === id) {
      const gunner=players.get(world.rover.gunner);
      if(gunner) interactRover(world,gunner);
      world.rover={...parkedRover(),hp:world.rover.hp,flatTires:world.rover.flatTires, bodyDamage:world.rover.bodyDamage,cargo:world.rover.cargo};
    } else if (world.supercar?.driver===id) {
      interactRover(world,player,'supercar');
    } else {
      const boat=crewBoat(world,id);
      if(boat?.driver===id){boat.driver=null;boat.throttle=0;}
      const kind=gunnerVehicle(world,id);
      if(kind) vehicleById(world,kind).gunner=null;
    }
    publish();
  });
  ws.send(JSON.stringify({ type: 'welcome', build, scoreKey:player.scoreKey, id, state: playerState(player), world: worldView() }));
  publish();
});

const idle = { x: 0, z: 0, jump: false, sprint: false, lift: 0 };
let ticks = 0;
function tick() {
  stepDrawbridges(world,bridges,step);
  if(CITY && players.size) {
    const pedestrians=[];
    for(const p of players.values()) {
      if(p.life.hp && !drivenRoad(world,p.id) && p.id!==world.heli.pilot && !gunnerVehicle(world,p.id) && !crewBoat(world,p.id))pedestrians.push(p.state);
    }
    stepStorefrontDoors(world.doors,pedestrians,step);
    stepRetailDoors(world.doors,pedestrians,step);
    stepHotelDoors(world.doors,pedestrians,step);
    stepFurniture(world.doors,step);
  }
  if(CITY)world.heli.chainFiring=false;
  const firingGunners=new Set(), boatInputs=new Map();
  let yachtInput;
  recoverHelicopter(world, step, players);
  recoverRover(world, step);
  recoverRover(world,step,'supercar');
  if (players.size) {
    for (const npc of npcs) updateRival(npc, ticks, step, world.hp, world);
  }
  for (const player of players.values()) {
    const input = player.inputs.shift();
    if(world.heli.gunner!==player.id || input?.interact || input?.seat)player.chainFireUntil=0;
    if (input) player.ack = input.seq;
    const fallingBody = advanceFall(player, ticks, step, world.hp, world);
    if (player.life.hp === 0) {
      if(world.yacht?.driver===player.id){world.yacht.driver=null;world.yacht.throttle=0;}
      const role=gunnerVehicle(world,player.id);
      if(role) vehicleById(world,role).gunner=null;
      const boat=crewBoat(world,player.id);
      if(boat?.driver===player.id){boat.driver=null;boat.throttle=0;}
      if (world.rover.driver === player.id) world.rover = {...parkedRover(), hp: world.rover.hp, flatTires:world.rover.flatTires, bodyDamage:world.rover.bodyDamage, cargo: world.rover.cargo};
      if (world.supercar?.driver===player.id) interactRover(world,player,'supercar');
      if (respawnDue(player, ticks)) {
        player.state = spawn(player.id - 1);
        player.life = newLife(ticks);
        player.yaw = 0;
        // Retire all inputs received during defeat. The respawn starts at rest.
        player.ack = player.lastSeq;
        player.inputs.length = 0;
      }
      continue;
    }
    if (fallingBody) continue;
    if (input) {
      if (input.replaySupply) replaySupplyRun(world);
      if (input.weapon) player.weapon = input.weapon;
      if (input.interact && !player.state.climb) {
        const boat=crewBoat(world,player.id);
        if(boat)interactBoat(world,boat,player);
        else if (world.rover.driver === player.id || world.rover.gunner === player.id) interactRover(world, player);
        else if (world.supercar?.driver===player.id) {
          player.supercarInput=null;interactRover(world,player,'supercar');
        }
        else if (world.heli.pilot === player.id || world.heli.gunner === player.id) interact(world, player);
        else if(!interactYacht(world,player)){
          const nearbyBoat=nearBoat(world,player.state),nearby=nearestVehicle(world,player.state);
          if(nearbyBoat)interactBoat(world,nearbyBoat,player);
          else if(nearby==='rover' || nearby==='supercar')interactRover(world,player,nearby);
          else interact(world,player);
        }
      } else if (input.seat && !player.state.climb) selectSeat(world,player,input.seatKind,input.seat);
    }
    const road=drivenRoad(world,player.id);
    if (road) {
      const kind=road.kind??'rover',before={...road};
      let roadInput=input||idle;
      if(kind==='supercar'){
        if(input)player.supercarInput={input,car:road,until:ticks+3};
        else if(player.supercarInput?.car===road && ticks<player.supercarInput.until)roadInput=player.supercarInput.input;
      }
      driveRover(world,roadInput,step,players,kind);
      vehicleContacts(world,kind,before,[...players.values(),...npcs],ticks,step);
      if(road.driver!==player.id)continue;
      if(kind==='rover' && input?.fire)launchMissile(world,kind,player,ticks);
      const {x,y,z,yaw}=road;
      player.state = { x,y,z,vy:0,grounded:true };
      player.yaw = yaw;
      player.moving = player.sprint = false;
      continue;
    }
    if (world.heli.pilot === player.id) {
      const before={...world.heli};
      fly(world, input || { ...idle, aimYaw: world.heli.yaw }, step, players);
      vehicleContacts(world,'heli',before,[...players.values(),...npcs],ticks,step);
      if (world.heli.pilot !== player.id) continue;
      if (input?.fire) launchMissile(world,'heli',player,ticks);
      const { x, y, z, yaw, grounded } = world.heli;
      player.state = { x, y, z, vy: 0, grounded };
      player.yaw = yaw;
      player.moving = false;
      player.sprint = false;
      continue;
    }
    if(world.yacht?.driver===player.id){yachtInput=input;continue;}
    const boat=crewBoat(world,player.id);
    if(boat?.driver===player.id){boatInputs.set(boat.id,input);continue;}
    const kind=gunnerVehicle(world,player.id);
    if (kind) {
      if(input && !input.interact && !input.seat) {
        const vehicle=vehicleById(world,kind);
        vehicle.turretYaw=input.aimYaw;vehicle.turretPitch=turretPitch(input.aimPitch);
        if(CITY && kind==='heli')player.chainFireUntil=input.fire ? ticks+4 : 0;
        if(input.fire) firingGunners.add(player.id);
      }
      // Bridge ordinary packet jitter, and release a stalled client's trigger.
      if(CITY && kind==='heli' && ticks<player.chainFireUntil)firingGunners.add(player.id);
      continue;
    }
    const falling = player.state;
    player.state = stepPlayer(falling, input || idle, step, world.hp, world);
    if(player.state.climb || falling.climb){
      player.yaw=(player.state.climb || falling.climb).yaw;
      player.moving=player.sprint=false;
      continue;
    }
    if (falling.parachute === 'packed' && player.state.grounded && !(input?.deploy && !input.interact)) {
      const impact = Math.max(0, Math.round((-falling.vy - 7) * 10));
      if (impact && damageActor(player, impact, ticks)) continue;
    }
    player.moving = Boolean(input && Math.hypot(input.x, input.z) > 0.01);
    player.sprint = player.moving && !player.state.swimming && !player.state.stance && input.sprint;
    if (input) {
      player.yaw = input.fire ? input.aimYaw : input.yaw;
      if (input.fire) fire(world, player, input, ticks, players, npcs);
    }
  }
  stepYacht(world,yachtInput,step,players);
  for(const kind of ['rover','supercar']){
    const road=world[kind];if(!road)continue;
    if(road.driver==null && road.bridgeFlight)driveRover(world,idle,step,players,kind);
    const raised=raisedRoadAt(world,road.x,road.z);
    if(raised && !road.bridgeFlight && !road.wrecked){
      const floor=groundHeight(road.x,road.z,Infinity,world.doors);
      if(floor>MAP.waterY)road.y=floor;
      else road.bridgeFlight={vx:0,vz:0,vy:0};
    }
    if(road.bridgeFlight){
      const f=road.bridgeFlight;
      const pitch=Math.atan2(f.vy,Math.max(1,Math.hypot(f.vx,f.vz)));
      road.suspension={pitch:Math.max(-.55,Math.min(.55,pitch)),roll:0,heave:0,wheels:[0,0,0,0]};
    }else if(kind==='rover' || raised){
      const leaf=raised && leafGeometry(raised,world.doors.bridgeLifts[raised.north]);
      stepSuspension(road,step,(x,z)=>{
        const ground=groundHeight(x,z,Infinity,world.doors);
        // Until takeoff, an unsupported axle follows the end of its ramp.
        if(leaf && ground<=MAP.waterY && Math.abs(z-bridgeMiddle(raised))<leafLength)
          return leaf.base+leaf.vertical;
        return ground;
      });
    }
    else delete road.suspension;
  }
  for(const b of world.boats){
    stepBoat(world,b,boatInputs.get(b.id),step,players);
    const driver=players.get(b.driver);
    if(driver){driver.state={...helmFeet(b),vy:0,grounded:true};driver.yaw=b.yaw;driver.moving=driver.sprint=false;}
  }
  for(const kind of ['rover','heli',...world.boats.map(b=>b.id)]) {
    const v=vehicleById(world,kind), gunner=players.get(v.gunner);
    if(!gunner || !gunner.life.hp) continue;
    gunner.state={...gunnerFeet(v,kind),grounded:kind!=='heli' || v.grounded,vy:0};
    gunner.yaw=v.turretYaw;gunner.moving=gunner.sprint=false;
    if(firingGunners.has(gunner.id)) fireTurret(world,kind,gunner,ticks,players,npcs);
  }
  if(players.size) {
    for(const player of players.values())sampleRanger(player,step,world);
    for(const npc of npcs)sampleRanger(npc,step,world);
  }
  advanceRounds(world,players,npcs,ticks);
  advanceMissiles(world,players,npcs,ticks);
  updateSupplyRun(world, step);
  if(world.yacht)reportVehicleWreck(world,world.yacht,world.yacht.id,'water',ticks);
  for(const boat of world.boats)reportVehicleWreck(world,boat,boat.id,'water',ticks);
  reportVehicleWreck(world,world.rover,'rover','road',ticks);
  if(world.supercar)reportVehicleWreck(world,world.supercar,'supercar','road',ticks);
  while (world.shots.length && ticks - world.shots[0].tick > 7) world.shots.shift();
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

if(CITY && process.send) {
  process.on('message',(request,socket)=>{
    if(!socket) return;
    accept(request,socket,Buffer.from(request.head,'base64'));
    socket.resume();
  });
  process.on('disconnect',()=>process.exit(0));
} else server.listen(port, host, () => {
  console.log(`Shared world listening at http://${host}:${server.address().port}/`);
});
