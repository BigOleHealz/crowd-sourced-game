// Brickell's only runway is on the military island; the rural strip stays put.
import {militaryRunway,militaryTaxiway,militaryTaxiways} from './military-island.js';
import {carrierDeckTop} from './eisenhower-carrier-layout.js';
export const runway=militaryRunway;
export const taxiway=militaryTaxiway;
export const runwayStart={x:(runway.west+runway.east)/2,z:runway.south-11,yaw:0};
export const outpostRunway={west:24,east:36,north:-50,south:27};
export const outpostRunwayStart={x:30,z:20,yaw:0};
export const rotationSpeed=24; // metres per second, about 86 km/h
export const stallSpeed=16;
const inside=(r,x,z)=>x>=r.west && x<=r.east && z>=r.north && z<=r.south;
export const carrierRunway={west:-329,east:-295,north:-350,south:-185,y:carrierDeckTop};
export const onRunway=(x,z,city)=>inside(city?runway:outpostRunway,x,z) || city && inside(carrierRunway,x,z);
export const onAirfield=(x,z)=>inside(runway,x,z) || militaryTaxiways.some(r=>inside(r,x,z));
