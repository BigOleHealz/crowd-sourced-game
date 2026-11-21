// Fictional match item. Contact uses the same authored map flags as the Ember.
export const arcadeMolotov={name:'Arcade Molotov',range:19,cooldown:42};
export const throwableLimit=16;

export function throwCapsule(world,id,player,from,input,tick){
  const list=world.throwables??=[];
  if(list.length>=throwableLimit)return;
  const flat=13*Math.cos(input.aimPitch);
  list.push({id,shooter:player.id,team:player.team,...from,
    vx:Math.sin(input.aimYaw)*flat,vy:4+13*Math.sin(input.aimPitch),vz:-Math.cos(input.aimYaw)*flat,
    born:tick});
}
