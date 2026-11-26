import {sidearmSlot,sidearmCar,hasMountedTool} from './public/car-sidearm.js';
import {activeCast,fishingAction,stepFishing} from './public/pier-fishing.js';
import {spearCast,clearReturnedFish} from './public/spearfishing.js';
import {addClubResidents,stepClubResidents,clubAppearance,staffAtWork,canServeDrink} from './club-residents.js';
import {refuelVehicle,stepVehicleFuel} from './public/vehicle-fuel.js';
import {compactAmbientView} from './ambient-snapshot.js';
import {resortArrivals} from './public/palma-site.js';
import {yachtArrival} from './public/yacht-layout.js';
import {stepSharkScavenging} from './public/shark-scavenging.js';
import {startDogPursuit,stepDogPursuit} from './public/dog-owner-pursuit.js';
import {requestDogAction} from './dog-actions.js';
import {blackjack} from './casino-blackjack.js';
import {shopBicycles} from './public/shop-bicycle-sites.js';
import {storefrontFaces} from './public/frontage-glass.js';
import {recordWheelContact} from './public/skate-touchdown.js';
import {parkRides} from './public/skate-park.js';
import {boardRacks,parkRide,takeRide} from './public/street-rides.js';
import {requestInterior,advanceElevator} from './interior-actions.js';
import {createBank} from './bank-claim.js';
import {newDogs,removeDog,stepDogs} from './public/dog-walkers.js';
import {createGulls} from './public/gull-flight.js';
import {stepSharkDogEncounters} from './public/shark-dog-encounter.js';
import {createSharks} from './public/shark-swim.js';
import {createDolphins} from './public/dolphin-swim.js';
import {createManatees} from './public/manatee-swim.js';
import {fireEngine,driveWater,stepFireEngines} from './public/fire-engine.js';
import {createVolleyball} from './harbor-volleyball.js';
import {stepCourtResident} from './court-residents.js';
import {createBasketball} from './basketball-game.js';
import {stepDistrictFires} from './public/district-fire.js';
import {useBeachClub,updateBeachVisit} from './public/beach-club.js';
import {seatAtClub,leaveClubSeat} from './public/club-lucero.js';
import {nextUse} from './public/use-target.js';
import {expireShots} from './public/shot-events.js';
import {serviceRoadCar} from './public/road-garages.js';
import {localWorldReactions,soundRoadHorn} from './public/pedestrian-reactions.js';
import {stepHydrants} from './public/hydrants.js';
import {stepCargoHook} from './public/cargo-hook.js';
import {finishTrafficDelivery} from './public/city-traffic.js';
import {stepWakeCrossings} from './public/boat-wakes.js';
import {stepRoadBoarding} from './public/road-cabin.js';
import {setRoadOccupantContext} from './public/road-occupants.js';
import {stepPatrolCruisers} from './public/patrol-cruisers.js';
import {createWanted} from './public/wanted.js';
import {newCityTraffic,parkedTrafficCar,syncTrafficDrivers,stepCityTraffic,trafficDriverCar,tryTrafficInteract,driveTrafficCar,leaveTraffic} from './public/city-traffic.js';
import {marinaMode,createMarinaSprint,sprintStart,sprintGates} from './public/marina-sprint.js';
import {roadContact} from './public/road-contact.js';
import {stepStructuralFalls} from './public/structural-collapse.js';
import {leaveTank,stepTank} from './public/tank.js';
import {stepJet,leaveJet} from './public/jet.js';
import {lockStatus} from './public/handheld-launcher.js';
import {zombieSurvival} from './zombie-survival.js';
import {zombieMode} from './public/zombie-arena.js';
import {assignTeam,createMatch,propertyTeam,teamSpawn} from './island-match.js';
import {frozenPhase,maxTeam,modes} from './public/island-rules.js';
import {bridges} from './public/brickell-map.js';
import {raisedRoadAt,updateRoadPose} from './public/bridge-driving.js';
import {stepDrawbridges} from './public/drawbridges.js';
import {interactYacht,stepYacht} from './public/superyacht.js';
import {stepFurniture} from './public/shop-furniture.js';
import {stepHotelDoors} from './public/maravela-hotel.js';
import {stepRetailDoors} from './public/frontage-glass.js';
import {stepStorefrontDoors} from './public/storefront-layout.js';
import {sampleRanger} from './public/ragdoll.js';
import {stepPartyEvacuation} from './public/party-evacuation.js';
import {partyFleet,crewBoat,interactBoat,stepBoat,helmFeet} from './public/patrol-boats.js';
import {selectSeat} from './public/seat-selection.js';
import { fork } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { stat, readdir, readFile } from 'node:fs/promises';
import {harborTrade,newWallet,walletView} from './harbor-trade.js';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { WebSocket, WebSocketServer } from 'ws';
import { CITY, MAP, groundHeight, spawn, stepPlayer, stanceBodyHeight } from './public/world.js';
import {validEquipment} from './public/arcade-melee.js';
import { advanceReload, magazineView, startReload } from './public/magazines.js';
import { canUseHandheld, advanceMelee, reportVehicleWreck, reportVehiclePersonHit, newExpedition, parkedHelicopter, fly, interact, fire, fireCarPistol, updateHandheldGear, trackLauncher, stepBurningActors, advanceThrowables, advanceRounds, fireTank, dropJetBomb, launchMissile, advanceMissiles, firePilotGuns, fireTurret } from './public/expedition.js';

import { gunnerVehicle, gunnerFeet, vehicleById, turretPitch } from './public/mounts.js';
import { stopRover, parkedRover, driveRover, interactRover, recoverRover, drivenRoad, roverKinds } from './public/rover.js';
import { updateSupplyRun, replaySupplyRun } from './public/supply-run.js';
import { flightState, recoverHelicopter, SECOND_HELIPAD } from './public/airframe.js';
import { newLife, healthView, damageActor, recoverPlayerHealth, respawnDue, newRivals, updateRival, rivalView, vehicleContacts } from './public/rivals.js';

