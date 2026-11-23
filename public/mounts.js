import {yachtGun,yachtDeckY} from './yacht-layout.js';
// Offsets in game units from the centre of the vehicle, facing local -Z.
export const roofPivot=[0,2.43,1.27];
const boatMount={turret:[0,1.68,1.12]};
export const mounts = {
  superyacht:{turret:[yachtGun.x,yachtGun.y,yachtGun.z]},
  boat:boatMount,'bay-rhib':boatMount,'key-rhib':boatMount,
  tank:{turret:roofPivot},
  jet: {launcher:[1.70,.70,-.9],turret:[0,1.03,-2.78]},
  heli: { launcher: [2.05,.86,-.21], turret: [0,.49,-.97] },
  rover: { launcher: [.84,.82,-1.16], turret: [0,2.04,.96] },
};

export function mountPosition(vehicle, [side,height,z]) {
  const c=Math.cos(vehicle.yaw), s=Math.sin(vehicle.yaw);
  // Apply the same roll, pitch, then heading as the rendered airframe.
  const roll=vehicle.roll ?? vehicle.suspension?.roll ?? 0, pitch=vehicle.pitch ?? vehicle.suspension?.pitch ?? 0;
  const lateral=side*Math.cos(roll)-height*Math.sin(roll);
  const up=side*Math.sin(roll)+height*Math.cos(roll);
  const longitudinal=up*Math.sin(pitch)+z*Math.cos(pitch);
  return {x:vehicle.x+lateral*c-longitudinal*s, y:vehicle.y+(vehicle.suspension?.heave ?? 0)+up*Math.cos(pitch)-z*Math.sin(pitch),
    z:vehicle.z+lateral*s+longitudinal*c};
}

export {viewPitch as turretPitch} from './view-pitch.js';

export function vehicleById(world,id){
  if(id==='superyacht')return world?.yacht;
  if(id==='rover'||id==='heli'||id==='jet'||id==='tank')return world?.[id];
  return world?.boats?.find(b=>b.id===id);
}
export function gunnerVehicle(world,id) {
  if(id==null || !world) return null;
  if(world.tank?.gunner===id)return 'tank';
  if(world.yacht?.gunner===id)return 'superyacht';
  if(world.rover.gunner===id) return 'rover';
  return world.heli.gunner===id ? 'heli' : world.boats?.find(b=>b.gunner===id)?.id??null;
}

export function gunnerFeet(vehicle,kind) {
  if(kind==='heli') return mountPosition(vehicle,[0,.52,0]);
  const feet=mountPosition(vehicle,[0,kind==='superyacht'?yachtDeckY:kind==='rover'?.80:kind==='tank'?1.17:.45,mounts[kind].turret[2]]);
  const yaw=kind==='tank'?vehicle.roofYaw:vehicle.turretYaw;
  feet.x-=.44*Math.sin(yaw);
  feet.z+=.44*Math.cos(yaw);
  return feet;
}
