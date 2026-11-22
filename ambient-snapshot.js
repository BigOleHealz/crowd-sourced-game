// Produce a wire view. Server physics and driven vehicles retain full precision.
// Leave timestamps, identifiers, health, interactions and nested state untouched.
const lengths=['x','y','z','vx','vy','vz','speed'];
const angles=['yaw','pitch','roll'];
function pose(actor){
  const copy={...actor};
  for(const key of lengths){
    if(typeof actor[key]==='number')copy[key]=Math.round(actor[key]*1000)/1000;
  }
  for(const key of angles){
    if(typeof actor[key]==='number')copy[key]=Math.round(actor[key]*10000)/10000;
  }
  return copy;
}
const freeVehicle=v=>v.driver==null && v.gunner==null && v.pilot==null?pose(v):v;

export function compactAmbientView(world){
  return {...world,npcs:world.npcs.map(pose),boats:world.boats.map(freeVehicle),
    traffic:world.traffic.map(freeVehicle),...(world.dogs && {dogs:world.dogs.map(pose)})};
}
