import {avenues,streets} from './brickell-map.js';
import {civilianProfiles} from './civilian-fleet.js';
import {CITY,MAP,blocked,groundHeight} from './world.js';
import {driveRover,interactRover,stopRover} from './rover.js';
import {roadContact} from './road-contact.js';
import {stepSuspension} from './road-suspension.js';

// A clockwise right-lane circuit around the shops east of Brickell Avenue.
const west=avenues[1]+2.55,east=avenues[2]-2.55;
const north=streets[1]+2,south=streets[3]-2,radius=2.5;
const vertical=south-north-2*radius,horizontal=east-west-2*radius;
const lengths=[vertical,horizontal,vertical,horizontal],arc=radius*Math.PI/2;
const loopLength=2*(vertical+horizontal)+4*arc;
const starts=[[west,south-radius],[west+radius,north],[east,north+radius],[east-radius,south]];
const path=new WeakMap();
const fleet=[['sedan','rival-omar'],['hatchback','rival-maia'],['van','rival-diego']];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function pathPose(distance){
  let d=distance%loopLength;
  for(let side=0;side<4;side++){
    const yaw=side*Math.PI/2,[x,z]=starts[side],s=Math.sin(yaw),c=Math.cos(yaw),length=lengths[side];
    if(d<=length)return {x:x+d*s,z:z-d*c,yaw};
    d-=length;
    if(d<=arc || side===3){
      const turn=yaw+d/radius;
      return {x:x+length*s+radius*(c-Math.cos(turn)),z:z-length*c+radius*(s-Math.sin(turn)),yaw:turn};
    }
    d-=arc;
  }
}

export function newCityTraffic(){
  if(!CITY)return [];
  return fleet.map(([model,npcDriver],i)=>{
    const distance=streets[3]-streets[2]+i*loopLength/fleet.length,pose=pathPose(distance),id='city-car-'+(i+1);
    const car={id,kind:id,model,...pose,y:groundHeight(pose.x,pose.z),speed:civilianProfiles[model].cruise,
      lateralSpeed:0,engineLoad:.36,driver:null,npcDriver,takeover:null,hp:250,maxHp:250,
      wrecked:false,flatTires:0,bodyDamage:{front:0,rear:0,left:0,right:0}};
    path.set(car,{distance,wait:0});
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
  for(const side of [-1,1]){
    for(const offset of [1.85,2.4]){
      const {x,z}=seat(car,side*offset),y=groundHeight(x,z,car.y+1,world.doors);
      if(y>MAP.waterY+.2 && !blocked(x,y,z,world.hp,world.doors))return {side,endX:x,endZ:z};
    }
  }
  return null;
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
    car.npcDriver=null;
  }
  car.driver=player.id;
  stopRover(car);
  return true;
}

function letDriverWalk(world,car,npc,x,z){
  npc.state={x,z,y:groundHeight(x,z,car.y+1,world.doors),vy:0,grounded:true};
  // Give the ejected resident a local walking route to a sidewalk, without
  // sending them across the map to their former pedestrian circuit.
  const verticalLane=Math.abs(Math.cos(car.yaw))>=Math.abs(Math.sin(car.yaw));
  const axis=verticalLane?avenues:streets,position=verticalLane?x:z;
  const center=axis.reduce((a,b)=>Math.abs(a-position)<Math.abs(b-position)?a:b);
  const curb=center+(Math.sign(position-center)||1)*(verticalLane?6.3:4.8);
  const cx=verticalLane?curb:x,cz=verticalLane?z:curb;
  const clear=(u,v)=>!blocked(u,groundHeight(u,v),v,world.hp,world.doors);
  const sidewalk=[[cx,cz],[cx+(verticalLane?0:2.5),cz+(verticalLane?2.5:0)]].filter(([u,v])=>clear(u,v));
  const points=sidewalk.length>1?sidewalk:[[x,z],...sidewalk];
  npc.route={id:npc.id,name:npc.name,points};
  npc.next=0;npc.pauseUntil=0;npc.moving=false;
}

function advanceTakeover(world,car,npc,dt){
  const t=car.takeover;
  t.progress=Math.min(1,t.progress+dt/.95);
  if(npc)placeDriver(car,npc);
  if(t.progress<1)return;
  if(npc)letDriverWalk(world,car,npc,t.endX,t.endZ);
  car.takeover=null;
}

function gapAhead(car,actors,vehicles){
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
    if(other===car)continue;
    // Project the other vehicle's oriented footprint into this lane.
    const otherShape=civilianProfiles[other.model];
    const width=otherShape?.halfWidth??.86,length=otherShape?.halfLength??1.7;
    const delta=car.yaw-other.yaw,side=Math.abs(Math.sin(delta)),along=Math.abs(Math.cos(delta));
    consider(other,width*along+length*side,length*along+width*side,.28);
  }
  return gap;
}