import { advanceFall, startFall } from './public/falls.js';

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
const redirectUrl = process.env.GAME_REDIRECT_URL && new URL(process.env.GAME_REDIRECT_URL);
if (redirectUrl && (redirectUrl.protocol !== 'https:' || redirectUrl.username || redirectUrl.password || redirectUrl.pathname !== '/' || redirectUrl.search || redirectUrl.hash)) {
  throw new Error('GAME_REDIRECT_URL must be an HTTPS origin');
}
const zombies = CITY && process.env.GOY_THEFT_AUTO_MODE===zombieMode;
const mode = CITY && (zombies || Object.hasOwn(modes,process.env.GOY_THEFT_AUTO_MODE)) ? process.env.GOY_THEFT_AUTO_MODE : null;
const bank=CITY && !mode ? createBank() : null;
const marina=CITY && process.env.GOY_THEFT_AUTO_MODE===marinaMode ? createMarinaSprint() : null;
const capacity = mode ? maxTeam*2 : 16;
const step = 1 / 30;
const players = new Map();
const departedScores=new Map();
let match, survival;
function canPlayVolleyball(world,player){
  const id=player.id,feet=player.state;
  return player.life.hp && !player.life.fall && feet.grounded && !feet.swimming && !feet.climb && !feet.parachute &&
    player.clubSince==null && !drivenRoad(world,id) && !crewBoat(world,id) && !gunnerVehicle(world,id) &&
    world.tank?.driver!==id && world.jet.pilot!==id && world.heli.pilot!==id && world.heli2?.pilot!==id &&
    world.yacht?.driver!==id && !world.basketball?.players.includes(id);
}
function canFish(player){
  return CITY && !mode && canPlayVolleyball(world,player) && !player.state.ride &&
    !player.state.dive && !player.state.liftTravel && !world.volleyballActivity?.member(player.id);
}
function freshWorld(){
  const w=newExpedition({civilianMarina:!mode || zombies});
  w.traffic=[...newCityTraffic({resort:!mode || zombies,parked:zombies}),fireEngine()];
  if(zombies)w.traffic.push(parkedTrafficCar('squad-sedan','sedan',-18,-206,-Math.PI/2));
  if(CITY){
    w.rides=[...(mode?[]:[...boardRacks(groundHeight),...parkRides(groundHeight)]),...shopBicycles(storefrontFaces)];
    for(const r of w.rides)Object.defineProperty(r,'home',{value:{x:r.x,y:r.y,z:r.z,yaw:r.yaw}});
  }
  if(CITY && !mode){
    w.boats.push(...partyFleet());
    Object.defineProperty(w,'removeEncounterDog',{value:dog=>removeDog(w,dog)});
    const table=blackjack();
    Object.defineProperty(w,'blackjack',{value:table});
    w.casino=table.state;
    const trading=harborTrade(w,(p,tick,message,seq,equipped)=>{
      if(p.ws.readyState===WebSocket.OPEN)p.ws.send(JSON.stringify({type:'wallet',wallet:walletView(p,tick),message,seq,equipped}));
    });
    Object.defineProperty(w,'trading',{value:trading});
    w.market=trading.state;w.bank=bank.state;
    const volleyball=createVolleyball(canPlayVolleyball);
    Object.defineProperty(w,'volleyballActivity',{value:volleyball});
    w.volleyball=volleyball.state;
    const gulls=createGulls();
    w.gulls=gulls.state;
    Object.defineProperty(w,'stepGulls',{value:gulls.step});
    const sharks=createSharks();
    w.sharks=sharks.state;
    w.sharkDefeats=sharks.defeats;
    Object.defineProperty(w,'stepSharks',{value:sharks.step});
    const pod=createDolphins(w,MAP.waterY);
    w.dolphins=pod.state;
    Object.defineProperty(w,'stepDolphins',{value:pod.step});
    const wildlife=createManatees(w,MAP.waterY);
    w.manatees=wildlife.state;
    Object.defineProperty(w,'stepManatees',{value:wildlife.step});
  }
  if(!mode)Object.defineProperty(w,'wanted',{value:createWanted(w,players,{stepCruisers:stepPatrolCruisers})});
  if(CITY && !mode){
    const game=createBasketball(w,players);
    Object.defineProperty(w,'hoops',{value:game});
    w.basketball=game.state;
  }
  if(zombies){
    survival=zombieSurvival();
    w.survival=survival.state;
  }else if(mode){
    match=createMatch(mode);
    w.match=match.state;
    Object.defineProperty(w,'rules',{value:match});
  }
  return w;
}
let world = freshWorld();
const helicopterKinds=()=>world.heli2?['heli','heli2']:['heli'];
const pilotHelicopterKind=id=>helicopterKinds().find(kind=>world[kind].pilot===id);
function freshResidents(){
  if(zombies)return [];
  const residents=newRivals({resort:!mode});
  syncTrafficDrivers(world,residents);
  world.trading?.assign(residents);
  if(CITY && !mode)world.dogs=newDogs(residents);
  if(CITY)addClubResidents(world,residents);
  world.hoops?.roster.attach(residents);
  for(const roster of world.volleyballActivity?.rosters??[])roster.attach(residents);
  return residents;
}
let npcs = freshResidents();
function worldView() {
  const bullets=CITY ? world.bullets.filter(r=>!r.hidden).map(r=>{
    if(r.source!=='heli' && r.source!=='heli2' && r.source!=='jet')return r;
    const {id,weapon,x,y,z,vx,vy,vz,age}=r;
    return r.source==='jet' ? {id,weapon,x,y,z,vx,vy,vz,age,source:r.source,shooter:r.shooter} : {id,weapon,x,y,z,vx,vy,vz,age};
  }) : world.bullets;
  const heli=world.heli;
  const heliView=CITY ? {...heli,chainFiring:!!heli.chainFiring && (heli.gunner!=null || heli.pilot!=null) && !heli.wrecked} : heli;
  const second=world.heli2;
  const secondView=second && {...second,chainFiring:!!second.chainFiring && (second.gunner!=null || second.pilot!=null) && !second.wrecked,
    ...(second.pilot!=null?{motion:flightState(second)}:{})};
  const sports=world.hoops?{
    basketball:{...world.basketball,npcs:world.hoops.roster.view(ticks)},
    volleyball:world.volleyball.map((game,i)=>({...game,athletes:world.volleyballActivity.rosters[i].view(ticks)})),
  }:{};
  return { ...world,...sports, bullets, heli:heli.pilot==null ? heliView : {...heliView,motion:flightState(heli)}, ...(secondView?{heli2:secondView}:{}), map: CITY ? 'brickell' : 'outpost', npcs: npcs.filter(actor=>!actor.courtPose).map(actor => actor.venue ? {...rivalView(actor,ticks),...clubAppearance(actor)} : rivalView(actor,ticks)) };
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

async function serve(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  if (redirectUrl) {
    try {
      const requested = new URL(request.url, 'http://localhost');
      const target = new URL(redirectUrl);
      target.pathname = requested.pathname;
      target.search = requested.search;
      response.writeHead(308, { Location: target.href, 'Cache-Control': 'no-store' }).end();
    } catch {
      response.writeHead(400).end();
    }
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
  } else if (pathname === '/vendor/loaders/GLTFLoader.js' || pathname === '/vendor/utils/BufferGeometryUtils.js' || pathname === '/vendor/utils/SkeletonUtils.js') {
    file = join(threeBuild, '../examples/jsm', pathname.slice('/vendor/'.length));
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
const arrivalRoutes=new Map([...resortArrivals,['solana',yachtArrival]].map(([key,pose])=>['/world?map=brickell&arrival='+key,pose]));
const cityRoutes=new Map([['/world?map=brickell',''],...[zombieMode,marinaMode,...Object.keys(modes)].map(key=>['/world?map=brickell&mode='+key,key])]);
function accept(request,socket,head) {
  sockets.handleUpgrade(request,socket,head,ws=>sockets.emit('connection',ws,request));
}
server.on('upgrade', (request, socket, head) => {
  if (redirectUrl) {
    try {
      const requested = new URL(request.url, 'http://localhost');
      const target = new URL(redirectUrl);
      target.protocol = 'wss:';
      target.pathname = requested.pathname;
      target.search = requested.search;
      socket.end(`HTTP/1.1 307 Temporary Redirect\r\nLocation: ${target.href}\r\nConnection: close\r\n\r\n`);
    } catch {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    }
    return;
  }
  const origin = request.headers.origin;
  const validOrigin = !origin || origin === 'http://' + request.headers.host ||
    origin === 'https://' + request.headers.host;
  const roomPath=arrivalRoutes.has(request.url)?'/world?map=brickell':request.url;
  const district = cityRoutes.get(roomPath);
  if ((request.url!=='/world' && district===undefined) || !validOrigin) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    return;
  }
  if(request.url === '/world') return accept(request,socket,head);
  let cityWorker=cityWorkers.get(roomPath);
  if(!cityWorker?.connected) {
    cityWorker=fork(fileURLToPath(import.meta.url),[],{env:{...process.env,GOY_THEFT_AUTO_MAP:'brickell',GOY_THEFT_AUTO_MODE:district}});
    cityWorkers.set(roomPath,cityWorker);
    cityWorker.on('error',err=>console.error('City session:',err.message));
  }
  socket.pause();
  cityWorker.send({headers:request.headers,method:request.method,url:request.url,head:head.toString('base64')},socket,err=>{
    if(err) socket.destroy();
  });
});

function playerState(player) {
  const lock=lockStatus(player,ticks);
  return { ...player.state,character:player.character,...(player.carShot && ticks-player.carShot.tick<18 && {carShot:player.carShot}),magazine:magazineView(player,ticks,sidearmCar(world,player.id)?sidearmSlot:player.weapon),...(player.fishing && {fishing:player.fishing}),...(player.spearfishing && {spearfishing:player.spearfishing}),...(player.holstered && {holstered:true}),...(player.meleeSwing && {meleeSwing:player.meleeSwing}),beachOrder:player.beachOrder,beachPose:player.beachPose,...(player.slotResult && {slotResult:player.slotResult}),...(player.resortStay && {resortStay:player.resortStay}),...(player.lastDive && ticks-player.lastDive.tick<180 && {lastDive:player.lastDive}),...(player.paradeCostume && {paradeCostume:true}),...(player.clubSince!=null && {clubSince:player.clubSince}),...(world.wanted && {wanted:world.wanted.view(player,ticks)}),use:world.survival?.phase!=='finished' && player.life.hp && !player.life.fall && !frozenPhase(world.match?.phase) && world.match?.phase!=='setup' ? nextUse(world,player.state,player.id) : null,...(marina && {race:marina.state(player)}),...(lock && {launcherLock:lock}), team:player.team, id: player.id, yaw: player.yaw, moving: player.moving,
    sprint: player.sprint, score:player.score, ack: player.ack, weapon: player.weapon, ...healthView(player, ticks) };
}

function publish() {
  if (!players.size) return;
  const view=worldView();
  const message = JSON.stringify({ type: 'snapshot', simTick:ticks, players: [...players.values()].map(playerState), world: CITY?compactAmbientView(view):view });
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
  if(zombies && input?.type==='startSurvival'){
    if(survival.state.phase!=='lobby' && survival.state.phase!=='finished')return;
    // Practice shots and their world damage belong to the warm-up.
    world=freshWorld();
    npcs=freshResidents();
    survival.start(players,ticks);
    return;
  }
  if(zombies && !['input','snapshotEncoding'].includes(input?.type)){
    // Allow physical navigation without enabling shops or casino games in survival.
    if(input?.type==='interior' && survival.state.phase!=='finished' &&
      (Number.isInteger(input.door) || Number.isInteger(input.floor))){
      const {seq,door,open,building,floor}=input;
      requestInterior(world,players,player,{seq,door,open,building,floor},ticks);
    }
    return;
  }
  if(input?.type==='spearfish'){
    if(CITY && !mode && !marina && player.clubSince==null && !player.trip)
      spearCast(world,player,input,ticks,MAP.waterY,groundHeight);
    return;
  }
  if(input?.type==='fishing'){fishingAction(player,input.action,ticks,canFish(player));return;}
  if(input?.type==='dog'){
    if(!world.dogs || !canPlayVolleyball(world,player) || player.state.ride || player.state.dive ||
      player.state.liftTravel || world.casino?.player===player.id || world.volleyballActivity?.member(player.id))return;
    const stolen=requestDogAction(world,player,input,ticks);
    if(stolen)startDogPursuit(world,player,stolen,ticks,npcs);
    return;
  }
  if(input?.type==='blackjack'){
    if(world.blackjack)world.blackjack.request(world,player,input,ticks,canPlayVolleyball(world,player) && !world.volleyballActivity?.member(player.id));
    return;
  }
  if(input?.type==='interior'){requestInterior(world,players,player,input,ticks);return;}
  if(input?.type==='volleyball'){world.volleyballActivity?.request(world,player,input.action,ticks);return;}
  if(input?.type==='bank'){bank?.request(world,player,input,ticks);return;}
  if(input?.type==='market'){world.trading?.request(player,input,ticks);return;}
  if(input?.type==='beachClub'){
    if(CITY && !mode && canPlayVolleyball(world,player) && !world.volleyballActivity?.member(player.id) &&
      world.casino?.player!==player.id && canServeDrink(world,input.action))useBeachClub(player,input.action,ticks,players);
    return;
  }
  if(input?.type==='clubSeat'){
    if(!CITY || mode)return;
    if(input.action==='leave' && player.clubSince!=null)leaveClubSeat(player);
    else if(input.action==='join' && staffAtWork(world,'lucero-daniel') && player.clubSince==null && !drivenRoad(world,player.id) && !crewBoat(world,player.id) &&
      !gunnerVehicle(world,player.id) && world.heli.pilot!==player.id && world.heli2?.pilot!==player.id && world.jet.pilot!==player.id &&
      world.tank?.driver!==player.id && world.yacht?.driver!==player.id)seatAtClub(player,ticks,players);
    return;
  }
  if(input?.type==='cruiserLights'){
    const car=drivenRoad(world,player.id);
    if(car?.patrol && !car.wrecked && typeof input.on==='boolean')car.emergencyLights=input.on;
    return;
  }
  if(input?.type==='paradeCostume'){player.paradeCostume=input.enabled===true;return;}
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
  if((zombies && survival.state.phase==='finished') || (match && frozenPhase(world.match.phase))){
    player.ack=player.lastSeq=input.seq;
    return;
  }
  const scale = Math.max(1, Math.hypot(input.x, input.z));
  player.lastSeq = input.seq;
  // Retain up to one second of commands while the fixed-step clock catches up
  // after a brief server stall. Bound longer backlogs so controls stay current.
  if (player.inputs.length >= 30) player.inputs.shift();
  player.inputs.push({
    refuel:input.refuel===true, handleCase:input.handleCase===true, replaySupply: input.replaySupply === true, deploy: input.deploy === true,
    stance: ['crouch', 'prone', 'stand'].includes(input.stance) ? input.stance : undefined,
    seq: input.seq, x: input.x / scale, z: input.z / scale,
    yaw: input.yaw % (Math.PI * 2), sprint: input.sprint === true, jump: input.jump === true,
    aimYaw: Number.isFinite(input.aimYaw) ? input.aimYaw % (Math.PI * 2) : input.yaw % (Math.PI * 2),
    aimPitch: Number.isFinite(input.aimPitch) ? Math.max(-Math.PI/2, Math.min(Math.PI/2, input.aimPitch)) : 0,
    skateTrick:input.skateTrick==='kickflip' || input.skateTrick==='shove'?input.skateTrick:undefined,
    flipDive:input.flipDive===true,hoopShot:input.hoopShot===true,
    holster:typeof input.holster==='boolean'?input.holster:undefined,handheldHeld:input.handheldHeld===true,
    swimY:input.swimY===1 || input.swimY===-1 ? input.swimY : 0, toggleScuba:input.toggleScuba===true,
    fromSwimming:!!player.state.swimming,tracking:input.tracking===true, weapon: validEquipment(input.weapon) ? input.weapon : null,
    seat: (input.seat===1 || input.seat===2) ? input.seat : null,
    seatKind: typeof input.seatKind==='string' && !!vehicleById(world,input.seatKind) ? input.seatKind : null,
    useTarget:typeof input.useTarget==='string'?input.useTarget.slice(0,64):undefined,
    useRole:typeof input.useRole==='string'?input.useRole.slice(0,12):undefined,
    lowerHook:input.lowerHook===true,releaseHook:input.releaseHook===true,
    horn:input.horn===true, bomb:input.bomb===true, missile:input.missile===true, fire: input.fire === true, sidearm:input.sidearm===true, reload: input.reload === true, interact: input.interact === true,
    throttle: Number.isFinite(input.throttle) ? Math.max(-1,Math.min(1,input.throttle)) : 0,
    steer: Number.isFinite(input.steer) ? Math.max(-1,Math.min(1,input.steer)) : 0,
    jetPitch: Number.isFinite(input.jetPitch) ? Math.max(-1,Math.min(1,input.jetPitch)) : undefined,
    jetRoll: input.jetRoll===1 || input.jetRoll===-1 ? input.jetRoll : 0,
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
    players.set(p.id,{id:p.id,ws:p.ws,team:p.team,slot:p.slot,scoreKey:p.scoreKey,character:p.character,
      alive:p.alive,packedSnapshots:p.packedSnapshots,lastSeq:p.lastSeq,ack:p.lastSeq,inputs:[],
      state:teamSpawn(p.team,p.slot),life:newLife(ticks),score:{kills:0,deaths:0,team:p.team},
      yaw:0,moving:false,sprint:false,weapon:4,fireReady:0});
    match.updateRoster(players);
    match.state.phase='practice';
  }
}

sockets.on('connection', (ws,request) => {
  ws.on('error', () => ws.terminate());
  if (players.size >= capacity) {
    ws.send(JSON.stringify({ type: 'full' }));
    ws.close(1013, 'World full');
    return;
  }
  if(!players.size)wakeWorld();
  let id = 1;
  while (players.has(id)) id++;
  const player = {
    id, ws, score:{kills:0,deaths:0}, scoreKey:randomUUID(), character:['classic','mike','pink','nathan'][randomInt(4)], life: newLife(ticks), state: { ...spawn(id - 1), grounded: true, vy: 0 },
    yaw: 0, moving: false, sprint: false, weapon: 4, fireReady: 0, inputs: [], ack: 0, lastSeq: 0, alive: true,
  };
  const arrival=arrivalRoutes.get(request.url);
  if(CITY && !match && arrival){
    player.state={x:arrival.x,y:arrival.y,z:arrival.z+(id%3)*.55,grounded:true,vy:0};
    player.yaw=arrival.yaw;
  }
  if(match){
    Object.assign(player,assignTeam(players));
    delete player.trip;
    player.state=teamSpawn(player.team,player.slot);
    player.score.team=player.team;
  }
  if(zombies)survival.join(player,ticks);
  if(world.trading)player.wallet=newWallet();
  players.set(id, player);
  updateRoom();
  ws.on('message', (data, binary) => acceptInput(players.get(id), data, binary));
  ws.on('pong', () => { players.get(id).alive = true; });
  ws.on('close', () => {
    const player=players.get(id);
    match?.release(player);
    parkRide(world,player,!player.state.grounded);
    world.blackjack?.leave(player);
    bank?.leave(player,ticks);
    world.volleyballActivity?.leave(id,ticks);
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
      sleepWorld();
      world = freshWorld();
      npcs = freshResidents();
    }
    else if (pilotHelicopterKind(id)) {
      const kind=pilotHelicopterKind(id),heli=world[kind];
      if(heli.onYacht && heli.grounded)heli.pilot=null;
      else {
        const gunner=players.get(heli.gunner);
        if (gunner) interact(world,gunner,kind);
        world[kind]=Object.assign(parkedHelicopter(kind==='heli2'?SECOND_HELIPAD:undefined),{hp:heli.hp,cargo:heli.cargo,fuel:heli.fuel});
      }
    } else if (roverKinds.some(kind=>world[kind]?.driver===id)) {
      const kind=roverKinds.find(kind=>world[kind]?.driver===id),rover=world[kind];
      const gunner=players.get(rover.gunner);
      if(gunner) interactRover(world,gunner,kind);
      world[kind]={...parkedRover(kind),fuel:rover.fuel,hp:rover.hp,flatTires:rover.flatTires, bodyDamage:rover.bodyDamage,fittingDamage:rover.fittingDamage,cargo:rover.cargo};
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
  ws.send(JSON.stringify({ type: 'welcome', build, ...(player.wallet && {wallet:walletView(player,ticks)}), ...(marina && {raceBoard:marina.board()}), scoreKey:player.scoreKey, id, state: playerState(players.get(id)), world: worldView() }));
  publish();
});

const idle = { x: 0, z: 0, jump: false, sprint: false, lift: 0 };
let ticks = 0, lobbyTicks = 0;
function resetRound(){
  world=freshWorld();
  npcs=freshResidents();
  departedScores.clear();
  for(const player of players.values()){
    delete player.trip;
    player.state=teamSpawn(player.team,player.slot);
    player.life=newLife(ticks);
    player.score={kills:0,deaths:0,team:player.team};
    player.inputs.length=0;
    player.ack=player.lastSeq;
    player.yaw=0;player.weapon=4;player.holstered=false;player.releaseSwimTrigger=false;delete player.meleeSwing;player.launcherLock=null;player.moving=player.sprint=false;
    player.unstuck=false;player.supercarInput=null;player.chainFireUntil=0;
  }
  updateRoom();
}
function tick() {
  if(!players.size)return;
  if(zombies && survival.state.phase==='finished'){
    if(++lobbyTicks%6===0)publish();
    return;
  }
  if(match && frozenPhase(world.match.phase)){
    if(world.match.phase==='finished' && match.step(players))resetRound();
    if(++lobbyTicks%2===0)publish();
    return;
  }
  setRoadOccupantContext(world,npcs,ticks);
  if(world.spearedFish)clearReturnedFish(world,ticks);
  stepVehicleFuel(world,step);
  stepDrawbridges(world,bridges,step);
  if(CITY && players.size) {
    const pedestrians=[];
    for(const p of players.values()) {
      if(p.life.hp && !drivenRoad(world,p.id) && !pilotHelicopterKind(p.id) && !gunnerVehicle(world,p.id) && !crewBoat(world,p.id))pedestrians.push(p.state);
    }
    stepStorefrontDoors(world.doors,pedestrians,step);
    stepRetailDoors(world.doors,pedestrians,step);
    stepHotelDoors(world.doors,pedestrians,step);
    stepFurniture(world.doors,step);
  }
  world.jet.chainFiring=false;
  if(world.jet.pilot==null)stepJet(world,null,step,players);
  for(const kind of helicopterKinds())world[kind].chainFiring=false;
  const firingGunners=new Set(), boatInputs=new Map();
  let yachtInput,hookInput;
  if(world.tank?.wrecked || world.tank?.sinking)stepTank(world,null,step);
  for(const kind of helicopterKinds())recoverHelicopter(world, step, players,kind);
  for(const kind of roverKinds)if(world[kind])recoverRover(world,step,kind);
  recoverRover(world,step,'supercar');
  for(const kind of roverKinds)if(world[kind])stepRoadBoarding(world[kind],step);
  stepRoadBoarding(world.supercar,step);
  for(const car of world.traffic)stepRoadBoarding(car,step);
  if(!zombies)stepFireEngines(world,players,npcs,ticks,step);
  stepCityTraffic(world,players,npcs,step,ticks);
  if (!zombies) {
    stepPartyEvacuation(world,npcs,ticks,step);
    stepClubResidents(world,players,ticks,step);
    for(const npc of npcs){
      if(npc.courtPose){stepCourtResident(npc,ticks,step,world);continue;}
      if(npc.venue || npc.officer || npc.partyEvac || trafficDriverCar(world,npc.id))continue;
      if(!stepDogPursuit(world,npc,players,ticks,step))updateRival(npc,ticks,step,world.hp,world);
    }
  }
  for (const player of players.values()) {
    const input = player.inputs.shift();
    if(player.life.reload){
      const seated = sidearmCar(world,player.id);
      const interrupt=seated ? (input?.interact || input?.seat || (hasMountedTool(seated) && input && !input.sidearm)) : player.holstered || input?.holster || input?.interact || input?.seat ||
        (input?.weapon != null && input.weapon!==player.weapon) || !canUseHandheld(world,player);
      advanceReload(player,ticks,interrupt,seated?sidearmSlot:player.weapon);
    }
    if(player.fishing){
      stepFishing(player,ticks,canFish(player));
      if(input && activeCast(player.fishing))input.fire=input.tracking=false;
    }
    if(player.meleeSwing && (ticks>=player.meleeSwing.endTick || input?.interact || input?.seat ||
      player.life.fall || !player.life.hp))delete player.meleeSwing;
    if(player.beachPose || player.beachOrder)updateBeachVisit(player,input,ticks);
    if(input && world.volleyballActivity?.member(player.id)){
      input.fire=input.tracking=input.interact=input.jump=input.deploy=false;
      input.seat=null;input.stance='stand';
    }
    if((!helicopterKinds().some(kind=>world[kind].gunner===player.id) && world.yacht?.gunner!==player.id) || input?.interact || input?.seat)player.chainFireUntil=0;
    if (input) player.ack = input.seq;
    if(player.state.ride && (player.unstuck || !player.life.hp || player.life.fall))parkRide(world,player,!player.state.grounded);
    if (player.unstuck) {
      player.unstuck = false;
      if (player.life.hp) {
        match?.release(player);
        const pilotKind=pilotHelicopterKind(player.id);
        if (pilotKind) interact(world,player,pilotKind);
        const road = drivenRoad(world,player.id);
        if(road?.model)leaveTraffic(world,player);
        else if (road) { road.driver = null; stopRover(road); }
        player.life.immuneUntil = ticks;
        damageActor(player,player.life.hp,ticks);
      }
    }
    const seatedAtTable=world.blackjack?.step(player,ticks);
    if(player.clubSince!=null && (!player.life.hp || player.life.fall))leaveClubSeat(player);
    const fallingBody = advanceFall(player, ticks, step, world.hp, world);
    if (player.life.hp === 0) {
      delete player.trip;delete player.state.liftTravel;delete player.state.dive;delete player.lastDive;
      if(drivenRoad(world,player.id)?.model)leaveTraffic(world,player);
      const pilotKind=pilotHelicopterKind(player.id);
      if(pilotKind)interact(world,player,pilotKind);
      if(world.tank?.driver===player.id)leaveTank(world,player);
      if(world.jet.pilot===player.id)leaveJet(world.jet);
      if(world.yacht?.driver===player.id){world.yacht.driver=null;world.yacht.throttle=0;}
      const role=gunnerVehicle(world,player.id);
      if(role) vehicleById(world,role).gunner=null;
      const boat=crewBoat(world,player.id);
      if(boat?.driver===player.id){boat.driver=null;boat.throttle=0;}
      for(const kind of roverKinds)if(world[kind]?.driver===player.id){const rover=world[kind];world[kind]={...parkedRover(kind),fuel:rover.fuel,hp:rover.hp,flatTires:rover.flatTires,bodyDamage:rover.bodyDamage,cargo:rover.cargo};}
      if (world.supercar?.driver===player.id) interactRover(world,player,'supercar');
      if ((!zombies || survival.state.phase==='lobby') && respawnDue(player, ticks)) {
        if(zombies)survival.join(player,ticks);
        else player.state = match ? teamSpawn(player.team,player.slot) : spawn(player.id - 1);
        player.life = newLife(ticks);
        player.yaw = 0;
        // Retire all inputs received during defeat. The respawn starts at rest.
        player.ack = player.lastSeq;
        player.inputs.length = 0;
      }
      continue;
    }
    if(seatedAtTable)continue;
    if(advanceElevator(world,player,ticks))continue;
    if (fallingBody) continue;
    if(player.clubSince!=null){
      if(ticks-player.clubSince<30*45)continue;
      leaveClubSeat(player);
    }
    if(input?.handleCase && world.tank?.driver!==player.id)match?.interact(player);
    if(world.match?.phase==='setup'){
      const next=stepPlayer(player.state,input||idle,step,world.hp,world);
      if(propertyTeam(next.x,next.z)===player.team)player.state=next;
      player.moving=Boolean(input && (input.x || input.z));
      player.sprint=!!input?.sprint;
      if(input)player.yaw=input.yaw;
      continue;
    }
    const wasPlayingHoops=world.basketball?.players.includes(player.id);
    if (input) {
      if(input.refuel && !input.interact && !input.seat)refuelVehicle(world,player.id);
      if (!match && input.replaySupply) replaySupplyRun(world);
      if (input.interact && !player.state.climb) {
        const use=nextUse(world,player.state,player.id,input.useTarget);
        // A nearby seat can change hands between the prompt and the keypress.
        // Revalidate its action before applying an E that names that target.
        if(use && (input.useTarget===undefined || (input.useTarget===use.target && input.useRole===use.role))){
          const target=use.target,boat=world.boats.find(b=>b.id===target);
          const ride=world.rides?.find(r=>r.id===target);
          if(ride){
            if(use.role==='exit')parkRide(world,player);
            else takeRide(ride,player);
          }else if(target==='tank'){
            if(use.role==='exit')leaveTank(world,player);
            else {world.tank.driver=player.id;match?.release(player);}
          }else if(target==='jet'){
            if(use.role==='exit')leaveJet(world.jet,player);
            else world.jet.pilot=player.id;
          }else if(target==='heli' || target==='heli2')interact(world,player,target);
          else if(target==='superyacht')interactYacht(world,player);
          else if(target==='basketball')world.hoops.interact(player,use.role);
          else if(boat)interactBoat(world,boat,player);
          else if(roverKinds.includes(target) || target==='supercar'){
            if(target==='supercar')player.supercarInput=null;
            interactRover(world,player,target);
          }else tryTrafficInteract(world,player,npcs);
        }
      } else if (input.seat && !player.state.climb) selectSeat(world,player,input.seatKind,input.seat);
    }
    if(world.tank?.driver===player.id){
      stepTank(world,input,step,players);
      if(world.tank.driver!==player.id)continue;
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
      if(!road.sinking)vehicleContacts(world,kind,before,[...players.values(),...npcs],ticks,step,players,reportVehiclePersonHit);
      if(road.driver!==player.id)continue;
      const pistol=sidearmCar(world,player.id) && (!hasMountedTool(road) || input?.sidearm);
      if(road.model==='engine')driveWater(world,road,pistol?{...input,fire:false}:input,ticks);
      if(pistol){
        if(input?.reload && !input.interact && !input.seat)startReload(player,ticks,sidearmSlot);
        if(input?.fire)fireCarPistol(world,road,player,input,ticks);
      }
      const {x,y,z,yaw}=road;
      player.state = { x,y,z,vy:0,grounded:true };
      player.yaw = yaw;
      player.moving = player.sprint = false;
      continue;
    }
    const pilotKind=pilotHelicopterKind(player.id);
    if (pilotKind) {
      const heli=world[pilotKind];
      if(pilotKind==='heli')hookInput={lower:heli.fuel!==0 && input?.lowerHook,release:input?.releaseHook};
      const before={...heli};
      fly(world, input || { ...idle, aimYaw: heli.yaw }, step, players,pilotKind);
      vehicleContacts(world,pilotKind,before,[...players.values(),...npcs],ticks,step);
      if (heli.pilot !== player.id) continue;
      if (input?.fire) firePilotGuns(world,player,ticks,pilotKind);
      if (input?.missile) launchMissile(world,pilotKind,player,ticks);
      const { x, y, z, yaw, grounded } = heli;
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
        if(CITY && (kind==='heli' || kind==='heli2' || kind==='superyacht'))player.chainFireUntil=input.fire ? ticks+4 : 0;
        if(roverKinds.includes(kind) && input.sidearm && sidearmCar(world,player.id)){
          if(input.reload)startReload(player,ticks,sidearmSlot);
          if(input.fire)fireCarPistol(world,vehicle,player,input,ticks);
        }else if(input.fire) firingGunners.add(player.id);
      }
      // Bridge ordinary packet jitter, and release a stalled client's trigger.
      if(CITY && (kind==='heli' || kind==='heli2' || kind==='superyacht') && ticks<player.chainFireUntil)firingGunners.add(player.id);
      continue;
    }
    const falling = player.state;
    player.state = stepPlayer(falling, input || idle, step, world.hp, world);
    const handheld=!player.state.ride && updateHandheldGear(player,input,falling.swimming,world);
    if(player.state.entryMark){
      player.lastDive={...player.state.entryMark,tick:ticks};
      delete player.state.entryMark;
    }
    if(player.state.dive){player.yaw=player.state.dive.kind==='platform'?0:-Math.PI/2;player.sprint=player.moving=false;continue;}
    if(falling.ride){
      const item=world.rides.find(r=>r.id===falling.ride.id);
      const {x,y,z,ride,skateBail}=player.state;
      if(skateBail){
        delete player.state.skateBail;
        Object.assign(item,{x,y,z,yaw:skateBail.yaw});
        parkRide(world,player);
        player.yaw=skateBail.yaw;
        startFall(player,ticks,{x:0,y:1,z:0},'skateboard');
        damageActor(player,skateBail.damage,ticks);
      }else if(!ride)parkRide(world,player,true);
      else {
        Object.assign(item,{x,y,z,yaw:ride.yaw});recordWheelContact(item,player.state,ticks);player.yaw=ride.yaw;
      }
      player.moving=player.sprint=false;
      continue;
    }
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
      player.yaw = input.fire && handheld ? input.aimYaw : input.yaw;
      if(world.basketball?.players.includes(player.id)){
        player.yaw=input.hoopShot || world.basketball.charge>0 ? input.aimYaw : input.yaw;
        player.launcherLock=null;
        world.hoops.input(player,input);
      }else if(!wasPlayingHoops && handheld){
        if(player.weapon===4 || player.launcherLock)trackLauncher(world,player,input,ticks,players,npcs);
        if (input.reload && !input.interact && !input.seat && canUseHandheld(world,player)) startReload(player,ticks);
        if (input.fire) fire(world, player, input, ticks, players, npcs);
      }
    }
    if(handheld && !wasPlayingHoops && player.meleeSwing)advanceMelee(world,player,ticks,players,npcs);
  }
  stepCargoHook(world,hookInput,step,v=>{
    if(v.model && !v.patrol)finishTrafficDelivery(world,v,npcs);
  });
  if(world.heli.hook?.load || world.hasFallingCargo){
    for(const road of [...roverKinds.map(kind=>world[kind]),world.supercar,...world.traffic]){
      const driver=road?.sling && players.get(road.driver);
      if(driver)Object.assign(driver.state,{x:road.x,y:road.y,z:road.z});
    }
    syncTrafficDrivers(world,npcs);
  }
  stepYacht(world,yachtInput,step,players);
  for(const road of [...roverKinds.map(kind=>world[kind]),world.supercar,...(world.traffic??[])]){
    if(!road || road.sling)continue;
    const kind=road.kind??'rover';
    if(road.driver==null && road.bridgeFlight)driveRover(world,idle,step,players,kind);
    // Driven and moving NPC traffic already updated their wheel contacts.
    if(!road.model || (road.driver==null && (road.flatTires || road.bridgeFlight || raisedRoadAt(world,road.x,road.z))))
      updateRoadPose(world,road,step);

  }
  for(const b of world.boats){
    stepBoat(world,b,boatInputs.get(b.id),step,players);
    const driver=players.get(b.driver);
    if(driver){driver.state={...helmFeet(b),vy:0,grounded:true};driver.yaw=b.yaw;driver.moving=driver.sprint=false;}
  }
  stepWakeCrossings(world,step);
  world.stepDolphins?.(step);
  world.stepManatees?.(step);
  for(const kind of [...roverKinds.filter(kind=>world[kind]),'heli',...world.boats.map(b=>b.id),...(world.yacht?['superyacht']:[])]) {
    const v=vehicleById(world,kind), gunner=players.get(v.gunner);
    if(!gunner || !gunner.life.hp) continue;
    gunner.state={...gunnerFeet(v,kind),grounded:(kind!=='heli'&&kind!=='heli2') || v.grounded,vy:0,...(kind==='superyacht'?{onYacht:true}:{})};
    gunner.yaw=v.turretYaw;gunner.moving=gunner.sprint=false;
    if(firingGunners.has(gunner.id)) fireTurret(world,kind,gunner,ticks,players,npcs);
  }
  world.stepGulls?.(step);
  world.stepSharks?.(step,players,ticks,damageActor);
  if(players.size && world.dogs){
    stepDogs(world,npcs,players,step,ticks);
    stepSharkDogEncounters(world,step,world.removeEncounterDog,ticks);
  }
  if(players.size)stepSharkScavenging(world,players,npcs,ticks,step);
  if(players.size) {
    for(const player of players.values())sampleRanger(player,step,world);
    for(const npc of npcs)sampleRanger(npc,step,world,ticks);
  }
  world.hoops?.step(step);
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
  stepBurningActors(world,players,npcs,ticks);
  advanceThrowables(world,players,npcs,ticks);
  advanceMissiles(world,players,npcs,ticks);
  stepDistrictFires(world.doors,ticks,world.rules);
  stepStructuralFalls(world.doors,MAP.buildings,players,ticks,damageActor,stanceBodyHeight,world.tank?.driver);
  if(players.size)world.trading?.step(players,npcs,ticks);
  world.wanted?.step(npcs,ticks);
  bank?.step(world,players,ticks);
  world.volleyballActivity?.step(world,players,ticks,step);
  if(zombies)survival.advance(players,npcs,ticks,world);
  else localWorldReactions(world,npcs,ticks,players);
  if(match){if(world.match.phase!=='finished')match.step(players,world);}
  else if(!zombies)updateSupplyRun(world, step);
  for(const player of players.values())recoverPlayerHealth(player,ticks);
  for(const car of [...roverKinds.map(kind=>world[kind]),world.supercar,...(world.traffic??[])])if(car)serviceRoadCar(car,step);
  if(world.tank)reportVehicleWreck(world,world.tank,'tank','road',ticks);
  if(world.yacht)reportVehicleWreck(world,world.yacht,world.yacht.id,'water',ticks);
  for(const boat of world.boats)reportVehicleWreck(world,boat,boat.id,'water',ticks);
  for(const kind of helicopterKinds())if(world[kind].sinking)reportVehicleWreck(world,world[kind],kind,'water',ticks);
  reportVehicleWreck(world,world.jet,'jet',world.jet.sinking?'water':'road',ticks);
  for(const kind of roverKinds)if(world[kind])reportVehicleWreck(world,world[kind],kind,'road',ticks);
  for(const car of world.traffic??[])reportVehicleWreck(world,car,car.id,'road',ticks);
  if(world.supercar)reportVehicleWreck(world,world.supercar,'supercar','road',ticks);
  expireShots(world.shots,ticks);
  if (++ticks % 2 === 0) publish();
}

let worldTimer,asleepSince=performance.now();
function wakeWorld(){
  let previous=performance.now(),accumulated=0;
  if(!match){
    // The bank cooldown survives an empty free-roam room. Advance its clock
    // without replaying movement, wildlife or other discarded world ticks.
    ticks+=Math.floor((previous-asleepSince)/1000/step);
    bank?.step(world,players,ticks);
  }
  worldTimer=setInterval(()=>{
    const now=performance.now();
    // Keep a short stall's elapsed time instead of permanently slowing the
    // authoritative world. Spread catch-up across callbacks to bound work.
    accumulated=Math.min(accumulated+(now-previous)/1000,1);
    previous=now;
    let catchupTicks=0;
    while(accumulated>=step && catchupTicks++<4){
      tick();
      accumulated-=step;
    }
  },8).unref();
}
function sleepWorld(){
  clearInterval(worldTimer);
  asleepSince=performance.now();
}

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
