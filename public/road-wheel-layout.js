import {civilianProfiles} from './civilian-fleet.js';
import {supercarLayout} from './supercar-layout.js';
import {tankScale} from './tank-layout.js';
// Left front, left rear, right front, right rear in vehicle-local metres.
export const wheelStations=[[-.70,-.94],[-.70,.95],[.70,-.94],[.70,.95]];

const sportWheels=[-1,1].flatMap(side=>supercarLayout.wheels.map((z,i)=>[side*supercarLayout.wheelTrack[i],z]));
const civilianWheels=Object.fromEntries(Object.entries(civilianProfiles).map(([model,{bodyWidth,axles,wheelTrack}])=>[
  model,[-1,1].flatMap(side=>axles.map((z,i)=>[side*(wheelTrack?.[i]??bodyWidth-.078),z])),
]));
const tankContacts=[[-1.02,-1.46],[-1.02,1.46],[1.02,-1.46],[1.02,1.46]].map(([x,z])=>[x*tankScale,z*tankScale]);
export const wheelsFor=car=>car.kind==='tank'?tankContacts:civilianWheels[car.model] ?? (car.kind==='supercar'?sportWheels:wheelStations);
export const flatMobility=car=>1/(1+.47*flatTireCount(car));

export const flatWheelDrop=.13;
export const isFlat=(rover,index)=>Boolean((rover.flatTires ?? 0)&(1<<index));

export function flatTireCount(rover){
  const bits=rover.flatTires ?? 0;
  return (bits&1)+((bits>>1)&1)+((bits>>2)&1)+((bits>>3)&1);
}
