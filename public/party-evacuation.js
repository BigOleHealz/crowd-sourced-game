import {mountPosition} from './mounts.js';
import {partyDeck,partySinkDepth} from './party-seats.js';
import {sinkingHull} from './sinking-hull.js';
import {MAP,blocked,groundHeight,insideTravelArea,stepPlayer} from './world.js';
import {findLedge} from './ledge-climb.js';
import {cityGround} from './brickell-map.js';
import {newLife,respawnDue} from './rivals.js';
import {advanceFall} from './falls.js';

const activeWrecks=new WeakMap();
const wardrobes=['omar','maia','rafi','leo','mei','santi','jules','wes','isabel'];

// Search once per incident, using the local coastline even on a stolen yacht.
// Water behind a vertical pier wall is less useful than a beach or a low dock.
function shoreApproach(world,boat,dx,dz,radius){
  const feet=MAP.waterY-.72;
  for(let r=.24;r<=radius;r+=.24){
    const x=boat.x+r*dx,z=boat.z+r*dz;
    const floor=cityGround(x,z,feet+1.7,world.doors);
    if(floor<=feet-.02)continue;
    const approach=[x-1.2*dx,z-1.2*dz];
    if(floor<feet+.29)return approach;
    const swimmer={x:x-.35*dx,y:feet,z:z-.35*dz,swimming:true};
    return findLedge(swimmer,{x:dx,z:dz,jump:true},world.hp,world)?approach:null;
  }
  return false;
}

function nearestLanding(world,boat){
  for(let radius=4;radius<=560;radius+=4){
    for(let bearing=0;bearing<32;bearing++){
      const angle=Math.PI+bearing*Math.PI/16,dx=Math.cos(angle),dz=Math.sin(angle);
      const x=boat.x+radius*dx,z=boat.z+radius*dz;
      if(!insideTravelArea(x,z))continue;
      const y=cityGround(x,z,MAP.waterY+1.6,world.doors);
      if(y<MAP.waterY+.03 || y>MAP.waterY+1.25)continue;
      const terrain=groundHeight(x,z,y+.30,world.doors);
      if(Math.abs(terrain-y)>.24 || blocked(x,y+.02,z,world.hp,world.doors))continue;
      const inlandX=x+1.4*dx,inlandZ=z+1.4*dz;
      const inland=groundHeight(inlandX,inlandZ,y+.6,world.doors);
      if(inland<MAP.waterY+.03 || blocked(inlandX,inland+.02,inlandZ,world.hp,world.doors))continue;
      const approach=shoreApproach(world,boat,dx,dz,radius+1.4);
      if(approach)return {approach,shore:[inlandX,inlandZ]};
    }
  }
  return {approach:[47,14],shore:[42,14]}; // Bayfront's boarding slip is reachable from open water.
}

function abandonShip(boat,seat,landing,tick){
  const place=partyDeck[seat],sink=sinkingHull(boat,partySinkDepth);
  const frame={...boat,y:boat.y-sink.drop,pitch:boat.pitch+sink.trim,roll:boat.roll+sink.list};
  const start=mountPosition(frame,place),rail=mountPosition(frame,[Math.sign(place[0])*4,.35,place[2]]);
  const id=boat.id+'-guest-'+seat;
  return {id,name:seat?'Party guest':'Skipper',evacLook:'rival-'+wardrobes[seat],weapon:0,
    life:newLife(tick,false),state:{...start,vy:1.4,grounded:false},yaw:boat.yaw,moving:true,
    route:{id,points:[landing.shore]},next:0,partyEvac:{boat,seat,rail,born:tick,landing,nextCry:tick+8+seat}};
}

function swimToSafety(actor,world,tick,dt){
  const evac=actor.partyEvac;
  if(respawnDue(actor,tick))return true;
  if(advanceFall(actor,tick,dt,world.hp,world) || !actor.life.hp)return false;
  const s=actor.state;
  if(tick>=evac.nextCry && !evac.safeAt){
    actor.panicCry=tick;evac.nextCry=tick+158+evac.seat*7;
  }
  if(!evac.safeAt && s.grounded && s.y>MAP.waterY && tick-evac.born>30)evac.safeAt=tick;
  if(evac.safeAt && tick-evac.safeAt>240)return true;
  const [ax,az]=evac.landing.approach;
  if(Math.hypot(s.x-ax,s.z-az)<.32)evac.onApproach=true;
  const [targetX,targetZ]=(tick-evac.born<22 && !s.swimming)?
    [evac.rail.x,evac.rail.z]:(evac.onApproach?evac.landing.shore:evac.landing.approach);
  const dx=targetX-s.x,dz=targetZ-s.z,d=Math.hypot(dx,dz);
  actor.moving=d>.3;
  if(actor.moving)actor.yaw=Math.atan2(dx,-dz);
  actor.state=stepPlayer(s,{x:actor.moving?dx/d:0,z:actor.moving?dz/d:0,
    jump:Boolean(s.swimming && (evac.onApproach || d<2) && (tick+evac.seat)%12===0)},dt,world.hp,world);
  return false;
}

export function stepPartyEvacuation(world,npcs,tick,dt){
  for(const boat of world.boats){
    if(!boat.partyYacht)continue;
    if(!boat.wrecked){
      if(activeWrecks.delete(boat)){
        const remaining=npcs.reduce((bits,n)=>n.partyEvac?.boat===boat?bits|(1<<n.partyEvac.seat):bits,0);
        if(remaining)boat.evacuatedSeats=remaining;
        else delete boat.evacuatedSeats;
      }
      continue;
    }
    let incident=activeWrecks.get(boat);
    if(!incident){
      incident={started:tick,launched:(boat.evacuatedSeats??0)|(boat.cruising?0:1),landing:nearestLanding(world,boat)};
      activeWrecks.set(boat,incident);
    }
    for(let seat=0;seat<partyDeck.length;seat++){
      const bit=1<<seat;
      if(incident.launched&bit || tick-incident.started<6+seat*4)continue;
      npcs.push(abandonShip(boat,seat,incident.landing,tick));
      incident.launched|=bit;boat.evacuatedSeats=(boat.evacuatedSeats??0)|bit;
    }
  }
  for(let i=npcs.length-1;i>=0;i--){
    const actor=npcs[i];
    if(!actor.partyEvac || !swimToSafety(actor,world,tick,dt))continue;
    const {boat,seat}=actor.partyEvac;
    if(!boat.wrecked){
      boat.evacuatedSeats&=~(1<<seat);
      if(!boat.evacuatedSeats)delete boat.evacuatedSeats;
    }
    npcs.splice(i,1);
  }
}
