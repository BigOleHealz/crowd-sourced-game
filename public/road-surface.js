import {onDrive} from './palma-site.js';
import {garageAt} from './road-garages.js';
import {CITY,MAP} from './world.js';
import {bridges,roadway,within} from './brickell-map.js';
import {onBeach} from './beach-layout.js';
import {churchPath} from './ridge-church.js';
import {routeDistance} from './north-ridge.js';
import {serviceTracks} from './traffic-routes.js';

export function trailDistance(x,z){
  let distance=Math.min(routeDistance(MAP.trail,x,z),routeDistance(MAP.northTrail??[],x,z),CITY?Infinity:routeDistance(churchPath,x,z));
  if(!CITY && x>=-25 && x<=22 && z>=-20 && z<=24){
    for(const track of serviceTracks)distance=Math.min(distance,routeDistance(track,x,z));
  }
  return distance;
}

export function roadSurfaceAt(x,z){
  if(garageAt({x,z}))return 'asphalt';
  if(CITY){
    if(bridges.some(b=>within(b,x,z)))return 'deck';
    if(onDrive(x,z) || roadway(x,z))return 'asphalt';
    if(onBeach(x,z))return 'sand';
    return 'grass';
  }
  const bridge=MAP.bridge;
  if(Math.abs(x-bridge.x)<=bridge.width/2 && Math.abs(z-bridge.z)<=bridge.length/2)return 'deck';
  return trailDistance(x,z)<2.1?'gravel':'grass';
}

// Coefficients scale the vehicle's own power, brakes and cornering grip.
// A smooth deck preserves the familiar paved-road handling for bridge jumps.
const paved={traction:1,pace:1};
const surfaces={asphalt:paved,deck:paved,gravel:{traction:.9,pace:.96},
  grass:{traction:.76,pace:.86},sand:{traction:.62,pace:.73}};
export const roadGrip=(x,z)=>surfaces[roadSurfaceAt(x,z)];
