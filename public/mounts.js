// Offsets in game units from the centre of the vehicle, facing local -Z.
export const mounts = {
  heli: { launcher: [.91,.86,-1.00], turret: [0,.49,-.97] },
  rover: { launcher: [.84,.82,-1.16], turret: [0,2.04,.96] },
};

export function mountPosition(vehicle, [side,height,z]) {
  const c=Math.cos(vehicle.yaw), s=Math.sin(vehicle.yaw);
  return {x:vehicle.x+side*c-z*s, y:vehicle.y+height, z:vehicle.z+side*s+z*c};
}
