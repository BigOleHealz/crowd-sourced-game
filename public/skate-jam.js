import {inSkatePark} from './skate-park.js';

export const jamSeconds=45;
const tricks={ollie:{points:35,label:'Ollie',time:.16},kickflip:{points:110,label:'Kickflip',time:.45},shove:{points:85,label:'Shove-it',time:.39}};
export const trickTime=kind=>tricks[kind]?.time??0;
export const isBoardTrick=kind=>kind==='kickflip' || kind==='shove';

// Scores are earned on a rolling touchdown. The same deterministic transitions
// run during prediction and in the server simulation that sends the scores.
export function stepSkateJam(previous,next,input,dt){
  const ride=next.ride,old=previous.ride,prior=old.run;
  const inside=inSkatePark(next.x,next.z),wasGrinding=!!old.grind,grinding=!!ride.grind;
  const launch=previous.grounded && !next.grounded && input.jump;
  const pressed=isBoardTrick(input.skateTrick) && (launch || !previous.grounded);
  const entry=grinding && !wasGrinding;
  if(!prior && !launch && !entry && !pressed)return;
  let run=prior && {...prior};
  delete ride.trick;
  if(!inside){
    if(run && run.left>0){run.left=0;run.last='Run ended';run.pending=0;run.rail=0;run.best=Math.max(run.best,run.score);}
    if(run)ride.run=run;
    return;
  }
  if(!run || run.left===0){
    if(!launch && !entry && !pressed)return;
    run={left:jamSeconds,score:0,best:prior?.best??0,last:'',pending:0,rail:0};
  }
  ride.run=run;run.left=Math.max(0,run.left-dt);
  if(!run.left){run.best=Math.max(run.best,run.score);run.pending=0;run.rail=0;run.last='Time';return;}
  let trick=old.trick && {...old.trick};
  if(pressed && (!trick || trick.kind==='ollie'))trick={kind:input.skateTrick,age:0};
  else if(launch)trick={kind:'ollie',age:0};
  if(trick){
    trick.age+=dt;
    if(next.grounded){
      const move=tricks[trick.kind];
      if(trick.age+.001>=move.time){run.pending+=move.points;run.last=move.label;}
      else {run.pending=0;run.last='Incomplete '+move.label;}
    }else ride.trick=trick;
  }
  if(grinding || wasGrinding){
    run.rail+=Math.hypot(next.x-previous.x,next.z-previous.z);
    if(grinding)run.last='Grinding';
    else {run.pending+=Math.round(run.rail*14);run.rail=0;run.last='Rail grind';}
  }
  if(next.grounded && !grinding && run.pending){
    run.score+=run.pending;run.award=run.pending;run.pending=0;
    run.best=Math.max(run.best,run.score);
  }else if(launch || entry)run.award=0;
}
