import {groundHeight,insideTravelArea,waterSurfaceAt} from './world.js';

const entries=new WeakMap();
export function takeRoadSplash(vehicle){
  const entry=entries.get(vehicle);
  if(entry)entries.delete(vehicle);
  return entry;
}

// Called after wheel contact or an airborne water landing. Probe below the
// chassis so a bridge deck above the vehicle cannot masquerade as the seabed.
export function enterRoadWater(world,car,players,dt,fallSpeed=0){
  const surface=waterSurfaceAt(car.x,car.z,car.y);
  if(car.y>surface+.03){delete car.wading;return false;}
  const bottom=groundHeight(car.x,car.z,surface+.04,world.doors);
  const depth=surface-bottom;
  if(depth<.04)return false;
  const firstContact=!car.wading;
  if(firstContact){
    const power=Math.min(1,.16+Math.abs(car.speed)/28+fallSpeed/16);
    entries.set(car,{at:{x:car.x,y:surface,z:car.z},power});
  }
  car.wading=true;
  car.speed*=Math.exp(-1.8*Math.min(depth,1)*dt);
  if(depth<.76){car.y=Math.max(bottom,surface-.24);return true;}

  const s=Math.sin(car.yaw),c=Math.cos(car.yaw);
  // The hull displaces a second, larger volume once it drops into deep water.
  // On an immediate drop, replace the initial shore splash with this one.
  entries.set(car,{at:{x:car.x,y:surface,z:car.z},power:Math.min(1,Math.max(.72,.24+Math.abs(car.speed)/22+fallSpeed/14))});
  car.sinking={elapsed:0,surface,vx:s*car.speed+c*(car.lateralSpeed??0),vz:-c*car.speed+s*(car.lateralSpeed??0)};
  car.y=Math.max(surface-.24,Math.min(car.y,surface));
  delete car.boarding;delete car.suspension;delete car.bridgeFlight;delete car.directionChange;
  car.speed=0;car.lateralSpeed=0;car.braking=false;car.engineLoad=0;
  if(car.takeover)car.takeover.playerId=null;
  if(car.exhaust)car.exhaust=0;
  return true;
}

// Return true when this vehicle is ready for its ordinary parking-bay recovery.
export function stepRoadSinking(world,car,dt){
  const sink=car.sinking;
  sink.elapsed+=dt;
  const x=car.x+sink.vx*dt,z=car.z+sink.vz*dt;
  const bottom=groundHeight(x,z,car.y+.2,world.doors);
  if(insideTravelArea(x,z) && bottom<=car.y+.02){
    car.x=x;car.z=z;
  }else{sink.vx=0;sink.vz=0;}
  const drag=Math.exp(-2.7*dt);
  sink.vx*=drag;sink.vz*=drag;
  const floor=groundHeight(car.x,car.z,car.y+.2,world.doors);
  car.y=Math.max(floor,car.y-dt*Math.min(1.8,.24+.55*sink.elapsed));
  return sink.elapsed>=8 && car.driver==null && car.gunner==null;
}

// A manual exit from a submerged vehicle starts swimming alongside its hull.
export function leaveSinkingRoad(world,car,side=-1){
  const surface=car.sinking.surface,c=Math.cos(car.yaw),s=Math.sin(car.yaw);
  const x=car.x+c*side*1.65,z=car.z+s*side*1.65;
  const clear=insideTravelArea(x,z) && groundHeight(x,z,surface+.85,world.doors)<surface-.72;
  return {x:clear?x:car.x,z:clear?z:car.z,y:surface-.72,grounded:false,swimming:true,vy:0};
}
