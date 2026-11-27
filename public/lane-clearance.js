import {civilianProfiles} from './civilian-fleet.js';

export function roadUsers(world,players,npcs){
  const vehicles=[...(world.traffic??[]),...(world.patrolCars??[])];
  for(const body of [world.rover,world.rover2,world.rover3,world.supercar,world.tank,...['heli','heli2','heli3','heli4','jet','jet2','jet3'].map(kind=>world[kind]?.grounded && world[kind])])
    if(body)vehicles.push(body);
  const actors=[...players.values(),...npcs].filter(a=>a.life?.hp!==0 && !a.cruiserId &&
    !vehicles.some(v=>a.id!=null && (v.driver===a.id || v.npcDriver===a.id || v.takeover?.npcId===a.id || v.gunner===a.id || v.pilot===a.id)));
  return {vehicles,actors};
}

export function gapAhead(car,actors,vehicles,jet){
  const c=Math.cos(car.yaw),s=Math.sin(car.yaw),profile=civilianProfiles[car.model];
  let gap=Infinity;
  function consider(p,width,length,buffer){
    if(Math.abs(p.y-car.y)>1.8)return;
    const dx=p.x-car.x,dz=p.z-car.z,along=dx*s-dz*c;
    if(along<0 || Math.abs(dx*c+dz*s)>profile.halfWidth+width)return;
    gap=Math.min(gap,Math.max(0,along-profile.halfLength-length-buffer));
  }
  for(const a of actors)consider(a.state,.40,.32,.28);
  for(const other of vehicles){
    if(other===car || other.crushed)continue;
    // Project the other vehicle's oriented footprint into this lane.
    const otherShape=civilianProfiles[other.model];
    const width=other===jet?2.82:otherShape?.halfWidth??.86;
    const length=other===jet?3.25:otherShape?.halfLength??1.7;
    const delta=car.yaw-other.yaw,side=Math.abs(Math.sin(delta)),along=Math.abs(Math.cos(delta));
    consider(other,width*along+length*side,length*along+width*side,.65+Math.max(0,car.speed-(other.speed??0))*.26);
  }
  return gap;
}
