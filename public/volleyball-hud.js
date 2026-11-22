import {courtTally,setScoreText} from './court-tally.js';
import {canServeVolleyball,courtSide,nearbyVolleyballCourt,slotSide,spikeWindup,volleyballMember,volleyballRallyContact,
  volleyballTeams} from './volleyball-court.js';

const rallyActions={return:'Return',dig:'Dig',spike:'Spike'};

export function volleyballHud(world,feet,id,available){
  if(!world?.volleyball || !feet)return null;
  const member=volleyballMember(world.volleyball,id);
  const index=member?.index??(available?nearbyVolleyballCourt(world.volleyball,feet):-1);
  if(index<0)return null;
  const game=world.volleyball[index];
  const score=volleyballTeams.map(({name},i)=>name+' '+game.score[i]).join('  ·  ');
  const courtInfo={score,index,game,side:member?.side??-1};
  if(!member){
    if(game.phase==='closed')return {...courtInfo,detail:'Net down'};
    if(game.players.every(id=>id!=null))return {...courtInfo,detail:'Court full'};
    return {...courtInfo,use:'Join volleyball',detail:''};
  }
  const {court,side,slot}=member;
  const result={...courtInfo,member:true,use:'Leave volleyball',detail:'Your team · '+volleyballTeams[side].name};
  if(game.phase==='game')result.detail=volleyballTeams[game.winner].name+' wins the game';
  else if(game.phase==='point')result.detail=game.reason+' · Point '+volleyballTeams[game.winner].name;
  else if(game.phase==='serve'){
    if(game.server!==slot)result.detail=slotSide(game.server)===side?'Teammate serving':'Other team serving';
    else{
      result.action='Serve';
      result.detail=canServeVolleyball(court,slot,feet)?'Your serve':'Step behind your back line to serve';
    }
  }else if(game.phase==='rally'){
    const receiving=1-slotSide(game.flight.slot);
    if(receiving===side){
      const now=world.simTick??game.flight.tick;
      const swing=game.swings[slot];
      if(swing?.kind==='spike' && now>=swing.tick && now<swing.tick+spikeWindup){
        result.detail='Jumping for the spike';
        return result;
      }
      const contact=volleyballRallyContact(court,side,feet,game.flight,now);
      result.action=rallyActions[contact?.kind]??'Return';
      if(contact)result.detail=result.action+' now';
      else result.detail=courtSide(court,feet.z)!==side?'Return to your half':'Watch the landing marker';
    }else result.detail='Ball across the net';
  }
  return result;
}

export function volleyballScoreboard(panel){
  const title=panel.querySelector('.court-title'),detail=panel.querySelector('output'),tally=courtTally(panel);
  return status=>{
    panel.hidden=!status;
    if(!status)return;
    const {game,index,side}=status;
    setScoreText(title,'Volleyball · Court '+(index+1));
    const awarded=game.phase==='game' || game.phase==='point';
    tally(game.score,side,awarded?game.winner:game.phase==='serve'?slotSide(game.server):-1,
      game.phase==='game'?'Winner':awarded?'Point':'Serve');
    setScoreText(detail,status.detail || (game.phase==='rally'?'Rally in play':'First to 11 · Win by 2 · Cap 15'));
  };
}
