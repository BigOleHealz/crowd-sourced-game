import {damageActor} from './rivals.js';

// Keep server-only actor references off the world snapshot sent to clients.
const contexts=new WeakMap();

export function setRoadOccupantContext(world,npcs,tick){
  contexts.set(world,{npcs,tick});
}

export function defeatRoadOccupants(world,car,players,cause='blast'){
  const {npcs=[],tick=0}=contexts.get(world)??{};
  const ids=new Set([car.driver,car.gunner,car.npcDriver].filter(id=>id!=null));
  for(const id of ids){
    const actor=players?.get(id)??npcs.find(npc=>npc.id===id);
    if(!actor?.life?.hp)continue;
    // A catastrophic wreck is lethal even during the short spawn shield.
    actor.life.immuneUntil=Math.min(actor.life.immuneUntil??0,tick);
    if(damageActor(actor,actor.life.hp,tick)){
      actor.life.deathKind=cause;
      actor.life.lastShotTick=tick;
    }
  }
}
