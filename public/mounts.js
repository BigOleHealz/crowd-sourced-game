import {yachtGun,yachtDeckY} from './yacht-layout.js';
import {jetScale} from './jet-size.js';
import {humveePassengerSeat} from './humvee-layout.js';
// Offsets in game units from the centre of the vehicle, facing local -Z.
const boatMount={turret:[0,1.68,1.12]};
export const mounts = {
  superyacht:{turret:[yachtGun.x,yachtGun.y,yachtGun.z]},
  boat:boatMount,'bay-rhib':boatMount,'key-rhib':boatMount,
  jet: {launcher:[1.70*jetScale,.70*jetScale,-.9*jetScale],
    turret:[-.232*jetScale,1.03*jetScale,-2.817*jetScale]},
  // The Little Bird GLB's rocket pod mouths sit just outside x=+/-1.44, y=.64, z=-1.47.
  heli: { launcher: [1.44,.64,-1.49], pilotGun: [.46,.72,-1.35], turret: [0,.49,-.97] },
  heli2: { launcher: [1.44,.64,-1.49], pilotGun: [.46,.72,-1.35], turret: [0,.49,-.97] },
  rover: { turret: [0,1.62,.06] },
  rover2: { turret: [0,1.62,.06] },
  rover3: { turret: [0,1.62,.06] },
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
  if(['rover','rover2','rover3','heli','heli2','jet','tank'].includes(id))return world?.[id];
  return world?.boats?.find(b=>b.id===id);
}
export function gunnerVehicle(world,id) {
  if(id==null || !world) return null;
  if(world.yacht?.gunner===id)return 'superyacht';
  for(const kind of ['rover','rover2','rover3'])if(world[kind]?.gunner===id)return kind;
  if(world.heli.gunner===id)return 'heli';
  return world.heli2?.gunner===id ? 'heli2' : world.boats?.find(b=>b.gunner===id)?.id??null;
}

export function gunnerFeet(vehicle,kind) {
  if(kind==='heli'||kind==='heli2') return mountPosition(vehicle,[0,.52,0]);
  if(kind==='rover'||kind==='rover2'||kind==='rover3') return mountPosition(vehicle,humveePassengerSeat);
  const feet=mountPosition(vehicle,[0,kind==='superyacht'?yachtDeckY:.45,mounts[kind].turret[2]]);
  const yaw=vehicle.turretYaw;
  feet.x-=.44*Math.sin(yaw);
  feet.z+=.44*Math.cos(yaw);
  return feet;
}
