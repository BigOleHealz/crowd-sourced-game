// The server owns this transient expedition state. It survives individual joins.
import { BREAKABLES, groundHeight, solidTopAt } from './world.js';
import { parkedRover, damageRover } from './rover.js';
import { newSupplyRun } from './supply-run.js';
import { damageActor } from './rivals.js';
import { damageHelicopter, parkedHelicopter } from './airframe.js';
export { parkedHelicopter, fly, interact } from './airframe.js';

import { mounts, mountPosition, turretRange } from './mounts.js';

const clearCrystals = Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, 0]));
let nextShotId = 1;

export function newExpedition() {
  return {
    heli: parkedHelicopter(), rover: parkedRover(),
    hp: Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, crystal.hp])),
    shots: [], missiles: [],
    mission: newSupplyRun(),
  };
}

function insideBody(point, feet, radius, height, halo) {
  return Math.hypot(point.x - feet.x, point.z - feet.z) <= radius + halo &&
    point.y >= feet.y - halo && point.y <= feet.y + height + halo;
}

function withinBurst(center, feet, centerHeight) {
  return Math.hypot(feet.x - center.x, feet.y + centerHeight - center.y, feet.z - center.z) <= 3.5;
}

// Use the same small head and wider torso for cursor picking and server damage.
// A relaxed near miss can select the body, but only a ray through the head earns a critical hit.
function actorIntersection(actor,from,dir) {
  const feet=actor.state;
  const x=from.x-feet.x, y=from.y-feet.y, z=from.z-feet.z;
  const lean=actor.moving ? .095 : 0, yaw=actor.yaw || 0;
  const hx=(x-lean*Math.sin(yaw))/.128, hy=(y-1.69)/.161, hz=(z+lean*Math.cos(yaw))/.128;
  const dx=dir.x/.128, dy=dir.y/.161, dz=dir.z/.128;
  const a=dx*dx+dy*dy+dz*dz, b=hx*dx+hy*dy+hz*dz;
  const disc=b*b-a*(hx*hx+hy*hy+hz*hz-1);
  let head=Infinity, body=Infinity;
  if(disc>=0 && -b+Math.sqrt(disc)>=0) head=Math.max(0,(-b-Math.sqrt(disc))/a);
  // Intersect the torso cylinder with its vertical interval.
  const radial=dir.x*dir.x+dir.z*dir.z, dot=x*dir.x+z*dir.z;
  const c=x*x+z*z-.39*.39, delta=dot*dot-radial*c;
  let enter=0, leave=Infinity;
  if(radial>1e-9 && delta>=0) {
    enter=Math.max(0,(-dot-Math.sqrt(delta))/radial);
    leave=(-dot+Math.sqrt(delta))/radial;
  } else if(radial>1e-9 || c>0) leave=-1;
  if(Math.abs(dir.y)>1e-9) {
    const low=-y/dir.y, high=(1.54-y)/dir.y;
    enter=Math.max(enter,Math.min(low,high));leave=Math.min(leave,Math.max(low,high));
  } else if(y<0 || y>1.54) leave=-1;
  if(enter<=leave) body=enter;
  return {actor,distance:Math.min(head,body),headshot:head<body};
}

// Also used by the third-person camera to find the depth under the cursor.
export function tracePulse(world, actors, from, direction, range, assist = true, sourceVehicle = null) {
  let target = null, hitKind = null, to, blocked = false, headshot=false;
  const intersections=actors.map(actor=>actorIntersection(actor,from,direction)).sort((a,b)=>a.distance-b.distance);
  // Step one common arcade pulse through the world; scenery and nearer targets
  // intercept it before anything farther along the same beam.
  for (let d = 0.2; d <= range; d += 0.2) {
    to = { x: from.x + direction.x * d, y: from.y + direction.y * d, z: from.z + direction.z * d };
    if (to.y <= solidTopAt(to.x, to.z, clearCrystals)) { blocked = true; break; }
    const halo = assist ? Math.min(0.7, d * 0.05) : 0;
    target = BREAKABLES.find(crystal => world.hp[crystal.id] > 0 &&
      insideBody(to, { ...crystal, y: groundHeight(crystal.x, crystal.z) }, crystal.radius, crystal.height, halo));
    if (target) { hitKind = 'crystal'; break; }
    if (sourceVehicle !== 'heli' && !world.heli.wrecked && insideBody(to, world.heli, 1.15, 1.95, halo)) {
      target = world.heli; hitKind = 'heli'; break;
    }
    const r=world.rover;
    if (sourceVehicle !== 'rover' && r && !r.wrecked && Math.abs(to.y-r.y-.79)<=.79+halo) {
      const dx=to.x-r.x, dz=to.z-r.z;
      const side=dx*Math.cos(r.yaw)+dz*Math.sin(r.yaw), along=dx*Math.sin(r.yaw)-dz*Math.cos(r.yaw);
      if (Math.abs(side)<=.79+halo && Math.abs(along)<=1.52+halo) {
        target=r; hitKind='rover'; break;
      }
    }
    const direct=intersections[0];
    if(direct && direct.distance<=d+.00001) {
      target=direct.actor;headshot=direct.headshot;
      to={x:from.x+direction.x*direct.distance,y:from.y+direction.y*direct.distance,z:from.z+direction.z*direct.distance};
    } else if(assist) {
      target=intersections.find(entry=>entry.distance===Infinity && insideBody(to,entry.actor.state,.39,1.72,halo))?.actor;
    }
    if (target) { hitKind = typeof target.id === 'number' ? 'player' : 'npc'; break; }
  }
  return { target, hitKind, to, blocked, headshot };
}

