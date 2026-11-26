import {collapsedLot} from './tower-damage.js';
import {yachtTopAt,yachtDeckHeight,yachtLocal,yachtPad,yachtDeckY} from './yacht-layout.js';
import {nearbyHull} from './patrol-boats.js';
import { vehicleContact } from './vehicle-contact.js';
import {crashAircraftInWater,stepAircraftSinking,swimmingFromAircraft} from './aircraft-water.js';
import { CITY, MAP, flightBounds, HELIPAD, BOARD_RANGE, blocked, groundHeight, onBuildingLot, solidTopAt, spawn } from './world.js';
import {militaryHelipads} from './military-island.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const AIRFRAME_HP = 500;
export const RECOVERY_SECONDS = 6;
const COAST_SECONDS = 1.5;

// Velocity and contact history belong to the server, not its public snapshots.
const flightStates = new WeakMap();

export function flightState(heli) { return flightStates.get(heli); }
export function restoreFlightState(heli) {
  flightStates.set(heli,{...heli.motion});
}

export const SECOND_HELIPAD={x:militaryHelipads[1].x,z:militaryHelipads[1].z};
export function parkedHelicopter(pad=HELIPAD) {
  const heli = {
    ...pad, y: groundHeight(pad.x, pad.z), yaw: 0, pitch: 0, roll: 0, pilot: null, gunner: null, turretYaw: 0, turretPitch: 0, grounded: true,
    fuel:100, hp: AIRFRAME_HP, maxHp: AIRFRAME_HP, abandonedFor: null, wrecked: false, recoverySeconds: 0,
  };
  flightStates.set(heli, { vx: 0, vy: 0, vz: 0, tiltX: 0, tiltZ: 0, yawRate: 0, sideContact: false, floorContact: false });
  return heli;
}

export function damageHelicopter(world, damage, players, shooterId = null,team,owner,kind='heli') {
  const heli = world[kind];
  if (heli.wrecked || !(damage > 0) || !Number.isFinite(damage)) return false;
  if (shooterId != null && shooterId === heli.pilot) return false;
  heli.hp = Math.max(0, heli.hp - damage);
  if (heli.hp === 0) {
    world.wanted?.record(owner,'wreck');
    world.rules?.wreckVehicle(team,'heli');
    for (const [seat,id] of [heli.pilot,heli.gunner].entries()) {
      const pilot=players?.get(id);
      if (!pilot) continue;
      pilot.state = heli.sinking ? swimmingFromAircraft(heli,seat ? -1 : 1) :
        world.rules?.spawn(pilot) ?? spawn(pilot.id - 1);
      pilot.moving = false;
      pilot.sprint = false;
      pilot.inputs.length = 0;
    }
    heli.pilot = null;
    heli.gunner = null;
    heli.abandonedFor = null;
    heli.wrecked = true;
    heli.recoverySeconds = RECOVERY_SECONDS;
  }
  return true;
}

// Advance the same airframe after the seat is released, even without pilot input.
function airPosition(h,motion,dt){
  return {x:clamp(h.x+motion.vx*dt,flightBounds.west,flightBounds.east),
    z:clamp(h.z+motion.vz*dt,flightBounds.north,flightBounds.south)};
}

function driftAfterBailout(world, dt, players,kind='heli') {
  const h = world[kind], motion = flightStates.get(h);
  h.abandonedFor += dt;
  const coasting = h.abandonedFor <= COAST_SECONDS;
  // A hovering craft tips gently forward. A moving craft retains its existing course.
  if (coasting && Math.hypot(motion.vx, motion.vz) < 3) {
    motion.vx += Math.sin(h.yaw) * 2 * dt;
    motion.vz -= Math.cos(h.yaw) * 2 * dt;
  }
  motion.vy = coasting ? approach(motion.vy, -.35, 3*dt) : Math.max(-14, motion.vy-7*dt);
  h.yaw += (coasting ? .09 : .48) * dt;
  const {x,z}=airPosition(h,motion,dt);
  const y = Math.min(flightBounds.ceiling, h.y + motion.vy*dt);
  const floor = flightFloor(x, z, world.hp,world);
  if (y <= floor) {
    // At a side impact retain the last clear position instead of jumping atop the obstacle.
    if (h.y >= floor) Object.assign(h, {x, y:floor, z});
    const water=floor===MAP.waterY+.6 && crashAircraftInWater(world,h,x,z,Math.hypot(motion.vx,motion.vz),motion.vy);
    damageHelicopter(world, h.hp, players,null,undefined,undefined,kind);
    if(water)h.recoverySeconds=8;
    return;
  }
  Object.assign(h, {x,y,z});
}

