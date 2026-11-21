import {beginRoadBoarding} from './road-cabin.js';
import {passingOffset,bendGap,signalLamps} from './traffic-signals.js';
import {roadGrip} from './road-surface.js';
import {flatMobility} from './road-wheel-layout.js';
import {bridges} from './brickell-map.js';
import {bridgeMiddle,trafficStopLine} from './drawbridges.js';
import {cityServices,outpostServices} from './traffic-routes.js';
import {civilianProfiles} from './civilian-fleet.js';
import {CITY,MAP,blocked,groundHeight} from './world.js';
import {clearRoadExit,driveRover,interactRover,stopRover} from './rover.js';
import {roadContact} from './road-contact.js';
import {stepSuspension} from './road-suspension.js';

const path=new WeakMap();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function newCityTraffic(){
  const services=CITY?cityServices:outpostServices;
  return services.map(([route,offset,model,name,bay,cruise],i)=>{
    const distance=route.length*offset,pose=route.pose(distance);
    const npcDriver='rival-'+name,id=(CITY?'city-car-':'outpost-car-')+(i+1);
    const car={id,kind:id,model,...pose,y:groundHeight(pose.x,pose.z),speed:cruise??civilianProfiles[model].cruise,
      lateralSpeed:0,engineLoad:.36,driver:null,npcDriver,takeover:null,hp:250,maxHp:250,
      wrecked:false,flatTires:0,bodyDamage:{front:0,rear:0,left:0,right:0}};
    path.set(car,{track:route,bay,cruise,distance,wait:0});
    return car;
  });
}

export const drivenTraffic=(world,id)=>id==null?null:world?.traffic?.find(car=>car.driver===id)??null;
export const trafficDriverCar=(world,id)=>id==null?null:world?.traffic?.find(car=>car.npcDriver===id || car.takeover?.npcId===id)??null;

function seat(car,side){
  return {x:car.x+side*Math.cos(car.yaw)+.28*Math.sin(car.yaw),z:car.z+side*Math.sin(car.yaw)-.28*Math.cos(car.yaw)};
}

function placeDriver(car,npc){
  const origin=seat(car,-.43),t=car.takeover,progress=t?.progress??0;
  const blend=progress*progress*(3-2*progress);
  const x=origin.x+((t?.endX??origin.x)-origin.x)*blend;
  const z=origin.z+((t?.endZ??origin.z)-origin.z)*blend;
  npc.state={x,z,y:car.y+.34*(1-blend)+.32*Math.sin(Math.PI*progress),vy:0,grounded:progress===1};
  npc.yaw=car.yaw-progress*1.4;npc.moving=false;
}

export function syncTrafficDrivers(world,npcs){
  for(const car of world.traffic??[]){
    const id=car.npcDriver??car.takeover?.npcId;
    const npc=id && npcs.find(n=>n.id===id);
    if(npc)placeDriver(car,npc);
  }
}

export function nearestTraffic(world,feet){
  if(!feet?.grounded || feet.swimming || feet.parachute)return null;
  let near=null,min=3.05;
  for(const car of world.traffic??[]){
    if(car.driver!=null || car.takeover || car.wrecked || Math.abs(car.speed)>.12)continue;
    const d=Math.hypot(car.x-feet.x,car.y-feet.y,car.z-feet.z);
    if(d<=min){near=car;min=d;}
  }
  return near;
}

export function leaveTraffic(world,player){
  const car=drivenTraffic(world,player.id);
  if(!car)return false;
  interactRover(world,player,car.id);
  return true;
}

function exitPoint(world,car){
  const exit=clearRoadExit(world,car);
  if(!exit)return null;
  const side=Math.sign((exit.x-car.x)*Math.cos(car.yaw)+(exit.z-car.z)*Math.sin(car.yaw))||-1;
  return {side,endX:exit.x,endZ:exit.z};
}

export function tryTrafficInteract(world,player,npcs){
  const occupied=drivenTraffic(world,player.id);
  if(occupied)return occupied.takeover?true:leaveTraffic(world,player);
  if(!player.life.hp || player.life.fall || player.state.climb)return false;
  const car=nearestTraffic(world,player.state);
  if(!car)return false;
  if(car.npcDriver){
    const npc=npcs.find(n=>n.id===car.npcDriver),exit=exitPoint(world,car);
    if(!npc?.life.hp || !exit)return false;
    car.takeover={npcId:npc.id,playerId:player.id,progress:0,...exit,
      startX:player.state.x,startY:player.state.y,startZ:player.state.z};
    car.npcDriver=null;car.blink=false;car.turnSignal=0;
  }else beginRoadBoarding(car,player.state);
  car.driver=player.id;
  stopRover(car);
  return true;
}

function letDriverWalk(world,car,npc,x,z){
  npc.state={x,z,y:groundHeight(x,z,car.y+1,world.doors),vy:0,grounded:true};
  // Give the ejected resident a local walking route to a sidewalk, without
  // sending them across the map to their former pedestrian circuit.
  const c=Math.cos(car.yaw),s=Math.sin(car.yaw);
  const side=Math.sign((x-car.x)*c+(z-car.z)*s)||1;
  const points=[[x,z]];
  for(const [across,along] of [[2,0],[2,2.5]]){
    const u=x+c*side*across+s*along,v=z+s*side*across-c*along;
    const floor=groundHeight(u,v,car.y+1,world.doors);
    if(floor>MAP.waterY+.2 && Math.abs(floor-car.y)<1.2 && !blocked(u,floor,v,world.hp,world.doors))points.push([u,v]);
  }
  if(points.length===1)points.push([x,z]);
  npc.route={id:npc.id,name:npc.name,points};
  npc.next=0;npc.pauseUntil=0;npc.moving=false;
}