// A cleared wreck returns to its own empty curbside bay. Its former driver
// stays on foot, and an occupied bay delays recovery instead of displacing anyone.
function recoverTrafficCar(world,car,actors,dt){
  car.recoverySeconds=Math.max(0,car.recoverySeconds-dt);
  if(car.recoverySeconds>.0001)return;
  const x=avenues[2]+3.7,z=2+world.traffic.indexOf(car)*8,y=groundHeight(x,z);
  if(roadContact(world,x,z,0,x,z,car) || actors.some(a=>Math.abs(a.state.y-y)<2 && Math.hypot(a.state.x-x,a.state.z-z)<3))return;
  Object.assign(car,{x,y,z,yaw:0,hp:car.maxHp,flatTires:0,wrecked:false,engineLoad:0,
    bodyDamage:{front:0,rear:0,left:0,right:0}});
  delete car.contactSound;delete car.suspension;
}

export function stepCityTraffic(world,players,npcs,dt){
  if(!world.traffic?.length)return;
  const vehicles=[...world.traffic,world.rover,world.supercar];
  if(world.tank)vehicles.push(world.tank);
  if(world.heli.grounded)vehicles.push(world.heli);
  if(world.jet.grounded)vehicles.push(world.jet);
  const actors=[...players.values(),...npcs].filter(a=>a.life.hp && !trafficDriverCar(world,a.id) &&
    !vehicles.some(v=>v?.driver===a.id || v?.gunner===a.id || v?.pilot===a.id));
  for(const car of world.traffic){
    const npc=npcs.find(n=>n.id===(car.npcDriver??car.takeover?.npcId));
    if(car.takeover){advanceTakeover(world,car,npc,dt);continue;}
    if(car.npcDriver && (car.wrecked || !npc?.life.hp)){
      if(npc){
        const exit=exitPoint(world,car);
        letDriverWalk(world,car,npc,exit?.endX??car.x,exit?.endZ??car.z);
      }
      car.npcDriver=null;stopRover(car);
    }
    if(car.wrecked){recoverTrafficCar(world,car,actors,dt);continue;}
    if(!car.npcDriver)continue;
    const route=path.get(car),profile=civilianProfiles[car.model],brake=profile.brakeForce/profile.mass;
    const gap=gapAhead(car,actors,vehicles);
    if(gap<.07)route.wait=.75;
    else route.wait=Math.max(0,route.wait-dt);
    const target=route.wait?0:Math.min(profile.cruise,Math.sqrt(2*brake*gap));
    const acceleration=profile.driveForce/profile.mass*.68;
    const change=clamp(target-car.speed,-brake*dt,acceleration*dt);
    car.speed=Math.min(car.speed+change,gap/dt);
    car.engineLoad=change>.01?.74:car.speed>.15 && change>=0?.36:0;
    route.distance=(route.distance+car.speed*dt)%loopLength;
    Object.assign(car,pathPose(route.distance));
    car.y=groundHeight(car.x,car.z,car.y+1,world.doors);
    placeDriver(car,npc);
  }
}

export function driveTrafficCar(world,car,input,dt,players){
  if(car.takeover || car.wrecked)return;
  driveRover(world,input??{},dt,players,car.id);
  stepSuspension(car,dt,(x,z)=>groundHeight(x,z,car.y+1.65,world.doors));
}
