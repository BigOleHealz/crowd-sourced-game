import {updateRoadPose} from './bridge-driving.js';
import {interpolateSuspension,seedRoadSuspension} from './road-suspension.js';
import {driveTrafficCar} from './city-traffic.js';
import {stepTank} from './tank.js';
import {stepJet} from './jet.js';
import {driveRover,drivenRoad} from './rover.js';
import {fly,restoreFlightState} from './airframe.js';
import {crewBoat,stepBoat} from './patrol-boats.js';
import {stepYacht} from './superyacht.js';
import {jetKinds,helicopterKinds,isJetKind,isHelicopterKind,pilotJetKind,pilotHelicopterKind} from './aircraft-fleet.js';

// Predict only the local operator. Collisions and damage during replay must
// never alter network snapshots, HUD events, or the other players' history.
export function driverPrediction(snapshot,id) {
  const road=drivenRoad(snapshot,id), boat=crewBoat(snapshot,id);
  const kind=snapshot.tank?.driver===id?'tank':road ? road.kind??'rover' :
    (pilotHelicopterKind(snapshot,id) ?? pilotJetKind(snapshot,id) ?? (snapshot.yacht?.driver===id ? 'yacht' : boat?.driver===id ? 'boat' : null));
  if(!kind || road?.sling || boat?.sling)return null;
  const {rover,rover2,rover3,supercar,tank,yacht,boats,doors,hp,traffic}=snapshot;
  const aircraft=Object.fromEntries([...jetKinds,...helicopterKinds].map(kind=>[kind,snapshot[kind]]));
  const world=structuredClone({...aircraft,rover,rover2,rover3,supercar,tank,yacht,boats,doors,hp,traffic});
  const vehicle=road?.model ? drivenRoad(world,id) : kind==='boat'?crewBoat(world,id):world[kind];
  if(road)seedRoadSuspension(vehicle);
  if(isHelicopterKind(kind))restoreFlightState(vehicle);
  const occupants=new Map();
  let previous=vehicle;
  return {
    kind, vehicleId:road?.model ? road.id : null,
    step(cmd,dt){
      if(vehicle.wrecked || (vehicle.pilot??vehicle.driver)!==id)return;
      previous={...vehicle};
      if(kind==='tank')stepTank(world,cmd,dt);
      else if(isHelicopterKind(kind))fly(world,cmd,dt,occupants,kind);
      else if(isJetKind(kind))stepJet(world,cmd,dt,occupants,kind);
      else if(kind==='boat')stepBoat(world,vehicle,cmd,dt,occupants);
      else if(kind==='yacht')stepYacht(world,cmd,dt,occupants);
      else if(vehicle.model)driveTrafficCar(world,vehicle,cmd,dt,occupants);
      else {driveRover(world,cmd,dt,occupants,kind);updateRoadPose(world,vehicle,dt);}
    },
    pose(t){
      const result={};
      for(const key of ['x','y','z','pitch','roll','steer']){
        if(Number.isFinite(vehicle[key]))result[key]=(previous[key]??0)+(vehicle[key]-(previous[key]??0))*t;
      }
      if(road){
        result.suspension=interpolateSuspension(previous.suspension,vehicle.suspension,t);
        result.bridgeFlight=(t<.5?previous:vehicle).bridgeFlight;
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
