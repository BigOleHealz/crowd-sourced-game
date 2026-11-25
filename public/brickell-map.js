import {seabedHeight,reefAnchorTop,reefGridSpacing} from './reef-channel.js';
import {shorePads,resortGround,onDrive} from './palma-site.js';
import {dockHeight,marinaDecks,marinaFittings} from './marina-docks.js';
import {resortBarriers} from './casino-layout.js';
import {bankSite,bankParcelTowerId} from './bank-site.js';
import {stationBarriers} from './fire-sites.js';
import {club,clubSolids} from './club-lucero.js';
import {marketHalls} from './harbor-market.js';
import {estateGlassBarriers} from './estate-exterior-glass.js';
import {casaBarriers,casaRails} from './casa-luma.js';
import {estateBarriers,berthing} from './lantern-buildings-layout.js';
import {lanternLand,lanternBridge,lanternPalms,bollards,benches,quayLamps,signBarriers,onLanternRoad,marketPiers,onMarketPier,pierDeck,ferrySlip,slipHeight} from './lantern-point.js';
import {keyGround} from './offshore-keys.js';
import {streetLamps} from './street-lamps.js';
import {waterfrontRoads,contains} from './waterfront-roads.js';
import {onAirfield} from './runway-layout.js';
import {skateParkFloor} from './skate-park.js';
import {leafSurface} from './drawbridges.js';
import {causewayArch} from './causeway-arch.js';
import {harborSigns,beachSigns,signalPost} from './scenery-layout.js';
import {beach,onBeach, sandHeight, beachBarriers} from './beach-layout.js';
import {beachClubFixtures,beachClubFloor} from './beach-club.js';
import {basketballBarriers,basketballFloor} from './basketball-layout.js';
import {harborHouses, coastalStructureBarriers} from './harbor-key-structures.js';
// A compact, fictional Brickell waterfront district. Road, sidewalk, mesh and
// collision dimensions come from the same layout on the server and client.
export const avenues = [-38, 0, 32];
export const streets = [-45, -9, 27, 61];
export const coast = { west: -76, east: 43, north: -60, south: 76 };
export const bayfrontLawns=[[-60,-49.1],[-40.9,-13.1],[-4.9,22.9],[31.1,56.9],[65.1,76]]
  .map(([north,south])=>({west:39.025,east:41.675,north:north+1,south:south-1}));
