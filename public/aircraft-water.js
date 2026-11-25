import {groundHeight,waterSurfaceAt} from './world.js';
import {queueVehicleSplash} from './road-water.js';

// Preserve the water-entry position and let the wreck settle toward the seabed.
export function crashAircraftInWater(world,aircraft,x,z,speed,vy){
  const surface=waterSurfaceAt(x,z,aircraft.y);
  if(groundHeight(x,z,surface+.04,world.doors)>=surface-.76)return false;
  Object.assign(aircraft,{x,z,y:surface,grounded:false,sinking:{surface,elapsed:0}});
  queueVehicleSplash(aircraft,{x,y:surface,z},Math.min(1,Math.max(.72,.35+Math.hypot(speed,vy)/28)));
  return true;
}

export function stepAircraftSinking(world,aircraft,dt){
  const sink=aircraft.sinking;
  sink.elapsed+=dt;
  const bottom=groundHeight(aircraft.x,aircraft.z,aircraft.y+.2,world.doors);
  aircraft.y=Math.max(bottom,aircraft.y-dt*Math.min(2.6,.45+.7*sink.elapsed));
}

export function swimmingFromAircraft(aircraft,side=1){
  const offset=side*2.7,c=Math.cos(aircraft.yaw),s=Math.sin(aircraft.yaw);
  return {x:aircraft.x+c*offset,y:aircraft.sinking.surface-.72,z:aircraft.z+s*offset,
    vy:0,grounded:false,swimming:true};
}
