// Activity movement and pedestrian physics share the same actor at each unoccupied slot.
// The sport is the only snapshot owner, including while its actor is away from play.
import {newLife,rivalView,stepRivalLife} from './public/rivals.js';

export function courtRoster(poses){
  const actors=poses.map(p=>({
    id:p.id,name:p.name,courtPose:p,state:p,yaw:p.yaw,moving:false,
    life:newLife(0,false),route:{points:[[p.x,p.z],[p.x,p.z]]},
  }));
  let residents;
  function setActive(slot,active){
    if(!residents)return;
    const actor=actors[slot],index=residents.indexOf(actor);
    if(active && index===-1)residents.push(actor);
    if(!active && index>=0)residents.splice(index,1);
  }
  function attach(list){
    residents=list;
    for(const [slot] of actors.entries())setActive(slot,true);
  }
  function view(tick){
    return actors.map((actor,i)=>{
      const p=poses[i];
      return actor.life.lastHurtTick!=null || actor.life.fall || actor.life.immuneUntil>tick || p.sidelined
        ? {...rivalView(actor,tick),yaw:p.yaw,moving:p.moving,sprint:p.sprint} : p;
    });
  }
  return {attach,setActive,view};
}

export function stepCourtResident(actor,tick,dt,world){
  const pose=actor.courtPose;
  actor.yaw=pose.yaw;actor.moving=pose.moving;actor.sprint=pose.sprint;
  const interrupted=stepRivalLife(actor,tick,dt,world.hp,world);
  if(actor.state!==pose){
    // stepPlayer and respawn can replace the feet. Reattach them to the court slot.
    const {x,y,z,vx=0,vy=0,vz=0,grounded,swimming}=actor.state;
    Object.assign(pose,{x,y,z,vx,vy,vz,grounded});
    if(swimming)pose.swimming=true;else delete pose.swimming;
    actor.state=pose;
  }
  if(interrupted){
    pose.sidelined=true;pose.yaw=actor.yaw;pose.moving=actor.moving;
    pose.sprint=actor.reaction?.type==='gunfire' && actor.moving;
  }else if(pose.sidelined){
    delete pose.sidelined;pose.sprint=false;
  }
}
