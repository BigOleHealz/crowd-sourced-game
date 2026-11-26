import {randomInt} from 'node:crypto';
import {buildingAction,doorIsOpen,doorWouldHit,setDoorOpen,landingValid} from './public/building-interiors.js';
import {yachtDoorAction,yachtLocal} from './public/yacht-layout.js';
import {yachtDoorHit} from './public/yacht-room-doors.js';
import {canUseInventory} from './harbor-trade.js';
import {frozenPhase} from './public/island-rules.js';

// Clients name a local control, never a destination coordinate. Validation is
// repeated on the authority for range, floor, occupancy and property condition.
export function requestInterior(world,players,player,input,tick){
  if(!Number.isSafeInteger(input.seq) || input.seq<1 || input.seq<=(player.interiorSeq??0))return;
  player.interiorSeq=input.seq;
  if(player.trip || !canUseInventory(world,player) || frozenPhase(world.match?.phase) || world.match?.phase==='setup')return;
  const use=yachtDoorAction(world.yacht,player.state)??buildingAction(player.state,world.doors);
  if(use?.kind==='slot' && input.slot===use.slot && tick>=(player.slotReady??0)){
    player.slotReady=tick+42;
    const reel=()=>['Palm','Shell','Pearl','Sun','Fan'][randomInt(5)];
    player.slotResult={slot:use.slot,reels:[reel(),reel(),reel()]};
    return;
  }
  if(use?.kind==='concierge' && input.checkIn===true){
    if(player.resortStay)return;
    const occupied=new Set([...players.values()].map(p=>p.resortStay?.key));
    const key=Array.from({length:32},(_,i)=>i).find(i=>!occupied.has(i));
    if(key!==undefined)player.resortStay={key,floor:5+Math.floor(key/2)};
    return;
  }
  if(use?.kind==='yachtDoor' && input.cabin===use.d.id && typeof input.open==='boolean'){
    const y=world.yacht;
    if(!input.open)for(const other of players.values()){
      const p=yachtLocal(y,other.state.x,other.state.z),feet=other.state.y-y.y;
      if(other.life.hp && yachtDoorHit(use.d,p.x,feet+.2,p.z,feet+1.65,.29))return;
    }
    const mask=1<<use.d.id;
    y.closedCabins=input.open?(y.closedCabins??0)&~mask:(y.closedCabins??0)|mask;
    if(!y.closedCabins)delete y.closedCabins;
    return;
  }
  if(use?.kind==='door' && input.door===use.d.id && typeof input.open==='boolean'){
    if(doorIsOpen(use.d,world.doors)===input.open)return;
    if(!input.open)for(const other of players.values())if(other.life.hp && doorWouldHit(use.d,other.state))return;
    setDoorOpen(use.d,world.doors,input.open);return;
  }
  if(use?.kind!=='lift' || input.building!==use.s.p.id || !Number.isInteger(input.floor))return;
  const dest=use.s.p.panels[input.floor];
  if(!dest || dest===use.s || !landingValid(dest,world.doors))return;
  // Each player's ride is independent, so another guest never holds the lift.
  const time=30;
  player.trip={from:use.s,to:dest,start:tick,time};
  player.state={x:use.s.exitX,y:use.s.y,z:use.s.exitZ,vy:0,grounded:false,liftTravel:dest.index+1};
  player.moving=player.sprint=false;
  player.inputs.length=0;player.ack=player.lastSeq;
}
export function advanceElevator(world,player,tick){
  const t=player.trip;
  if(!t)return false;
  if(!landingValid(t.from,world.doors) || !landingValid(t.to,world.doors) || !player.life.hp || player.life.fall){
    delete player.trip;delete player.state.liftTravel;return false;
  }
  const n=Math.max(0,Math.min(1,(tick-t.start)/t.time)),ease=n*n*(3-2*n);
  const {from,to}=t;
  const shaft=from.p.shaft;
  if(shaft){
    const boardTicks=4,travel=t.time-2*boardTicks,elapsed=Math.max(0,tick-t.start);
    const position=Math.min(1,Math.max(0,(elapsed-boardTicks)/travel));
    const smooth=position*position*(3-2*position);
    const outside=Math.max(0,1-elapsed/boardTicks,Math.min(1,(elapsed-boardTicks-travel)/boardTicks));
    player.state.x=shaft.x+(from.exitX-shaft.x)*outside;
    player.state.y=from.y+smooth*(to.y-from.y);
    player.state.z=shaft.z+(from.exitZ-shaft.z)*outside;
  }else{
    player.state.x=from.exitX+ease*(to.exitX-from.exitX);
    player.state.y=from.y+ease*(to.y-from.y);
    player.state.z=from.exitZ+ease*(to.exitZ-from.exitZ);
  }
  if(n===1){
    Object.assign(player.state,{x:to.exitX,y:to.y,z:to.exitZ,grounded:true});
    delete player.trip;delete player.state.liftTravel;
  }
  return true;
}
