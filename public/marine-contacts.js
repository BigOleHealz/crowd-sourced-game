import {gullContact,damageGull} from './gull-flight.js';
import {manateeContact,damageManatee} from './manatee-swim.js';
import {sharkContact,damageShark} from './shark-swim.js';

const swimmers=[
  {kind:'shark',key:'sharks',contact:sharkContact,damage:damageShark},
  {kind:'manatee',key:'manatees',contact:manateeContact,damage:damageManatee},
];

const species=[...swimmers,{kind:'gull',key:'gulls',contact:gullContact,damage:damageGull}];

export function hasSwimmingWildlife(world){
  return swimmers.some(({key})=>world[key]?.length);
}

export function marineContact(world,start,end){
  let nearest=null;
  for(const {kind,key,contact} of species){
    const animals=world[key];
    if(!animals?.length)continue;
    const hit=contact(animals,start,end);
    if(hit && (!nearest || hit.t<nearest.t))nearest={t:hit.t,kind,target:animals[hit.index]};
  }
  return nearest;
}

// A direct missile hit and its area effect belong to the same damage event.
export function hitMarineWildlife(world,target,to,damage,blastRadius){
  for(const entry of species){
    const animals=world[entry.key];
    if(!animals)continue;
    for(const [index,animal] of animals.entries()){
      const direct=target===animal;
      if(!direct && (!blastRadius || Math.hypot(animal.x-to.x,animal.y-to.y,animal.z-to.z)>blastRadius))continue;
      entry.damage(animals,index,blastRadius ? animal.maxHp : damage,blastRadius ? 'blast' : 'shot',direct ? to : undefined);
    }
  }
}
