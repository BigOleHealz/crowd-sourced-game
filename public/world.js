import {storefrontFloor,storefrontCeiling,hasStorefrontRooms,facadePiers,storefrontRoom,storefrontTopAt,storefrontHeadroom} from './storefront-layout.js';
import {findLedge,stepClimb} from './ledge-climb.js';
import {lookoutFloor} from './beach-layout.js';
// Coordinates are metres. Positions refer to the player's feet, with Y up.
// Both the authoritative server and the predicting client use this module.
import {trailMarkers} from './scenery-layout.js';
import { vehicleContact } from './vehicle-contact.js';
import { brickellMap, cityGround, parapetTop } from './brickell-map.js';
export const CITY = typeof location === 'object'
  ? new URLSearchParams(location.search).get('map') === 'brickell'
  : typeof process !== 'undefined' && process.env.PINEWATCH_MAP === 'brickell';
export const MAP = CITY ? brickellMap : {
  bounds: 38,
  waterY: -1.2,
  bridge: { x: 0, z: 0, width: 3.4, length: 10, y: 0.8 },
  lookout: { x: -4, z: -24 },
  trail: [
    [0, 15], [0.5, 10], [0, 5], [0, -5], [-2, -11],
    [-6, -17], [-4, -24], [3, -23], [10, -17], [15, -10],
    [16, -4], [16, 4], [14, 10], [9, 16], [4, 17], [0, 15],
  ],
  buildings: [
    {x:-9.3,z:-7.8,w:10.2,d:5.6,eave:5.1,rise:1.25},
    {x:9.7,z:6.0,w:6.4,d:4.4,eave:3.55,rise:.82,garage:true},
    {x:-13.8,z:15.2,w:7.9,d:4.2,eave:3.25,rise:.68,garage:true},
    {x:8.7,z:-25.8,w:7.3,d:4.8,eave:4.75,rise:1.12},
  ],
  rocks: [
    { x: -4, z: 11.5, radius: 1.3, height: 1.45 },
    { x: 5, z: 7, radius: 1.6, height: 1.7 },
    { x: -7, z: 1.2, radius: 1.85, height: 2.3 },
    { x: 8.5, z: -1, radius: 1.05, height: 1.3 },
    { x: -8, z: -10, radius: 1.6, height: 2.1 },
    { x: -11, z: -19, radius: 2.4, height: 3.4 },
    { x: 1, z: -15.5, radius: 1.25, height: 1.35 },
    { x: -7, z: -28, radius: 1.6, height: 2.25 },
    { x: 6, z: -26, radius: 2.2, height: 2.8 },
    { x: 20, z: -11, radius: 1.5, height: 1.9 },
    { x: 19.5, z: 8, radius: 1.4, height: 1.55 },
    { x: 7, z: 21, radius: 1.5, height: 1.65 },
  ],
  trees: [],
};

export const HELIPAD = CITY ? {x:15,z:12} : { x: 4, z: 14 };
MAP.barriers=[...(MAP.barriers ?? []), ...(CITY ? facadePiers : [])];
if (!CITY) {
  MAP.barriers.push(...trailMarkers.map(({x,z,h})=>({x,z,w:.14,d:.15,h})),
    {x:HELIPAD.x+3.20,z:HELIPAD.z-2.85,w:.09,d:.09,h:3.18});
}

export const BOARD_RANGE = 3.5;
export const BREAKABLES = [
  { id: 'trailhead', x: 0, z: 10, radius: 1.15, height: 2.6, hp: 3 },
  { id: 'twin', x: 2.1, z: 9.4, radius: 0.76, height: 1.7, hp: 3 },
  { id: 'switchback', x: -4, z: -14, radius: 1.35, height: 3, hp: 3 },
  { id: 'lookout', x: -3, z: -21, radius: 0.95, height: 2.1, hp: 3 },
  { id: 'ford', x: 16, z: 6.5, radius: 1.1, height: 2.4, hp: 3 },
  { id: 'creek', x: 17.8, z: 7.2, radius: 0.6, height: 1.5, hp: 3 },
];