function advanceTakeover(world,car,npc,dt,players){
  const t=car.takeover;
  t.progress=Math.min(1,t.progress+dt/.95);
  if(npc)placeDriver(car,npc);
  if(t.progress<1)return;
  if(npc)letDriverWalk(world,car,npc,t.endX,t.endZ);
  if(t.playerId!=null && car.driver===t.playerId)world.wanted?.record(world.wanted.session(players.get(t.playerId)),'theft');
  car.takeover=null;
}

function gapAhead(car,actors,vehicles,jet){
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

// Stop before the hinge while the channel is reserved for a yacht. Drivers
// already on the leaves clear them before the bridge starts lifting.
function bridgeGap(world,car){
  if(!CITY || Math.abs(car.x)>5)return Infinity;
  const direction=-Math.sign(Math.cos(car.yaw));
  let gap=Infinity;
  for(const bridge of bridges){
    const middle=bridgeMiddle(bridge),yacht=world.yacht;
    if(!(world.doors?.bridgeLifts?.[bridge.north]>0) &&
        (!yacht || yacht.wrecked || Math.hypot(yacht.x,yacht.z-middle)>=65))continue;
    const remaining=(middle-car.z)*direction-trafficStopLine(car);
    if(remaining>=-.08)gap=Math.min(gap,Math.max(0,remaining));
  }
  return gap;
}

// A cleared wreck returns to its own empty curbside bay. Its former driver
// stays on foot, and an occupied bay delays recovery instead of displacing anyone.
function recoverTrafficCar(world,car,actors,dt){
  car.recoverySeconds=Math.max(0,car.recoverySeconds-dt);
  if(car.recoverySeconds>.0001)return;
  const [x,z]=path.get(car).bay,y=groundHeight(x,z);
  if(roadContact(world,x,z,0,x,z,car) || actors.some(a=>Math.abs(a.state.y-y)<2 && Math.hypot(a.state.x-x,a.state.z-z)<3))return;
  Object.assign(car,{x,y,z,yaw:0,hp:car.maxHp,flatTires:0,wrecked:false,engineLoad:0,
    bodyDamage:{front:0,rear:0,left:0,right:0}});
  delete car.fittingDamage;delete car.contactSound;delete car.suspension;delete car.crushed;
}

export function stepCityTraffic(world,players,npcs,dt){
  if(!world.traffic?.length)return;
  const vehicles=[...world.traffic,world.rover];
  if(world.supercar)vehicles.push(world.supercar);
  if(world.tank)vehicles.push(world.tank);
  if(world.heli.grounded)vehicles.push(world.heli);
  if(world.jet.grounded)vehicles.push(world.jet);
  const actors=[...players.values(),...npcs].filter(a=>a.life.hp && !trafficDriverCar(world,a.id) &&
    !vehicles.some(v=>v?.driver===a.id || v?.gunner===a.id || v?.pilot===a.id));
  for(const car of world.traffic){
    const npc=npcs.find(n=>n.id===(car.npcDriver??car.takeover?.npcId));
    if(car.takeover){advanceTakeover(world,car,npc,dt,players);continue;}
    if(car.npcDriver && (car.wrecked || !npc?.life.hp)){
      if(npc){
        const exit=exitPoint(world,car);
        letDriverWalk(world,car,npc,exit?.endX??car.x,exit?.endZ??car.z);
      }
      car.npcDriver=null;car.blink=false;car.turnSignal=0;stopRover(car);
    }
    if(car.wrecked){recoverTrafficCar(world,car,actors,dt);continue;}
    if(!car.npcDriver)continue;
    const route=path.get(car),profile=civilianProfiles[car.model],brake=profile.brakeForce/profile.mass;
    const gap=Math.min(gapAhead(car,actors,vehicles,world.jet),bridgeGap(world,car),bendGap(car,route,actors,vehicles));
    if(gap<.07)route.wait=.75;
    else route.wait=Math.max(0,route.wait-dt);
    const mobility=flatMobility(car),surface=roadGrip(car.x,car.z);
    route.offset=passingOffset(world,car,route,actors,dt);
    signalLamps(car,route,dt);
    const cruising=(route.cruise??profile.cruise)*(route.offset>.1?.67:1);
    const target=route.wait?0:Math.min(cruising*mobility*surface.pace,Math.sqrt(2*brake*surface.traction*gap));
    const acceleration=profile.driveForce/profile.mass*.68*mobility*surface.traction;
    const change=clamp(target-car.speed,-brake*surface.traction*dt,acceleration*dt);
    car.speed=Math.min(car.speed+change,gap/dt);
    car.braking=change<-.01 || gap<.07;
    car.engineLoad=change>.01?.74:car.speed>.15 && change>=0?.36:0;
    route.distance=(route.distance+car.speed*dt)%route.track.length;
    Object.assign(car,route.track.pose(route.distance));
    car.x+=Math.cos(car.yaw)*route.offset;car.z+=Math.sin(car.yaw)*route.offset;
    car.y=groundHeight(car.x,car.z,car.y+1,world.doors);
    if(!CITY || bridges.some(b=>Math.abs(car.x)<6 && car.z<b.south && car.z>b.north)){
      stepSuspension(car,dt,(x,z)=>groundHeight(x,z,car.y+1.65,world.doors));
    }else if(car.suspension)delete car.suspension;
    placeDriver(car,npc);
  }
}

export function driveTrafficCar(world,car,input,dt,players){
  if(car.takeover || car.wrecked)return;
  driveRover(world,input??{},dt,players,car.id);
  stepSuspension(car,dt,(x,z)=>groundHeight(x,z,car.y+1.65,world.doors));
}
