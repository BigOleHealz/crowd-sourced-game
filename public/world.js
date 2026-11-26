import {inTankOpening} from './tank-wall-cuts.js';
import {grandTopAt,poolSurface} from './grand-resort-layout.js';
import {towerFloor,towerRail,stepPlatformLadder} from './marina-platform.js';
import {boardAt,boardHeight,stepDive} from './estate-diving.js';
import {swimColumn,carryScuba} from './scuba.js';
import {swimmingPoolAt,poolFloorAt} from './swimming-pools.js';
import {residenceSpirals,spiralForHouse,spiralWell,spiralSolid,spiralSupport} from './residential-spirals.js';
import {upperShellTop} from './tower-glass.js';
import {advanceRideLanding} from './skate-touchdown.js';
import {isBoardTrick,stepSkateJam} from './skate-jam.js';
import {inSkatePark,rideParkRail} from './skate-park.js';
import {landBoard,rideTravelYaw,rollingMotion} from './street-rides.js';
import {interiorPlans,initializeBuildingInteriors,furnishedSupport,furnishedFloorTop,roomDoorTop,interiorCeiling,approachRamp} from './building-interiors.js';
import {ruinedHouseAt,houseRubbleHeight} from './residential-sites.js';
import {balconySurfaces} from './balcony-surfaces.js';
import {noise} from './terrain-noise.js';
import {breachedFloor,inTowerBreach,collapsedLot,towerCollapsed,rubbleHeight} from './tower-damage.js';
import {estateSolids,estateSupportLimit} from './estate-damage.js';
import {fenceDown} from './military-island.js';
import {church,churchLot,churchParts,churchFloor,churchCeiling,churchTerrace} from './ridge-church.js';
import {casaFloor,casaCeiling} from './casa-luma.js';
import {mareFloor,mareCeiling} from './palazzo-mare.js';
import {yachtFloorAt,yachtWalkBlocked} from './yacht-layout.js';
import {northTrail,northRocks,northernPines,ridgeBench} from './north-ridge.js';
import {shopFloor,shopCeiling} from './street-shop-layout.js';
import {faceAt,frontageOpenToRound,frontageSupportOpening,retailSurface,brokenSpan,retailRoom,retailHeadroom} from './frontage-glass.js';
import {galleryTopAt,galleryRoomAt,galleryFloor,galleryCeiling} from './gallery-lobbies.js';
import {postDown} from './street-lamps.js';
import {storefrontFloor,storefrontCeiling,hasStorefrontRooms,facadePiers,storefrontRoom,storefrontTopAt,storefrontHeadroom} from './storefront-layout.js';
import {findLedge,stepClimb} from './ledge-climb.js';
import {lookoutFloor} from './beach-layout.js';
import {beachHutFloor} from './harbor-key-structures.js';
// Coordinates are metres. Positions refer to the player's feet, with Y up.
// Both the authoritative server and the predicting client use this module.
import {trailMarkers} from './scenery-layout.js';
import { vehicleContact } from './vehicle-contact.js';
import { brickellMap, cityGround, coastalBedHeight, militaryShoreBedHeight, militaryShoreRocks, parapetTop, waterfront } from './brickell-map.js';
import {militaryRockTopAt} from './military-shore-rocks.js';
import {onRunway} from './runway-layout.js';
import {militaryHelipads} from './military-island.js';
import {carrierRampRailBlocked} from './eisenhower-carrier-layout.js';
export const CITY = typeof location === 'object'
  ? (new URLSearchParams(location.search).get('map') ?? 'brickell') === 'brickell'
  : typeof process !== 'undefined' && process.env.GOY_THEFT_AUTO_MAP === 'brickell';
