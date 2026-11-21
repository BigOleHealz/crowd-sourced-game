import {driveTrafficCar} from './city-traffic.js';
import {stepTank} from './tank.js';
import {stepJet} from './jet.js';
import {driveRover,drivenRoad} from './rover.js';
import {fly,restoreFlightState} from './airframe.js';
import {crewBoat,stepBoat} from './patrol-boats.js';
import {stepYacht} from './superyacht.js';

// Predict only the local operator. Collisions and damage during replay must
// never alter network snapshots, HUD events, or the other players' history.
export function driverPrediction(snapshot,id) {
  const road=drivenRoad(snapshot,id), boat=crewBoat(snapshot,id);
  const kind=snapshot.tank?.driver===id?'tank':road ? road.kind??'rover' : snapshot.heli.pilot===id ? 'heli' : snapshot.jet?.pilot===id ? 'jet' :
    snapshot.yacht?.driver===id ? 'yacht' : boat?.driver===id ? 'boat' : null;
  if(!kind)return null;
  const {jet,heli,rover,supercar,tank,yacht,boats,doors,hp,traffic}=snapshot;
  const world=structuredClone({jet,heli,rover,supercar,tank,yacht,boats,doors,hp,traffic});
  const vehicle=road?.model ? drivenRoad(world,id) : kind==='boat'?crewBoat(world,id):world[kind];
  if(kind==='heli')restoreFlightState(vehicle);
  const occupants=new Map();
  let previous=vehicle;
  return {
    kind, vehicleId:road?.model ? road.id : null,
    step(cmd,dt){
      if(vehicle.wrecked || (vehicle.pilot??vehicle.driver)!==id)return;
      previous={...vehicle};
      if(kind==='tank')stepTank(world,cmd,dt);
      else if(kind==='heli')fly(world,cmd,dt,occupants);
      else if(kind==='jet')stepJet(world,cmd,dt,occupants);
      else if(kind==='boat')stepBoat(world,vehicle,cmd,dt,occupants);
      else if(kind==='yacht')stepYacht(world,cmd,dt,occupants);
      else if(vehicle.model)driveTrafficCar(world,vehicle,cmd,dt,occupants);
      else driveRover(world,cmd,dt,occupants,kind);
    },
    pose(t){
      const result={};
      for(const key of ['x','y','z','pitch','roll']){
        if(Number.isFinite(vehicle[key]))result[key]=previous[key]+(vehicle[key]-previous[key])*t;
      }
      if(kind==='tank'){
        const turn=vehicle.turretYaw-previous.turretYaw;
        result.turretYaw=previous.turretYaw+Math.atan2(Math.sin(turn),Math.cos(turn))*t;
        result.turretPitch=previous.turretPitch+(vehicle.turretPitch-previous.turretPitch)*t;
      }
      const turn=vehicle.yaw-previous.yaw;
      result.yaw=previous.yaw+Math.atan2(Math.sin(turn),Math.cos(turn))*t;
      return result;
    }
  };
}
