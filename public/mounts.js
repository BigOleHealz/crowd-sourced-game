// Offsets in game units from the centre of the vehicle, facing local -Z.
export const mounts = {
  heli: { launcher: [.91,.86,-1.00], turret: [0,.49,-.97] },
  rover: { launcher: [.84,.82,-1.16], turret: [0,2.04,.96] },
};

export function mountPosition(vehicle, [side,height,z]) {
  const c=Math.cos(vehicle.yaw), s=Math.sin(vehicle.yaw);
  return {x:vehicle.x+side*c-z*s, y:vehicle.y+height, z:vehicle.z+side*s+z*c};
}

export const turretRange=40;
export const turretPitch=pitch=>Math.max(-.95,Math.min(.65,pitch));

export function gunnerVehicle(world,id) {
  if(id==null || !world) return null;
  if(world.rover.gunner===id) return 'rover';
  return world.heli.gunner===id ? 'heli' : null;
}

export function gunnerFeet(vehicle,kind) {
  if(kind==='heli') return mountPosition(vehicle,[0,.52,0]);
  const feet=mountPosition(vehicle,[0,.80,mounts.rover.turret[2]]);
  feet.x-=.44*Math.sin(vehicle.turretYaw);
  feet.z+=.44*Math.cos(vehicle.turretYaw);
  return feet;
}
