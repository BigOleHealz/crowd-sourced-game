import {nextUse} from './public/use-target.js';
import {expireShots} from './public/shot-events.js';
import {serviceRoadCar} from './public/road-garages.js';
import {localWorldReactions,soundRoadHorn} from './public/pedestrian-reactions.js';
import {stepHydrants} from './public/hydrants.js';
import {stepCargoHook} from './public/cargo-hook.js';
import {finishTrafficDelivery} from './public/city-traffic.js';
import {stepWakeCrossings} from './public/boat-wakes.js';
import {stepRoadBoarding} from './public/road-cabin.js';
import {stepPatrolCruisers} from './public/patrol-cruisers.js';
import {createWanted} from './public/wanted.js';
import {newCityTraffic,syncTrafficDrivers,stepCityTraffic,trafficDriverCar,tryTrafficInteract,driveTrafficCar,leaveTraffic} from './public/city-traffic.js';
import {createMarinaSprint,sprintStart,sprintGates} from './public/marina-sprint.js';
import {roadContact} from './public/road-contact.js';
import {stepStructuralFalls} from './public/structural-collapse.js';
import {leaveTank,stepTank} from './public/tank.js';
import {stepJet,leaveJet} from './public/jet.js';
import {lockStatus} from './public/handheld-launcher.js';
import {assignTeam,createMatch,propertyTeam,teamSpawn} from './island-match.js';
import {frozenPhase,maxTeam,modes} from './public/island-rules.js';
import {bridges} from './public/brickell-map.js';
import {raisedRoadAt} from './public/bridge-driving.js';
import {stepDrawbridges,bridgeMiddle,leafGeometry,leafLength} from './public/drawbridges.js';
import {interactYacht,stepYacht} from './public/superyacht.js';
import {stepFurniture} from './public/shop-furniture.js';
import {stepHotelDoors} from './public/maravela-hotel.js';
import {stepRetailDoors} from './public/frontage-glass.js';
import {stepStorefrontDoors} from './public/storefront-layout.js';
import {sampleRanger} from './public/ragdoll.js';
import {crewBoat,interactBoat,stepBoat,helmFeet} from './public/patrol-boats.js';
import {selectSeat} from './public/seat-selection.js';
import { fork } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat, readdir, readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { WebSocket, WebSocketServer } from 'ws';
import { CITY, MAP, groundHeight, spawn, stepPlayer, stanceBodyHeight } from './public/world.js';
import { reportVehicleWreck, newExpedition, parkedHelicopter, fly, interact, fire, trackLauncher, advanceRounds, fireTank, dropJetBomb, launchMissile, advanceMissiles, fireTurret } from './public/expedition.js';

