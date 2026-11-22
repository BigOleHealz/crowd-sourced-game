import {courtTally} from './court-tally.js';
import {basketballCourt as court,basketballTeams,hoopHeading,onBasketballCourt,shotWindow,inDunkRange} from './basketball-layout.js';

export function basketballHud(panel){
  const status=panel.querySelector('output'),meter=panel.querySelector('[role=meter]');
  const tally=courtTally(panel);
  const fill=meter.querySelector('i'),gold=meter.querySelector('b');
  function update(game,feet,yaw,touch){
    panel.hidden=!game || !onBasketballCourt(feet,5) || Math.abs(feet.y-court.y)>5 || feet.dead;
    if(panel.hidden)return;
    const side=game.players.indexOf(feet.id),joined=side>=0;
    const ball=game.turn===side && game.phase==='held';
    tally(game.scores,side,game.phase==='held'?game.turn:-1,'Ball');
    const shot=game.shot,result=game.result,team=basketballTeams[game.turn];
    const released=joined && shot?.side===side && Number.isFinite(shot.power);
    let line;
    if(!joined){
      line=game.players.includes(null)?(touch?'Tap Join basketball to play':'Press E at the court to join'):'Both sides are playing';
    }else if(shot && result?.serial===shot.serial){
      const outcome=result.points?(result.kind==='dunk'?'Dunk':'Basket')+' · +'+result.points:result.kind==='dunk'?'Missed dunk':'Miss';
      line=outcome+' · '+shot.timing;
    }else if(released){
      line=(shot.kind==='dunk'?'Dunk':'Release')+' · '+shot.timing;
    }else if(game.steal && game.phase==='held'){
      line=basketballTeams[game.steal.side].player+' stole the ball';
    }else if(game.reach && ball){
      line='Defender reaching · Move or release';
    }else if(ball){
      const hoopYaw=hoopHeading(feet);
      const deviation=Math.atan2(Math.sin(yaw-hoopYaw),Math.cos(yaw-hoopYaw));
      if(inDunkRange(feet))line=touch?'Dunk · Hold Shoot, release in gold':'Dunk · Hold F or click, release in gold';
      else line=Math.abs(deviation)>.20?'Face the hoop':touch?'Hold Shoot, release in gold':'Hold F or click, release in gold';
    }else if(game.shot?.kind==='dunk')line='Dunk attempt';
    else line=game.phase==='flight'?'Ball in the air':game.players[game.turn]==null?team.player+' has the ball':'Opponent has the ball';
    if(status.textContent!==line)status.textContent=line;
    meter.hidden=!ball && !released;
    if(meter.hidden)return;
    const power=released?shot.power:game.charge;
    const {center,halfWidth}=released?shot:shotWindow(feet);
    gold.style.left=(center-halfWidth)*100+'%';
    gold.style.width=halfWidth*200+'%';
    const amount=Math.round(power*100);
    fill.style.width=amount+'%';
    meter.setAttribute('aria-valuenow',amount);
    meter.classList.toggle('in-gold',Math.abs(power-center)<=halfWidth);
  }
  return {update,hide(){panel.hidden=true;}};
}
