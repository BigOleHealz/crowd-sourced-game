import {streetLamps} from './street-lamps.js';
import {waterfrontRoads,contains} from './waterfront-roads.js';
import {causewayArch} from './causeway-arch.js';
import {harborSigns,beachSigns,signalPost} from './scenery-layout.js';
import {onBeach, sandHeight, beachBarriers} from './beach-layout.js';
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
export const waterfront=(x,z)=>![coast,causeway,harbor].some(r=>within(r,x,z));
export const roadway=(x,z)=>within(causeway,x,z) || (z<coast.north ? streetPlan.island : streetPlan.mainland).some(r=>within(r,x,z));
export function cityGround(x,z,maxBottom=Infinity) {
  if (within(causeway,x,z)) {
    return maxBottom >= causeway.height(z,'soffit') ? causeway.height(z,'road') : -2.8;
  }
  return onBeach(x,z) ? sandHeight(x,z) : waterfront(x,z) ? -2.8 : roadway(x,z) ? .70 : .80;
}

export function parapetTop(x,z,padding,maxBottom) {
  const {west,east,north,south,parapetWidth,parapetHeight}=causeway;
  if (z<north-padding || z>south+padding || x<west-padding || x>east+padding ||
      (x>west+parapetWidth+padding && x<east-parapetWidth-padding)) return -Infinity;
  const road=causeway.height(z,'road');
  return road<=maxBottom ? road+parapetHeight : -Infinity;
}

const towers = [
  [-59,-31,17,18,39,1],[-52,10,12,19,26,3],[-61,47,17,18,38,0],
  [-20,-31,13,16,37,1],[-17,7,15,18,24,0],[-19,43,16,19,46,3],
  [15,-30,14,17,34,0],[17,45,14,19,42,1],[-57,-53,15,7,18,3],
  [-16,-53,17,8,23,0],[17,-54,12,7,31,1],[-56,69,13,7,28,1],
  [-18,69,15,7,22,3],[17,69,16,7,27,0],
];
const buildings=towers.map(([x,z,w,d,eave,facade])=>({
  x,z,w,d,eave,facade,rise:0,
  // Raised housing on the roof. Barrier heights are relative to the ground.
  housing:{x:x+w*.13,z,w:w*.45,d:d*.46,bottom:eave+.06,h:eave+1.24},
}));
const palms=[];
for(const x of [-45,-7.3,7.7,39]) for(const z of [-52,-35,-19,0,21,36,53,69]) {
  palms.push({x,z,height:6.4+1.1*Math.abs(Math.sin(x+z)), radius:.22});
}
for(const x of [-9,9]) for(const z of [-163,-182,-221,-243,-267]) palms.push({x,z,height:7.1,radius:.22});
export const brickellMap = {
  bounds: 77, northBound:-289, flightNorth:-285, flightLimit: 73, flightCeiling: 73, waterY: -.14,
  barriers:[...streetPlan.curbs,...beachBarriers,...coastalStructureBarriers,...streetLamps,...buildings.map(b=>b.housing),
    ...avenues.flatMap(x=>streets.map(z=>signalPost(x,z))),
    ...harborSigns.flatMap(([x,z])=>[-1,1].map(side=>({x:x+side*1.3,z,w:.10,d:.10,h:2.58}))),
    ...beachSigns.flatMap(([x,z,yaw],i)=>[-1,1].map(side=>({
      x:x+side*1.72*Math.cos(yaw),z:z-side*1.72*Math.sin(yaw),w:.14,d:.14,h:2.1,woodId:'sign-'+i,
    })))], lookout:{x:38,z:-42}, trail:[], rocks:[], trees:palms.filter(p=>!roadway(p.x,p.z)),
  buildings:[...buildings,...harborHouses],
};
