import { spendRound } from './magazines.js';
import {meleeItems,validEquipment} from './arcade-melee.js';
import {immersedSurface} from './water-impact.js';
import {hitMarineWildlife,marineContact} from './marine-contacts.js';
import {arcadeMolotov,throwCapsule} from './arcade-molotov.js';
import {flameProjector,fuelStop,stationContact} from './fire-sites.js';
import {burnableContact,hitFireSite} from './district-fire.js';
import {tankMuzzle} from './tank-layout.js';
import {parkedTank,damageTank} from './tank.js';
import {breachTower} from './tower-damage.js';
import {parkedJet,damageJet} from './jet.js';
import {launcherSpec,lockStatus,guideGameMissile,updateLock} from './handheld-launcher.js';
import {lotHeight,lotWidth} from './island-rules.js';
import {breachEstate,onEstate} from './estate-damage.js';
import {windowContact} from './vehicle-glass-layout.js';
import {noteGlass} from './pane-damage.js';
import {civilianLooks} from './civilian-style.js';
import {mooredYacht,damageYacht} from './superyacht.js';
import {yachtSolidAt} from './yacht-layout.js';
import {shatterPane} from './frontage-glass.js';
import {damagePost,lampHP,postDown} from './street-lamps.js';
import {newStorefrontDoors} from './storefront-layout.js';
import {posedHit} from './hit-zones.js';
import {patrolFleet,marinaFleet,damageBoat,crewBoat} from './patrol-boats.js';
import {marinaHullContains} from './marina-fleet-layout.js';
import { firearmSpecs, civilianRoundContact, tankRoundContact, roverRoundContact, supercarRoundContact, firstPaneHit, postContact, blastPosts, roundActorSweep, segmentContact } from './rounds.js';
// The server owns this transient expedition state. It survives individual joins.
import { CITY, MAP, BREAKABLES, groundHeight, solidTopAt, stanceDrop, stanceMuzzleHeight } from './world.js';
import { parkedRover, parkedSupercar, damageRover, drivenRoad } from './rover.js';
import { newSupplyRun } from './supply-run.js';
import {alertWalkersDogs,damageDog,projectileDogHit} from './dog-walkers.js';
import { damageActor } from './rivals.js';
import { damageHelicopter, parkedHelicopter } from './airframe.js';
export { parkedHelicopter, fly, interact } from './airframe.js';

import { mounts, mountPosition, vehicleById } from './mounts.js';

import {strikeFittings} from './road-fittings.js';
const clearCrystals = Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, 0]));
let nextShotId = 1;

const reportedWrecks=new WeakSet();
// Sample after the authoritative damage, collisions and crew ejection for this
// tick. The retained event shares the regular shot feed's deduplication on join.
export function reportVehicleWreck(world,vehicle,source,surface,tick) {
  if(!vehicle.wrecked){reportedWrecks.delete(vehicle);return;}
  if(reportedWrecks.has(vehicle))return;
  reportedWrecks.add(vehicle);
  const at={x:vehicle.x,y:vehicle.y+(surface==='water' ? .47 : .85),z:vehicle.z};
  world.shots.push({id:nextShotId++,weapon:'vehicleWreck',source,surface,from:at,to:at,tick});
}

export function newExpedition({civilianMarina=true}={}) {
  return {
    doors:CITY?newStorefrontDoors():{},
    ...(CITY ? {yacht:mooredYacht(),supercar:parkedSupercar(),tank:parkedTank()} : {}),
    jet:parkedJet(), heli: parkedHelicopter(), rover: parkedRover(), boats:[...patrolFleet(),...(civilianMarina?marinaFleet():[])],
    hp: Object.fromEntries(BREAKABLES.map(crystal => [crystal.id, crystal.hp])),
    shots: [], missiles: [], bullets: [],
    mission: newSupplyRun(),
  };
}

