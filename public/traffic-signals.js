import {civilianProfiles} from './civilian-fleet.js';
import {roadContact} from './road-contact.js';

function intendedTurn(route,speed){
  const ahead=Math.max(3,Math.min(13,speed*2+2));
  const from=route.track.pose(route.distance),to=route.track.pose(route.distance+ahead);
  const delta=to.yaw-from.yaw,angle=Math.atan2(Math.sin(delta),Math.cos(delta));
  return Math.abs(angle)>.35?Math.sign(angle):0;
}

export function signalLamps(car,route,dt){
  const signal=route.sidestep || intendedTurn(route,Math.max(car.speed,route.cruise??civilianProfiles[car.model].cruise));
  if(car.turnSignal!==signal)route.flash=0;
  car.turnSignal=signal;
  route.flash=((route.flash??0)+dt)%.72;
  car.blink=signal!==0 && route.flash<.36;
}

// A faster crewed road vehicle may pass on the left. Move right only on a
// clear, level shoulder. Hold position alongside the passing vehicle before
// blending back onto this car's original centreline.
export function passingOffset(world,car,route,actors,dt){
  const lane=route.track.pose(route.distance),c=Math.cos(lane.yaw),s=Math.sin(lane.yaw);
  let approaching=false,beside=false;
  for(const other of [world.rover,world.rover2,world.rover3,world.supercar,...world.traffic]){
    if(!other || other===car || other.driver==null || Math.abs(other.y-car.y)>1.5 || Math.cos(other.yaw-lane.yaw)<.78)continue;
    const dx=other.x-lane.x,dz=other.z-lane.z,along=dx*s-dz*c,across=dx*c+dz*s;
    if(Math.abs(across)>2.3)continue;
    if(along<0 && along> -13 && other.speed>car.speed+.8)approaching=true;
    if(along>=-5 && along<5)beside=true;
  }
  const old=route.offset??0;
  const straight=Math.abs(intendedTurn(route,car.speed))===0;
  const target=(approaching && straight || beside && old>0)?1.05:0;
  const change=Math.max(-dt*.82,Math.min(dt*.82,target-old));
  route.sidestep=0;
  if(Math.abs(change)<.0001)return old;
  const next=old+change,probe=target>old?1.05:next;
  const steps=[0,Math.max(2,car.speed*.5)];
  for(const distance of steps){
    const point=route.track.pose(route.distance+distance);
    const x=point.x+Math.cos(point.yaw)*probe,z=point.z+Math.sin(point.yaw)*probe;
    if(roadContact(world,x,z,point.yaw,car.x,car.z,car) ||
      actors.some(a=>Math.abs(a.state.y-car.y)<2 && Math.hypot(a.state.x-x,a.state.z-z)<2.15))return old;
  }
  route.sidestep=Math.sign(change);
  return next;
}

// Look down the curved centreline as well as along the current bumper. This
// lets the tail of a queue protect a pedestrian or a stopped car past a bend.
export function bendGap(car,route,actors,vehicles){
  if(!intendedTurn(route,car.speed))return Infinity;
  const shape=civilianProfiles[car.model];
  for(let d=1;d<=Math.max(4,car.speed*1.2);d+=1){
    const p=route.track.pose(route.distance+d);
    for(const actor of actors){
      const a=actor.state;
      if(Math.abs(a.y-car.y)<1.8 && Math.hypot(a.x-p.x,a.z-p.z)<shape.halfWidth+.4)
        return Math.max(0,d-shape.halfLength-.8);
    }
    for(const other of vehicles){
      if(other===car || Math.abs(other.y-car.y)>1.8 || Math.hypot(other.x-p.x,other.z-p.z)>4)continue;
      const dx=p.x-other.x,dz=p.z-other.z,c=Math.cos(other.yaw),s=Math.sin(other.yaw);
      const size=civilianProfiles[other.model];
      if(Math.abs(dx*c+dz*s)<shape.halfWidth+(size?.halfWidth??.86) &&
         Math.abs(dx*s-dz*c)<(size?.halfLength??1.7))
        return Math.max(0,d-shape.halfLength-.7);
    }
  }
  return Infinity;
}