if (CITY) {
  const sites=[[23,19],[24.5,17],[3,-32],[35,-19],[-33,3],[-32,4.5]];
  BREAKABLES.forEach((p,i)=>{[p.x,p.z]=sites[i];});
}

export function onBuildingLot(x,z,margin=0) {
  return MAP.buildings.some(b=>Math.abs(x-b.x)<b.w/2+margin && Math.abs(z-b.z)<b.d/2+margin);
}

// Align the models, walking collision, aim traces and aircraft clearance.
export function buildingTopAt(x,z,padding=0,maxBottom=Infinity,doors) {
  let top=CITY ? parapetTop(x,z,padding,maxBottom) : -Infinity;
  for(const b of MAP.buildings) {
    const dz=Math.max(0,Math.abs(z-b.z)-padding);
    if(Math.abs(x-b.x)>b.w/2+padding || dz>b.d/2) continue;
    const roof=b.base+b.eave+b.rise*(1-2*dz/b.d);
    const surface=CITY && hasStorefrontRooms(b) ? storefrontTopAt(x,z,padding,maxBottom,roof,doors) : roof;
    top=Math.max(top,surface);
  }
  for(const b of MAP.barriers ?? []){
    if(Math.abs(x-b.x)>b.w/2+padding || Math.abs(z-b.z)>b.d/2+padding) continue;
    const base=terrainHeight(b.x,b.z);
    if(b.bottom===undefined || base+b.bottom<=maxBottom) top=Math.max(top,base+b.h);
  }
  return top;
}
for(const b of MAP.buildings) {
  const corners=[-1,1].flatMap(s=>[-1,1].map(t=>terrainHeight(b.x+s*b.w/2,b.z+t*b.d/2)));
  b.base=Math.max(...corners)+.13;
}
MAP.rocks=MAP.rocks.filter(r=>!onBuildingLot(r.x,r.z,r.radius*.65));

// Deterministic groves. Keep foliage out of the spawn clearing, creek and path.
for (let i = 0; !CITY && i < 9; i++) {
  for (let j = 0; j < 9; j++) {
    const x = -30 + i * 7.4 + Math.sin(i * 5 + j) * 2.2;
    const z = -30 + j * 7.4 + Math.cos(j * 4 + i) * 2.2;
    if (Math.abs(z) < 4.7 || Math.hypot(x, z - 16) < 5) continue;
    const byTrail = MAP.trail.some(([ax, az], k) => {
      if (k === 0) return false;
      const [bx, bz] = MAP.trail[k - 1];
      const dx = bx - ax;
      const dz = bz - az;
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      return Math.hypot(x - ax - t * dx, z - az - t * dz) < 4;
    });
    const byRock = MAP.rocks.some(rock => Math.hypot(x - rock.x, z - rock.z) < rock.radius + 1.2);
    if (byTrail || byRock || onBuildingLot(x,z,1.1)) continue;
    const height = 5.6 + 2.8 * (0.5 + 0.5 * Math.sin(i * 3 + j * 9));
    MAP.trees.push({ x, z, height, radius: height * 0.035 });
  }
}