const crateBodies = BREAKABLES.map(prop => ({...prop, y:groundHeight(prop.x, prop.z)}));

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
  let {x,y,z}=prone ? proneCoordinates(from,actor,true) : {x:from.x-feet.x,y:from.y-feet.y,z:from.z-feet.z};
  let dir=prone ? proneCoordinates(worldDir,actor,false) : worldDir;
  // Test the ray in the same scaled body frame that the civilian renderer uses.
  const look=CITY && civilianLooks[actor.id];
  if(look){
    const yaw=actor.yaw??0,c=Math.cos(yaw),s=Math.sin(yaw);
    const widthFactor=1/look.width-1;
    const lateral=(x*c+z*s)*widthFactor;
    x+=c*lateral;z+=s*lateral;y/=look.height;
    const lateralRay=(dir.x*c+dir.z*s)*widthFactor;
    dir={x:dir.x+c*lateralRay,y:dir.y/look.height,z:dir.z+s*lateralRay};
  }
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
export function tracePulse(world, actors, from, direction, range, assist = true, sourceVehicle = null, spacing=.2) {
  let target = null, hitKind = null, to, blocked = false, headshot=false, hitPart=null, injuryPoint=null;
  const intersections=actors.map(actor=>actorIntersection(actor,from,direction)).sort((a,b)=>a.distance-b.distance);
  const delta={x:direction.x*range,y:direction.y*range,z:direction.z*range};
  const wildlife=marineContact(world,from,
    {x:from.x+delta.x,y:from.y+delta.y,z:from.z+delta.z});
  const wildlifeDistance=wildlife ? wildlife.t*range : Infinity;
  const roverContact=sourceVehicle==='rover' ? null : roverRoundContact(world.rover,from,delta);
  const sportContact=supercarRoundContact(world.supercar,from,delta);
  const tankDistance=sourceVehicle==='tank'?Infinity:tankRoundContact(world.tank,from,delta)*range;
  const hitSport=sportContact<(roverContact?.t??Infinity);
  let roadDistance=(hitSport?sportContact:roverContact?.t??Infinity)*range;
  let road=hitSport?world.supercar:world.rover;
  for(const car of world.traffic??[]){
    const distance=civilianRoundContact(car,from,delta)*range;
    if(distance<roadDistance){roadDistance=distance;road=car;}
  }
  for(const car of world.patrolCars??[]){
    if(car.targetId!==from.shooter || car.wrecked)continue;
    const distance=civilianRoundContact(car,from,delta)*range;
    if(distance<roadDistance){roadDistance=distance;road=car;}
  }
  const post=postContact(world,from,delta);
  const pane=sourceVehicle && !assist ? firstPaneHit(world,from,delta):null;
  // Step one common arcade pulse through the world; scenery and nearer targets
  // intercept it before anything farther along the same beam.
  for (let sample=1; sample*spacing<=range+.00001;sample++) {
    const d=Math.min(range,sample*spacing,wildlifeDistance);
    to = { x: from.x + direction.x * d, y: from.y + direction.y * d, z: from.z + direction.z * d };
    if(pane?.target && pane.t<=post.t && pane.t*range<=d){
      target=pane.target;hitKind='glass';
      to={x:from.x+delta.x*pane.t,y:from.y+delta.y*pane.t,z:from.z+delta.z*pane.t};break;
    }
    if(post.target && post.t*range<=d){
      target=post.target;hitKind=target.lamp!=null?'lamp':'post';
      to={x:from.x+delta.x*post.t,y:from.y+delta.y*post.t,z:from.z+delta.z*post.t};break;
    }
    if (to.y <= solidTopAt(to.x, to.z, clearCrystals,0,to.y,world.doors,!!sourceVehicle && !assist)) { blocked = true; break; }
    const lot=world.match?.lots.find(l=>l.hp && l.carrier==null && Math.abs(to.x-l.x)<=lotWidth/2 && Math.abs(to.z-l.z)<=lotWidth/2 && to.y>=l.y && to.y<=l.y+lotHeight);
    if(lot){target=lot;hitKind='insured';break;}
    if(yachtSolidAt(world.yacht,to.x,to.y,to.z)){target=world.yacht;hitKind=target.id;break;}
    const halo = assist ? Math.min(0.7, d * 0.05) : 0;
    const crateIndex = crateBodies.findIndex(crate => world.hp[crate.id] > 0 &&
      insideBody(to, crate, crate.radius, crate.height, halo));
    target = BREAKABLES[crateIndex];
    if (target) { hitKind = 'crystal'; break; }
    if (world.jet && sourceVehicle!=='jet' && !world.jet.wrecked && insideBody(to,world.jet,1.35,1.8,halo)) {
      target=world.jet;hitKind='jet';break;
    }
    if (sourceVehicle !== 'heli' && !world.heli.wrecked && insideBody(to, world.heli, 1.15, 1.95, halo)) {
      target = world.heli; hitKind = 'heli'; break;
    }
    if(d>=tankDistance && tankDistance<roadDistance){
      to={x:from.x+direction.x*tankDistance,y:from.y+direction.y*tankDistance,z:from.z+direction.z*tankDistance};
      target=world.tank;hitKind='tank';break;
    }
    if(d>=roadDistance){
      to={x:from.x+direction.x*roadDistance,y:from.y+direction.y*roadDistance,z:from.z+direction.z*roadDistance};
      hitKind=road.id??road.kind??'rover';target=road;break;
    }
    const boat=world.boats?.find(b=>{
      if(b.wrecked||b.id===sourceVehicle)return false;
      if(b.boatModel)return marinaHullContains(b,to.x,to.y,to.z,halo);
      const dx=to.x-b.x,dz=to.z-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw);
      const side=Math.abs(dx*c+dz*s),along=-dx*s+dz*c,up=to.y-b.y;
      return up>=-.50-halo && up<=1.05+halo && side<=1.04+halo && Math.abs(along)<=2.65+halo;
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
    if(d>=wildlifeDistance){
      target=wildlife.target;hitKind=wildlife.kind;break;
    }
  }
  return { target, hitKind, to, blocked, headshot, hitPart, injuryPoint };
}

// A queued command may cross the shoreline between receipt and simulation.
// Keep the last land selection and require a release after a held swim input.
export function updateHandheldGear(player,input,wasSwimming,world){
  const held=input?.fire || input?.tracking || input?.handheldHeld;
  if(wasSwimming || player.state.swimming || input?.fromSwimming){
    player.launcherLock=null;
    delete player.meleeSwing;
    if(input)player.releaseSwimTrigger=!!held;
    return false;
  }
  if(typeof input?.holster==='boolean' && input.holster!==!!player.holstered && canUseHandheld(world,player)){
    player.holstered=input.holster;
    player.launcherLock=null;
    delete player.meleeSwing;
    player.releaseSwimTrigger=!!held;
    if(!player.holstered && validEquipment(input.weapon))player.weapon=input.weapon;
  }
  if(player.holstered){
    if(input)player.releaseSwimTrigger=!!held;
    return false;
  }
  if(input){
    if(!held)player.releaseSwimTrigger=false;
    if(validEquipment(input.weapon) && !player.releaseSwimTrigger){
      if(player.weapon!==input.weapon)delete player.meleeSwing;
      player.weapon=input.weapon;
    }
  }
  return !player.releaseSwimTrigger;
}

export function trackLauncher(world,player,input,tick,players,npcs){
  if(player.holstered || player.releaseSwimTrigger){player.launcherLock=null;return;}
  const p=player.state;
  updateLock(world,player,{...input,from:{x:p.x,y:p.y+stanceMuzzleHeight(p),z:p.z}},tick,(w,from,dir,range)=>tracePulse(w,targets(w,player.id,players,npcs),from,dir,range,false,'handLauncher'));
}

export function canUseHandheld(world,player){
  const s=player.state,id=player.id;
  return player.life.hp>0 && !player.life.fall && !s.swimming && !s.climb && !s.ride && !s.dive && !s.parachute && !s.liftTravel &&
    player.clubSince==null && world.casino?.player!==id && !world.volleyballActivity?.member(id) &&
    !world.basketball?.players.includes(id) && world.yacht?.driver!==id && world.yacht?.gunner!==id &&
    world.tank?.driver!==id && world.jet?.pilot!==id && world.heli.pilot!==id && world.heli.gunner!==id &&
    world.rover.gunner!==id && !drivenRoad(world,id) && !crewBoat(world,id);
}

// Resolve once, on the contact frame. The server owns the facing at windup,
// the positions at contact, and the first reachable actor in the forward arc.
export function advanceMelee(world,player,tick,players,npcs){
  const swing=player.meleeSwing;
  if(!swing || tick!==swing.hitTick || !Number.isFinite(player.meleeHeading))return;
  const yaw=player.meleeHeading,pitch=player.meleePitch??0;
  delete player.meleeHeading;delete player.meleePitch;
  if(player.holstered || !canUseHandheld(world,player) || player.weapon!==swing.weapon)return;
  const spec=meleeItems[swing.weapon],s=player.state;
  const from={x:s.x,y:s.y+(spec.posedContact?stanceMuzzleHeight(s):1.03-stanceDrop(s)),z:s.z,shooter:player.id};
  const aheadX=Math.sin(yaw),aheadZ=-Math.cos(yaw);
  const close=p=>Math.abs(p.x-s.x)<=spec.range && Math.abs(p.z-s.z)<=spec.range;
  const near=[];
  for(const actor of targets(world,player.id,players,npcs,null,null,close)){
    const p=actor.state;
    const dx=p.x-s.x,dz=p.z-s.z,dy=p.y+.98-stanceDrop(p)-from.y;
    const distance=Math.hypot(dx,dy,dz);
    if(distance>spec.range || dx*aheadX+dz*aheadZ<Math.hypot(dx,dz)*Math.cos(spec.halfArc))continue;
    near.push({actor,distance,delta:{x:dx,y:dy,z:dz}});
  }
  near.sort((a,b)=>a.distance-b.distance);
  // On the closest reachable actor, prefer the exact aim through the posed
  // model; the wider sweep can still catch an actor off the centre line.
  const flat=Math.cos(pitch)*spec.range;
  const aimDelta=spec.posedContact?{x:aheadX*flat,y:Math.sin(pitch)*spec.range,z:aheadZ*flat}:null;
  for(const entry of near){
    const {actor,distance}=entry;
    let delta=entry.delta,hit;
    if(aimDelta){
      hit=segmentContact(world,from,aimDelta,[actor],new Map(),actorIntersection);
      if(hit.target===actor)delta=aimDelta;
    }
    if(hit?.target!==actor)hit=segmentContact(world,from,delta,[actor],new Map(),actorIntersection);
    if(hit.target!==actor)continue;
    if(tick<actor.life.immuneUntil || (player.team && player.team===actor.team))return;
    const fraction=spec.posedContact?Math.min(1,hit.visualT):hit.t;
    const contact={x:from.x+delta.x*fraction,y:from.y+delta.y*fraction,z:from.z+delta.z*fraction};
    const direction={x:delta.x/(distance || 1),y:0,z:delta.z/(distance || 1)};
    const hitPart=spec.posedContact?hit.hitPart:undefined;
    const limb=actor.hitPose && (hitPart==='leftArm' || hitPart==='rightArm' || hitPart==='leftLeg' || hitPart==='rightLeg')?hitPart:undefined;
    const injury=applyHit(world,{target:actor,hitKind:hit.hitKind,to:contact,hitPart:limb},[actor],players,player.id,tick,spec.damage,0,false,'melee',direction,0,spec.damage,player.score,world.wanted?.session(player));
    swing.hit=true;swing.contact=contact;
    if(hitPart){swing.hitPart=hitPart;swing.victim=actor.id;}
    if(limb && injury===limb)swing.severed=true;
    return;
  }
}

export function fire(world, player, input, tick, players, npcs) {
  if (player.holstered || player.releaseSwimTrigger || player.state.swimming || world.yacht?.driver===player.id || player.life.hp === 0 || tick < player.fireReady || world.heli.pilot === player.id || drivenRoad(world,player.id)) return;
  const melee=meleeItems[player.weapon];
  if(melee){
    if(!canUseHandheld(world,player) || !Number.isFinite(input.aimYaw) || input.interact || input.seat)return;
    player.fireReady=tick+melee.cooldown;
    player.meleeHeading=input.aimYaw;
    if(melee.posedContact)player.meleePitch=Number.isFinite(input.aimPitch)?input.aimPitch:0;
    player.meleeSwing={seq:tick,weapon:player.weapon,tick,hitTick:tick+melee.windup,endTick:player.fireReady,hit:false};
    return;
  }
  const spec=player.weapon===6 ? arcadeMolotov : player.weapon===5 ? flameProjector : player.weapon===4 ? launcherSpec : firearmSpecs[player.weapon];
  if(!spec || !spendRound(player))return;
  player.fireReady=tick+spec.cooldown;
  const from={x:player.state.x,y:player.state.y+stanceMuzzleHeight(player.state),z:player.state.z};
  if(player.weapon===6){
    throwCapsule(world,nextShotId++,player,from,input,tick);
    return;
  }
  if(player.weapon===5){
    const flat=Math.cos(input.aimPitch)*spec.range;
    const d={x:Math.sin(input.aimYaw)*flat,y:Math.sin(input.aimPitch)*spec.range,z:-Math.cos(input.aimYaw)*flat};
    const actors=targets(world,player.id,players,npcs);
    const hit=segmentContact(world,{...from,shooter:player.id},d,actors,new Map(),actorIntersection);
    const t=Math.min(1,hit.t),to={x:from.x+d.x*t,y:from.y+d.y*t,z:from.z+d.z*t};
    if(hit.hitKind==='player' || hit.hitKind==='npc'){
      const actor=hit.target;
      if(!actor.state.swimming && tick>=actor.life.immuneUntil && !(player.team && player.team===actor.team)){
        const burn=actor.life.burn??={next:tick};
        burn.until=tick+90;
        burn.shooter=player.id;
        tagShot(world,burn,player);
        alertWalkersDogs(world,actor.id,player.id,players,tick);
      }
    }else if(Number.isFinite(hit.t)){
      hitFireSite(world.doors,burnableContact(hit,to),to,tick,true,player.team);
    }
    world.shots.push({id:nextShotId++,shooter:player.id,weapon:'ember',from,to,tick});
    return;
  }
  if(player.weapon===4){
    const lock=lockStatus(player,tick);
    const id=nextShotId++;
    const m={...from,id,shooter:player.id,source:'handLauncher',yaw:input.aimYaw,pitch:input.aimPitch,remaining:launcherSpec.range};
    if(lock?.progress===1 && input.tracking)m.lock=lock.key;
    world.missiles.push(m);
    tagShot(world,m,player);
    world.shots.push({id,shooter:player.id,weapon:'launch',from,to:from,tick});
    return;
  }
  sendRound(world,player,player.weapon,null,from,input.aimYaw,input.aimPitch,tick);

}

function targets(world,shooter,players,npcs,source=null,round,swept) {
  return [...players.values(), ...npcs].filter(actor =>
    actor.life.hp>0 && actor.id!==shooter && (!swept || swept(actor.state)) &&
    (!actor.officer || (actor.targetId===shooter && (!round || world.wanted?.owner(round)))) && actor.id!==world.tank?.driver && !world.traffic?.some(car=>car.npcDriver===actor.id) && actor.id!==world.jet?.pilot && !crewBoat(world,actor.id) && actor.id!==world.heli.pilot && actor.id!==world.heli.gunner && !drivenRoad(world,actor.id) && (source!=='rover' || actor.id!==world.rover?.gunner));
}

function reportWaterHit(world,victim,body,waterline,impact,dead,blast,size,tick){
  if(waterline===undefined)return;
  const to={x:impact?.x??body.x,y:Math.min(waterline-.06,impact?.y??body.y+.24),z:impact?.z??body.z};
  world.shots.push({id:nextShotId++,weapon:'waterHit',victim,to,waterline,dead,blast,size,tick});
}

function applyHit(world,{target,hitKind,to,blocked,headshot,hitPart,injuryPoint,wheel},actors,players,shooter,tick,damage,crystalDamage,areaImpact,source=null,direction,vehicleDamage=damage,headshotDamage=damage*3,score,owner) {
  let injury=null;
  if(hitKind==='insured')world.rules?.damageLot(score?.team,target,damage);
  if(hitKind==='vehicleGlass'){
    const {vehicle,paneId}=target;
    (vehicle.brokenGlass??={})[paneId]=true;noteGlass(world.doors,to);
    if(vehicle===world.yacht && source!=='superyacht')damageYacht(world,vehicleDamage,score?.team,owner);
    return null;
  }
  if(hitKind==='glass'){
    if(shatterPane(world.doors,target))world.rules?.brokenPane(score?.team,to,target.id??(target.face.id+'-'+target.index));
    if(!areaImpact)return null;
  }
  if(hitKind==='lamp' || hitKind==='post'){
    damagePost(world.doors,target,damage);
    if(postDown(world.doors,target))world.rules?.brokenPost(score?.team,target);
  }
  if (hitKind || (areaImpact && blocked)) {
    // Center a crystal burst on the formation so the visible cluster clears together.
    const center = hitKind === 'crystal' ? { x: target.x, y: groundHeight(target.x, target.z) + target.height / 2, z: target.z } : to;
    const blastRemains=(p,height,size)=>{
      const at={x:p.x,y:p.y+height,z:p.z};
      world.shots.push({id:nextShotId++,weapon:'bodyBlast',from:at,to:at,size,tick});
    };
    hitMarineWildlife(world,target,center,damage,areaImpact ? 3.5 : 0,(gull)=>blastRemains(gull,0,gull.size*.45));
    for(const dog of world.dogs??[]){
      if(dog!==target && !(areaImpact && withinBurst(center,dog,.34*dog.size)))continue;
      const water=dog.mode==='swimming'?immersedSurface(dog,world.doors):undefined;
      const hurt=areaImpact?damageDog(dog,damage,tick):projectileDogHit(dog,headshot?headshotDamage:damage,tick,direction,headshot);
      if(!hurt)continue;
      if(!areaImpact)injury=dog.headInjury?'dogHead':'torso';
      if(areaImpact && !dog.hp){
        dog.deathKind='blast';blastRemains(dog,.3*dog.size,.7*dog.size);
      }
      reportWaterHit(world,dog.id,dog,water,dog===target?to:null,!dog.hp,areaImpact,dog.size*.69,tick);
    }
    if(areaImpact)blastPosts(world,center,3.1,lampHP,score?.team);
    for (const crystal of BREAKABLES) {
      if ((hitKind==='crystal' && crystal.id===target.id) || (areaImpact && withinBurst(center, { ...crystal, y: groundHeight(crystal.x, crystal.z) }, crystal.height / 2))) {
        world.hp[crystal.id] = Math.max(0, world.hp[crystal.id] - crystalDamage);
      }
    }
    for (const actor of actors) {
      if(score?.team && actor.team===score.team)continue;
      if (actor === target || (areaImpact && withinBurst(center, actor.state, Math.max(.25,.9-stanceDrop(actor.state))))) {
        const priorHP=actor.life.hp;
        const water=immersedSurface(actor.state,world.doors);
        const defeated=damageActor(actor,actor===target && headshot ? headshotDamage : damage,tick,direction);
        if(defeated && areaImpact){
          actor.life.deathKind='blast';blastRemains(actor.state,.7,.95);
        }
        if(actor.id!==shooter && actor.life.hp<priorHP){
          actor.life.lastShotTick=tick;
          reportWaterHit(world,actor.id,actor.state,water,actor===target?injuryPoint??to:null,defeated,areaImpact,.88,tick);
          alertWalkersDogs(world,actor.id,shooter,players,tick);
          // One of eight incoming sectors is enough to shade the victim's HUD.
          // For splash damage use the blast centre rather than the launch path.
          const dx=areaImpact ? center.x-actor.state.x : -(direction?.x??0);
          const dz=areaImpact ? center.z-actor.state.z : -(direction?.z??0);
          actor.life.hitSector=Math.hypot(dx,dz)>.03 ? (Math.round(Math.atan2(dx,-dz)*4/Math.PI)+8)%8 : undefined;
        }
        if(defeated && actor.id!==shooter){
          if(score && score!==actor.score)score.kills++;
          world.wanted?.record(owner,actor.officer?'officer':'defeat',tick);
        }
        if(actor===target && hitPart && actor.life.hp<priorHP) {
          if(hitPart==='head' && !defeated)continue;
          if(actor.life.lostParts?.[hitPart])continue;
          injury=hitPart==='head' ? 'headPop' : hitPart;
          if(hitPart!=='torso') {
            actor.life.lostParts ??= {};
            actor.life.lostParts[hitPart] = {tick,...(injuryPoint ?? to),yaw:actor.yaw ?? 0,
              dx:direction?.x ?? 0,dz:direction?.z ?? 0};
          }
        }
      }
    }
    if(source!=='superyacht' && hitKind===world.yacht?.id && world.yacht)damageYacht(world,vehicleDamage,score?.team,owner);
    for(const b of world.boats??[]){
      if(b.id!==source && (hitKind===b.id || (areaImpact && withinBurst(center,b,.55))))damageBoat(world,b,vehicleDamage,players,owner);
    }
    function hitRoad(car,kind,burstHeight){
      if(!car || source===kind)return;
      if(hitKind!==kind && !(areaImpact && withinBurst(center,car,burstHeight)))return;
      if(!areaImpact && Number.isInteger(wheel))car.flatTires=(car.flatTires??0)|(1<<wheel);
      else {strikeFittings(car,areaImpact?center:to,vehicleDamage);damageRover(world,vehicleDamage,players,kind,score?.team,owner);}
    }
    hitRoad(world.rover,'rover',.8);
    hitRoad(world.supercar,'supercar',.55);
    for(const car of world.traffic??[])hitRoad(car,car.id,.7);
    for(const car of world.patrolCars??[]){
      if(!owner || car.targetId!==shooter || car.wrecked)continue;
      if(hitKind!==car.id && !(areaImpact && withinBurst(center,car,.7)))continue;
      car.hp=Math.max(0,car.hp-vehicleDamage);
      if(!car.hp){
        car.wrecked=true;car.speed=0;car.recoverySeconds=0;
        world.wanted.record(owner,'wreck',tick);
        reportVehicleWreck(world,car,car.id,'road',tick);
      }
    }
    if(world.tank && source!=='tank' && (hitKind==='tank' || (areaImpact && withinBurst(center,world.tank,.95))))damageTank(world,vehicleDamage,players,owner);
    if(world.jet && source!=='jet' && (hitKind==='jet' || (areaImpact && withinBurst(center,world.jet,1))))damageJet(world,vehicleDamage,players,owner);
    if (source !== 'heli' && (hitKind === 'heli' || (areaImpact && withinBurst(center, world.heli, 1)))) {
      damageHelicopter(world,vehicleDamage,players,shooter,score?.team,owner);
    }
  }
  return injury;
}

const scoreAtLaunch=new WeakMap();
function tagShot(world,round,player){
  if(player.score)scoreAtLaunch.set(round,player.score);
  world.wanted?.tag(round,player);
}

// Patrol fire is a target-only arcade effect. Geometry, people and occupied
// vehicles intercept sight. A bystander can neither receive the hit nor have
// their vehicle damaged by it.
export function patrolSight(world,officer,player,players){
  const a=officer.state,b=player.state;
  const from={x:a.x,y:a.y+1.36,z:a.z},dx=b.x-a.x,dy=b.y+.92-stanceDrop(b)-from.y,dz=b.z-a.z;
  const range=Math.hypot(dx,dy,dz);
  if(range<.05 || range>29)return;
  const dir={x:dx/range,y:dy/range,z:dz/range};
  const hit=tracePulse(world,[...players.values()].filter(p=>p.life.hp),from,dir,range+.8,false,'patrol',.28);
  if(hit.target===player || (hit.target && [hit.target.driver,hit.target.pilot,hit.target.gunner].includes(player.id)))
    return {from,to:hit.to,direction:dir};
}
export function firePatrolShot(world,officer,player,sight,tick,damage){
  const {from,to,direction}=sight;
  const hp=player.life.hp,water=immersedSurface(player.state,world.doors);
  const defeated=damageActor(player,damage,tick,direction);
  if(player.life.hp<hp){
    player.life.lastShotTick=tick;
    reportWaterHit(world,player.id,player.state,water,to,defeated,false,.88,tick);
  }
  world.shots.push({id:nextShotId++,shooter:officer.id,weapon:'muzzle',firedWeapon:2,from,to:from,tick});
  world.shots.push({id:nextShotId++,shooter:officer.id,weapon:2,from,to,hit:true,targetId:player.id,tick});
}


// Launch direction is captured from the authoritative body heading.
const launchState=new WeakMap();
const missileStep=source=>source==='jet'?2:1;
export function launchMissile(world,kind,player,tick) {
  const v=world[kind];
  const previous=launchState.get(v);
  if(v.wrecked || (kind==='heli' || kind==='jet' ? v.pilot : v.driver)!==player.id || tick<(previous?.ready ?? 0)) return;
  const offset=[...mounts[kind].launcher];
  const id=nextShotId++;
  const side=kind==='heli' ? -(previous?.side ?? -1) : (id%2===0 ? -1 : 1);
  launchState.set(v,{ready:tick+30,side});
  offset[0]*=side;
  const from=mountPosition(v,offset);
  world.shots.push({id,shooter:player.id,weapon:'launch',from,to:from,tick});
  world.missiles.push({...from,yaw:v.yaw,pitch:v.pitch ?? 0,source:kind,shooter:player.id,id,side,remaining:60/missileStep(kind)});
  tagShot(world,world.missiles.at(-1),player);
}

export function fireTank(world,player,tick){
  const t=world.tank;
  if(!t || t.driver!==player.id || !player.life.hp || t.wrecked || tick<(launchState.get(t)?.ready??0))return;
  const from=tankMuzzle(t),id=nextShotId++;
  launchState.set(t,{ready:tick+38});
  world.shots.push({id,shooter:player.id,weapon:'launch',source:'tank',from,to:from,tick});
  const shell={...from,yaw:t.turretYaw,pitch:t.turretPitch,source:'tank',shooter:player.id,id,remaining:60};
  world.missiles.push(shell);
  tagShot(world,shell,player);
}

const nextBomb=new WeakMap();
export function dropJetBomb(world,player,tick){
  const jet=world.jet;
  if(jet.pilot!==player.id || !player.life.hp || jet.grounded || jet.wrecked || tick<(nextBomb.get(jet)??0))return;
  const horizontal=jet.speed*Math.cos(jet.pitch);
  const bomb={...mountPosition(jet,[0,-.22,0]),id:nextShotId++,source:'jet',bomb:true,shooter:player.id,
    yaw:jet.yaw,pitch:jet.pitch,vx:Math.sin(jet.yaw)*horizontal,vz:-Math.cos(jet.yaw)*horizontal,
    vy:jet.speed*Math.sin(jet.pitch),remaining:600};
  world.missiles.push(bomb);
  tagShot(world,bomb,player);
  nextBomb.set(jet,tick+60);
}

function traceBomb(world,actors,bomb){
  bomb.vy-=18/30;
  const speed=Math.hypot(bomb.vx,bomb.vy,bomb.vz);
  if(speed<1e-8)return {to:{x:bomb.x,y:bomb.y,z:bomb.z}};
  const direction={x:bomb.vx/speed,y:bomb.vy/speed,z:bomb.vz/speed};
  bomb.yaw=Math.atan2(bomb.vx,-bomb.vz);
  bomb.pitch=Math.atan2(bomb.vy,Math.hypot(bomb.vx,bomb.vz));
  const range=speed/30;
  const hit=tracePulse(world,actors,bomb,direction,range,false,'jet',range/Math.ceil(range/.1));
  if(hit.to.y<=MAP.waterY && direction.y<0){
    const distance=Math.max(0,(MAP.waterY-bomb.y)/direction.y);
    return {to:{x:bomb.x+direction.x*distance,y:MAP.waterY,z:bomb.z+direction.z*distance},blocked:true};
  }
  return hit;
}

// Keep the damage clock on the server so extra hits refresh the duration
// without stacking timers, and everyone observes the same health and flames.
export function stepBurningActors(world,players,npcs,tick){
  function step(actor){
    const life=actor.life,burn=life.burn;
    if(!burn)return;
    if(!life.hp || actor.state.swimming || tick>=burn.until || tick<life.immuneUntil){
      delete life.burn;
      return;
    }
    if(tick<burn.next)return;
    burn.next=tick+15;
    if(damageActor(actor,8,tick)){
      const score=scoreAtLaunch.get(burn);
      if(score)score.kills++;
      world.wanted?.record(world.wanted.owner(burn),actor.officer?'officer':'defeat',tick);
      delete life.burn;
    }
  }
  for(const p of players.values())step(p);
  for(const n of npcs)step(n);
}

export function advanceThrowables(world,players,npcs,tick){
  if(!world.throwables)return;
  const live=world.throwables;
  for(let i=live.length-1;i>=0;i--){
    const s=live[i],dt=1/30;
    const delta={x:s.vx*dt,y:(s.vy-8*dt)*dt,z:s.vz*dt};
    const hit=segmentContact(world,s,delta,targets(world,s.shooter,players,npcs),new Map(),actorIntersection);
    const ratio=Math.min(hit.t,1);
    s.x+=delta.x*ratio;s.y+=delta.y*ratio;s.z+=delta.z*ratio;s.vy-=16*dt;
    if(Number.isFinite(hit.t)){
      const at={x:s.x,y:s.y,z:s.z};
      hitFireSite(world.doors,burnableContact(hit,at),at,tick,true,s.team);
      world.shots.push({id:nextShotId++,weapon:'molotov',shooter:s.shooter,from:at,to:at,tick,water:at.y<=MAP.waterY+.03});
    }else if(tick-s.born<110)continue;
    live.splice(i,1);
  }
  if(!live.length)delete world.throwables;
}

export function advanceMissiles(world,players,npcs,tick) {
  world.missiles=world.missiles.filter(m=>{
    const actors=targets(world,m.shooter,players,npcs,m.source,m);
    if(m.source==='handLauncher')guideGameMissile(world,m);
    const pitch=m.pitch ?? 0, horizontal=Math.cos(pitch);
    const direction={x:Math.sin(m.yaw)*horizontal,y:Math.sin(pitch),z:-Math.cos(m.yaw)*horizontal};
    const hit=m.bomb?traceBomb(world,actors,m):tracePulse(world,actors,m,direction,missileStep(m.source),false,m.source,CITY && onEstate(m.x,m.z) ? .04 : .2);
    const from={x:m.x,y:m.y,z:m.z};
    Object.assign(m,hit.to);
    m.remaining--;
    if(!hit.hitKind && !hit.blocked) return m.remaining>0;
    if(CITY && hit.blocked && stationContact(hit.to))hitFireSite(world.doors,fuelStop.id,hit.to,tick,false);
    if (CITY && (hit.blocked || hit.hitKind==='glass')) {
      const cell=breachTower(MAP.buildings,world.doors,hit.to);
      if (cell!=null) world.rules?.damageProperty(scoreAtLaunch.get(m)?.team,hit.to,'tower:'+cell,'Tower structure',31_250);
    }
    if(CITY && (hit.blocked || hit.hitKind==='glass') && breachEstate(world.doors,hit.to)){
      world.rules?.damageProperty(scoreAtLaunch.get(m)?.team,hit.to,'wall:'+world.doors.estateBreaches.at(-1),'Estate wall',250_000);
    }
    const damage=m.source==='handLauncher'?launcherSpec.damage:150;
    const injury=applyHit(world,hit,actors,players,m.shooter,tick,damage,m.source==='handLauncher'?damage:3,true,m.source,direction,undefined,undefined,scoreAtLaunch.get(m),world.wanted?.owner(m));
    world.shots.push({id:nextShotId++,shooter:m.shooter,weapon:'missile',injury,injuryPoint:injury ? hit.injuryPoint : undefined,source:m.source,from,to:hit.to,targetId:hit.target?.id ?? hit.hitKind,headshot:hit.headshot,hit:true,hitKind:hit.hitKind,tick});
    return false;
  });
}

const nextBullet=new WeakMap();
export function fireTurret(world,kind,player,tick,players,npcs) {
  const v=vehicleById(world,kind);
  if(player.life.hp<=0 || (kind==='jet'?v.pilot:v.gunner)!==player.id || v.wrecked) return;
  const yaw=kind==='jet'?v.yaw:v.turretYaw, pitch=kind==='jet'?v.pitch:v.turretPitch;
  if(CITY && (kind==='heli' || kind==='jet')) {
    // Five integer time slots per tick put rounds three slots apart (50/s).
    // Reset the phase after a pause so idle time never accrues ammunition.
    const start=tick*5, end=start+5, pivot=mountPosition(v,mounts[kind].turret);
    let slot=Math.max(start,nextBullet.get(v) ?? start);
    for(;slot<end;slot+=3) {
      v.chainRounds=(v.chainRounds ?? 0)+1;
      const tracer=(v.chainRounds-1)%5===0;
      sendRound(world,player,'turret',kind,pivot,yaw,pitch,tick,tracer,(slot-start)/5);
    }
    nextBullet.set(v,slot);
    v.chainFiring=true;
    return;
  }
  const ready=nextBullet.get(v) ?? tick;
  if(tick<ready)return;
  const weapon=kind==='superyacht'?'yachtGun':'turret';
  const interval=CITY && kind==='rover' ? 3 : firearmSpecs[weapon].cooldown;
  nextBullet.set(v,(tick-ready<1 ? ready : tick)+interval);
  const pivot=mountPosition(v,mounts[kind].turret);
  sendRound(world,player,weapon,kind,pivot,yaw,pitch,tick);
}

function sendRound(world,player,weapon,source,from,yaw,pitch,tick,tracer=true,delay=0){
  const shooter=player.id;
  const spec=firearmSpecs[weapon],speed=spec.speed,flat=Math.cos(pitch);
  const round={...from,shooter,weapon,source,id:nextShotId++,vx:Math.sin(yaw)*flat*speed,
    vy:Math.sin(pitch)*speed,vz:-Math.cos(yaw)*flat*speed,left:spec.range,age:0};
  if(!tracer)round.hidden=true;
  if(delay)round.delay=delay;
  world.bullets.push(round);
  tagShot(world,round,player);
  if(tracer)world.shots.push({id:nextShotId++,shooter,weapon:'muzzle',firedWeapon:weapon,source,from,to:from,tick});
}

const lastPosition=new WeakMap();
// Current feet may be up to one full actor sweep from the positions seen by a
// round. The extra two metres contain the head, torso and rotated prone body.
const roundActorPadding=roundActorSweep+2;
export function advanceRounds(world,players,npcs,tick){
  const dt=1/30;
  world.bullets=world.bullets.filter(r=>{
    const spec=firearmSpecs[r.weapon];
    const elapsed=dt*(1-(r.delay ?? 0));
    if(r.delay)r.delay=0;
    const d={x:r.vx*elapsed,y:r.vy*elapsed,z:r.vz*elapsed};
    const step=Math.hypot(d.x,d.y,d.z),fraction=Math.min(1,r.left/step);
    d.x*=fraction;d.y*=fraction;d.z*=fraction;
    const x=r.x+d.x/2,y=r.y+d.y/2,z=r.z+d.z/2;
    const w=Math.abs(d.x)/2+roundActorPadding,h=Math.abs(d.y)/2+roundActorPadding,l=Math.abs(d.z)/2+roundActorPadding;
    const actors=targets(world,r.shooter,players,npcs,r.source,r,feet=>
      Math.abs(feet.x-x)<=w && Math.abs(feet.y-y)<=h && Math.abs(feet.z-z)<=l);
    const hit=segmentContact(world,r,d,actors,lastPosition,actorIntersection);
    const injuryPoint=hit.hitPart ? {x:r.x+d.x*hit.visualT,y:r.y+d.y*hit.visualT,z:r.z+d.z*hit.visualT} : undefined;
    const from=r.prior ?? {x:r.x,y:r.y,z:r.z}, t=Math.min(1,hit.t);
    r.prior={x:r.x,y:r.y,z:r.z};
    r.x+=d.x*t;r.y+=d.y*t;r.z+=d.z*t;r.left-=step*fraction;r.age++;
    if(hit.t===Infinity)return r.left>.00001 && r.age<90;
    const to={x:r.x,y:r.y,z:r.z};
    if(CITY && hit.target?.fireSite)hitFireSite(world.doors,hit.target.fireSite,to,tick,false);
    if(hit.target && !Number.isInteger(hit.wheel) && ['heli','rover','supercar'].includes(hit.hitKind)){
      const pane=windowContact(hit.hitKind,hit.target,to,d,CITY);
      if(pane){(hit.target.brokenGlass??={})[pane.id]=true;noteGlass(world.doors,pane);}
    }
    const injury=hit.hitKind!=='scenery' && hit.target && applyHit(world,{...hit,to,injuryPoint},actors,players,r.shooter,tick,spec.damage,spec.propDamage,false,r.source,{x:d.x/(step*fraction),z:d.z/(step*fraction)},spec.vehicleDamage,spec.headshotDamage,scoreAtLaunch.get(r),world.wanted?.owner(r));
    if(r.hidden && !hit.target && !injury)return false;
    world.shots.push({id:nextShotId++,shooter:r.shooter,weapon:r.weapon,source:r.source,from,to,traveling:true,hit:true,injury,injuryPoint:injury ? injuryPoint : undefined,
      hitKind:hit.hitKind,targetId:hit.target?.id??hit.hitKind,headshot:hit.headshot,tick});
    return false;
  });
  for(const actor of [...players.values(),...npcs])lastPosition.set(actor,{...actor.state});
}
