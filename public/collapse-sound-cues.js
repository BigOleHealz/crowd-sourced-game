import {collapsePlan,piecePose} from './structural-collapse.js';

export function collapseSoundCues(event,buildings){
  const plan=collapsePlan(event,buildings);
  if(!plan.pieces.length)return [];
  const pieces=[...plan.pieces].sort((a,b)=>a.land-b.land);
  const cues=[];
  for(const fraction of [0,.56,1]){
    const piece=pieces[Math.round((pieces.length-1)*fraction)];
    const at=piece.land+(fraction===1?.21:0);
    if(cues.length && at-cues.at(-1).at<.21)continue;
    const pose=piecePose(piece,piece.land,{});
    cues.push({at,x:pose.x,y:pose.low+.16,z:pose.z,settling:fraction===1});
  }
  return cues;
}
export function fallAudioTracker(buildings){
  const live=new Map();
  return {
    reset(){live.clear();},
    step(events,play){
      for(const key of live.keys())if(!events.some(e=>e.key===key))live.delete(key);
      for(const event of events){
        const now=event.age/30;
        let record=live.get(event.key);
        if(!record){
          record={cues:collapseSoundCues(event,buildings),last:Math.max(-1,now-.085)};
          live.set(event.key,record);
        }
        for(const cue of record.cues)if(cue.at>record.last && cue.at<=now)play(cue);
        record.last=now;
      }
    },
  };
}
