// Left front, left rear, right front, right rear in vehicle-local metres.
export const wheelStations=[[-.70,-.94],[-.70,.95],[.70,-.94],[.70,.95]];

export const flatWheelDrop=.13;
export const isFlat=(rover,index)=>Boolean((rover.flatTires ?? 0)&(1<<index));

export function flatTireCount(rover){
  const bits=rover.flatTires ?? 0;
  return (bits&1)+((bits>>1)&1)+((bits>>2)&1)+((bits>>3)&1);
}