export function recoverHelicopter(world, dt, players,kind='heli') {
  const heli = world[kind];
  if(heli.pilot==null && !heli.wrecked && heli.abandonedFor==null && (flightStates.get(heli).roofDrop || lostRoof(world,kind))){
    fly(world,{x:0,z:0,lift:0,aimYaw:heli.yaw},dt,players,kind);
    return;
  }
  if (heli.abandonedFor != null) return driftAfterBailout(world, dt, players,kind);
  if (!heli.wrecked) return;
  if(heli.sinking){
    stepAircraftSinking(world,heli,dt);
    heli.recoverySeconds=Math.max(0,heli.recoverySeconds-dt);
    if(heli.recoverySeconds<.0001)world[kind]=parkedHelicopter(kind==='heli2'?SECOND_HELIPAD:HELIPAD);
    return;
  }
  const ground = Math.max(groundHeight(heli.x, heli.z, Infinity,world.doors), MAP.waterY);
  heli.y = Math.max(ground, heli.y - dt * 6);
  heli.grounded = heli.y <= ground;
  heli.recoverySeconds = Math.max(0, heli.recoverySeconds - dt);
  if (heli.recoverySeconds < 0.0001) world[kind] = parkedHelicopter(kind==='heli2'?SECOND_HELIPAD:HELIPAD);
}

// Only the stopped component of a motion counts. A skimming hit loses less
// hull than a square impact; slow taps can land without losing any hull.
export function impactDamage(stoppedSpeed) {
  return Math.max(0, Math.round((stoppedSpeed - 3) * 12));
}

function approach(current, target, maxDelta) {
  return current + clamp(target - current, -maxDelta, maxDelta);
}

// Wheel contact points in local metres after the airframe model's 1.24 scale.
const wheels = [[-1.22, -.85], [1.22, -.85], [0, 4.23]];
function roofSupportsWheels(h, floor, hp, doors) {
  const c = Math.cos(h.yaw), s = Math.sin(h.yaw);
  return wheels.every(([side, aft]) => {
    const x = h.x + side*c - aft*s, z = h.z + side*s + aft*c;
    // Padding keeps the fuselage clear of walls, but cannot support a wheel in midair.
    return onBuildingLot(x, z) && Math.abs(solidTopAt(x, z, hp,0,Infinity,doors) - floor) < .02;
  });
}

function onFlightDeck(yacht,h,floor){
  if(!yacht || yacht.wrecked || Math.abs(floor-yacht.y-yachtDeckY)>.035)return false;
  const c=Math.cos(h.yaw),s=Math.sin(h.yaw);
  return wheels.every(([side,aft])=>{
    const p=yachtLocal(yacht,h.x+c*side-s*aft,h.z+s*side+c*aft);
    return Math.abs(p.x)<=yachtPad.halfWidth && p.z>=yachtPad.fore && p.z<=yachtPad.aft;
  });
}

function landingSite(x, z, floor, doors) {
  const y = groundHeight(x, z, Infinity, doors);
  if (y < MAP.waterY + 0.45 || floor > y + 0.05) return false;
  // Both skids need a reasonably level patch of terrain. Keep the narrow bridge clear.
  if (MAP.bridge && Math.abs(x) < MAP.bridge.width / 2 + 1 && Math.abs(z) < MAP.bridge.length / 2 + 1) return false;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dz]) =>
    Math.abs(groundHeight(x + dx, z + dz, Infinity, doors) - y) < 0.45);
}

function flightFloor(x, z, hp,world) {
  const boat=nearbyHull(world?.boats,null,x,z,world?.heli.yaw??0,1.28,3.6);
  const surface = Math.max(groundHeight(x, z, Infinity,world?.doors), MAP.waterY + 0.6, boat ? boat.y+1.45 : -Infinity);
  const clearance = Math.max(solidTopAt(x,z,hp,1.8,Infinity,world?.doors),yachtTopAt(world?.yacht,x,z,1.65));
  // The woodland has low-poly canopies broader than the trunks used for walkers.
  let floor = Math.max(surface, clearance);
  for (const tree of MAP.trees) {
    if (Math.hypot(tree.x - x, tree.z - z) < tree.height * 0.18 + 1.65) {
      floor = Math.max(floor, groundHeight(tree.x, tree.z) + tree.height + 0.2);
    }
  }
  if (MAP.bridge && Math.abs(x) <= MAP.bridge.width / 2 + 1.65 && Math.abs(z) <= MAP.bridge.length / 2 + 1.65) {
    floor = Math.max(floor, MAP.bridge.y + 1.12);
  }
  return floor;
}

