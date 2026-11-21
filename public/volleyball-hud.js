import {canReturnVolleyball,canServeVolleyball,courtSide,nearbyVolleyballCourt,sampleVolleyball,
  slotSide,volleyballMember,volleyballTeams} from './volleyball-court.js';

export function volleyballHud(world,feet,id,available){
  if(!world?.volleyball || !feet)return null;
  const member=volleyballMember(world.volleyball,id);
  const index=member?.index??(available?nearbyVolleyballCourt(world.volleyball,feet):-1);
  if(index<0)return null;
  const game=world.volleyball[index];
  const score=volleyballTeams.map(({name},i)=>name+' '+game.score[i]).join('  ·  ');
  if(!member){
    if(game.phase==='closed')return {score,detail:'Net down'};
    if(game.players.every(id=>id!=null))return {score,detail:'Court full'};
    return {use:'Join volleyball',score,detail:''};
  }
  const {court,side,slot}=member;
  const result={member:true,use:'Leave volleyball',score,detail:'Your team · '+volleyballTeams[side].name};
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
      result.action='Return';
      const ball=sampleVolleyball(game.flight,world.simTick??game.flight.tick);
      if(canReturnVolleyball(court,side,feet,ball))result.detail='Return now';
      else result.detail=courtSide(court,feet.z)!==side?'Return to your half':'Watch the landing marker';
    }else result.detail='Ball across the net';
  }
  return result;
}
