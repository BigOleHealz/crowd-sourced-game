import {crewBoat} from './patrol-boats.js';
import {vehicleById} from './mounts.js';
import {stopRover} from './rover.js';
import {helicopterKinds,isHelicopterKind} from './aircraft-fleet.js';

export function seatVehicle(world,id) {
  if(!world || id==null) return null;
  if(world.tank?.driver===id)return 'tank';
  for(const kind of ['rover','rover2','rover3'])if(world[kind]?.driver===id || world[kind]?.gunner===id)return kind;
  for(const kind of helicopterKinds)if(world[kind]?.pilot===id || world[kind]?.gunner===id)return kind;
  const boat=crewBoat(world,id);
  return boat?.boatModel?null:boat?.id??null;
}

export function selectSeat(world,player,kind,seat) {
  if((seat!==1 && seat!==2) || !kind || kind!==seatVehicle(world,player.id)) return false;
  if(kind==='tank')return false;
  const v=vehicleById(world,kind), primary=isHelicopterKind(kind)?'pilot':'driver';
  const to=seat===1?primary:'gunner', from=seat===1?'gunner':primary;
  if(v.wrecked || v[to]!=null) return false;
  if(v[from]===player.id) {
    v[from]=null;
    if(from==='driver' && kind==='tank')v.speed=v.turnRate=0;
    if(from==='driver' && ['rover','rover2','rover3'].includes(kind)){delete v.boarding;stopRover(v);}
    if(from==='driver' && v.id) v.throttle=0;
    if(from==='pilot' && !v.grounded) v.abandonedFor=0;
  }
  v[to]=player.id;
  if(to==='pilot') v.abandonedFor=null;
  if(to==='gunner'){
    v.turretYaw=v.yaw;v.turretPitch=0;
  }
  return true;
}

export function seatChoices(world,kind,id) {
  const v=vehicleById(world,kind), primary=isHelicopterKind(kind)?'pilot':'driver';
  const label=(role,name)=>name+(v[role]===id?' (you)':v[role]!=null?' (occupied)':'');
  if(kind==='tank')return '1 '+label('driver','Driver');
  return '1 '+label(primary,isHelicopterKind(kind)?'Pilot':v.id?'Helm':'Driver')+'  ·  2 '+label('gunner','Gunner');
}