export function fire(world, player, input, tick, players, npcs) {
  if (player.life.hp === 0 || tick < player.fireReady || world.heli.pilot === player.id || world.rover?.driver === player.id) return;
  const bloom = player.weapon === 2;
  player.fireReady = tick + (bloom ? 21 : 6);
  const { x, y, z } = player.state;
  const from = { x, y: y + 1.3, z };
  const horizontal = Math.cos(input.aimPitch);
  const dx = Math.sin(input.aimYaw) * horizontal;
  const dy = Math.sin(input.aimPitch);
  const dz = -Math.cos(input.aimYaw) * horizontal;
  const actors = targets(world,player.id,players,npcs);
  const { target, hitKind, to, headshot } = tracePulse(world, actors, from, {x:dx, y:dy, z:dz}, bloom ? 18 : 27);
  applyHit(world,{target,hitKind,to,headshot},actors,players,player.id,tick,bloom ? 40 : 25,bloom ? 2 : 1,bloom);
  world.shots.push({ id: nextShotId++, shooter: player.id, weapon: player.weapon, from, to, headshot,
    hit: Boolean(hitKind), hitKind, targetId: hitKind === 'heli' || hitKind === 'rover' ? hitKind : target?.id ?? null, tick });
}

function targets(world,shooter,players,npcs,source=null) {
  return [...players.values(), ...npcs].filter(actor =>
    actor.id !== shooter && actor.id !== world.heli.pilot && actor.id !== world.heli.gunner && actor.id !== world.rover?.driver && (source!=='rover' || actor.id!==world.rover?.gunner) && actor.life.hp > 0);
}

function applyHit(world,{target,hitKind,to,blocked,headshot},actors,players,shooter,tick,damage,crystalDamage,bloom,source=null) {
  if (hitKind || (bloom && blocked)) {
    // Center a crystal burst on the formation so the visible cluster clears together.
    const center = hitKind === 'crystal' ? { x: target.x, y: groundHeight(target.x, target.z) + target.height / 2, z: target.z } : to;
    for (const crystal of BREAKABLES) {
      if (crystal === target || (bloom && withinBurst(center, { ...crystal, y: groundHeight(crystal.x, crystal.z) }, crystal.height / 2))) {
        world.hp[crystal.id] = Math.max(0, world.hp[crystal.id] - crystalDamage);
      }
    }
    for (const actor of actors) {
      if (actor === target || (bloom && withinBurst(center, actor.state, .9))) {
        damageActor(actor, actor===target && headshot ? damage*3 : damage, tick);
      }
    }
    if (source !== 'rover' && (hitKind === 'rover' || (bloom && world.rover && withinBurst(center,world.rover,.8)))) {
      damageRover(world,damage,players);
    }
    if (source !== 'heli' && (hitKind === 'heli' || (bloom && withinBurst(center, world.heli, 1)))) {
      damageHelicopter(world, damage, players, shooter);
    }
  }
}

// Launch direction is captured from the authoritative body heading.
const launcherReady=new WeakMap();
export function launchMissile(world,kind,player,tick) {
  const v=world[kind];
  if(v.wrecked || (kind==='heli' ? v.pilot : v.driver)!==player.id || tick<(launcherReady.get(v) ?? 0)) return;
  launcherReady.set(v,tick+30);
  const offset=[...mounts[kind].launcher];
  const id=nextShotId++;
  if(id%2===0) offset[0]*=-1;
  world.missiles.push({...mountPosition(v,offset),yaw:v.yaw,source:kind,shooter:player.id,id,remaining:60});
}

export function advanceMissiles(world,players,npcs,tick) {
  world.missiles=world.missiles.filter(m=>{
    const actors=targets(world,m.shooter,players,npcs,m.source);
    const direction={x:Math.sin(m.yaw),y:0,z:-Math.cos(m.yaw)};
    const hit=tracePulse(world,actors,m,direction,1,false,m.source);
    Object.assign(m,hit.to);
    m.remaining--;
    if(!hit.hitKind && !hit.blocked) return m.remaining>0;
    applyHit(world,hit,actors,players,m.shooter,tick,75,3,true,m.source);
    world.shots.push({id:nextShotId++,shooter:m.shooter,weapon:'missile',from:hit.to,to:hit.to,headshot:hit.headshot,hit:true,hitKind:hit.hitKind,tick});
    return false;
  });
}

const nextBullet=new WeakMap();
export function fireTurret(world,kind,player,tick,players,npcs) {
  const v=world[kind], ready=nextBullet.get(v) ?? tick;
  if(player.life.hp<=0 || v.gunner!==player.id || v.wrecked || tick<ready) return;
  // The 30 Hz simulation alternates eight and seven ticks between bullets.
  nextBullet.set(v,(tick-ready<1 ? ready : tick)+7.5);
  const horizontal=Math.cos(v.turretPitch);
  const dir={x:Math.sin(v.turretYaw)*horizontal,y:Math.sin(v.turretPitch),z:-Math.cos(v.turretYaw)*horizontal};
  const pivot=mountPosition(v,mounts[kind].turret);
  const actors=targets(world,player.id,players,npcs,kind);
  const hit=tracePulse(world,actors,pivot,dir,turretRange,false,kind);
  applyHit(world,hit,actors,players,player.id,tick,34,34,false,kind);
  const d=Math.min(.64,Math.hypot(hit.to.x-pivot.x,hit.to.y-pivot.y,hit.to.z-pivot.z));
  const from={x:pivot.x+dir.x*d,y:pivot.y+dir.y*d,z:pivot.z+dir.z*d};
  world.shots.push({id:nextShotId++,shooter:player.id,weapon:'turret',from,to:hit.to,headshot:hit.headshot,
    hit:Boolean(hit.hitKind),hitKind:hit.hitKind,targetId:hit.target?.id ?? hit.hitKind,tick});
}
