import {jetWalkContact} from './jet-road-contact.js';
import {civilianProfiles} from './civilian-fleet.js';
import {yachtFloorAt,yachtCeilingAt} from './yacht-layout.js';
import {supercarLayout,isCheetahCar} from './supercar-layout.js';
import {marinaModel} from './marina-fleet-layout.js';
import {tankScale,tankHull} from './tank-layout.js';
import {humveeWalkShapes} from './humvee-layout.js';
import {jetKinds,helicopterKinds,isHelicopterKind} from './aircraft-fleet.js';
// Walking colliders in vehicle-local metres: half-width, front, rear, bottom, top.
// The helicopter includes the 1.24 airframe model scale. Separating its cabin,
// boom and landing gear leaves the sidewalk open underneath the elevated tail.
const helicopter = [
  [.48,-3.10,-2.46,.70,1.47], [.89,-2.46,-1.56,.56,1.97],
  [.97,-1.56,1.65,.52,2.30], [.64,1.65,2.54,.94,1.98],
  [.33,2.54,5.83,1.57,2.25], [1.58,5.25,5.80,2.00,2.12],
  [.16,5.72,6.57,2.04,3.61], [.18,4.02,4.43,.06,1.88],
  [1.25,-1.05,-.60,.06,.90],
];
const sport=[[supercarLayout.halfWidth,-supercarLayout.halfLength,supercarLayout.halfLength,.10,.73],
  [.84,-.98,1.10,.73,supercarLayout.roof]];
const tracks=[[tankHull.halfWidth,-tankHull.halfLength,tankHull.halfLength,.05,1.20*tankScale],
  [.77*tankScale,-.85*tankScale,.95*tankScale,1.20*tankScale,tankHull.height]];
const boatHull=[[.57,-2.65,-1.87,-.60,.43],[1.04,-1.87,2.15,-.62,.50],[.86,2.15,2.65,-.50,.45]];
const trafficShapes=Object.fromEntries(Object.entries(civilianProfiles).map(([model,p])=>[model,
  [[p.halfWidth,-p.halfLength,p.halfLength,.10,p.belt??.90],
   [p.halfWidth*(p.cabin ? .72 : .89),p.cabin?.[0]??-p.halfLength*.56,
     p.cabin?.[1]??p.halfLength*(model==='van'?.92:.65),p.belt??.90,p.roof]]]));
const radius=.32;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function vehicleContact(x,y,z,world,city,height=1.8) {
  const result={dx:0,dz:0,depth:0,floor:-Infinity,ceiling:Infinity};
  if(!world) return result;
  const yachtTop=yachtFloorAt(world.yacht,x,y,z);
  if(y>=yachtTop-.31)result.floor=yachtTop;
  result.ceiling=yachtCeilingAt(world.yacht,x,y,z)-height;
  for(const kind of jetKinds)jetWalkContact(result,world[kind],x,y,z,radius,height);
  const boats=world.boats??[];
  const traffic=world.traffic??[],patrol=world.patrolCars??[];
  const vehicles=[...helicopterKinds.map(kind=>[kind,world[kind]]),...['rover','rover2','rover3','supercar','tank'].map(kind=>[kind,world[kind]]),
    ...boats.map(vehicle=>['boat',vehicle]),...[...traffic,...patrol].map(vehicle=>['traffic',vehicle])];
  for(const [kind,vehicle] of vehicles) {
    if(kind==='boat' && vehicle.wrecked)continue;
    if(!vehicle || vehicle.crushed || Math.abs(vehicle.x-x)>8 || Math.abs(vehicle.z-z)>8) continue;
    const shapes=kind==='tank'?tracks:isCheetahCar(vehicle)?sport:vehicle.model?trafficShapes[vehicle.model]:kind==='boat' ? marinaModel(vehicle)?.shapes??boatHull : isHelicopterKind(kind) ? helicopter : humveeWalkShapes;
    const c=Math.cos(vehicle.yaw),s=Math.sin(vehicle.yaw);
    const side=(x-vehicle.x)*c+(z-vehicle.z)*s;
    const along=-(x-vehicle.x)*s+(z-vehicle.z)*c;
    for(const [half,front,rear,bottom,top] of shapes) {
      let nx=side-clamp(side,-half,half), nz=along-clamp(along,front,rear);
      const distance=Math.hypot(nx,nz);
      if(distance>=radius) continue;
      if(y>=vehicle.y+top-.001) {
        result.floor=Math.max(result.floor,vehicle.y+top);
        continue;
      }
      if(y+height<=vehicle.y+bottom+.001) {
        result.ceiling=Math.min(result.ceiling,vehicle.y+bottom-height);
        continue;
      }
      let depth=radius-distance;
      if(distance>0) {
        nx/=distance;nz/=distance;
      } else {
        // A moving vehicle can reach an idle player between simulation ticks.
        const sideGap=half-Math.abs(side), endGap=Math.min(along-front,rear-along);
        depth+=Math.min(sideGap,endGap);
        nx=sideGap<=endGap ? (Math.sign(side)||1) : 0;
        nz=sideGap>endGap ? (along-front<rear-along ? -1 : 1) : 0;
      }
      if(depth<=result.depth) continue;
      result.depth=depth;
      result.dx=(nx*c-nz*s)*depth;
      result.dz=(nx*s+nz*c)*depth;
    }
  }
  return result;
}