export const harbor={west:-61,east:38,north:-280,south:-152,avenue:0,crossing:-205};
export const causeway=causewayArch(-6,6,harbor.south,coast.north);
export const within=contains;
export const streetPlan=waterfrontRoads(avenues,streets,coast,harbor);
// Keep the western turning apron open beside the resort.
streetPlan.ends=streetPlan.ends.filter(e=>!(e.x===-71.5 && e.z===61));
streetPlan.curbs=streetPlan.curbs.filter(c=>!(c.x< -71.5 && c.x> -72 && Math.abs(c.z-61)<4.5));
export const bridges=[causeway,lanternBridge];
// Open the former avenue turning head into the resort drive.
streetPlan.ends=streetPlan.ends.filter(e=>!(e.x===-38 && e.z===71.5));
streetPlan.curbs=streetPlan.curbs.filter(c=>!(Math.abs(c.x+38)<9 && Math.abs(c.z-71.65)<.03));
const oldShores=[...shorePads,coast,causeway,harbor],newShores=[lanternBridge,ferrySlip,berthing.lip,...lanternLand,...marketPiers,...marinaDecks];
// The shore apron uses the same two-metre triangles as the rendered sand.
// Boats retain the surveyed bed; submerged swimmers use this visible height.
const shoreLand=[...shorePads,coast,harbor,...lanternLand];
function shoreSurvey(x,z) {
  const bed=seabedHeight(x,z);
  let distance=Infinity;
  for(const r of shoreLand){
    const dx=Math.max(r.west-x,0,x-r.east),dz=Math.max(r.north-z,0,z-r.south);
    distance=Math.min(distance,Math.hypot(dx,dz));
  }
  const t=Math.min(1,distance/9), blend=t*t*(3-2*t);
  const shore=bed+(0.80-bed)*(1-blend);
  // The beach is the top of the same ground, not a slab above the bay floor.
  // Carry its seaward lip into the reef before returning to the surveyed bed.
  const bx=Math.max(beach.west,Math.min(beach.east,x));
  const bz=Math.max(beach.north,Math.min(beach.south,z));
  const beachDistance=Math.hypot(x-bx,z-bz);
  if(beachDistance>=12)return shore;
  const u=beachDistance/12, fade=u*u*(3-2*u);
  return sandHeight(bx,bz)*(1-fade)+shore*fade;
}
export function coastalBedHeight(x,z) {
  const i=Math.floor(x/reefGridSpacing),j=Math.floor(z/reefGridSpacing);
  const x0=i*reefGridSpacing,z0=j*reefGridSpacing;
  const u=(x-x0)/reefGridSpacing,v=(z-z0)/reefGridSpacing;
  const a=shoreSurvey(x0,z0),b=shoreSurvey(x0+reefGridSpacing,z0);
  const c=shoreSurvey(x0,z0+reefGridSpacing),d=shoreSurvey(x0+reefGridSpacing,z0+reefGridSpacing);
  return u+v<=1 ? a+u*(b-a)+v*(c-a) : d+(1-u)*(c-d)+(1-v)*(b-d);
}
export const waterfront=(x,z)=>!(z<harbor.north ? newShores : oldShores).some(r=>within(r,x,z));
export const roadway=(x,z)=>z<harbor.north ? within(lanternBridge,x,z) || onLanternRoad(x,z) :
  within(causeway,x,z) || (z<coast.north ? streetPlan.island : streetPlan.mainland).some(r=>within(r,x,z));
function islandOrSeabed(x,z) {
  const shore=keyGround(x,z);
  return shore===-2.8 ? seabedHeight(x,z) : shore;
}
export function cityGround(x,z,maxBottom=Infinity,doors) {
  if(onAirfield(x,z))return .70;
  if(Math.abs(x-club.x)<club.w/2 && Math.abs(z-club.z)<club.d/2)return club.floor;
  const arrival=resortGround(x,z);if(arrival!==undefined)return arrival;
  const bridge=bridges.find(r=>within(r,x,z));
  if(bridge){
    const deck=leafSurface(bridge,z,doors?.bridgeLifts?.[bridge.north]??0);
    const road=deck??bridge.height(z,'road'), soffit=deck==null?bridge.height(z,'soffit'):deck-.65;
    return Number.isFinite(road) && maxBottom>=soffit ? road : Math.max(seabedHeight(x,z),reefAnchorTop(x,z));
  }
  if(z<=lanternBridge.north){
    const marina=dockHeight(x,z);if(marina!==undefined)return marina;
    if(within(ferrySlip,x,z))return slipHeight(x);
    if(onMarketPier(x,z))return pierDeck;
  }
  return onBeach(x,z) ? (skateParkFloor(x,z)??beachClubFloor(x,z)??basketballFloor(x,z)??sandHeight(x,z)) : waterfront(x,z) ? islandOrSeabed(x,z) : roadway(x,z) ? .70 : .80;
}

export function parapetTop(x,z,padding,maxBottom,doors) {
  const bridge=bridges.find(b=>z>=b.north-padding && z<=b.south+padding);
  if(!bridge)return -Infinity;
  const {west,east,parapetWidth,parapetHeight}=bridge;
  if (x<west-padding || x>east+padding ||
      (x>west+parapetWidth+padding && x<east-parapetWidth-padding)) return -Infinity;
  const road=leafSurface(bridge,z,doors?.bridgeLifts?.[bridge.north]??0)??bridge.height(z,'road');
  return road<=maxBottom ? road+parapetHeight : -Infinity;
}