export const MAP = CITY ? brickellMap : {
  bounds:38, northBound:-90, flightNorth:-84, northTrail,
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

// The western skyline is closer than the eastern bay. All water users share
// this chart, including swimmers and dismounted or falling crew.
export const travelBounds={west:MAP.westBound ?? -MAP.bounds,east:MAP.bounds,
  north:MAP.northBound ?? -MAP.bounds,south:MAP.southBound??MAP.bounds};
const flightMargin=CITY?220:120;
export const flightBounds={
  west:travelBounds.west-flightMargin,east:travelBounds.east+flightMargin,
  north:travelBounds.north-flightMargin,south:travelBounds.south+flightMargin,
  ceiling:CITY?220:150
};
export function insideTravelArea(x,z,halfX=0,halfZ=halfX) {
  return x-halfX>=travelBounds.west && x+halfX<=travelBounds.east &&
    z-halfZ>=travelBounds.north && z+halfZ<=travelBounds.south;
}

export const HELIPAD = CITY ? {x:militaryHelipads[0].x,z:militaryHelipads[0].z} : { x: 4, z: 14 };
MAP.barriers=[...(MAP.barriers ?? []), ...(CITY ? facadePiers : [])];
if (!CITY) {
  MAP.rocks.push(...northRocks);
  MAP.barriers.push(...churchParts,{x:ridgeBench.x,z:ridgeBench.z,w:2.35,d:.55,h:.77},...trailMarkers.map(({x,z,h,postId})=>({x,z,postId,w:.14,d:.15,h})),
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
  return (!CITY && churchLot(x,z,margin)) || MAP.buildings.some(b=>Math.abs(x-b.x)<b.w/2+margin && Math.abs(z-b.z)<b.d/2+margin);
}

export function podiumTop(b,x,z,pad,probe,roof,doors,round=false){
  if(!CITY)return furnishedFloorTop(b,x,z,pad,probe,doors,round)??roof;
  if(ruinedHouseAt(doors,b.x,b.z))return -Infinity;
  // Rubble is already the terrain height. The building's padded wall probe
  // would otherwise create an invisible step just outside the visible mound.
  if(towerCollapsed(b,doors))return -Infinity;
  if(doors?.tankWallCuts){
    // The shop glass is inset from the lot outline; test the actual contact
    // point when the player's radius still overlaps the edge of the lot.
    const px=Math.max(b.x-b.w/2+.18,Math.min(b.x+b.w/2-.18,x));
    const pz=Math.max(b.z-b.d/2+.18,Math.min(b.z+b.d/2-.18,z));
    if(inTankOpening(doors,px,probe,pz))return -Infinity;
  }
  const breach=breachedFloor(b,x,z,Math.min(probe,roof),doors);
  if(breach!=null)return breach;
  const stair=b.finish && spiralForHouse(b);
  if(stair && spiralWell(stair,x,z) && probe<roof-.1)
    return Math.max(spiralSupport(stair,x,z,probe),spiralSolid(stair,x,z,pad,probe));
  const interior=furnishedFloorTop(b,x,z,pad,probe,doors,round);
  const shell=round && upperShellTop(b,x,z,probe,roof);
  if(round && shell!==undefined)return Math.max(shell,interior??-Infinity);
  if(interior!==undefined)return interior;
  const gallery=galleryTopAt(b,x,z,pad,probe,roof,doors,round);
  if(gallery!==undefined)return gallery;
  const face=faceAt(b,x);
  if(!face)return roof;
  if(!face.showcase)return retailSurface(face,x,z,pad,probe,roof,doors,round);
  const gap=round ? frontageOpenToRound(face,z,probe,doors) : brokenSpan(face,doors?.broken?.[face.id]??0,z,pad) ||
    frontageSupportOpening(face,z,probe,pad,doors);
  return storefrontTopAt(x,z,pad,probe,roof,doors,gap);
}

// All common contact probes have a radius of two metres or less. Index
// expanded bounds once, then run the original exact tests on local solids.
const cellWidth = 12, maxIndexedPadding = 2, emptyCell = [];
function indexFootprints(parts, circles = false) {
  const columns = new Map();
  for (const part of parts) {
    const dx = (circles ? part.radius : part.w/2) + maxIndexedPadding;
    const dz = (circles ? part.radius : part.d/2) + maxIndexedPadding;
    for (let i = Math.floor((part.x-dx)/cellWidth); i <= Math.floor((part.x+dx)/cellWidth); i++) {
      let rows = columns.get(i);
      if (!rows) columns.set(i, rows = new Map());
      for (let j = Math.floor((part.z-dz)/cellWidth); j <= Math.floor((part.z+dz)/cellWidth); j++) {
        let cell = rows.get(j);
        if (!cell) rows.set(j, cell = []);
        cell.push(part);
      }
    }
  }
  return columns;
}
function candidates(index,parts,x,z,padding) {
  if(padding>maxIndexedPadding)return parts;
  return index.get(Math.floor(x/cellWidth))?.get(Math.floor(z/cellWidth)) ?? emptyCell;
}
const buildingCells = indexFootprints(MAP.buildings);
const barrierCells = new WeakMap();
function nearbyBarriers(x, z, padding, doors) {
  const parts = estateSolids(MAP.barriers, doors);
  if (padding > maxIndexedPadding) return parts;
  let index = barrierCells.get(parts);
  if (!index || index.count !== parts.length || index.last !== parts.at(-1)) {
    index = {columns:indexFootprints(parts), count:parts.length, last:parts.at(-1)};
    barrierCells.set(parts, index);
  }
  return candidates(index.columns,parts,x,z,padding);
}

const balconyAt=balconySurfaces(CITY?MAP.buildings:[]);

// Align the models, walking collision, aim traces and aircraft clearance.
export function buildingTopAt(x,z,padding=0,maxBottom=Infinity,doors,round=false) {
  let top=CITY ? Math.max(grandTopAt(x,z,padding,maxBottom,doors),parapetTop(x,z,padding,maxBottom,doors),balconyAt(x,z,padding,maxBottom,doors,false,round)) : -Infinity;
  if(!inTankOpening(doors,x,maxBottom,z))top=Math.max(top,roomDoorTop(x,z,padding,maxBottom,doors));
  if(CITY)for(const stair of residenceSpirals){
    if(!spiralWell(stair,x,z,padding) || doors?.houseRuins?.[stair.home])continue;
    const cap=estateSupportLimit(doors,x,z);
    const hit=spiralSolid(stair,x,z,padding,Math.min(maxBottom,cap));
    if(hit<=cap)top=Math.max(top,hit);
  }
  for(const b of candidates(buildingCells,MAP.buildings,x,z,padding)) {
    const dz=Math.max(0,Math.abs(z-b.z)-padding);
    if(Math.abs(x-b.x)>b.w/2+padding || dz>b.d/2) continue;
    const roof=b.base+b.eave+b.rise*(1-2*dz/b.d);
    const surface=podiumTop(b,x,z,padding,maxBottom,roof,doors,round);
    top=Math.max(top,surface);
  }
  for(const b of nearbyBarriers(x,z,padding,doors)){
    // Expanding a walkable slab lip would add an invisible curb at its edge.
    if(b.resortShell)continue;
    if(b.fenceId && fenceDown(doors,b.fenceId))continue;
    const pad=b.flushEdge ? 0 : padding;
    if(Math.abs(x-b.x)>b.w/2+pad || Math.abs(z-b.z)>b.d/2+pad)continue;
    if(doors?.beachWood?.[b.woodId] || b.netting || (b.net!=null && doors?.nets?.[b.net]))continue;
    if(postDown(doors,b) || (b.paneId && doors?.brokenPanes?.[b.paneId]) || doors?.brokenSills?.[b.sillPaneId])continue;
    if(ruinedHouseAt(doors,b.x,b.z) || inTankOpening(doors,x,maxBottom,z))continue;
    const base=terrainHeight(b.x,b.z);
    if(inTowerBreach(MAP.buildings,doors,x,Math.min(base+b.h,maxBottom),z))continue;
    if(b.bottom===undefined || base+b.bottom<=maxBottom) top=Math.max(top,base+b.h);
  }
  return top;
}
for(const b of MAP.buildings) {
  const corners=[-1,1].flatMap(s=>[-1,1].map(t=>terrainHeight(b.x+s*b.w/2,b.z+t*b.d/2)));
  b.base=Math.max(...corners)+.13;
}
initializeBuildingInteriors(MAP.buildings,CITY,terrainHeight);
if(!CITY)for(const p of interiorPlans)if(p.glazing)MAP.barriers.push(...p.glazing);
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

if(!CITY)MAP.trees.push(...northernPines().filter(t=>!churchLot(t.x,t.z,2)));
MAP.trees.forEach((tree,i)=>{tree.treeId=i;});

function smoothstep(start, end, position) {
  const t = Math.max(0, Math.min(1, (position - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function terrainHeight(x, z) {
  if(CITY) return cityGround(x,z);
  if(onRunway(x,z,false))return .80;
  const creekCenter = 0.7 * Math.sin(x * 0.15);
  const bank = smoothstep(1.2, 4.8, Math.abs(z - creekCenter));
  const ford = 1 - smoothstep(0.9, 3.5, Math.abs(x - 16));
  const ridge = 4.8 * smoothstep(5, 24, -z) *
    (1 - smoothstep(7, 27, Math.abs(x + 4)));
  const relief = smoothstep(6, 14, Math.abs(z)) *
    (0.32 * Math.sin(x * 0.17) + 0.24 * Math.sin(z * 0.3));
  // Carry the existing northern upland through its former shoreline. The new
  // meadow is shallow, with a long, walkable rise to the granite ridge.
  const northRise=smoothstep(34,79,-z)*(5.4+2.2*Math.cos((x-4)*.063))+
    smoothstep(42,59,-z)*1.35*Math.sin((z+64)*.11+x*.035);
  const edge = Math.max(Math.abs(x),z,MAP.bounds+MAP.northBound-z);
  // Shape the wading shelf separately from the steep underwater basin.
  const shore = Math.max(0, Math.min(5, edge - (MAP.bounds - 6)));
  const lip = shore + 12 * smoothstep(MAP.bounds - 1, MAP.bounds, edge);
  const natural=0.8 - (1 - bank) * (3.0 - 2.6 * ford) + ridge + relief + northRise - lip;
  return natural+(church.base-natural)*churchTerrace(x,z);
}

export function sceneryHeight(x,z) {
  const base=terrainHeight(x,z);
  const beyond=Math.hypot(Math.max(0,Math.abs(x)-MAP.bounds),Math.max(0,z-MAP.bounds,MAP.northBound-z));
  if(!beyond) return base;
  // Continue the actual drop-off into wooded draws. Ridge crests depend on
  // world-space drainage and outcrops, so they do not trace the map perimeter.
  const basin=smoothstep(0,13,beyond);
  const broad=noise(x*.036+11,z*.037-7);
  const gullies=noise(x*.072+3,z*.065-15);
  const crest=Math.hypot(x+7,z-5)+14*(broad-.5);
  const foothills=smoothstep(47,77,crest);
  return base+basin*(3+6*gullies+foothills*(8+19*broad));
}

export function groundHeight(x, z, maxBottom=Infinity, doors) {
  if(CITY) {
    const ruin=ruinedHouseAt(doors,x,z);
    if(ruin)return houseRubbleHeight(ruin,x,z,doors.houseRuins[ruin.id]);
    const pile=collapsedLot(MAP.buildings,doors,x,z);
    if(pile)return rubbleHeight(pile,x,z,doors);
    const limit=estateSupportLimit(doors,x,z);
    const probe=Math.min(limit,maxBottom);
    const tower=towerFloor(x,z,probe);
    if(tower!==undefined)return tower;
    const board=boardAt(x,z);
    if(board && probe>=boardHeight(board,x)-.01)return boardHeight(board,x);
    const villa=casaFloor(x,z,probe);
    if(villa!==undefined)return villa<=limit+.001 ? villa : cityGround(x,z,probe,doors);
    const palace=mareFloor(x,z,probe);
    if(Number.isFinite(palace))return palace;
    const pool=swimmingPoolAt(x,z,probe);
    if(pool)return poolFloorAt(pool,x,z);
    const interior=furnishedSupport(x,z,probe,doors);
    if(interior!==undefined)return interior;
    if(galleryRoomAt(x,galleryFloor,z))return galleryFloor;
    if(storefrontRoom(x,storefrontFloor,z))return storefrontFloor;
    if(retailRoom(x,shopFloor,z))return shopFloor;
    const floor=beachHutFloor(x,z,lookoutFloor(x,z,cityGround(x,z,maxBottom,doors),doors));
    const rock=militaryRockTopAt(militaryShoreRocks,x,z,militaryShoreBedHeight,maxBottom);
    return Math.max(floor,rock??-Infinity);
  }
  const bridge = MAP.bridge;
  if (Math.abs(x - bridge.x) <= bridge.width / 2 &&
      Math.abs(z - bridge.z) <= bridge.length / 2) {
    return bridge.y;
  }
  return Math.max(sceneryHeight(x,z),churchFloor(x,z,maxBottom),furnishedSupport(x,z,maxBottom,doors)??-Infinity,approachRamp(x,z));
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
const OLLIE_SPEED = 5.4;

const obstacles = [...MAP.rocks, ...MAP.trees, ...BREAKABLES].map(prop => ({
  ...prop, top: terrainHeight(prop.x, prop.z) + prop.height,
}));

const obstacleCells = indexFootprints(obstacles, true);

function overlaps(x, z, obstacle, padding) {
  const dx = x - obstacle.x;
  const dz = z - obstacle.z;
  const radius = obstacle.radius + padding;
  return dx * dx + dz * dz < radius * radius;
}

export function solidTopAt(x, z, hp, padding = 0, maxBottom = Infinity, doors,round=false) {
  let top = Math.max(groundHeight(x,z,maxBottom,doors),buildingTopAt(x,z,padding,maxBottom,doors,round));
  for (const obstacle of candidates(obstacleCells,obstacles,x,z,padding)) {
    if (obstacle.id && hp?.[obstacle.id] === 0) continue;
    if (obstacle.treeId!=null && doors?.fallenTrees?.[obstacle.treeId]) continue;
    if (overlaps(x, z, obstacle, padding)) top = Math.max(top, obstacle.top);
  }
  return top;
}

export function blocked(x, y, z, hp, doors, height=1.7) {
  if(CITY && towerRail(x,y,z))return true;
  if(CITY && carrierRampRailBlocked(x,y,z,height,PLAYER_RADIUS))return true;
  const floor=groundHeight(x,z,y+1.7,doors);
  if (floor > y + 0.3) return true;
  const bridge = MAP.bridge;
  const rail = !CITY && Math.abs(Math.abs(x - bridge.x) - bridge.width / 2) < PLAYER_RADIUS + 0.05 &&
    Math.abs(z - bridge.z) <= 4.8 && y < bridge.y + 0.9 && y + 1.7 >= bridge.y;
  if (rail) return true;
  return solidTopAt(x, z, hp, PLAYER_RADIUS, y+height, doors) > Math.max(y, floor) + 0.001;
}

// Weight only grounded characters in the shallows. Falling, climbing and
// deck occupants keep their own movement until the buoyancy model takes over.
export function waterSurfaceAt(x,z,feetY){
  return CITY ? (poolSurface(x,feetY,z)??swimmingPoolAt(x,z,feetY)?.waterY??MAP.waterY) : MAP.waterY;
}
export function waterBlend(state){
  if(state.swimming)return 1;
  if(!state.grounded || state.onYacht || state.climb || state.parachute)return 0;
  return smoothstep(.08,.72,waterSurfaceAt(state.x,state.z,state.y)-state.y);
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

export function stepPlayer(state, input, dt, hp, world, options={}) {
  if(world?.survival?.phase==='finished')return state;
  // One jump press can catch a ledge reached during the first quarter-second
  // of the approach. Preserve launch height so the buffer never extends reach.
  if(state.liftTravel)return state;
  const submerged=(state.swimDepth??0)>.18;
  if(CITY && !submerged && (state.climb?.kind==='platformLadder' || input.jump)){
    const ladder=stepPlatformLadder(state,input,dt);
    if(ladder)return carryScuba(state,ladder,dt);
  }
  const parkBoard=CITY && state.ride?.kind==='board' && inSkatePark(state.x,state.z);
  if(parkBoard && state.grounded && isBoardTrick(input.skateTrick))input={...input,jump:true};
  if(CITY && (state.dive || input.jump || input.flipDive)){
    const dive=stepDive(state,input,dt);
    if(dive)return carryScuba(state,dive,dt);
  }
  const grabAllowed=!submerged && !state.ride && !input.interact && !input.seat && !state.stance && !state.parachute && !state.fall && !state.dead;
  const risingToBank=state.swimming && !submerged && input.swimY===1 && (state.swimDepth || input.x || input.z);
  const grab=grabAllowed && ((input.jump || risingToBank) && (state.grounded || state.swimming)
    ? {y:state.y,left:.25} : state.grab);
  const climb=state.climb || (!submerged && !state.ride && (input.jump || grab) && findLedge(state,input,hp,world,grab));
  if(climb)return carryScuba(state,stepClimb(state,climb,dt,hp,world),dt);
  const parachute = state.parachute === 'packed' && input.deploy && !input.interact ? 'open' : state.parachute;
  const requested = state.ride ? undefined : input.stance ?? state.stance;
  const stance = state.grounded && !input.jump && !parachute && !state.swimming &&
    (requested === 'crouch' || requested === 'prone') ? requested : undefined;
  const drySpeed=stance==='prone'?1.05:stance==='crouch'?2.25:parachute==='open'?3.6:parachute?2.3:input.sprint?7.4:4.6;
  const wade=waterBlend(state);
  // Flippers propel an equipped swimmer at the surface and underwater alike.
  // Apply a surface gear toggle on this tick so movement and equipment agree.
  const flippers=state.swimming && ((state.swimDepth??0)<=.06 && input.toggleScuba ? !state.scuba : state.scuba);
  const speed=state.swimming?(flippers?4.35:3.05):drySpeed+(Math.min(3.05,drySpeed)-drySpeed)*wade;
  const ix = Number.isFinite(input.x) ? input.x : 0;
  const iz = Number.isFinite(input.z) ? input.z : 0;
  const scale = speed / Math.max(1, Math.hypot(ix, iz));
  let vx=ix*scale, vz=iz*scale;
  let ride;
  const boardAir=state.ride?.kind==='board' && (!state.grounded || input.jump);
  if(state.ride){
    let grade=0;
    if(state.grounded){
      const ahead=.40,yaw=rideTravelYaw(state.ride);
      const rise=groundHeight(state.x+Math.sin(yaw)*ahead,state.z-Math.cos(yaw)*ahead,state.y+.28,world?.doors)-state.y;
      // A curb or a drop-off is a contact, not a steep slope.
      if(Math.abs(rise)<.14)grade=rise/ahead;
    }
    ride=rollingMotion(state.ride,input,dt,state.grounded,grade,boardAir);
  }
  if(ride){
    if(boardAir && !state.grounded){
      vx=state.vx??0;vz=state.vz??0;
    }else{
      const heading=rideTravelYaw(boardAir?state.ride:ride);
      vx=Math.sin(heading)*ride.speed;vz=-Math.cos(heading)*ride.speed;
    }
  }else if(state.grounded && !parachute) {
    const oldX=state.vx ?? 0, oldZ=state.vz ?? 0;
    const change=Math.hypot(vx-oldX,vz-oldZ);
    const acceleration=ix || iz ? 37 : 47;
    const blend=Math.min(1,acceleration*dt/(change || 1));
    vx=oldX+(vx-oldX)*blend;vz=oldZ+(vz-oldZ)*blend;
  }
  let { x, y, z, vy = 0, grounded = false } = state;
  if (input.jump && grounded && (ride?.kind!=='bike' || CITY && inSkatePark(x,z))) {
    grounded = false;
    vy = ride?.kind==='board' ? OLLIE_SPEED : ride ? 4.7 : JUMP_SPEED;
  }
  // Resolving each horizontal axis separately lets players slide along a wall.
  const height=state.swimming?1.12:stanceBodyHeight(stance);
  const doors=world?.doors;
  // A submerged swimmer must meet the same shore apron that the sand mesh shows.
  // Surface swimmers and boats keep their existing approach and boarding rules.
  const sandBlocks=(nx,nz)=>CITY && options.swimmerSand!==false && submerged && state.swimming && coastalBedHeight(nx,nz)>y-.10;
  if (vx) {
    if (yachtWalkBlocked(world?.yacht,x+vx*dt,y,z,height) || blocked(x+vx*dt,y,z,hp,doors,height) || sandBlocks(x+vx*dt,z)) vx=0;
    else x+=vx*dt;
  }
  if (vz) {
    if (yachtWalkBlocked(world?.yacht,x,y,z+vz*dt,height) || blocked(x,y,z+vz*dt,hp,doors,height) || sandBlocks(x,z+vz*dt)) vz=0;
    else z+=vz*dt;
  }
  // Bailouts inherit the flight area. After landing outside the walking map,
  // allow the crew to move back in without snapping them across the chart.
  const limits=parachute?flightBounds:travelBounds;
  const west=Math.min(state.x,limits.west),east=Math.max(state.x,limits.east);
  const north=Math.min(state.z,limits.north),south=Math.max(state.z,limits.south);
  if(x<west || x>east)vx=0;
  if(z<north || z>south)vz=0;
  x=Math.max(west,Math.min(east,x));z=Math.max(north,Math.min(south,z));
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
  // A swimmer underneath the projecting board remains in the basin.
  const floorProbe=CITY && state.swimming && boardAt(x,z) ? y+.26 : y+height;
  let floor = Math.max(groundHeight(x,z,floorProbe,doors),contact.floor);
  if(CITY && options.swimmerSand!==false && waterfront(x,z) && !state.ride &&
    (state.swimming || state.grounded && y<MAP.waterY+1))
    floor=Math.max(floor,coastalBedHeight(x,z));
  const top = solidTopAt(x, z, hp, PLAYER_RADIUS,y+.01,doors);
  if (y >= top-.005) floor = Math.max(floor,top);
  const draft=.72, floatY=waterSurfaceAt(x,z,y)-draft;
  const sandShallow=CITY && options.swimmerSand!==false && !state.ride && waterfront(x,z) &&
    coastalBedHeight(x,z)>floatY-.10;
  const deep=!sandShallow && floor<floatY+(state.swimming?.08:-.03);
  if(deep && y<=floatY+.20 && vy<=.2){
    return {x,z,vx,vy:0,vz,grounded:false,swimming:true,
      ...swimColumn(state,input,y,floatY+draft,floor,dt,contact.ceiling),
      ...(grab?.left>dt && {grab:{y:grab.y,left:grab.left-dt}})};
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
    const ruined=CITY && ruinedHouseAt(doors,x,z);
    const support=ruined?-Infinity:estateSupportLimit(doors,x,z);
    let ceiling=CITY?Math.min(contact.ceiling,casaCeiling(x,state.y,z,support)-height,mareCeiling(x,state.y,z,support)-height):Math.min(contact.ceiling,churchCeiling(x,state.y,z)-height);
    ceiling=Math.min(ceiling,interiorCeiling({x,y:state.y,z},doors)-height);
    const shops=CITY && !ruined && !collapsedLot(MAP.buildings,doors,x,z);
    if(shops && state.y<shopCeiling)ceiling=Math.min(ceiling,retailHeadroom(x,z,PLAYER_RADIUS)-height);
    if(shops && state.y<storefrontCeiling)ceiling=Math.min(ceiling,storefrontHeadroom(x,z,PLAYER_RADIUS)-height);
    if(shops && state.y<galleryCeiling && galleryRoomAt(x,galleryFloor,z) && !residenceSpirals.some(s=>spiralWell(s,x,z)))ceiling=Math.min(ceiling,galleryCeiling-height);
    if(CITY && vy>0)ceiling=Math.min(ceiling,balconyAt(x,z,PLAYER_RADIUS,state.y+height,doors,true)-height);
    if(y>ceiling) {y=ceiling;vy=0;}
    if (y <= floor && vy <= 0) {
      y = floor;
      vy = 0;
      grounded = true;
    }
  }
  if (y < -8 && insideTravelArea(x,z)) return spawn();
  const next = { x, y, z, vx, vy, vz, grounded };
  if(ride)next.ride={...ride,speed:Math.hypot(vx,vz)};
  if(CITY && ride && (ride.grind || inSkatePark(x,z)))rideParkRail(state,next,input);
  if(boardAir && !state.grounded && next.grounded && !next.ride.grind)landBoard(next);
  if(next.grounded && next.ride)delete next.ride.ollieTurn;
  if(CITY && next.ride && (ride.landing || inSkatePark(x,z)))advanceRideLanding(state,next,dt);
  if(next.ride && (parkBoard || ride.run))stepSkateJam(state,next,input,dt);
  if(grab?.left>dt && !grounded)next.grab={y:grab.y,left:grab.left-dt};
  const yachtSurface=yachtFloorAt(world?.yacht,x,y,z);
  if(Number.isFinite(yachtSurface) && (grounded && Math.abs(y-yachtSurface)<.27 || !grounded && state.onYacht && y>=yachtSurface-.04))next.onYacht=true;
  if (grounded && stance) next.stance = stance;
  if (parachute && !grounded) next.parachute = parachute;
  return carryScuba(state,next,dt);
}