function smoothstep(start, end, position) {
  const t = Math.max(0, Math.min(1, (position - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function terrainHeight(x, z) {
  if(CITY) return cityGround(x,z);
  const creekCenter = 0.7 * Math.sin(x * 0.15);
  const bank = smoothstep(1.2, 4.8, Math.abs(z - creekCenter));
  const ford = 1 - smoothstep(0.9, 3.5, Math.abs(x - 16));
  const ridge = 4.8 * smoothstep(5, 24, -z) *
    (1 - smoothstep(7, 27, Math.abs(x + 4)));
  const relief = smoothstep(6, 14, Math.abs(z)) *
    (0.32 * Math.sin(x * 0.17) + 0.24 * Math.sin(z * 0.3));
  const edge = Math.max(Math.abs(x), Math.abs(z));
  // Shape the wading shelf separately from the steep underwater basin.
  const shore = Math.max(0, Math.min(5, edge - (MAP.bounds - 6)));
  const lip = shore + 12 * smoothstep(MAP.bounds - 1, MAP.bounds, edge);
  return 0.8 - (1 - bank) * (3.0 - 2.6 * ford) + ridge + relief - lip;
}

export function groundHeight(x, z, maxBottom=Infinity) {
  if(CITY) {
    if(storefrontRoom(x,storefrontFloor,z))return storefrontFloor;
    return lookoutFloor(x,z,cityGround(x,z,maxBottom));
  }
  const bridge = MAP.bridge;
  if (Math.abs(x - bridge.x) <= bridge.width / 2 &&
      Math.abs(z - bridge.z) <= bridge.length / 2) {
    return bridge.y;
  }
  return terrainHeight(x, z);
}

export function spawn(index = 0) {
  const slot = Math.abs(Math.trunc(index)) % 16;
  const x = [-0.475, 0.475, -1.425, 1.425][slot % 4];
  const z = 15 + Math.floor(slot / 4) * 0.95;
  return { x, y: groundHeight(x, z), z, vy: 0, grounded: true };
}

const PLAYER_RADIUS = 0.32;
const GRAVITY = 19;
const JUMP_SPEED = 7.1;

const obstacles = [...MAP.rocks, ...MAP.trees, ...BREAKABLES].map(prop => ({
  ...prop, top: terrainHeight(prop.x, prop.z) + prop.height,
}));

function overlaps(x, z, obstacle, padding) {
  const dx = x - obstacle.x;
  const dz = z - obstacle.z;
  const radius = obstacle.radius + padding;
  return dx * dx + dz * dz < radius * radius;
}

export function solidTopAt(x, z, hp, padding = 0, maxBottom = Infinity, doors) {
  let top = Math.max(groundHeight(x,z,maxBottom),buildingTopAt(x,z,padding,maxBottom,doors));
  for (const obstacle of obstacles) {
    if (obstacle.id && hp?.[obstacle.id] === 0) continue;
    if (overlaps(x, z, obstacle, padding)) top = Math.max(top, obstacle.top);
  }
  return top;
}

export function blocked(x, y, z, hp, doors, height=1.7) {
  const floor=groundHeight(x,z,y+1.7);
  if (floor > y + 0.3) return true;
  const bridge = MAP.bridge;
  const rail = !CITY && Math.abs(Math.abs(x - bridge.x) - bridge.width / 2) < PLAYER_RADIUS + 0.05 &&
    Math.abs(z - bridge.z) <= 4.8 && y < bridge.y + 0.9 && y + 1.7 >= bridge.y;
  if (rail) return true;
  return solidTopAt(x, z, hp, PLAYER_RADIUS, y+height, doors) > Math.max(y, floor) + 0.001;
}

export function stanceBodyHeight(stance) {
  return stance === 'prone' ? .54 : stance === 'crouch' ? 1.28 : 1.8;
}

export function stanceDrop(state) {
  return state.stance === 'prone' ? .98 : state.stance === 'crouch' ? .49 : 0;
}

export function stanceMuzzleHeight(state) {
  return 1.3 - stanceDrop(state) * (state.stance === 'prone' ? .78 : 1);
}

export function stepPlayer(state, input, dt, hp, world) {
  const climb=state.climb || (input.jump && findLedge(state,input,hp,world));
  if(climb) return stepClimb(state,climb,dt,hp,world);
  const parachute = state.parachute === 'packed' && input.deploy && !input.interact ? 'open' : state.parachute;
  const requested = input.stance ?? state.stance;
  const stance = state.grounded && !input.jump && !parachute && !state.swimming &&
    (requested === 'crouch' || requested === 'prone') ? requested : undefined;
  const speed = stance === 'prone' ? 1.05 : stance === 'crouch' ? 2.25 : state.swimming ? 3.05 : parachute === 'open' ? 3.6 : parachute ? 2.3 : input.sprint ? 7.4 : 4.6;
  const ix = Number.isFinite(input.x) ? input.x : 0;
  const iz = Number.isFinite(input.z) ? input.z : 0;
  const scale = speed / Math.max(1, Math.hypot(ix, iz));
  let vx=ix*scale, vz=iz*scale;
  if(state.grounded && !parachute) {
    const oldX=state.vx ?? 0, oldZ=state.vz ?? 0;
    const change=Math.hypot(vx-oldX,vz-oldZ);
    const acceleration=ix || iz ? 37 : 47;
    const blend=Math.min(1,acceleration*dt/(change || 1));
    vx=oldX+(vx-oldX)*blend;vz=oldZ+(vz-oldZ)*blend;
  }
  let { x, y, z, vy = 0, grounded = false } = state;
  if (input.jump && grounded) {
    grounded = false;
    vy = JUMP_SPEED;
  }
  // Resolving each horizontal axis separately lets players slide along a wall.
  const height=stanceBodyHeight(stance);
  const doors=world?.doors;
  if (!blocked(x+vx*dt,y,z,hp,doors,height)) x+=vx*dt; else vx=0;
  if (!blocked(x,y,z+vz*dt,hp,doors,height)) z+=vz*dt; else vz=0;
  // Water reaches every outer edge. Stay at the limit and allow movement
  // parallel to it, including a swimmer turning back toward the shoreline.
  if (x < -MAP.bounds || x > MAP.bounds) vx=0;
  if (z < (MAP.northBound ?? -MAP.bounds) || z > MAP.bounds) vz=0;
  x=Math.max(-MAP.bounds,Math.min(MAP.bounds,x));
  z=Math.max(MAP.northBound ?? -MAP.bounds,Math.min(MAP.bounds,z));
  let contact=vehicleContact(x,y,z,world,CITY,height);
  // Project out of the hull and remove only the velocity into its surface.
  // Recheck adjacent sections when a corner touches more than one shape.
  for(let pass=0; contact.depth>.00001 && pass<5; pass++) {
    const nx=contact.dx/contact.depth,nz=contact.dz/contact.depth;
    const px=x+contact.dx, pz=z+contact.dz;
    if(blocked(px,y,pz,hp,doors,height)) {x=state.x;z=state.z;vx=vz=0;break;}
    x=px;z=pz;
    const inward=Math.min(0,vx*nx+vz*nz);
    vx-=inward*nx;vz-=inward*nz;
    contact=vehicleContact(x,y,z,world,CITY,height);
  }
  let floor = Math.max(groundHeight(x, z,y+height),contact.floor);
  const top = solidTopAt(x, z, hp, PLAYER_RADIUS,y+.01,doors);
  if (y >= top) floor = Math.max(floor,top);
  const draft=.72, floatY=MAP.waterY-draft;
  const deep=floor<floatY+(state.swimming?.08:-.03);
  if(deep && y<=floatY+.20 && vy<=.2){
    // Damp the last part of a fall on entry, then converge to surface height.
    const blend=-Math.expm1(-9*dt);
    const nextY=Math.max(floatY-.16,y+(floatY-y)*blend);
    return {x,y:nextY,z,vx,vy:0,vz,grounded:false,swimming:true};
  }
  if(state.swimming && !deep && floor<=y+.31) {
    y=floor;grounded=true;vy=0;
  }
  if (grounded && y - floor <= 0.28) {
    y = floor;
    vy = 0;
  } else {
    grounded = false;
    vy -= GRAVITY * dt;
    if (parachute === 'open') vy = Math.max(vy, -2.8);
    y += vy * dt;
    let ceiling=contact.ceiling;
    if(CITY && state.y<storefrontCeiling)ceiling=Math.min(ceiling,storefrontHeadroom(x,z,PLAYER_RADIUS)-height);
    if(y>ceiling) {y=ceiling;vy=0;}
    if (y <= floor && vy <= 0) {
      y = floor;
      vy = 0;
      grounded = true;
    }
  }
  if (y < -8 || Math.abs(x)>MAP.bounds || z>MAP.bounds || z<(MAP.northBound ?? -MAP.bounds)) return spawn();
  const next = { x, y, z, vx, vy, vz, grounded };
  if (grounded && stance) next.stance = stance;
  if (parachute && !grounded) next.parachute = parachute;
  return next;
}
