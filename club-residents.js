import {beachClubCast} from './public/beach-club-cast.js';
import {barMenu,pourTicks} from './public/beach-club.js';
import {cabaretCast,leaveClubSeat} from './public/club-lucero.js';
import {newLife,stepRivalLife} from './public/rivals.js';
import {stepPlayer} from './public/world.js';

const venues=new WeakMap();
function lineup(visitors,tick){
  return [...beachClubCast(visitors,tick),...cabaretCast(visitors,tick)];
}

export function addClubResidents(world,residents){
  const actors=lineup([],0).map(p=>{
    const venue=p.performer?'lucero':'beach';
    return {id:p.id,name:p.name,venue,lookId:p.lookId,route:{points:[[p.x,p.z]]},life:newLife(0,false),
      state:{x:p.x,y:p.y,z:p.z,grounded:true,vy:0},yaw:p.yaw,moving:false,weapon:0,onDuty:true,program:p};
  });
  venues.set(world,actors);
  residents.push(...actors);
}

export function clubAppearance(actor){
  const p=actor.program;
  const active=actor.onDuty && actor.life.hp>0 && !actor.life.fall && !actor.reaction;
  return {venue:actor.venue,lookId:actor.lookId,...(active && (p.performer?{performer:p.performer}:
    {beachRole:p.beachRole,partyOffset:p.partyOffset,...(p.pouring && {pouring:true})}))};
}

export function staffAtWork(world,id){
  const actor=venues.get(world)?.find(p=>p.id===id);
  return !!(actor?.onDuty && actor.life.hp && !actor.life.fall && !actor.reaction);
}

export function stepClubResidents(world,players,tick,dt){
  const actors=venues.get(world);
  if(!actors)return;
  const visitors=[...players.values()],program=lineup(visitors,tick);
  for(const [i,actor] of actors.entries()){
    const p=program[i];actor.program=p;
    if(stepRivalLife(actor,tick,dt,world.hp,world)){
      actor.onDuty=false;continue;
    }
    if(!actor.onDuty){
      const dx=p.x-actor.state.x,dz=p.z-actor.state.z,d=Math.hypot(dx,dz);
      if(d>.30){
        actor.state=stepPlayer(actor.state,{x:dx/d*.65,z:dz/d*.65},dt,world.hp,world);
        actor.yaw=Math.atan2(dx,-dz);actor.moving=true;
        continue;
      }
    }
    actor.onDuty=true;actor.moving=!!p.moving;actor.yaw=p.yaw;
    Object.assign(actor.state,{x:p.x,y:p.y,z:p.z,grounded:true,vy:0,vx:0,vz:0});
  }
  for(const player of visitors){
    if(player.clubSince!=null && !staffAtWork(world,'lucero-daniel'))leaveClubSeat(player);
    if(player.beachOrder && tick-player.beachOrder.tick<pourTicks && !staffAtWork(world,'beach-club-0'))delete player.beachOrder;
  }
}

export function canServeDrink(world,action){
  return !barMenu.some(p=>p.id===action) || staffAtWork(world,'beach-club-0');
}
