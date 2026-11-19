import {posedHit} from './hit-zones.js';
import {patrolFleet,damageBoat,crewBoat} from './patrol-boats.js';
import { firearmSpecs, roundDrop, segmentContact } from './rounds.js';
// The server owns this transient expedition state. It survives individual joins.
import { CITY, BREAKABLES, groundHeight, solidTopAt, stanceDrop, stanceMuzzleHeight } from './world.js';
import { parkedRover, damageRover } from './rover.js';
import { newSupplyRun } from './supply-run.js';
import { damageActor } from './rivals.js';
import { damageHelicopter, parkedHelicopter } from './airframe.js';
export { parkedHelicopter, fly, interact } from './airframe.js';

import { mounts, mountPosition, vehicleById } from './mounts.js';

const clearCrystals = Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, 0]));
let nextShotId = 1;

export function newExpedition() {
  return {
    heli: parkedHelicopter(), rover: parkedRover(), boats:patrolFleet(),
    hp: Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, crystal.hp])),
    shots: [], missiles: [], bullets: [],
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

// Rotate prone rays back into the upright body frame, preserving the ray parameter.
function proneCoordinates(vector, actor, isPoint) {
  const fx=Math.sin(actor.yaw || 0), fz=-Math.cos(actor.yaw || 0);
  const feet=actor.state;
  const x=vector.x-(isPoint ? feet.x-.96*fx : 0);
  const y=vector.y-(isPoint ? feet.y+.14 : 0);
  const z=vector.z-(isPoint ? feet.z-.96*fz : 0);
  const forward=x*fx+z*fz;
  const c=Math.cos(1.38), s=Math.sin(1.38);
  const shift=forward*(c-1)-y*s;
  return {x:x+fx*shift,y:y*c+forward*s,z:z+fz*shift};
}

function assistedActorHit(point, actor, halo) {
  if(actor.state.stance==='prone') {
    return insideBody(proneCoordinates(point,actor,true),{x:0,y:0,z:0},.39,1.72,halo);
  }
  return insideBody(point,actor.state,.39,1.72-stanceDrop(actor.state),halo);
}

// Use the same small head and wider torso for cursor picking and server damage.
// A relaxed near miss can select the body, but only a ray through the head earns a critical hit.
function actorIntersection(actor,from,worldDir) {
  const feet=actor.state;
  const prone=feet.stance==='prone';
  const {x,y,z}=prone ? proneCoordinates(from,actor,true) : {x:from.x-feet.x,y:from.y-feet.y,z:from.z-feet.z};
  const dir=prone ? proneCoordinates(worldDir,actor,false) : worldDir;
  const drop=prone ? 0 : stanceDrop(feet);
  const lean=actor.moving ? .095 : 0, yaw=actor.yaw || 0;
  const hx=(x-lean*Math.sin(yaw))/.128, hy=(y-1.69+drop)/.161, hz=(z+lean*Math.cos(yaw))/.128;
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
    const low=-y/dir.y, high=(1.54-drop-y)/dir.y;
    enter=Math.max(enter,Math.min(low,high));leave=Math.min(leave,Math.max(low,high));
  } else if(y<0 || y>1.54-drop) leave=-1;
  if(enter<=leave) body=enter;
  const distance=Math.min(head,body),headshot=head<body;
  let hitPart=null,visualT=distance;
  if(Number.isFinite(distance)) {
    const side=(x+dir.x*distance)*Math.cos(yaw)+(z+dir.z*distance)*Math.sin(yaw);
    const h=y+dir.y*distance+drop, limb=side<0 ? 'left' : 'right';
    hitPart=headshot ? 'head' : h<.91 ? limb+'Leg' : h>1.14 && Math.abs(side)>.19 ? limb+'Arm' : 'torso';
    if(!headshot) {
      const posed=posedHit(actor,from,worldDir,enter,leave);
      if(posed) {hitPart=posed.part;visualT=posed.visualT;}
    }
  }
  return {actor,distance,headshot,hitPart,visualT};
}

