import {releaseCruiser} from './cruiser-handoff.js';
import {gapAhead,roadUsers} from './lane-clearance.js';
import {CITY,groundHeight} from './world.js';
import {cityServices,outpostServices} from './traffic-routes.js';
import {boardingSeconds,roadBoardingPosition,roadHandle} from './road-cabin.js';
import {stepSuspension} from './road-suspension.js';
import {bridges} from './brickell-map.js';

// The same surveyed lanes carry civilian and marked sedans. Cache their samples
// once per map and only search on dispatch or every half second during a chase.
const lanes=[...new Set((CITY?cityServices:outpostServices).map(service=>service[0]))].map(route=>{
  const samples=[];
  for(let at=0;at<route.length;at+=3)samples.push({...route.pose(at),at});
  return {route,samples};
});
const wrap=(n,len)=>(n%len+len)%len;
const units=new WeakMap();
function nearest(lane,p){
  let distance=Infinity,at=0;
  for(const point of lane.samples){
    const d=(point.x-p.x)**2+(point.z-p.z)**2;
    if(d<distance){distance=d;at=point.at;}
  }
  return {distance,at};
}
function dispatch(officer,target,rank,traffic){
  let best;
  for(const lane of lanes){
    const hit=nearest(lane,target);
    if(!best || hit.distance<best.distance)best={...hit,lane};
  }
  if(best.distance>36**2)return;
  const {lane}=best;
  const proposed=best.at-Math.min(29+rank*9,lane.route.length*(.38+rank*.16));
  let at,pose;
  for(const offset of [0,-4.5,4.5,-9,9,-14]){
    at=wrap(proposed+offset,lane.route.length);const candidate=lane.route.pose(at);
    const y=groundHeight(candidate.x,candidate.z);
    if(traffic.vehicles.some(v=>!v.crushed && Math.abs(v.y-y)<2 && Math.hypot(v.x-candidate.x,v.z-candidate.z)<4.6))continue;
    if(traffic.actors.some(a=>a!==officer && Math.abs(a.state.y-y)<2 && Math.hypot(a.state.x-candidate.x,a.state.z-candidate.z)<2.4))continue;
    pose=candidate;break;
  }
  if(!pose)return;
  const id='patrol-car-'+officer.id;
  const car={id,model:'sedan',patrol:true,officerId:officer.id,targetId:officer.targetId,npcDriver:officer.id,
    active:true,...pose,y:groundHeight(pose.x,pose.z),speed:0,steer:0,hp:250,maxHp:250,wrecked:false};
  return {lane,at,goal:best.at,car,lastSeen:{x:target.x,z:target.z}};
}
const dt=1/30,brakeRate=5.5;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function exitPoint(car,world){
  const handle=roadHandle(car,0),x=handle.x-1.05*Math.cos(car.yaw),z=handle.z-1.05*Math.sin(car.yaw);
  return {startX:x,startY:groundHeight(x,z,Infinity,world.doors),startZ:z,progress:1};
}
function finishExit(officer,car,action){
  officer.state={...officer.state,x:action.startX,z:action.startZ,y:action.startY,grounded:true,vx:0,vz:0,vy:0};
  officer.moving=false;delete officer.cruiserId;car.npcDriver=null;car.speed=0;car.steer=0;
  delete car.boarding;delete car.braking;
}
function stepExit(officer,car,world){
  const action=car.boarding??=exitPoint(car,world);
  action.progress=Math.max(0,action.progress-dt/boardingSeconds);
  if(!action.progress){finishExit(officer,car,action);return;}
  const pose=roadBoardingPosition(car,action);
  Object.assign(officer.state,{...pose,vx:0,vy:0,vz:0,grounded:true});
}
// Detect a raised span even when a fast cruiser still has several metres to stop.
function bridgeDistance(car,world){
  if(!CITY || !world.doors?.bridgeLifts)return Infinity;
  const dz=-Math.cos(car.yaw);
  if(Math.abs(dz)<.65)return Infinity;
  let nearest=Infinity;
  for(const b of bridges){
    if(!(world.doors.bridgeLifts[b.north]>.05) || car.x<b.west || car.x>b.east)continue;
    const near=dz>0?b.north-2:b.south+2,far=dz>0?b.south+2:b.north-2;
    if((far-car.z)/dz>=0)nearest=Math.min(nearest,Math.max(0,(near-car.z)/dz));
  }
  return nearest;
}

