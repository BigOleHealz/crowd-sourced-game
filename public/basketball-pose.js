import {dunkFrame,dunkLanding} from './basketball-dunk.js';
import {basketballTeams} from './basketball-layout.js';

export function basketballPose(game,actor,clock){
  if(!game)return null;
  const side=game.players.findIndex((id,i)=>(id??basketballTeams[i].npc)===actor.id);
  if(side<0 || actor.dead || actor.fall)return null;
  if(game.shot?.kind==='dunk' && game.shot.actorId===actor.id && game.shot.age<dunkLanding)
    return {dunk:dunkFrame(game.shot,game.shot.age,actor)};
  const hasBall=game.turn===side && game.phase==='held';
  const charge=hasBall?Math.min(1,game.charge*1.65):0;
  const dribble=hasBall && !charge && actor.moving;
  const height=dribble?.14+1.04*Math.abs(Math.cos(clock*4.5)):1.28+charge*.45;
  const forward=dribble?.36:.40-charge*.06;
  const lateral=dribble?.25:0;
  const release=game.shot?.side===side?Math.max(0,1-game.shot.age/.56):0;
  return {hasBall,charge,dribble,height,forward,lateral,release};
}
