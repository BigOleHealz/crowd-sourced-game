import {crewBoat} from './patrol-boats.js';
import {vehicleById} from './mounts.js';
import {stopRover} from './rover.js';

export function seatVehicle(world,id) {
  if(!world || id==null) return null;
  if(world.rover.driver===id || world.rover.gunner===id) return 'rover';
  if(world.heli.pilot===id || world.heli.gunner===id) return 'heli';
  return crewBoat(world,id)?.id??null;
}

export function selectSeat(world,player,kind,seat) {
  if((seat!==1 && seat!==2) || !kind || kind!==seatVehicle(world,player.id)) return false;
  const v=vehicleById(world,kind), primary=kind==='heli'?'pilot':'driver';
  const to=seat===1?primary:'gunner', from=seat===1?'gunner':primary;
  if(v.wrecked || v[to]!=null) return false;
  if(v[from]===player.id) {
    v[from]=null;
    if(from==='driver' && kind==='rover') stopRover(v);
    if(from==='driver' && v.id) v.throttle=0;
    if(from==='pilot' && !v.grounded) v.abandonedFor=0;
  }
  v[to]=player.id;
  if(to==='pilot') v.abandonedFor=null;
  if(to==='gunner') {v.turretYaw=v.yaw;v.turretPitch=0;}
  return true;
}

export function seatChoices(world,kind,id) {
  const v=vehicleById(world,kind), primary=kind==='heli'?'pilot':'driver';
  const label=(role,name)=>name+(v[role]===id?' (you)':v[role]!=null?' (occupied)':'');
  return '1 '+label(primary,kind==='heli'?'Pilot':v.id?'Helm':'Driver')+'  ·  2 '+label('gunner','Gunner');
}