import { gunnerVehicle, gunnerFeet, vehicleById, turretPitch } from './public/mounts.js';
import { stopRover, parkedRover, driveRover, interactRover, recoverRover, drivenRoad } from './public/rover.js';
import { stepSuspension } from './public/road-suspension.js';
import { updateSupplyRun, replaySupplyRun } from './public/supply-run.js';
import { flightState, recoverHelicopter } from './public/airframe.js';
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
const mode = CITY && Object.hasOwn(modes,process.env.PINEWATCH_MODE) ? process.env.PINEWATCH_MODE : null;
const marina=CITY && !mode ? createMarinaSprint() : null;
const capacity = mode ? maxTeam*2 : 16;
const step = 1 / 30;
const players = new Map();
const departedScores=new Map();
let match;
function freshWorld(){
  const w=newExpedition();
  w.traffic=newCityTraffic();
  if(!mode)Object.defineProperty(w,'wanted',{value:createWanted(w,players,{stepCruisers:stepPatrolCruisers})});
  if(mode){
    match=createMatch(mode);
    w.match=match.state;
    Object.defineProperty(w,'rules',{value:match});
  }
  return w;
}
let world = freshWorld();
function freshResidents(){
  const residents=newRivals();
  syncTrafficDrivers(world,residents);
  return residents;
}
let npcs = freshResidents();
function worldView() {
  const bullets=CITY ? world.bullets.filter(r=>!r.hidden).map(r=>{
    if(r.source!=='heli' && r.source!=='jet')return r;
    const {id,weapon,x,y,z,vx,vy,vz,age}=r;
    return {id,weapon,x,y,z,vx,vy,vz,age};
  }) : world.bullets;
  const heli=world.heli;
  const heliView=CITY ? {...heli,chainFiring:!!heli.chainFiring && heli.gunner!=null && !heli.wrecked} : heli;
  return { ...world, bullets, heli:heli.pilot==null ? heliView : {...heliView,motion:flightState(heli)}, map: CITY ? 'brickell' : 'outpost', npcs: npcs.map(actor => rivalView(actor, ticks)) };
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
// World snapshots repeat vehicles, NPC state and field names at 15 Hz. Keep
// the outbound compression dictionary across frames. Tiny player inputs
// don't benefit from retaining their own per-connection dictionary.
const sockets = new WebSocketServer({
  noServer: true, maxPayload: 1024,
  perMessageDeflate: { clientNoContextTakeover: true, zlibDeflateOptions: { level: 1 } },
});
// Each district owns its authoritative timers, vehicles, NPCs and players.
const cityWorkers = new Map();
const cityRoutes=new Map([['/world?map=brickell',''],...Object.keys(modes).map(key=>['/world?map=brickell&mode='+key,key])]);
function accept(request,socket,head) {
  sockets.handleUpgrade(request,socket,head,ws=>sockets.emit('connection',ws));
}
server.on('upgrade', (request, socket, head) => {
  const origin = request.headers.origin;
  const validOrigin = !origin || origin === 'http://' + request.headers.host ||
    origin === 'https://' + request.headers.host;
  const district = cityRoutes.get(request.url);
  if ((request.url!=='/world' && district===undefined) || !validOrigin) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  if(request.url === '/world') return accept(request,socket,head);
  let cityWorker=cityWorkers.get(request.url);
  if(!cityWorker?.connected) {
    cityWorker=fork(fileURLToPath(import.meta.url),[],{env:{...process.env,PINEWATCH_MAP:'brickell',PINEWATCH_MODE:district}});
    cityWorkers.set(request.url,cityWorker);
    cityWorker.on('error',err=>console.error('City session:',err.message));
  }
  socket.pause();
  cityWorker.send({headers:request.headers,method:request.method,url:request.url,head:head.toString('base64')},socket,err=>{
    if(err) socket.destroy();
  });
});

function playerState(player) {
  const lock=lockStatus(player,ticks);
  return { ...player.state,...(world.wanted && {wanted:world.wanted.view(player,ticks)}),use:player.life.hp && !player.life.fall && !frozenPhase(world.match?.phase) && world.match?.phase!=='setup' ? nextUse(world,player.state,player.id) : null,...(marina && {race:marina.state(player)}),...(lock && {launcherLock:lock}), team:player.team, id: player.id, yaw: player.yaw, moving: player.moving,
    sprint: player.sprint, score:player.score, ack: player.ack, weapon: player.weapon, ...healthView(player, ticks) };
}

function publish() {
  if (!players.size) return;
  const message = JSON.stringify({ type: 'snapshot', simTick:ticks, players: [...players.values()].map(playerState), world: worldView() });
  let packed;
  for (const { ws, packedSnapshots } of players.values()) {
    if (ws.readyState !== WebSocket.OPEN || ws.bufferedAmount >= 64 * 1024) continue;
    if (packedSnapshots) {
      packed ??= deflateSync(message, {level: 1});
      ws.send(packed, {compress: false});
    } else ws.send(message);
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
  if(input?.type==='wantedMode'){
    if(typeof input.enabled==='boolean')world.wanted?.set(player,input.enabled);
    return;
  }
  if (input?.type === 'snapshotEncoding' && input.encoding === 'deflate') {
    player.packedSnapshots = true;
    return;
  }
  if(input?.type==='marinaSprint' && marina){
    const car=drivenRoad(world,player.id);
    if(!car || car.wrecked || !player.life.hp)return;
    const run=marina.run(player);
    if(run?.phase==='finished' && run.car===car && Math.hypot(car.x-sprintGates.at(-1).x,car.z-sprintGates.at(-1).z)<18){
      if(car.gunner!=null || car.cargo || car.bridgeFlight){
        run.message='Park and unload passengers or cargo to retry.';return;
      }
      const actors=[...players.values(),...npcs].filter(p=>p!==player);
      const gridZ=[sprintStart.z-3.8,sprintStart.z+3.8,sprintStart.z].find(z=>
        !actors.some(p=>Math.hypot(p.state.x-sprintStart.x,p.state.z-z)<3.7) &&
        !roadContact(world,sprintStart.x,z,0,sprintStart.x,z,car));
      if(gridZ===undefined){
        run.message='Start grid occupied · press T to try again.';return;
      }
      Object.assign(car,{x:sprintStart.x,z:gridZ,y:groundHeight(sprintStart.x,gridZ),yaw:0});
      stopRover(car);player.supercarInput=null;
    }
    marina.start(player,car,performance.now());
    return;
  }
  if (input?.type === 'unstuck') {
    if (player.life.hp && !(match && frozenPhase(world.match.phase))) player.unstuck = true;
    return;
  }
  if(!mode && input?.type==='resumeScore' && !player.lastSeq && departedScores.has(input.key)){
    player.score=departedScores.get(input.key);departedScores.delete(input.key);return;
  }
  if (input?.type !== 'input' || !Number.isSafeInteger(input.seq) ||
      input.seq <= player.lastSeq || !Number.isFinite(input.x) ||
      !Number.isFinite(input.z) || !Number.isFinite(input.yaw)) return;
  if(match && frozenPhase(world.match.phase)){
    player.ack=player.lastSeq=input.seq;
    return;
  }
  const scale = Math.max(1, Math.hypot(input.x, input.z));
  player.lastSeq = input.seq;
  // Limit latency after a stalled connection. Input never controls simulation time.
  if (player.inputs.length >= 8) player.inputs.shift();
  player.inputs.push({
    handleCase:input.handleCase===true, replaySupply: input.replaySupply === true, deploy: input.deploy === true,
    stance: ['crouch', 'prone', 'stand'].includes(input.stance) ? input.stance : undefined,
    seq: input.seq, x: input.x / scale, z: input.z / scale,
    yaw: input.yaw % (Math.PI * 2), sprint: input.sprint === true, jump: input.jump === true,
    aimYaw: Number.isFinite(input.aimYaw) ? input.aimYaw % (Math.PI * 2) : input.yaw % (Math.PI * 2),
    aimPitch: Number.isFinite(input.aimPitch) ? Math.max(-Math.PI/2, Math.min(Math.PI/2, input.aimPitch)) : 0,
    tracking:input.tracking===true, weapon: [1,2,3,4].includes(input.weapon) ? input.weapon : null,
    seat: input.seat===1 || input.seat===2 ? input.seat : null,
    seatKind: typeof input.seatKind==='string' && !!vehicleById(world,input.seatKind) ? input.seatKind : null,
    useTarget:typeof input.useTarget==='string'?input.useTarget.slice(0,64):undefined,
    useRole:typeof input.useRole==='string'?input.useRole.slice(0,12):undefined,
    lowerHook:input.lowerHook===true,releaseHook:input.releaseHook===true,
    horn:input.horn===true, bomb:input.bomb===true, missile:input.missile===true, fire: input.fire === true, interact: input.interact === true,
    throttle: Number.isFinite(input.throttle) ? Math.max(-1,Math.min(1,input.throttle)) : 0,
    steer: Number.isFinite(input.steer) ? Math.max(-1,Math.min(1,input.steer)) : 0,
    jetPitch: Number.isFinite(input.jetPitch) ? Math.max(-1,Math.min(1,input.jetPitch)) : undefined,
    lift: input.lift === 1 || input.lift === -1 ? input.lift : 0,
  });
}

// Keep the competitive simulation parked while the lone player practices.
let parkedRound;
function updateRoom() {
  match?.updateRoster(players);
  if(mode!=='total-loss')return;
  if(!players.size){parkedRound=null;return;}
  if(parkedRound && players.size>1){
    const saved=parkedRound;
    parkedRound=null;
    world=saved.world;match=world.rules;npcs=saved.npcs;ticks=saved.tick;
    for(const p of players.values()){
      if(p.id===saved.player.id){
        saved.player.ack=saved.player.lastSeq=p.lastSeq;
        saved.player.packedSnapshots=p.packedSnapshots;
        saved.player.alive=p.alive;
        players.set(p.id,saved.player);
      }else p.life=newLife(ticks);
    }
    match.updateRoster(players);
  }else if(!parkedRound && players.size===1 && ['waiting','paused'].includes(match.state.phase)){
    const [p]=players.values();
    p.inputs.length=0;p.ack=p.lastSeq;p.moving=p.sprint=false;
    parkedRound={world,npcs,tick:ticks,player:p};
    world=freshWorld();npcs=freshResidents();
    players.set(p.id,{id:p.id,ws:p.ws,team:p.team,slot:p.slot,scoreKey:p.scoreKey,
      alive:p.alive,packedSnapshots:p.packedSnapshots,lastSeq:p.lastSeq,ack:p.lastSeq,inputs:[],
      state:teamSpawn(p.team,p.slot),life:newLife(ticks),score:{kills:0,deaths:0,team:p.team},
      yaw:0,moving:false,sprint:false,weapon:4,fireReady:0});
    match.updateRoster(players);
    match.state.phase='practice';
  }
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
    yaw: 0, moving: false, sprint: false, weapon: 4, fireReady: 0, inputs: [], ack: 0, lastSeq: 0, alive: true,
  };
  if(match){
    Object.assign(player,assignTeam(players));
    player.state=teamSpawn(player.team,player.slot);
    player.score.team=player.team;
  }
  players.set(id, player);
  updateRoom();
  ws.on('message', (data, binary) => acceptInput(players.get(id), data, binary));
  ws.on('pong', () => { players.get(id).alive = true; });
  ws.on('close', () => {
    const player=players.get(id);
    match?.release(player);
    world.wanted?.set(player,false);
    if(drivenRoad(world,id)?.model)leaveTraffic(world,player);
    players.delete(id);
    match?.updateRoster(players);
    if(match && frozenPhase(world.match.phase)){
      for(const p of players.values()){p.inputs.length=0;p.ack=p.lastSeq;p.moving=p.sprint=false;}
    }
    if(world.tank?.driver===id)leaveTank(world,player);
    if(world.jet.pilot===id)leaveJet(world.jet);
    if(world.yacht?.driver===id){world.yacht.driver=null;world.yacht.throttle=0;}
    if(!players.size)departedScores.clear();
    else if(player.score.kills || player.score.deaths || world.bullets.some(r=>r.shooter===id) || world.missiles.some(m=>m.shooter===id)){
      departedScores.set(player.scoreKey,player.score);
    }
    if (!players.size) {
      world = freshWorld();
      npcs = freshResidents();
    }
    else if(world.heli.onYacht && world.heli.grounded && world.heli.pilot===id)world.heli.pilot=null;
    else if (world.heli.pilot === id) {
      const gunner=players.get(world.heli.gunner);
      if (gunner) interact(world,gunner);
      world.heli=Object.assign(parkedHelicopter(),{hp:world.heli.hp,cargo:world.heli.cargo});
    } else if (world.rover.driver === id) {
      const gunner=players.get(world.rover.gunner);
      if(gunner) interactRover(world,gunner);
      world.rover={...parkedRover(),hp:world.rover.hp,flatTires:world.rover.flatTires, bodyDamage:world.rover.bodyDamage,fittingDamage:world.rover.fittingDamage,cargo:world.rover.cargo};
    } else if (world.supercar?.driver===id) {
      interactRover(world,player,'supercar');
    } else {
      const boat=crewBoat(world,id);
      if(boat?.driver===id){boat.driver=null;boat.throttle=0;}
      const kind=gunnerVehicle(world,id);
      if(kind) vehicleById(world,kind).gunner=null;
    }
    updateRoom();
    publish();
  });
  ws.send(JSON.stringify({ type: 'welcome', build, ...(marina && {raceBoard:marina.board()}), scoreKey:player.scoreKey, id, state: playerState(players.get(id)), world: worldView() }));
  publish();
});