const towers = [
  [-59,-31,17,18,39,1],[-52,10,12,19,26,3],[-61,34.85,16,7,38,0],
  [-20,-31,13,16,37,1],[-17,7,15,18,24,0],[-19,43,16,19,46,3],
  [15,-30,14,17,34,0],[17,45,14,19,42,1],[-57,-53,15,7,18,3],
  [-16,-53,17,8,39,0],[17,-54,12,7,31,1],[-56,69,13,7,28,1],
  [-18,69,15,7,22,3],[17,69,16,7,27,0],
];
const replacedTowers=new Set([2,11,12]);
const buildings=towers.map(([x,z,w,d,eave,facade],towerId)=>({
  towerId,
  x,z,w,d,eave,facade,rise:0,
  // Raised housing on the roof. Barrier heights are relative to the ground.
  housing:{x:x+w*.13,z,w:w*.45,d:d*.46,bottom:eave+.06,h:eave+1.24},
}));
const cityPlots=[...buildings,...harborHouses,...marketHalls,bankSite];
const plotIds=new WeakMap(cityPlots.map((b,id)=>[b,id]));
export const citySiteId=b=>plotIds.get(b);
// Substitute the bank in the old tower slot so surviving shops retain their tenant indices.
const activePlots=cityPlots.filter(b=>b!==bankSite && !replacedTowers.has(b.towerId))
  .map(b=>b.towerId===bankParcelTowerId?bankSite:b);
const retainedTowers=activePlots.filter(b=>b.housing);
const palms=[[-69.2,34.1,7.9],[-68.2,51.8,7.6],[-45.4,39.7,7.9],[-46.3,48.4,6.8],
  [-74.43,92.8,8.6],[-73.7,97.1,7.7],[-63.15,96.4,6.8],[-44.4,96.4,7.4],[-34.35,94.7,7.1],
  [-27.8,78.8,6.7],[-10.4,78.8,6.55]].map(([x,z,height])=>({x,z,height,radius:.19}));
for(const x of [-45,-7.3,7.7,39]) for(const z of [-52,-35,-19,0,21,36,53,69]) {
  if(onDrive(x,z) || x===-45 && z>=32)continue; // The fountain occupies this former planting bed.
  palms.push({x,z,height:6.4+1.1*Math.abs(Math.sin(x+z)), radius:.22});
}
for(const x of [-9,9]) for(const z of [-163,-172,-182,-193,-212,-221,-232,-243,-253,-267])
  palms.push({x,z,height:7.1+.55*Math.cos(z+x),radius:.22});
export const brickellMap = {
  bounds: 109, westBound:-245, southBound:118, northBound:-518, flightNorth:-488, flightLimit: 73, flightCeiling: 73, waterY: -.14,
  barriers:[...resortBarriers,...marinaFittings,...stationBarriers,...clubSolids,...streetPlan.curbs,...casaBarriers.filter(p=>!casaRails.includes(p)),...estateGlassBarriers,...bollards,...benches,...quayLamps,...estateBarriers,...signBarriers,...beachBarriers,...beachClubFixtures,...basketballBarriers,...coastalStructureBarriers,...streetLamps,...retainedTowers.map(b=>b.housing),
    ...avenues.flatMap(x=>streets.map(z=>signalPost(x,z))),
    ...harborSigns.flatMap(([x,z],i)=>[-1,1].map(side=>({postId:'harbor-'+i,x:x+side*1.3,z,w:.10,d:.10,h:2.58}))),
    ...beachSigns.flatMap(([x,z,yaw],i)=>[-1,1].map(side=>({
      x:x+side*1.72*Math.cos(yaw),z:z-side*1.72*Math.sin(yaw),w:.14,d:.14,h:2.1,postId:'beach-'+i,woodId:'sign-'+i,
    })))], lookout:{x:38,z:-42}, trail:[], rocks:[], trees:[...palms,...lanternPalms].filter(p=>!roadway(p.x,p.z)),
  buildings:activePlots,
};