function lostRoof(world,kind='heli'){
  const h=world[kind];
  return CITY && h.grounded && !h.onYacht && collapsedLot(MAP.buildings,world.doors,h.x,h.z) &&
    h.y>flightFloor(h.x,h.z,world.hp,world)+.22;
}

export function fly(world, input, dt, players,kind='heli') {
  const h = world[kind];
  if(h.wrecked)return;
  const motion=flightStates.get(h);
  if(lostRoof(world,kind)){
    h.grounded=false;motion.floorContact=false;motion.roofDrop=true;
  }
  const outOfFuel=h.fuel===0;
  // A windmilling rotor lets the mass settle under its remaining momentum.
  if(outOfFuel)input={x:0,z:0,lift:-.43,aimYaw:h.yaw};
  if(h.grounded && input.lift<=0)return;
  if(input.lift>0)delete motion.roofDrop;
  // The rotor disc tips toward the velocity error. Its horizontal thrust
  // accelerates the hull, while drag and the hover assist bleed off airspeed.
  const stick = Math.max(1, Math.hypot(input.x, input.z));
  const forwardInput=Math.max(0,(input.x*Math.sin(h.yaw)-input.z*Math.cos(h.yaw))/stick);
  const atSpeed=clamp((Math.hypot(motion.vx,motion.vz)-3)/4,0,1);
  // Keep the low-speed response for docking; full cyclic reaches 16.4 m/s
  // sideways and 18.4 m/s forward once translational lift builds.
  const cruise=8.2+atSpeed*(8.2+2*forwardInput), drag=.65;
  const demandX = (input.x * cruise / stick - motion.vx) * 2.1 + input.x * cruise * drag / stick;
  const demandZ = (input.z * cruise / stick - motion.vz) * 2.1 + input.z * cruise * drag / stick;
  const tiltScale = Math.min(1, 13 / (Math.hypot(demandX, demandZ) || 1));
  const response = -Math.expm1(-dt * 6);
  motion.tiltX += (demandX * tiltScale - motion.tiltX) * response;
  motion.tiltZ += (demandZ * tiltScale - motion.tiltZ) * response;
  const turn = Math.atan2(Math.sin(input.aimYaw - h.yaw), Math.cos(input.aimYaw - h.yaw));
  motion.yawRate += (clamp(3 * turn, -2.4, 2.4) - motion.yawRate) * response;
  h.yaw += motion.yawRate * dt;
  const forward = motion.tiltX * Math.sin(h.yaw) - motion.tiltZ * Math.cos(h.yaw);
  const right = motion.tiltX * Math.cos(h.yaw) + motion.tiltZ * Math.sin(h.yaw);
  h.pitch = -Math.atan2(forward, 21);
  h.roll = -Math.atan2(right, 21);
  const liftTarget = input.lift * (input.lift < 0 ? 6 : 4.8);
  const liftFraction = Math.cos(h.pitch) * Math.cos(h.roll);
  motion.vy = motion.roofDrop ? Math.max(-35,motion.vy-9.81*dt) : approach(motion.vy, liftTarget * (input.lift > 0 ? liftFraction : 1),
    (input.lift ? 8 * liftFraction : 10) * dt);
  const nextY = h.y + motion.vy * dt;
  const floor = flightFloor(h.x, h.z, world.hp, world);
  const rooftop = CITY && nextY <= floor + .22 && onBuildingLot(h.x, h.z) &&
    roofSupportsWheels(h, floor, world.hp,world.doors);
  const yachtLanding=onFlightDeck(world.yacht,h,floor);
  const rubbleLanding=motion.roofDrop && collapsedLot(MAP.buildings,world.doors,h.x,h.z) && Math.abs(floor-groundHeight(h.x,h.z,Infinity,world.doors))<.05;
  const landable = rubbleLanding || yachtLanding || rooftop || landingSite(h.x, h.z, floor,world.doors);
  const minY = floor + (landable || outOfFuel ? 0 : 0.22);
  const floorContact = nextY <= minY && motion.vy <= 0;
  if(floorContact && outOfFuel && !landable && floor===MAP.waterY+.6){
    const water=crashAircraftInWater(world,h,h.x,h.z,Math.hypot(motion.vx,motion.vz),motion.vy);
    damageHelicopter(world,h.hp,players,null,undefined,undefined,kind);
    if(water)h.recoverySeconds=8;
    return;
  }
  if(floorContact && floor===MAP.waterY+.6 && !landable &&
      crashAircraftInWater(world,h,h.x,h.z,Math.hypot(motion.vx,motion.vz),motion.vy)){
    damageHelicopter(world,h.hp,players,null,undefined,undefined,kind);
    h.recoverySeconds=8;
    return;
  }
  if (floorContact && !motion.floorContact) {
    let stoppedSpeed=rooftop?Math.hypot(motion.vx,motion.vy,motion.vz):-motion.vy;
    if(yachtLanding){
      const y=world.yacht;
      stoppedSpeed=Math.hypot(motion.vx-y.speed*Math.sin(y.yaw),motion.vy,motion.vz+y.speed*Math.cos(y.yaw));
    }
    damageHelicopter(world,impactDamage(stoppedSpeed),players,null,undefined,world.wanted?.session(players?.get(h.pilot)),kind);
  }
  motion.floorContact = floorContact;
  h.y = clamp(nextY, minY, flightBounds.ceiling);
  if (floorContact || h.y === (flightBounds.ceiling)) motion.vy = 0;
  h.grounded = (landable || outOfFuel) && floorContact;
  if(h.grounded && yachtLanding)h.onYacht=true;else delete h.onYacht;
  if (h.grounded || h.wrecked) {
    delete motion.roofDrop;
    motion.vx = 0;
    motion.vz = 0;
    motion.tiltX = motion.tiltZ = motion.yawRate = h.pitch = h.roll = 0;
    motion.sideContact = false;
    return;
  }

  motion.vx += (motion.tiltX - drag * motion.vx) * dt;
  motion.vz += (motion.tiltZ - drag * motion.vz) * dt;
  const {x,z}=airPosition(h,motion,dt);
  const clear = (tx, tz) => h.y > flightFloor(tx, tz, world.hp,world) + 0.04;
  let stoppedX = 0, stoppedZ = 0;
  if (clear(x, z)) {
    h.x = x;
    h.z = z;
  } else {
    if (clear(x, h.z)) h.x = x;
    else { stoppedX = motion.vx; motion.vx = 0; }
    if (clear(h.x, z)) h.z = z;
    else { stoppedZ = motion.vz; motion.vz = 0; }
  }
  const stoppedSpeed = Math.hypot(stoppedX, stoppedZ);
  if (stoppedSpeed > 0 && !motion.sideContact) {
    damageHelicopter(world,impactDamage(stoppedSpeed),players,null,undefined,world.wanted?.session(players?.get(h.pilot)),kind);
  }
  motion.sideContact = stoppedSpeed > 0;

}

