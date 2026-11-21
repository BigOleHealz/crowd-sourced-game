import {CITY,groundHeight} from './world.js';
import {cityServices,outpostServices} from './traffic-routes.js';
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
function dispatch(officer,target,rank){
  let best;
  for(const lane of lanes){
    const hit=nearest(lane,target);
    if(!best || hit.distance<best.distance)best={...hit,lane};
  }
  if(best.distance>36**2)return;
  const {lane}=best;
  const at=wrap(best.at-Math.min(29+rank*9,lane.route.length*(.38+rank*.16)),lane.route.length);
  const pose=lane.route.pose(at),id='patrol-car-'+officer.id;
  const car={id,model:'sedan',patrol:true,officerId:officer.id,targetId:officer.targetId,npcDriver:officer.id,
    active:true,...pose,y:groundHeight(pose.x,pose.z),speed:0,steer:0,hp:250,maxHp:250,wrecked:false};
  return {lane,at,goal:best.at,car,lastSeen:{x:target.x,z:target.z}};
}
function dismount(officer,car,world){
  const x=car.x-1.18*Math.cos(car.yaw),z=car.z-1.18*Math.sin(car.yaw);
  officer.state={...officer.state,x,z,y:groundHeight(x,z,Infinity,world.doors),grounded:true,vy:0};
  officer.moving=false;delete officer.cruiserId;car.npcDriver=null;car.speed=0;car.steer=0;
}

export function stepPatrolCruisers(world,officers,players,tick){
  let state=units.get(world);
  if(!state){state=new Map();units.set(world,state);}
  const assigned=new Set(),cars=[];
  for(const officer of officers){
    const target=players.get(officer.targetId)?.state;
    if(!target || !officer.life.hp)continue;
    assigned.add(officer.id);
    let unit=state.get(officer.id);
    if(!state.has(officer.id)){
      // At most two cruisers per pursuit. Additional responders approach on foot.
      const count=cars.filter(car=>car.targetId===officer.targetId).length;
      unit=count<2?dispatch(officer,target,count):null;
      state.set(officer.id,unit);
      if(unit)officer.cruiserId=unit.car.id;
    }
    if(!unit)continue;
    const {car,lane}=unit;cars.push(car);
    if(!car.npcDriver)continue;
    if(car.sling){
      unit.towed=true;Object.assign(officer.state,{x:car.x,y:car.y,z:car.z});continue;
    }
    if(unit.towed){dismount(officer,car,world);continue;}
    if(officer.visible){unit.lastSeen.x=target.x;unit.lastSeen.z=target.z;}
    const destination=officer.lastKnown??unit.lastSeen;
    const actual=Math.hypot(destination.x-car.x,destination.z-car.z);
    if(tick%15===0)unit.goal=nearest(lane,destination).at;
    let ahead=wrap(unit.goal-unit.at,lane.route.length);
    if(ahead>lane.route.length-3)ahead=0;
    const speed=Math.min(11,car.speed+5/30,Math.sqrt(7*ahead));
    const at=wrap(unit.at+speed/30,lane.route.length),pose=lane.route.pose(at);
    const raised=CITY && bridges.some(b=>(world.doors?.bridgeLifts?.[b.north]??0)>.05 && pose.z>b.north-2 && pose.z<b.south+2 && pose.x>=b.west && pose.x<=b.east);
    if(actual<9 || ahead<1.8 || raised || car.wrecked || car.hp<=0){dismount(officer,car,world);continue;}
    car.steer=Math.max(-1,Math.min(1,Math.sin(pose.yaw-car.yaw)*20));
    Object.assign(car,pose,{speed,y:groundHeight(pose.x,pose.z,Infinity,world.doors)});
    unit.at=at;
    Object.assign(officer.state,{x:car.x,y:car.y,z:car.z,vy:0,grounded:true});
    officer.yaw=car.yaw;officer.moving=false;
  }
  for(const id of state.keys())if(!assigned.has(id))state.delete(id);
  if(cars.length)world.patrolCars=cars;
  else delete world.patrolCars;
  return cars;
}
