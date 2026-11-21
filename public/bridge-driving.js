import {bridges} from './brickell-map.js';
import {leafLength,bridgeMiddle,leafGeometry} from './drawbridges.js';
import {CITY,MAP,groundHeight} from './world.js';

export function raisedRoadAt(world,x,z){
  if(!CITY || !world.doors?.bridgeLifts || Math.abs(x)>6)return null;
  return bridges.find(b=>world.doors.bridgeLifts[b.north]>.001 && Math.abs(z-bridgeMiddle(b))<=leafLength+.01);
}

// Launch at the physical end of the steel deck, keeping the road velocity.
// Once airborne the tyres have no traction until they touch down again.
export function launchAtLip(world,car,vx,vz,dt){
  const bridge=raisedRoadAt(world,car.x,car.z);
  if(!bridge || !vz)return false;
  const leaf=leafGeometry(bridge,world.doors.bridgeLifts[bridge.north]);
  const side=Math.sign(car.z-leaf.middle), towards=-side*vz;
  if(towards<=0)return false;
  const lip=leaf.middle+side*leaf.gap/2;
  const duration=(lip-car.z)/vz;
  if(duration<-.0001 || duration>dt)return false;
  car.x+=vx*duration;car.z=lip;car.y=leaf.base+leaf.vertical;
  car.bridgeFlight={vx,vz,vy:Math.min(8,towards*leaf.slope)};
  return Math.max(0,dt-duration);
}

// Persist the last touchdown in ordinary snapshots so remote listeners can
// hear it even when no network snapshot fell on the landing tick.
let landingSequence=0;
export function roadTouchdown(car,speed){
  if(speed<.8)return;
  car.landingSound={id:++landingSequence,speed,x:car.x,y:car.y,z:car.z};
}

export function advanceBridgeFlight(world,car,dt){
  const flight=car.bridgeFlight,gravity=19, previousY=car.y;
  car.x+=flight.vx*dt;car.z+=flight.vz*dt;
  car.y+=flight.vy*dt-.5*gravity*dt*dt;
  flight.vy-=gravity*dt;
  const floor=groundHeight(car.x,car.z,previousY+.12,world.doors);
  if(car.y<=MAP.waterY && floor<=MAP.waterY){
    delete car.bridgeFlight;return 'water';
  }
  if(flight.vy<=0 && car.y<=floor && floor>MAP.waterY){
    car.y=floor;roadTouchdown(car,-flight.vy);delete car.bridgeFlight;
  }
}