export function stepPatrolCruisers(world,officers,players,tick,npcs=officers){
  let state=units.get(world);
  if(!state){state=new Map();units.set(world,state);}
  const assigned=new Set(),cars=[];
  const traffic=roadUsers(world,players,npcs);
  for(const officer of officers){
    const target=players.get(officer.targetId)?.state;
    if(!target || !officer.life.hp)continue;
    assigned.add(officer.id);
    let unit=state.get(officer.id);
    if(!state.has(officer.id)){
      // At most two cruisers per pursuit. Additional responders approach on foot.
      const count=cars.filter(car=>car.targetId===officer.targetId).length;
      // Bound the district fleet without evicting a visible or occupied cruiser.
      const parked=world.traffic?.filter(c=>c.released)??[];
      let room=parked.length+cars.length<16;
      if(!room){
        const old=parked.find(c=>c.driver==null && !c.boarding && !c.sling &&
          [...players.values()].every(p=>Math.hypot(c.x-p.state.x,c.z-p.state.z)>160));
        if(old){world.traffic.splice(world.traffic.indexOf(old),1);room=true;}
      }
      unit=count<2 && room?dispatch(officer,target,count,traffic):null;
      state.set(officer.id,unit);
      if(unit){officer.cruiserId=unit.car.id;traffic.vehicles.push(unit.car);}
    }
    if(!unit || unit.car.released)continue;
    const {car,lane}=unit;cars.push(car);
    if(!car.npcDriver)continue;
    if(car.sling){
      unit.towed=true;delete car.boarding;Object.assign(officer.state,{x:car.x,y:car.y,z:car.z});continue;
    }
    if(unit.towed || car.wrecked || car.hp<=0){finishExit(officer,car,exitPoint(car,world));continue;}
    const surface=(x,z)=>groundHeight(x,z,Infinity,world.doors);
    if(car.boarding){stepSuspension(car,dt,surface);stepExit(officer,car,world);continue;}
    if(officer.visible){unit.lastSeen.x=target.x;unit.lastSeen.z=target.z;}
    const destination=officer.lastKnown??unit.lastSeen;
    const actual=Math.hypot(destination.x-car.x,destination.z-car.z);
    if(tick%15===0)unit.goal=nearest(lane,destination).at;
    let ahead=wrap(unit.goal-unit.at,lane.route.length);
    if(ahead>lane.route.length-3)ahead=0;
    const arrival=Math.min(Math.max(0,actual-6.5),Math.max(0,ahead-.9),bridgeDistance(car,world));
    const gap=gapAhead(car,traffic.actors.filter(a=>a!==officer && !a.cruiserId),traffic.vehicles,world.jet);
    const distance=Math.min(arrival,gap);
    const look=lane.route.pose(wrap(unit.at+3,lane.route.length));
    const turn=Math.abs(Math.atan2(Math.sin(look.yaw-car.yaw),Math.cos(look.yaw-car.yaw)));
    const cornerSpeed=Math.sqrt(3.2*3/Math.max(.025,turn));
    const targetSpeed=distance<.10?0:Math.min(11,cornerSpeed,Math.sqrt(2*brakeRate*distance));
    const speed=car.speed+clamp(targetSpeed-car.speed,-brakeRate*dt,4.6*dt);
    car.braking=speed<car.speed-.025 || speed<.1;
    // Keep the nose behind the stop line if a bridge rises during final braking.
    const at=wrap(unit.at+Math.min(distance,speed*dt),lane.route.length),pose=lane.route.pose(at);
    car.steer=clamp(Math.sin(pose.yaw-car.yaw)*20,-1,1);
    Object.assign(car,pose,{speed,y:surface(pose.x,pose.z)});
    stepSuspension(car,dt,surface);
    unit.wait=speed<.015 && gap<.10?(unit.wait??0)+dt:0;
    if(speed<.015 && (arrival<.10 || unit.wait>1.9)){
      stepExit(officer,car,world);continue;
    }
    unit.at=at;
    Object.assign(officer.state,{x:car.x,y:car.y,z:car.z,vy:0,grounded:true});
    officer.yaw=car.yaw;officer.moving=false;
  }
  for(const [id,unit] of state)if(!assigned.has(id)){
    if(unit)releaseCruiser(world,unit.car);
    state.delete(id);
  }
  if(cars.length)world.patrolCars=cars;
  else delete world.patrolCars;
  return cars;
}
