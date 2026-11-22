import {courtTally} from './court-tally.js';
import {basketballCourt as court,basketballTeams,hoopHeading,onBasketballCourt,shotWindow} from './basketball-layout.js';

export function basketballHud(panel){
  const status=panel.querySelector('output'),meter=panel.querySelector('[role=meter]');
  const tally=courtTally(panel);
  const fill=meter.querySelector('i'),gold=meter.querySelector('b');
  let lastSerial,noticeUntil=0;
  function update(game,feet,yaw,touch){
    panel.hidden=!game || !onBasketballCourt(feet,5) || Math.abs(feet.y-court.y)>5 || feet.dead;
    if(panel.hidden)return;
    const side=game.players.indexOf(feet.id),joined=side>=0;
    const ball=game.turn===side && game.phase==='held';
    tally(game.scores,side,game.phase==='held'?game.turn:-1,'Ball');
    if(game.result?.serial!==lastSerial){
      lastSerial=game.result?.serial;
      noticeUntil=performance.now()+1800;
    }
    const result=game.result,team=basketballTeams[game.turn];
    let line;
    if(!joined){
      line=game.players.includes(null)?(touch?'Tap Join basketball to play':'Press E at the court to join'):'Both sides are playing';
    }else if(result && performance.now()<noticeUntil && game.phase==='flight'){
      line=result.points?basketballTeams[result.side].name+' basket · +'+result.points:'Miss · Next possession soon';
    }else if(ball){
      const hoopYaw=hoopHeading(feet);
      const deviation=Math.atan2(Math.sin(yaw-hoopYaw),Math.cos(yaw-hoopYaw));
      line=Math.abs(deviation)>.20?'Face the hoop':touch?'Hold Shoot, release in gold':'Hold F or click, release in gold';
    }else line=game.phase==='flight'?'Ball in the air':game.players[game.turn]==null?team.player+' has the ball':'Opponent has the ball';
    if(status.textContent!==line)status.textContent=line;
    meter.hidden=!ball;
    if(!ball)return;
    const {center,halfWidth}=shotWindow(feet);
    gold.style.left=(center-halfWidth)*100+'%';
    gold.style.width=halfWidth*200+'%';
    const amount=Math.round(game.charge*100);
    fill.style.width=amount+'%';
    meter.setAttribute('aria-valuenow',amount);
    meter.classList.toggle('in-gold',Math.abs(game.charge-center)<=halfWidth);
  }
  return {update,hide(){panel.hidden=true;}};
}