export function interact(world, player,kind='heli') {
  const heli = world[kind];
  if (heli.wrecked) return;
  const gunning=heli.gunner===player.id;
  if (!heli.grounded) {
    if (!gunning && heli.pilot !== player.id) return;
    player.state = { x: heli.x, y: heli.y + .6, z: heli.z, vy: 0, grounded: false, parachute: 'packed' };
    // Step clear of the cabin so the jumper and aircraft separate visibly.
    for (const side of [1,-1]) {
      const x = heli.x + side * 1.85 * Math.cos(heli.yaw);
      const z = heli.z + side * 1.85 * Math.sin(heli.yaw);
      if (blocked(x, player.state.y, z, world.hp) || vehicleContact(x,player.state.y,z,world,CITY).depth>0) continue;
      Object.assign(player.state, {x,z});
      break;
    }
    if (gunning) heli.gunner=null;
    else {heli.pilot=null;heli.abandonedFor=0;}
    return;
  }
  if (!gunning && heli.pilot !== player.id) {
    const range = Math.hypot(player.state.x - heli.x, player.state.z - heli.z, player.state.y - heli.y);
    if (range > BOARD_RANGE || !player.state.grounded) return;
    if (heli.pilot==null) heli.pilot=player.id;
    else if (heli.gunner==null) {heli.gunner=player.id;heli.turretYaw=heli.yaw;heli.turretPitch=0;}
  } else {
    // Try both sides and the fore/aft directions before using the safe trailhead.
    let exit = world.rules?.spawn(player) ?? spawn(player.id - 1);
    for (let i = 0; i < 8; i++) {
      const angle = heli.yaw + i * Math.PI / 4;
      const x = heli.x + 2.15 * Math.cos(angle);
      const z = heli.z + 2.15 * Math.sin(angle);
      const y = Math.max(yachtDeckHeight(world.yacht,x,z),CITY && onBuildingLot(x,z) ? solidTopAt(x,z,world.hp,0,Infinity,world.doors) : groundHeight(x,z,Infinity,world.doors));
      if (y > MAP.waterY && Math.abs(y - heli.y) < 0.9 && !blocked(x, y, z, world.hp) && !vehicleContact(x,y,z,world,CITY).depth) {
        exit = {x,y,z,vy:0,grounded:true,...(heli.onYacht?{onYacht:true}:{})};
        break;
      }
    }
    if (gunning) heli.gunner=null; else heli.pilot=null;
    player.state = exit;
  }
}