// Also used by the third-person camera to find the depth under the cursor.
export function tracePulse(world, actors, from, direction, range, assist = true, sourceVehicle = null) {
  let target = null, hitKind = null, to, blocked = false, headshot=false, hitPart=null, injuryPoint=null;
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
    const boat=world.boats?.find(b=>{
      if(b.wrecked||b.id===sourceVehicle||to.y<b.y-.50-halo||to.y>b.y+1.05+halo)return false;
      const dx=to.x-b.x,dz=to.z-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw);
      return Math.abs(dx*c+dz*s)<=1.04+halo && Math.abs(-dx*s+dz*c)<=2.65+halo;
    });
    if(boat){target=boat;hitKind=boat.id;break;}
    const direct=intersections[0];
    if(direct && direct.distance<=d+.00001) {
      target=direct.actor;headshot=direct.headshot;hitPart=direct.hitPart;
      injuryPoint={x:from.x+direction.x*direct.visualT,y:from.y+direction.y*direct.visualT,z:from.z+direction.z*direct.visualT};
      to={x:from.x+direction.x*direct.distance,y:from.y+direction.y*direct.distance,z:from.z+direction.z*direct.distance};
    } else if(assist) {
      target=intersections.find(entry=>entry.distance===Infinity && assistedActorHit(to,entry.actor,halo))?.actor;
    }
    if (target) { hitKind = typeof target.id === 'number' ? 'player' : 'npc'; break; }
  }
  return { target, hitKind, to, blocked, headshot, hitPart, injuryPoint };
}

export function fire(world, player, input, tick, players, npcs) {
  if (player.state.swimming || player.life.hp === 0 || tick < player.fireReady || world.heli.pilot === player.id || world.rover?.driver === player.id) return;
  const spec=firearmSpecs[player.weapon];
  player.fireReady=tick+spec.cooldown;
  const from={x:player.state.x,y:player.state.y+stanceMuzzleHeight(player.state),z:player.state.z};
  sendRound(world,player.id,player.weapon,null,from,input.aimYaw,input.aimPitch,tick);

}

function targets(world,shooter,players,npcs,source=null) {
  return [...players.values(), ...npcs].filter(actor =>
    actor.id !== shooter && !crewBoat(world,actor.id) && actor.id !== world.heli.pilot && actor.id !== world.heli.gunner && actor.id !== world.rover?.driver && (source!=='rover' || actor.id!==world.rover?.gunner) && actor.life.hp > 0);
}

function applyHit(world,{target,hitKind,to,blocked,headshot,hitPart,injuryPoint},actors,players,shooter,tick,damage,crystalDamage,areaImpact,source=null,direction) {
  let injury=null;
  if (hitKind || (areaImpact && blocked)) {
    // Center a crystal burst on the formation so the visible cluster clears together.
    const center = hitKind === 'crystal' ? { x: target.x, y: groundHeight(target.x, target.z) + target.height / 2, z: target.z } : to;
    for (const crystal of BREAKABLES) {
      if ((hitKind==='crystal' && crystal.id===target.id) || (areaImpact && withinBurst(center, { ...crystal, y: groundHeight(crystal.x, crystal.z) }, crystal.height / 2))) {
        world.hp[crystal.id] = Math.max(0, world.hp[crystal.id] - crystalDamage);
      }
    }
    for (const actor of actors) {
      if (actor === target || (areaImpact && withinBurst(center, actor.state, Math.max(.25,.9-stanceDrop(actor.state))))) {
        const priorHP=actor.life.hp;
        damageActor(actor, actor===target && headshot ? damage*3 : damage, tick, direction);
        if(actor===target && hitPart && actor.life.hp<priorHP) {
          injury=actor.life.lostParts?.[hitPart] ? null : hitPart;
          if(hitPart!=='torso') {
            actor.life.lostParts ??= {};
            actor.life.lostParts[hitPart] ??= {tick,...(injuryPoint ?? to),yaw:actor.yaw ?? 0,
              dx:direction?.x ?? 0,dz:direction?.z ?? 0};
          }
        }
      }
    }
    for(const b of world.boats??[]){
      if(b.id!==source && (hitKind===b.id || (areaImpact && withinBurst(center,b,.55))))damageBoat(world,b,damage,players);
    }
    if (source !== 'rover' && (hitKind === 'rover' || (areaImpact && world.rover && withinBurst(center,world.rover,.8)))) {
      damageRover(world,damage,players);
    }
    if (source !== 'heli' && (hitKind === 'heli' || (areaImpact && withinBurst(center, world.heli, 1)))) {
      damageHelicopter(world, damage, players, shooter);
    }
  }
  return injury;
}

// Launch direction is captured from the authoritative body heading.
const launchState=new WeakMap();
export function launchMissile(world,kind,player,tick) {
  const v=world[kind];
  const previous=launchState.get(v);
  if(v.wrecked || (kind==='heli' ? v.pilot : v.driver)!==player.id || tick<(previous?.ready ?? 0)) return;
  const offset=[...mounts[kind].launcher];
  const id=nextShotId++;
  const side=kind==='heli' ? -(previous?.side ?? -1) : (id%2===0 ? -1 : 1);
  launchState.set(v,{ready:tick+30,side});
  offset[0]*=side;
  const from=mountPosition(v,offset);
  world.shots.push({id,shooter:player.id,weapon:'launch',from,to:from,tick});
  world.missiles.push({...from,yaw:v.yaw,pitch:v.pitch ?? 0,source:kind,shooter:player.id,id,side,remaining:60});
}

