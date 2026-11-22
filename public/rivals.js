import {sidewalkPace,curbWait} from './sidewalk-crossings.js';
import {stepPedestrianReaction} from './pedestrian-reactions.js';
import {outpostPatrols} from './outpost-patrols.js';
import {brickellResidents} from './brickell-residents.js';
import {resortGuests} from './resort-guests.js';
import {packedJoints,releaseJoints} from './ragdoll.js';
// The server advances every actor's lifecycle on the same 30 Hz clock.
import { vehicleContact } from './vehicle-contact.js';
import { CITY, groundHeight, stepPlayer, stanceBodyHeight } from './world.js';

import { startFall, advanceFall } from './falls.js';

const MAX_HP = 100;
const RESPAWN_TICKS = 90;
const SHIELD_TICKS = 60;
const patrols = [
  { id: 'rival-fern', name: 'Fern', points: CITY ? [[-7.55,8],[-7.55,16.2],[-8.25,13.7],[-8.25,8.1]] : [[-3.5, 8], [-2.8, 7.6], [-3.3, 6.7]] },
  { id: 'rival-rowan', name: 'Rowan', points: [[10, 13], [11, 12], [12, 13.5]] },
  ...(CITY ? brickellResidents : outpostPatrols),
];

export function newLife(tick, shield = true) {
  return { hp: MAX_HP, returnAt: 0, immuneUntil: shield ? tick + SHIELD_TICKS : 0 };
}

export function healthView(actor, tick) {
  const life = actor.life;
  const f = life.fall;
  const fall = f ? { cause: f.cause, yaw: f.yaw, speed: f.speed, age: (tick-f.started)/30,
    ...(f.ragdoll ? {joints:packedJoints(f.ragdoll),started:f.started} : {}),
    settled: f.settled !== null, recovery: life.hp && f.settled !== null ? Math.min(1,(tick-f.settled)/16) : 0 } : null;
  const lostParts=life.lostParts && Object.fromEntries(Object.entries(life.lostParts).map(
    ([part,hit])=>[part,{...hit,age:Math.min(8,(tick-hit.tick)/30)}]));
  return { fall, lostParts, deathKind:life.deathKind, lastShotTick:life.lastShotTick,lastBiteTick:life.lastBiteTick,hitSector:life.hitSector, hp: life.hp, maxHp: MAX_HP, dead: life.hp === 0,
    protected: tick < life.immuneUntil, respawnIn: Math.max(0, (life.returnAt - tick) / 30) };
}

// Returns true only on the transition to zero, even if several shots arrive together.
export function damageActor(actor, amount, tick, direction) {
  const life = actor.life;
  if (life.hp === 0 || tick < life.immuneUntil) return false;
  if(!(amount>0))return false;
  life.lastHurtTick=tick;
  life.hp = Math.max(0, life.hp - amount);
  if (life.hp !== 0) return false;
  if(actor.score)actor.score.deaths++;
  life.returnAt = tick + RESPAWN_TICKS;
  const released=direction && !life.fall ? releaseJoints(actor,tick,direction) : null;
  actor.moving = actor.sprint = false;
  if (!life.fall) startFall(actor, tick, { x: (direction?.x ?? Math.sin(actor.yaw || 0)) * 1.5,
    z: (direction?.z ?? -Math.cos(actor.yaw || 0)) * 1.5, y: 1.2 }, 'defeat');
  if(released)life.fall.ragdoll=released;
  return true;
}

export function respawnDue(actor, tick) {
  return actor.life.hp === 0 && tick >= actor.life.returnAt;
}

function patrolStart(route) {
  const [x, z] = route.points[0];
  return { x, y: groundHeight(x, z), z, vy: 0, grounded: true };
}

export function newRivals({resort=false}={}) {
  const routes=CITY && resort ? [...patrols,...resortGuests] : patrols;
  return routes.map((route,index) => ({ sidewalk:CITY && index>=2 ? sidewalkPace(index) : null, id: route.id, name: route.name, route, next: 1, pauseUntil: 0,
    state: patrolStart(route), yaw: Math.PI, moving: false, weapon: 1, life: newLife(0, false) }));
}

