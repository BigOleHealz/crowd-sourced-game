// Values are in game units and simulation ticks.
export const launcherSpec={name:'Heat-seeking launcher',range:120,damage:500,cooldown:45,lockTicks:18};

export function lockVehicle(world,key){
  if(['heli','rover','rover2','rover3','supercar'].includes(key))return world[key];
  if(key==='superyacht')return world.yacht;
  return world.boats?.find(b=>b.id===key)??world.traffic?.find(c=>c.id===key);
}
export function lockLabel(key){
  if(key?.startsWith('city-car-') || key?.startsWith('outpost-car-'))return 'Civilian car';
  return {heli:'Helicopter',rover:'Humvee',rover2:'Humvee',rover3:'Humvee',supercar:'Supercar',superyacht:'Yacht'}[key]??'Patrol boat';
}
function candidateRange(world,from,dir){
  let far=0;
  for(const v of [world.heli,world.rover,world.rover2,world.rover3,world.supercar,world.yacht,...(world.boats??[]),...(world.traffic??[])]){
    if(!v || v.wrecked)continue;
    const radius=v===world.yacht?18:v===world.heli?4:3;
    const x=v.x-from.x,y=v.y+1-from.y,z=v.z-from.z;
    const along=x*dir.x+y*dir.y+z*dir.z;
    if(along+radius<0 || along-radius>launcherSpec.range)continue;
    if(x*x+y*y+z*z-along*along<=radius*radius)far=Math.max(far,along+radius);
  }
  return Math.min(launcherSpec.range,Math.ceil(far));
}
export function updateLock(world,player,input,tick,trace){
  const old=player.launcherLock;
  if(player.weapon!==4 || !input.tracking || player.state.swimming || player.state.parachute || player.life.hp<=0){
    player.launcherLock=null;return;
  }
  const continuous=old && tick-old.last<=3;
  if(continuous && !input.fire && tick-old.checked<3){
    old.last=tick;return;
  }
  const flat=Math.cos(input.aimPitch),dir={x:Math.sin(input.aimYaw)*flat,y:Math.sin(input.aimPitch),z:-Math.cos(input.aimYaw)*flat};
  const range=candidateRange(world,input.from,dir);
  const hit=range && trace(world,input.from,dir,range);
  const key=hit?.hitKind;
  if(!key || !lockVehicle(world,key)){player.launcherLock=null;return;}
  const start=continuous && old.key===key ? old.start : tick;
  player.launcherLock={key,start,last:tick,checked:tick};
}
export function lockStatus(player,tick){
  const lock=player.launcherLock;
  if(!lock || tick-lock.last>3 || player.weapon!==4 || player.life.hp<=0)return null;
  return {key:lock.key,progress:Math.min(1,(tick-lock.start)/launcherSpec.lockTicks)};
}
export function guideGameMissile(world,m){
  if(!m.lock)return;
  const target=lockVehicle(world,m.lock);
  if(!target || target.wrecked){delete m.lock;return;}
  const dx=target.x-m.x,dz=target.z-m.z;
  const height=target===world.yacht?1.5:[world.rover,world.rover2,world.rover3,world.supercar].includes(target)? .55: .75;
  const desired=Math.atan2(dx,-dz), turn=desired-m.yaw;
  m.yaw+=Math.atan2(Math.sin(turn),Math.cos(turn))*.24;
  m.pitch+=(Math.atan2(target.y+height-m.y,Math.hypot(dx,dz))-m.pitch)*.24;
}