const idle = { x: 0, z: 0, jump: false, sprint: false, lift: 0 };
let ticks = 0, lobbyTicks = 0;
function resetRound(){
  world=freshWorld();
  npcs=freshResidents();
  departedScores.clear();
  for(const player of players.values()){
    player.state=teamSpawn(player.team,player.slot);
    player.life=newLife(ticks);
    player.score={kills:0,deaths:0,team:player.team};
    player.inputs.length=0;
    player.ack=player.lastSeq;
    player.yaw=0;player.weapon=4;player.launcherLock=null;player.moving=player.sprint=false;
    player.unstuck=false;player.supercarInput=null;player.chainFireUntil=0;
  }
  updateRoom();
}
function tick() {
  if(match && !players.size)return;
  if(match && frozenPhase(world.match.phase)){
    if(world.match.phase==='finished' && match.step(players))resetRound();
    if(++lobbyTicks%2===0)publish();
    return;
  }
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
  world.jet.chainFiring=false;
  if(world.jet.pilot==null)stepJet(world,null,step,players);
  if(CITY)world.heli.chainFiring=false;
  const firingGunners=new Set(), boatInputs=new Map();
  let yachtInput,hookInput;
  if(world.tank?.wrecked)stepTank(world,null,step);
  recoverHelicopter(world, step, players);
  recoverRover(world, step);
  recoverRover(world,step,'supercar');
  if (players.size) {
    stepRoadBoarding(world.rover,step);stepRoadBoarding(world.supercar,step);
    for(const car of world.traffic)stepRoadBoarding(car,step);
    stepCityTraffic(world,players,npcs,step);
    for (const npc of npcs) if(!npc.officer && !trafficDriverCar(world,npc.id))updateRival(npc, ticks, step, world.hp, world);
  }
  for (const player of players.values()) {
    const input = player.inputs.shift();
    if((world.heli.gunner!==player.id && world.yacht?.gunner!==player.id) || input?.interact || input?.seat)player.chainFireUntil=0;
    if (input) player.ack = input.seq;
    if (player.unstuck) {
      player.unstuck = false;
      if (player.life.hp) {
        match?.release(player);
        if (world.heli.pilot === player.id) interact(world,player);
        const road = drivenRoad(world,player.id);
        if(road?.model)leaveTraffic(world,player);
        else if (road) { road.driver = null; stopRover(road); }
        player.life.immuneUntil = ticks;
        damageActor(player,player.life.hp,ticks);
      }
    }
    const fallingBody = advanceFall(player, ticks, step, world.hp, world);
    if (player.life.hp === 0) {
      if(drivenRoad(world,player.id)?.model)leaveTraffic(world,player);
      if(world.tank?.driver===player.id)leaveTank(world,player);
      if(world.jet.pilot===player.id)leaveJet(world.jet);
      if(world.yacht?.driver===player.id){world.yacht.driver=null;world.yacht.throttle=0;}
      const role=gunnerVehicle(world,player.id);
      if(role) vehicleById(world,role).gunner=null;
      const boat=crewBoat(world,player.id);
      if(boat?.driver===player.id){boat.driver=null;boat.throttle=0;}
      if (world.rover.driver === player.id) world.rover = {...parkedRover(), hp: world.rover.hp, flatTires:world.rover.flatTires, bodyDamage:world.rover.bodyDamage, cargo: world.rover.cargo};
      if (world.supercar?.driver===player.id) interactRover(world,player,'supercar');
      if (respawnDue(player, ticks)) {
        player.state = match ? teamSpawn(player.team,player.slot) : spawn(player.id - 1);
        player.life = newLife(ticks);
        player.yaw = 0;
        // Retire all inputs received during defeat. The respawn starts at rest.
        player.ack = player.lastSeq;
        player.inputs.length = 0;
      }
      continue;
    }
    if (fallingBody) continue;
    if(input?.handleCase && world.tank?.driver!==player.id)match?.interact(player);
    if(world.match?.phase==='setup'){
      const next=stepPlayer(player.state,input||idle,step,world.hp,world);
      if(propertyTeam(next.x,next.z)===player.team)player.state=next;
      player.moving=Boolean(input && (input.x || input.z));
      player.sprint=!!input?.sprint;
      if(input)player.yaw=input.yaw;
      continue;
    }
    if (input) {
      if (!match && input.replaySupply) replaySupplyRun(world);
      if (input.weapon) player.weapon = input.weapon;
      if (input.interact && !player.state.climb) {
        const use=nextUse(world,player.state,player.id,input.useTarget);
        // A nearby seat can change hands between the prompt and the keypress.
        // Revalidate its action before applying an E that names that target.
        if(use && (input.useTarget===undefined || (input.useTarget===use.target && input.useRole===use.role))){
          const target=use.target,boat=world.boats.find(b=>b.id===target);
          if(target==='tank'){
            if(use.role==='exit')leaveTank(world,player);
            else {world.tank.driver=player.id;match?.release(player);}
          }else if(target==='jet'){
            if(use.role==='exit')leaveJet(world.jet,player);
            else world.jet.pilot=player.id;
          }else if(target==='heli')interact(world,player);
          else if(target==='superyacht')interactYacht(world,player);
          else if(boat)interactBoat(world,boat,player);
          else if(target==='rover' || target==='supercar'){
            if(target==='supercar')player.supercarInput=null;
            interactRover(world,player,target);
          }else tryTrafficInteract(world,player,npcs);
        }
      } else if (input.seat && !player.state.climb) selectSeat(world,player,input.seatKind,input.seat);
    }
    if(world.tank?.driver===player.id){
      stepTank(world,input,step,players);
      if(input?.fire)fireTank(world,player,ticks);
      const t=world.tank;
      player.state={x:t.x,y:t.y,z:t.z,grounded:true,vy:0};
      player.yaw=t.yaw;player.moving=player.sprint=false;continue;
    }
    if(world.jet.pilot===player.id){
      stepJet(world,input,step,players);
      const jet=world.jet;
      if(jet.pilot!==player.id)continue;
      if(input?.fire)fireTurret(world,'jet',player,ticks,players,npcs);
      if(input?.missile)launchMissile(world,'jet',player,ticks);
      if(input?.bomb)dropJetBomb(world,player,ticks);
      player.state={x:jet.x,y:jet.y,z:jet.z,grounded:jet.grounded,vy:0};
      player.yaw=jet.yaw;player.moving=player.sprint=false;
      continue;
    }
    const road=drivenRoad(world,player.id);
    if (road) {
      if(input?.horn)soundRoadHorn(world,road,npcs,ticks);
      const kind=road.kind??'rover',before={...road};
      let roadInput=input||idle;
      if(kind==='supercar'){
        if(input)player.supercarInput={input,car:road,until:ticks+3};
        else if(player.supercarInput?.car===road && ticks<player.supercarInput.until)roadInput=player.supercarInput.input;
      }
      if(road.model)driveTrafficCar(world,road,roadInput,step,players);
      else driveRover(world,roadInput,step,players,kind);
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
      hookInput={lower:input?.lowerHook,release:input?.releaseHook};
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
        if(CITY && (kind==='heli' || kind==='superyacht'))player.chainFireUntil=input.fire ? ticks+4 : 0;
        if(input.fire) firingGunners.add(player.id);
      }
      // Bridge ordinary packet jitter, and release a stalled client's trigger.
      if(CITY && (kind==='heli' || kind==='superyacht') && ticks<player.chainFireUntil)firingGunners.add(player.id);
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
      if(player.weapon===4 || player.launcherLock)trackLauncher(world,player,input,ticks,players,npcs);
      if (input.fire) fire(world, player, input, ticks, players, npcs);
    }
  }
  stepCargoHook(world,hookInput,step,v=>{
    if(v.model && !v.patrol)finishTrafficDelivery(world,v,npcs);
  });
  if(world.heli.hook?.load || world.hasFallingCargo){
    for(const road of [world.rover,world.supercar,...world.traffic]){
      const driver=road?.sling && players.get(road.driver);
      if(driver)Object.assign(driver.state,{x:road.x,y:road.y,z:road.z});
    }
    syncTrafficDrivers(world,npcs);
  }
  stepYacht(world,yachtInput,step,players);
  for(const road of [world.rover,world.supercar,...(world.traffic??[])]){
    if(!road || road.sling)continue;
    const kind=road.kind??'rover';
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
    }else{
      const leaf=raised && leafGeometry(raised,world.doors.bridgeLifts[raised.north]);
      // Driven civilian suspension already advanced with its driving input.
      if(road.model && (road.driver!=null || !road.flatTires))continue;
      stepSuspension(road,step,(x,z)=>{
        const ground=groundHeight(x,z,road.y+1.65,world.doors);
        // Until takeoff, an unsupported axle follows the end of its ramp.
        if(leaf && ground<=MAP.waterY && Math.abs(z-bridgeMiddle(raised))<leafLength)
          return leaf.base+leaf.vertical;
        return ground;
      });
    }

  }
  for(const b of world.boats){
    stepBoat(world,b,boatInputs.get(b.id),step,players);
    const driver=players.get(b.driver);
    if(driver){driver.state={...helmFeet(b),vy:0,grounded:true};driver.yaw=b.yaw;driver.moving=driver.sprint=false;}
  }
  stepWakeCrossings(world,step);
  for(const kind of ['rover','heli',...world.boats.map(b=>b.id),...(world.yacht?['superyacht']:[])]) {
    const v=vehicleById(world,kind), gunner=players.get(v.gunner);
    if(!gunner || !gunner.life.hp) continue;
    gunner.state={...gunnerFeet(v,kind),grounded:kind!=='heli' || v.grounded,vy:0,...(kind==='superyacht'?{onYacht:true}:{})};
    gunner.yaw=v.turretYaw;gunner.moving=gunner.sprint=false;
    if(firingGunners.has(gunner.id)) fireTurret(world,kind,gunner,ticks,players,npcs);
  }
  if(players.size) {
    for(const player of players.values())sampleRanger(player,step,world);
    for(const npc of npcs)sampleRanger(npc,step,world);
  }
  if(marina){
    let changed=false;
    const now=performance.now();
    for(const p of players.values()){
      if(marina.update(p,drivenRoad(world,p.id),now))changed=true;
    }
    if(changed){
      const result=JSON.stringify({type:'marinaBoard',rows:marina.board()});
      for(const {ws} of players.values())if(ws.readyState===WebSocket.OPEN)ws.send(result);
    }
  }
  stepHydrants(world);
  advanceRounds(world,players,npcs,ticks);
  advanceMissiles(world,players,npcs,ticks);
  stepStructuralFalls(world.doors,MAP.buildings,players,ticks,damageActor,stanceBodyHeight,world.tank?.driver);
  world.wanted?.step(npcs,ticks);
  localWorldReactions(world,npcs,ticks);
  if(match){if(world.match.phase!=='finished')match.step(players,world);}
  else updateSupplyRun(world, step);
  for(const car of [world.rover,world.supercar,...(world.traffic??[])])serviceRoadCar(car,step);
  if(world.tank)reportVehicleWreck(world,world.tank,'tank','road',ticks);
  if(world.yacht)reportVehicleWreck(world,world.yacht,world.yacht.id,'water',ticks);
  for(const boat of world.boats)reportVehicleWreck(world,boat,boat.id,'water',ticks);
  reportVehicleWreck(world,world.jet,'jet','road',ticks);
  reportVehicleWreck(world,world.rover,'rover','road',ticks);
  for(const car of world.traffic??[])reportVehicleWreck(world,car,car.id,'road',ticks);
  if(world.supercar)reportVehicleWreck(world,world.supercar,'supercar','road',ticks);
  expireShots(world.shots,ticks);
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
