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
  if(CITY){
    if(bridges.some(b=>within(b,x,z)))return 'deck';
    if(roadway(x,z))return 'asphalt';
    if(onBeach(x,z))return 'sand';
    return 'grass';
  }
  const bridge=MAP.bridge;
  if(Math.abs(x-bridge.x)<=bridge.width/2 && Math.abs(z-bridge.z)<=bridge.length/2)return 'deck';
  return trailDistance(x,z)<2.1?'gravel':'grass';
}
