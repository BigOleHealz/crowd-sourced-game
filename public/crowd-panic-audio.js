const voices=[{name:'crowd-startle',ticks:19},{name:'crowd-shout',ticks:26},{name:'crowd-alarm',ticks:40}];
export const crowdRecordings=Object.fromEntries(voices.map(({name})=>[name,name]));

// Keep a small audible group in the foreground, with room between reactions.
// The server timestamps the cry. A repeat snapshot or a late join stays quiet.
export function crowdPanicAudio(){
  let previous,nextAllowed=-Infinity;
  let ends=[];
  function reset(npcs){
    previous=npcs;
    nextAllowed=-Infinity;
    ends=[];
  }
  function step(npcs,tick,ear,play){
    const before=previous;
    previous=npcs;
    if(!before || !npcs?.length || !Number.isFinite(tick) || tick<nextAllowed)return;
    ends=ends.filter(end=>end>tick);
    if(ends.length>=3)return;
    let actor,near=35;
    for(const npc of npcs){
      if(npc.dead || npc.reaction!=='gunfire' || !Number.isInteger(npc.panicCry) ||
        npc.panicCry>tick || tick-npc.panicCry>12)continue;
      const prior=before.find(p=>p.id===npc.id);
      if(!prior || prior.panicCry===npc.panicCry)continue;
      const d=Math.hypot(npc.x-ear.x,npc.y-ear.y,npc.z-ear.z);
      if(d<near){near=d;actor=npc;}
    }
    if(!actor)return;
    let hash=0;
    for(const ch of String(actor.id))hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;
    const cue=voices[hash%voices.length];
    const mouth={x:actor.x,y:actor.y+1.48,z:actor.z};
    play(cue.name,mouth,.80*Math.min(1,(35-near)/7),hash%97+actor.panicCry);
    ends.push(tick+cue.ticks);
    nextAllowed=tick+5;
  }
  return {reset,step};
}
