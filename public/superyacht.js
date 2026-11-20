import {damageBoat} from './patrol-boats.js';
import {CITY,MAP,groundHeight,insideTravelArea} from './world.js';
import {yachtBerth,yachtMaxHp,yachtHalfBeam,yachtDeckHeight,yachtTopAt,yachtHelmFeet,yachtPrompt,
  aboardYacht,carryOnYacht,yachtOverlap,yachtSections,yachtPlatform,yachtCabin} from './yacht-layout.js';

export function mooredYacht(){
  return {id:'superyacht',...yachtBerth,y:MAP.waterY,speed:0,throttle:0,driver:null,gangway:true,
    hp:yachtMaxHp,maxHp:yachtMaxHp,wrecked:false,recoverySeconds:0};
}
export function interactYacht(world,player){
  const prompt=yachtPrompt(world,player.state,player.id),y=world.yacht;
  if(prompt==='leave'){y.driver=null;y.throttle=0;return true;}
  if(prompt==='helm'){
    y.driver=player.id;player.state={...yachtHelmFeet(y),grounded:true,vy:0};
    player.yaw=y.yaw;player.moving=player.sprint=false;return true;
  }
  return prompt==='occupied';
}
export function damageYacht(world,amount){
  const y=world.yacht;
  if(!y || y.wrecked || !Number.isFinite(amount) || amount<=0)return;
  y.hp=Math.max(0,y.hp-amount);
  if(y.hp)return;
  Object.assign(y,{wrecked:true,driver:null,speed:0,throttle:0,gangway:false,recoverySeconds:9});
  if(world.heli?.onYacht){
    delete world.heli.onYacht;world.heli.grounded=false;
    if(!world.heli.wrecked && world.heli.pilot==null)world.heli.abandonedFor=0;
  }
}
const samples=[];
for(const z of [...new Set([...yachtSections.map(s=>s[0]),...Array.from({length:21},(_,i)=>-20+2*i),21])]){
  const w=z>=19?yachtPlatform.halfWidth:yachtHalfBeam(z);
  for(const x of [-w,-w*.5,0,w*.5,w])samples.push([x,z]);
}
function clear(world,pose,players,old){
  const c=Math.cos(pose.yaw),s=Math.sin(pose.yaw);
  for(const [side,aft] of samples){
    const x=pose.x+c*side-s*aft,z=pose.z+s*side+c*aft;
    const top=Math.abs(side)<=2.25 && Math.abs(aft+5.8)<1.9 ? 9.78 :
      side>=yachtCabin.west && side<=yachtCabin.east && aft>=yachtCabin.fore && aft<=yachtCabin.aft ? yachtCabin.top : 3.6;
    if(!insideTravelArea(x,z) || groundHeight(x,z,pose.y+top+.15,world.doors)>MAP.waterY-.35)return false;
  }
  for(const b of world.boats)if(!b.wrecked && yachtOverlap(pose,b.x,b.z,b.yaw,1.10,2.75))return false;
  const h=world.heli;
  if(!h.onYacht && !h.wrecked && h.y<pose.y+yachtCabin.top && yachtOverlap(pose,h.x,h.z,h.yaw,1.3,4.3)){
    const hcos=Math.cos(h.yaw),hsin=Math.sin(h.yaw);
    for(const side of [-1.2,0,1.2])for(const aft of [-2.8,0,4.2]){
      const top=yachtTopAt(pose,h.x+hcos*side-hsin*aft,h.z+hsin*side+hcos*aft);
      if(h.y<top-.04)return false;
    }
  }
  for(const p of players?.values()??[]){
    if(aboardYacht(old,p.state) || p.state.y>=pose.y+2.5)continue;
    const next=yachtDeckHeight(pose,p.state.x,p.state.z);
    if(next>p.state.y+.30 && (!old || yachtDeckHeight(old,p.state.x,p.state.z)<=p.state.y+.30))return false;
  }
  return true;
}
function carryCrew(world,from,to,players){
  const h=world.heli,turn=to.yaw-from.yaw;
  if(h.onYacht && h.grounded && !h.wrecked){
    Object.assign(h,carryOnYacht(from,to,h));h.yaw+=turn;h.turretYaw+=turn;
  }
  for(const p of players?.values()??[]){
    if(h.onYacht && p.id===h.pilot){
      Object.assign(p.state,{x:h.x,y:h.y,z:h.z});p.yaw=h.yaw;
    }else if(p.id!==to.driver && (p.state.onYacht && Number.isFinite(yachtDeckHeight(from,p.state.x,p.state.z)) || aboardYacht(from,p.state) || p.id===h.gunner && h.onYacht)){
      p.state=carryOnYacht(from,to,p.state);p.yaw+=turn;
      const rag=p.life?.fall?.ragdoll;
      if(rag)for(const point of [...rag.points,...rag.previous]){
        const moved=carryOnYacht(from,to,point);point.set(moved.x,moved.y,moved.z);
      }
    }
  }
}
export function stepYacht(world,input,dt,players){
  const y=world.yacht;if(!y || !CITY)return;
  if(y.wrecked){
    y.recoverySeconds=Math.max(0,y.recoverySeconds-dt);
    if(y.recoverySeconds<.0001){
      const berth=mooredYacht();if(clear(world,berth,players,null))world.yacht=berth;
    }
    return;
  }
  const throttle=y.driver==null?0:input?.throttle||0,steer=y.driver==null?0:input?.steer||0;
  y.throttle=throttle;
  const desired=throttle*(throttle<0?2.0:5.2),rate=throttle && y.speed*throttle>=0?1.1:2.0;
  y.speed+=Math.max(-rate*dt,Math.min(rate*dt,desired-y.speed));
  const turn=steer*(y.speed<-.08?-1:1)*(.16+.034*Math.abs(y.speed))*dt;
  if(y.speed || turn){
    const from={...y},angle=y.yaw+turn;
    const next={...y,yaw:Math.atan2(Math.sin(angle),Math.cos(angle))};
    if(turn && !clear(world,next,players,from))next.yaw=y.yaw;
    next.x+=Math.sin(next.yaw)*y.speed*dt;next.z-=Math.cos(next.yaw)*y.speed*dt;
    if(clear(world,next,players,from)){
      Object.assign(y,{x:next.x,z:next.z,yaw:next.yaw});
    }else {
      y.yaw=next.yaw;
      const impact=Math.round((Math.abs(y.speed)-3.4)*8);
      if(impact>0){
        const c=Math.cos(next.yaw),s=Math.sin(next.yaw);
        const inBounds=samples.every(([dx,dz])=>insideTravelArea(next.x+c*dx-s*dz,next.z+s*dx+c*dz));
        if(inBounds){
          damageYacht(world,impact);
          const hull=world.boats.find(b=>!b.wrecked && yachtOverlap(next,b.x,b.z,b.yaw,1.1,2.75));
          if(hull)damageBoat(world,hull,impact,players);
        }
      }
      y.speed=0;
    }
    if(y.wrecked)return;
    const angleToBerth=y.yaw-yachtBerth.yaw;
    y.gangway=Math.abs(y.speed)<.15 && Math.hypot(y.x-yachtBerth.x,y.z-yachtBerth.z)<.22 && Math.cos(angleToBerth)>.9998;
    carryCrew(world,from,y,players);
  }
  const driver=players?.get(y.driver);
  if(driver){driver.state={...yachtHelmFeet(y),grounded:true,vy:0};driver.yaw=y.yaw;driver.moving=driver.sprint=false;}
}