export function advanceMissiles(world,players,npcs,tick) {
  world.missiles=world.missiles.filter(m=>{
    const actors=targets(world,m.shooter,players,npcs,m.source);
    const pitch=m.pitch ?? 0, horizontal=Math.cos(pitch);
    const direction={x:Math.sin(m.yaw)*horizontal,y:Math.sin(pitch),z:-Math.cos(m.yaw)*horizontal};
    const hit=tracePulse(world,actors,m,direction,1,false,m.source);
    const from={x:m.x,y:m.y,z:m.z};
    Object.assign(m,hit.to);
    m.remaining--;
    if(!hit.hitKind && !hit.blocked) return m.remaining>0;
    const injury=applyHit(world,hit,actors,players,m.shooter,tick,75,3,true,m.source,direction);
    world.shots.push({id:nextShotId++,shooter:m.shooter,weapon:'missile',injury,injuryPoint:injury ? hit.injuryPoint : undefined,source:m.source,from,to:hit.to,targetId:hit.target?.id ?? hit.hitKind,headshot:hit.headshot,hit:true,hitKind:hit.hitKind,tick});
    return false;
  });
}

const nextBullet=new WeakMap();
export function fireTurret(world,kind,player,tick,players,npcs) {
  const v=vehicleById(world,kind), ready=nextBullet.get(v) ?? tick;
  if(player.life.hp<=0 || v.gunner!==player.id || v.wrecked || tick<ready) return;
  const interval=CITY && kind==='rover' ? 3 : firearmSpecs.turret.cooldown;
  nextBullet.set(v,(tick-ready<1 ? ready : tick)+interval);
  const pivot=mountPosition(v,mounts[kind].turret);
  sendRound(world,player.id,'turret',kind,pivot,v.turretYaw,v.turretPitch,tick);
}

function sendRound(world,shooter,weapon,source,from,yaw,pitch,tick){
  const spec=firearmSpecs[weapon],speed=spec.speed,flat=Math.cos(pitch);
  world.bullets.push({...from,shooter,weapon,source,id:nextShotId++,vx:Math.sin(yaw)*flat*speed,
    vy:Math.sin(pitch)*speed,vz:-Math.cos(yaw)*flat*speed,left:spec.range,age:0});
  world.shots.push({id:nextShotId++,shooter,weapon:'muzzle',firedWeapon:weapon,source,from,to:from,tick});
}

const lastPosition=new WeakMap();
export function advanceRounds(world,players,npcs,tick){
  const dt=1/30;
  world.bullets=world.bullets.filter(r=>{
    const spec=firearmSpecs[r.weapon],actors=targets(world,r.shooter,players,npcs,r.source);
    const d={x:r.vx*dt,y:r.vy*dt-roundDrop*dt*dt/2,z:r.vz*dt};
    const step=Math.hypot(d.x,d.y,d.z),fraction=Math.min(1,r.left/step);
    d.x*=fraction;d.y*=fraction;d.z*=fraction;
    const hit=segmentContact(world,r,d,actors,lastPosition,actorIntersection);
    const injuryPoint=hit.hitPart ? {x:r.x+d.x*hit.visualT,y:r.y+d.y*hit.visualT,z:r.z+d.z*hit.visualT} : undefined;
    const from=r.prior ?? {x:r.x,y:r.y,z:r.z}, t=Math.min(1,hit.t);
    r.prior={x:r.x,y:r.y,z:r.z};
    r.x+=d.x*t;r.y+=d.y*t;r.z+=d.z*t;r.vy-=roundDrop*dt*fraction;r.left-=step*fraction;r.age++;
    if(hit.t===Infinity)return r.left>.00001 && r.age<90;
    const to={x:r.x,y:r.y,z:r.z};
    const injury=hit.target && applyHit(world,{...hit,to,injuryPoint},actors,players,r.shooter,tick,spec.damage,spec.propDamage,false,r.source,{x:d.x/(step*fraction),z:d.z/(step*fraction)});
    world.shots.push({id:nextShotId++,shooter:r.shooter,weapon:r.weapon,source:r.source,from,to,traveling:true,hit:true,injury,injuryPoint:injury ? injuryPoint : undefined,
      hitKind:hit.hitKind,targetId:hit.target?.id??hit.hitKind,headshot:hit.headshot,tick});
    return false;
  });
  for(const actor of [...players.values(),...npcs])lastPosition.set(actor,{...actor.state});
}
