import {berthDeckY} from './marina-docks.js';

const water=-.14;
export const marinaPlatform={
  kind:'platform',x:71.6,startZ:-449,water,deck:water+10,width:2.22,
  flights:3,treads:16,run:.32,landing:1.08,apron:3.25,
  exitX:74.35,exitWidth:1.52,exitZ:-471.4,exitRun:.49,exitSteps:8,exitRise:.22,
};
const p=marinaPlatform;
p.near=p.startZ-p.flights*p.treads*p.run-(p.flights-1)*p.landing;
p.tip=p.near-p.apron;
p.exitEnd=p.exitZ-p.exitRun*p.exitSteps;

export const towerSlabs=[];
let edge=p.startZ;
for(let flight=0;flight<p.flights;flight++){
  for(let tread=1;tread<=p.treads;tread++){
    const top=berthDeckY+(p.deck-berthDeckY)*(flight*p.treads+tread)/(p.flights*p.treads);
    towerSlabs.push({south:edge,north:edge-p.run,top,tread:true});
    edge-=p.run;
  }
  if(flight<p.flights-1){
    towerSlabs.push({south:edge,north:edge-p.landing,top:towerSlabs.at(-1).top});
    edge-=p.landing;
  }
}
towerSlabs.push({south:edge,north:p.tip,top:p.deck});

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
    top=towerSlabs.find(s=>z<=s.south+.0001 && z>=s.north-.0001)?.top;
  }
  if(top!==undefined && probe>=top-.01)return top;
}
export function towerRail(x,y,z){
  if(z>p.startZ || z<p.near-1.5 || Math.abs(Math.abs(x-p.x)-p.width/2)>.24)return false;
  const deck=towerFloor(p.x,z,Infinity);
  return deck!==undefined && y>=deck-.32 && y<deck+1.03;
}
// The marked competition water and its exit are reserved for swimming.
export function inDivingLane(x,z){
  return x>=p.x-4.3 && x<=p.exitX+1.25 && z<=p.near && z>=p.tip-12.8;
}