export function updateRival(actor, tick, dt, hp, world) {
  if (respawnDue(actor, tick)) {
    actor.state = patrolStart(actor.route);
    actor.next = 1;
    actor.life = newLife(tick);
    delete actor.crossing;delete actor.checkingTraffic;delete actor.reaction;delete actor.escapeTrail;delete actor.panicCry;
    actor.pauseUntil = tick + 30;
  }
  if (advanceFall(actor,tick,dt,hp,world) || !actor.life.hp){delete actor.reaction;return;}
  if(stepPedestrianReaction(actor,tick,dt,world)){delete actor.checkingTraffic;return;}
  if(tick<actor.pauseUntil)return;
  const [x, z] = actor.route.points[actor.next];
  const dx = x - actor.state.x, dz = z - actor.state.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.12) {
    actor.next = (actor.next + 1) % actor.route.points.length;
    delete actor.crossing;delete actor.checkingTraffic;
    actor.pauseUntil = tick + (actor.sidewalk ? (actor.next===1 ? actor.sidewalk.pause : 3) : 55);
    actor.state.vx=actor.state.vz=0;
    actor.moving = false;
    return;
  }
  const heading=Math.atan2(dx,-dz);
  let speed=.17;
  if(actor.sidewalk){
    const turn=Math.atan2(Math.sin(heading-actor.yaw),Math.cos(heading-actor.yaw));
    actor.yaw+=Math.max(-dt*3.4,Math.min(dt*3.4,turn));
    if(curbWait(actor,tick,world)){
      actor.moving=false;actor.state.vx=actor.state.vz=0;actor.checkingTraffic=true;return;
    }
    delete actor.checkingTraffic;
    speed=actor.crossing ? Math.max(.32,actor.sidewalk.speed) : actor.sidewalk.speed;
    speed*=Math.max(.48,1-.34*Math.abs(turn));
  }else actor.yaw=heading;
  actor.moving = true;
  actor.state = stepPlayer(actor.state, { x: dx / distance * speed, z: dz / distance * speed }, dt, hp, world);
}

export function rivalView(actor, tick) {
  return { id: actor.id, name: actor.name, ...actor.state, yaw: actor.yaw,
    moving: actor.moving,...(actor.pursuedDog && {pursuedDog:actor.pursuedDog,sprint:actor.sprint}),...(actor.checkingTraffic && {checkingTraffic:true}), weapon: actor.weapon,...(actor.officer && {officer:true,searching:!actor.visible,targetId:actor.targetId,cruiserId:actor.cruiserId,sprint:actor.sprint}),...(actor.reaction && {reaction:actor.reaction.type}),...(actor.reaction?.type==='drenched' && {drenchedAt:actor.reaction.since}),...(actor.reaction?.type==='gunfire' && {sprint:actor.moving,panicCry:actor.panicCry}), ...(actor.partyEvac && {evacLook:actor.evacLook,reaction:'shipwreck',panicCry:actor.panicCry}), ...healthView(actor, tick) };
}

export function vehicleContacts(world, kind, before, actors, tick, dt) {
  const vehicle = world[kind]??world.traffic?.find(car=>car.id===kind);
  const vx = (vehicle.x - before.x) / dt, vz = (vehicle.z - before.z) / dt;
  const descent = kind==='heli' ? Math.max(0, (before.y - vehicle.y) / dt) : 0;
  const speed = Math.hypot(vx, vz, descent);
  if (vehicle.wrecked || speed < 1.8) return;
  const hull=vehicle.model?{traffic:[vehicle]}:{[kind]:vehicle};
  const crew = [world.tank?.driver,...(world.traffic??[]).flatMap(car=>[car.driver,car.npcDriver,car.takeover?.npcId]),world.rover.driver, world.rover.gunner, world.supercar?.driver, world.heli.pilot, world.heli.gunner,...(world.boats??[]).flatMap(b=>[b.driver,b.gunner])];
  for (const actor of actors) {
    if ((actor.officer && actor.targetId!==(vehicle.pilot??vehicle.driver)) || crew.includes(actor.id) || !actor.life.hp || actor.life.fall || tick < actor.life.immuneUntil) continue;
    const p = actor.state, dx = p.x - vehicle.x, dz = p.z - vehicle.z;
    // Use the walking hull immediately after the vehicle moves, before an
    // on-foot tick can push the target clear. Ignore surfaces moving away.
    const hit=vehicleContact(p.x,p.y,p.z,hull,CITY,stanceBodyHeight(p.stance));
    if(hit.depth<=.00001) continue;
    const approach=(vx*hit.dx+vz*hit.dz)/hit.depth;
    if(Math.max(approach,descent)<1.8) continue;
    const outward = descent / Math.max(.1, Math.hypot(dx, dz));
    const impulse = { x: vx * 1.25 + dx*outward, z: vz * 1.25 + dz*outward, y: 1 + speed*.53 };
    startFall(actor, tick, impulse, kind);
    if(damageActor(actor,Math.round(speed*18),tick)){
      const driver=actors.find(p=>p.id===(kind==='heli'?vehicle.pilot:vehicle.driver));
      if(driver?.score && driver!==actor){
        driver.score.kills++;
        world.wanted?.record(world.wanted.session(driver),actor.officer?'officer':'defeat',tick);
      }
    }
  }
}
