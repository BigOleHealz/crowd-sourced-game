// The west-side airstrip. Its taxiway joins the downtown road at z=-45.
// Flight, terrain and the visible markings use the same footprint.
export const runway={west:-128,east:-112,north:-55,south:81};
export const taxiway={west:-120,east:-71.5,north:-53,south:-47};
export const runwayStart={x:-120,z:70,yaw:0};
export const outpostRunway={west:24,east:36,north:-50,south:27};
export const outpostRunwayStart={x:30,z:20,yaw:0};
export const rotationSpeed=24; // metres per second, about 86 km/h
export const stallSpeed=16;
const inside=(r,x,z)=>x>=r.west && x<=r.east && z>=r.north && z<=r.south;
export const onRunway=(x,z,city)=>inside(city?runway:outpostRunway,x,z);
export const onAirfield=(x,z)=>onRunway(x,z,true) ||
  x>=taxiway.west && x<=taxiway.east && z>=taxiway.north && z<=taxiway.south;
