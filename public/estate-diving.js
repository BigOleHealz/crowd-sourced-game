// Each board projects west from the east apron over the deep part of its pool.
import {estatePools} from './swimming-pools.js';
export const divingBoards=estatePools.filter(p=>!p.reflecting).map(p=>({
  edge:p.x+p.w/2,z:p.z+(p.entry==='south'?-2.3:1.0),deck:p.deckY,water:p.waterY,
}));
export function boardAt(x,z){
  if(z> -385 || z< -435)return;
  return divingBoards.find(b=>Math.abs(z-b.z)<=.53 && x>=b.edge-1.65 && x<=b.edge+1.26);
}
export function boardHeight(b,x){
  const along=b.edge-x;
  return b.deck+(along<-.97?.16:along<-.67?.32:.49);
}
export function takeoffBoard(p){
  if(!p?.grounded || p.dead || p.fall || p.ride || p.liftTravel || p.climb)return;
  const board=boardAt(p.x,p.z);
  return board && p.x<=board.edge-.28 && Math.abs(p.y-boardHeight(board,p.x))<.08 ? board : undefined;
}
const gravity=10.6, launch=5.6, turn=Math.PI*2;
export const entryBeat=.76;
export function diveMotion(d){
  // One half turn gives a straight head-first entry. A tucked front flip adds a full turn.
  const intended=d.flip?1.5:.5;
  const turnTime=d.release??d.time;
  const turns=intended*Math.min(1.22,turnTime/(d.duration*entryBeat));
  return {angle:-turn*turns,tuck:d.flip && d.release==null?Math.sin(Math.min(1,d.time/(d.duration*.94))*Math.PI):0};
}
export function stepDive(p,command,dt){
  let d=p.dive;
  if(!d){
    const board=takeoffBoard(p);
    if(!board || !(command.jump || command.flipDive))return;
    d={time:0,flip:!!command.flipDive,startY:p.y,water:board.water,
      duration:(launch+Math.sqrt(launch*launch+2*gravity*(p.y-board.water+.72)))/gravity};
  }else if(command.jump && d.release==null)d={...d,release:d.time};
  const time=Math.min(d.time+dt,d.duration),elapsed=time-d.time;
  d={...d,time};
  const vx=-3.9+Math.max(-1,Math.min(1,command.x||0))*.74;
  const vz=Math.max(-1,Math.min(1,command.z||0))*.80;
  const x=p.x+vx*elapsed,z=p.z+vz*elapsed,vy=launch-gravity*time;
  if(time<d.duration)return {x,z,y:d.startY+launch*time-gravity*time*time/2,vx,vz,vy,grounded:false,dive:d};
  const turns=Math.abs(diveMotion(d).angle)/turn,target=d.flip?1.5:.5;
  const error=d.release==null?1:Math.abs(d.release/d.duration-entryBeat);
  const alignment=Math.max(0,1-Math.abs(turns-target)*2);
  const score=Math.round((5*Math.max(0,1-error/.36)+5*alignment)*10)/10;
  const note=d.release==null?'Missed entry':error<.065?'Clean entry':d.release/d.duration<entryBeat?'Opened early':'Opened late';
  return {x,z,y:d.water-.72,vx,vy:0,vz,grounded:false,swimming:true,
    entryMark:{score,note,flip:d.flip,x,z,water:d.water,splash:.55+(10-score)*.092}};
}
