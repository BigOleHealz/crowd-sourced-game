// The cabin, shaft opening, doors and boarding point share one vertical axis.
export function hotelShaft(x,z,angle){
  const nx=Math.round(Math.sin(angle)),nz=Math.round(Math.cos(angle)),hole=.85;
  return {x,z,angle,hole,nx,nz,frontX:x+nx*hole,frontZ:z+nz*hole,
    exitX:x+nx*(hole+.79),exitZ:z+nz*(hole+.79)};
}
export function resortWingShaft(b){
  const z=b.towerId===2?b.z:b.z-b.d/2+1.42;
  return hotelShaft(b.x-2.23,z,Math.PI/2);
}
export function shaftContains(s,x,z,pad=0){
  return Math.abs(x-s.x)<=s.hole+pad && Math.abs(z-s.z)<=s.hole+pad;
}
