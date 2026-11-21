// Frame the entire handoff against server ticks so a client can join mid-scene.
import {bankAlarmSeconds} from './bank-rules.js';

const ease=(t,start,end)=>{
  const u=Math.max(0,Math.min(1,(t-start)/(end-start)));
  return u*u*(3-2*u);
};

const parcelOnCounter={x:-.67,y:1.888,z:3.98,pitch:0};

export function bankPresentation(bank,tick,reducedMotion=false){
  const phase=bank?.phase??'ready';
  const elapsed=Math.max(0,(tick-(bank?.since??tick))/30);
  const alarm=phase==='alarm',handoff=phase==='handoff',cooldown=phase==='cooldown';
  const active=alarm || handoff;
  const threat=alarm?ease(elapsed,0,.45):handoff?1:cooldown?1-ease(elapsed,.65,4.1):0;
  const offerStart=bankAlarmSeconds-1.65;
  const lifting=alarm && elapsed>=offerStart;
  const lift=ease(elapsed,offerStart,offerStart+.48);
  const push=ease(elapsed,offerStart+.36,bankAlarmSeconds-.13);
  const rest=parcelOnCounter;
  const offering=lifting && !reducedMotion;
  const parcel=handoff || (offering && push===1)?rest:!offering?null:{
    x:rest.x+.22*(1-push),
    y:1.61+.43*lift-(2.04-rest.y)*push,
    z:rest.z+.59*(1-push),
    pitch:-.20*lift*(1-push)
  };
  const cashGrip=offering?ease(elapsed,offerStart,offerStart+.18):handoff && !reducedMotion?1-ease(elapsed,0,.64):0;
  return {phase,active,elapsed,parcel,offering,cashGrip,reducedMotion,
    threat:reducedMotion?Number(active):threat,
    glow:active?(reducedMotion?.75:.68+.32*Math.cos(elapsed*Math.PI*1.5)):0,
    sign:active?(handoff?'cash':'alarm'):cooldown?(bank.outcome==='collected'?'collected':'interrupted'):null};
}
