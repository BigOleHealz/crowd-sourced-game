import {berthDeckY} from './marina-docks.js';

const water=-.14;
export const marinaPlatform={
  kind:'platform',x:71.6,startZ:-449,water,deck:water+10,width:2.22,
  near:-466.52,apron:3.25,rungs:31,
  exitX:74.35,exitWidth:1.52,exitZ:-471.4,exitRun:.49,exitSteps:8,exitRise:.22,
};
const p=marinaPlatform;
p.tip=p.near-p.apron;
p.exitEnd=p.exitZ-p.exitRun*p.exitSteps;

export const rungPitch=(p.deck-berthDeckY)/p.rungs;
const ladderZ=p.near+.38,upperExitZ=p.near-.47,lowerExitZ=p.near+.80;
const climbSeconds=5.5;

export function platformLadderAt(feet){
  if(!feet?.grounded || feet.dead || feet.fall || feet.ride || feet.swimming || feet.stance ||
    feet.parachute || feet.liftTravel || Math.abs(feet.x-p.x)>.58)return;
  if(Math.abs(feet.y-berthDeckY)<.09 && feet.z>=p.near+.18 && feet.z<=p.near+1.25)return 'up';
  if(Math.abs(feet.y-p.deck)<.09 && feet.z>=p.near-.82 && feet.z<=p.near)return 'down';
}

export function stepPlatformLadder(state,input,dt){
  let climb=state.climb;
  if(climb?.kind!=='platformLadder'){
    if(climb || !input.jump || input.seat || input.interact)return;
    const direction=platformLadderAt(state);
    if(!direction)return;
    climb={kind:'platformLadder',down:direction==='down',sx:state.x,sz:state.z,t:0,yaw:0};
  }
  const t=Math.min(1,climb.t+dt/climbSeconds);
  const mount=Math.min(1,t/.08),dismount=Math.max(0,(t-.92)/.08);
  const rise=Math.max(0,Math.min(1,(t-.08)/.84));
  const y=berthDeckY+(p.deck-berthDeckY)*(climb.down?1-rise:rise);
  const x=climb.sx+(p.x-climb.sx)*mount;
  const z=climb.sz+(ladderZ-climb.sz)*mount+((climb.down?lowerExitZ:upperExitZ)-ladderZ)*dismount;
  return {x,y,z,vx:0,vy:0,vz:0,grounded:t===1,...(t<1 && {climb:{...climb,t}})};
}

export function onPlatform(x,z){
  return Math.abs(x-p.x)<=p.width/2 && z<=p.near+.001 && z>=p.tip;
}
export function towerFloor(x,z,probe){
  if(z<p.exitEnd-.001 || z>p.startZ+1.21 || x<p.x-p.width/2 || x>p.exitX+p.exitWidth/2)return;
  let top;
  if(z>=p.startZ && z<=p.startZ+1.2)top=berthDeckY;
  else if(Math.abs(x-p.exitX)<=p.exitWidth/2){
    const step=z>=p.exitZ?0:Math.min(p.exitSteps,Math.ceil((p.exitZ-z)/p.exitRun));
    top=berthDeckY-step*p.exitRise;
  }else if(Math.abs(x-p.x)<=p.width/2){
    if(onPlatform(x,z))top=p.deck;
    else if(z>=p.near && z<=p.startZ)top=berthDeckY;
  }
  if(top!==undefined && probe>=top-.01)return top;
}
export function towerRail(x,y,z){
  if(z>p.startZ || z<p.tip-.30 || Math.abs(x-p.x)>p.width/2+.26)return false;
  const side=Math.abs(Math.abs(x-p.x)-p.width/2)<.24;
  if(y>=berthDeckY-.34 && y<berthDeckY+1.03 && z>=p.near && (side || z<=p.near+.18))return true;
  if(y>=p.deck-.32 && y<p.deck+1.03 && z>=p.near-1.5 && z<=p.near+.10){
    return side || (Math.abs(z-p.near)<.22 && Math.abs(x-p.x)>.50);
  }
  return Math.abs(Math.abs(x-p.x)-.77)<.27 && Math.abs(z-(p.near-.33))<.32 && y<p.deck-.24;
}
// The marked competition water and its exit are reserved for swimming.
export function inDivingLane(x,z){
  return x>=p.x-4.3 && x<=p.exitX+1.25 && z<=p.near && z>=p.tip-12.8;
}
