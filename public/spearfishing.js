import {fishPose,fishSchools,fishSpecies} from './reef-fish.js';
import {sharkContact,damageShark} from './shark-swim.js';
import {dolphinContact,damageDolphin} from './dolphin-swim.js';
import {manateeContact,damageManatee} from './manatee-swim.js';

export const spearRange=9;
const recoveryTicks=30, restockTicks=45*30, animalDamage=40;

export const reefFishKey=(schoolIndex,fishIndex)=>schoolIndex+'-'+fishIndex;
export const spearOrigin=state=>({x:state.x,y:state.y+.45,z:state.z});
export function canSpearfish(state){
  return !!(state?.scuba && state.swimming && state.swimDepth>.42 && state.swimAir>0 &&
    !state.outOfAir && !state.dead && !state.fall && !state.dive && !state.ride && !state.climb);
}

// Test a slightly forgiving body-shaped volume along each fish's current heading.
// The visitor supplies only the viewing angles. The school, size, and points come from this room.
function fishContact(from,dir,center,pose,species){
  const s=Math.sin(pose.yaw),c=Math.cos(pose.yaw),dx=from.x-center.x,dz=from.z-center.z;
  const w=species.width*pose.scale*.5+.15,h=species.height*pose.scale*.5+.15,l=species.length*pose.scale*.5+.15;
  const x=(c*dx-s*dz)/w,y=(from.y-center.y)/h,z=(s*dx+c*dz)/l;
  const vx=(c*dir.x-s*dir.z)/w,vy=dir.y/h,vz=(s*dir.x+c*dir.z)/l;
  const a=vx*vx+vy*vy+vz*vz,b=x*vx+y*vy+z*vz,k=x*x+y*y+z*z-1;
  if(k<=0)return 0;
  const disc=b*b-a*k;
  return b<0 && disc>=0 ? (-b-Math.sqrt(disc))/a : Infinity;
}

export function clearReturnedFish(world,tick){
  if(!world.spearedFish)return;
  for(const key in world.spearedFish)if(world.spearedFish[key]<=tick)delete world.spearedFish[key];
  if(!Object.keys(world.spearedFish).length)delete world.spearedFish;
}

export function spearCast(world,player,input,tick,waterY,floorAt){
  if(!canSpearfish(player.state) || !(player.life.hp>0) || player.life.fall ||
    !Number.isSafeInteger(input.seq) || input.seq<1 || input.seq<=(player.spearSeq??0) ||
    !Number.isFinite(input.aimYaw) || !Number.isFinite(input.aimPitch) || Math.abs(input.aimPitch)>Math.PI/2)return false;
  player.spearSeq=input.seq;
  if(tick-(player.spearfishing?.last.tick??-Infinity)<recoveryTicks)return false;

  const from=spearOrigin(player.state),pitch=input.aimPitch,yaw=input.aimYaw,flat=Math.cos(pitch);
  const dir={x:Math.sin(yaw)*flat,y:Math.sin(pitch),z:-Math.cos(yaw)*flat};
  const point=t=>({x:from.x+t*dir.x,y:from.y+t*dir.y,z:from.z+t*dir.z});
  let reach=spearRange,hit;
  // Stop at dry land, the bottom, or the surface, including on a miss.
  for(let t=.25;t<=spearRange;t+=.25){
    const p=point(t);
    if(p.y>=waterY || p.y<=floorAt(p.x,p.z,p.y,world.doors)){reach=t-.25;break;}
  }
  for(const [i,school] of fishSchools.entries()){
    if(Math.hypot(school.x-from.x,school.z-from.z)>reach+Math.max(school.rx,school.rz)*1.25+1)continue;
    const spec=fishSpecies[school.species];
    for(let j=0;j<school.count;j++){
      const key=reefFishKey(i,j);
      if(world.spearedFish?.[key]>tick)continue;
      const pose=fishPose(school,j,tick/30);
      const distance=fishContact(from,dir,{x:pose.x,y:waterY-pose.depth,z:pose.z},pose,spec);
      if(distance<reach){
        reach=distance;
        hit={key,species:school.species,lengthCm:Math.round(spec.length*pose.scale*100)};
      }
    }
  }
  let animalHit;
  const end=point(reach);
  for(const [kind,states,contact,damage] of [
    ['shark',world.sharks,sharkContact,damageShark],
    ['dolphin',world.dolphins,dolphinContact,damageDolphin],
    ['manatee',world.manatees,manateeContact,damageManatee],
  ]){
    const found=contact(states,from,end);
    if(found && (!animalHit || found.t<animalHit.t))
      animalHit={...found,kind,states,damage};
  }
  if(animalHit){
    reach*=animalHit.t;
    hit=undefined;
    animalHit.damage(animalHit.states,animalHit.index,animalDamage,'spear',point(reach));
  }
  const stats=player.spearfishing??={score:0,count:0,log:[]};
  stats.last={tick,from,to:point(reach)};
  if(animalHit)stats.last.hitKind=animalHit.kind;
  if(hit){
    (world.spearedFish??={})[hit.key]=tick+restockTicks;
    const landed={species:hit.species,lengthCm:hit.lengthCm,points:hit.lengthCm,tick};
    stats.count++;stats.score+=landed.points;
    stats.last.catch=landed;stats.log.unshift(landed);stats.log.length=Math.min(5,stats.log.length);
  }
  return true;
}
