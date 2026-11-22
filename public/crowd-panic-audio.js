import {civilianLooks} from './civilian-style.js';

// Seconds into the mono crowd-reactions recording. The gaps separate the
// performances even when the browser resamples the track for its audio device.
export const crowdVoices=[
  [
    {start:0,duration:1.66}, // alarmed yell
    {start:1.76,duration:0.97}, // alarmed yell
    {start:2.83,duration:0.77}, // alarmed yell
    {start:3.7,duration:0.98}, // alarmed yell
    {start:4.78,duration:0.63}, // alarmed yell
    {start:5.51,duration:0.88}, // alarmed yell
    {start:6.49,duration:0.67}, // alarmed yell
    {start:7.26,duration:0.93}, // alarmed yell
  ],
  [
    {start:8.29,duration:0.38}, // startled cry
    {start:8.77,duration:0.49}, // startled cry
    {start:9.36,duration:0.32}, // startled cry
    {start:9.78,duration:0.48}, // startled cry
    {start:10.36,duration:0.35}, // startled cry
    {start:10.81,duration:0.33}, // startled cry
    {start:11.24,duration:0.57}, // No!
    {start:11.91,duration:0.48}, // No!
  ],
  [
    {start:12.49,duration:0.696}, // hurry up!
    {start:13.286,duration:0.62}, // get down!
    {start:14.006,duration:0.647}, // look out!
    {start:14.754,duration:1.23}, // go go go!
    {start:16.084,duration:0.65}, // medic!
    {start:40.948,duration:2.25}, // piercing scream
  ],
  [
    {start:16.834,duration:0.676}, // hurry up!
    {start:17.61,duration:0.85}, // get down!
    {start:18.56,duration:0.608}, // look out!
    {start:19.267,duration:0.98}, // go go go!
    {start:20.347,duration:0.667}, // medic!
    {start:39.618,duration:1.23}, // Help!
  ],
  [
    {start:21.114,duration:0.287}, // sharp cry
    {start:21.501,duration:0.38}, // sharp cry
    {start:21.981,duration:0.3}, // sharp cry
    {start:22.381,duration:0.35}, // sharp cry
    {start:22.831,duration:0.328}, // sharp cry
    {start:23.259,duration:0.379}, // sharp cry
    {start:23.738,duration:0.32}, // sharp cry
    {start:24.158,duration:0.37}, // sharp cry
    {start:24.628,duration:0.38}, // sharp cry
  ],
  [
    {start:25.108,duration:1.42}, // Oh my God!
    {start:26.628,duration:1.57}, // Oh my God!
    {start:28.298,duration:1.15}, // Oh my God!
    {start:29.548,duration:0.74}, // Stop it!
    {start:30.388,duration:0.76}, // Stop it!
    {start:31.248,duration:0.8}, // Go away!
    {start:32.148,duration:0.92}, // Go away!
    {start:33.168,duration:0.88}, // Get out of here!
    {start:34.148,duration:0.88}, // Get out of here!
    {start:35.128,duration:0.98}, // Get off me!
    {start:36.208,duration:0.95}, // Get off me!
    {start:37.258,duration:0.9}, // What are you doing?
    {start:38.258,duration:1.26}, // What are you doing?
  ],
];
const lowerVoices=[crowdVoices[0],crowdVoices[1],crowdVoices[3]];
const higherVoices=[crowdVoices[2],crowdVoices[4],crowdVoices[5]];

// Keep a small audible group in the foreground, with room between reactions.
// The server timestamps the cry. A repeat snapshot or a late join stays quiet.
export function crowdPanicAudio(){
  let previous,nextAllowed=-Infinity;
  let ends=[];
  const playedAt=new Map();
  function reset(npcs){
    previous=npcs;
    playedAt.clear();
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
      if(npc.dead || (npc.reaction!=='gunfire' && npc.reaction!=='shipwreck') || !Number.isInteger(npc.panicCry) ||
        npc.panicCry>tick || tick-npc.panicCry>12)continue;
      const prior=before.find(p=>p.id===npc.id);
      if(!prior || prior.panicCry===npc.panicCry)continue;
      const d=Math.hypot(npc.x-ear.x,npc.y-ear.y,npc.z-ear.z);
      if(d<near){near=d;actor=npc;}
    }
    if(!actor)return;
    let hash=0;
    for(const ch of String(actor.id))hash=(Math.imul(hash,31)+ch.charCodeAt(0))>>>0;
    // Keep each resident in character and cycle through every take for that
    // voice before repeating one. Adjacent listeners hear a spatial call.
    const face=civilianLooks[actor.evacLook??actor.id]?.face??hash;
    const cast=(face%2===0?higherVoices:lowerVoices)[hash%3];
    const start=(hash+actor.panicCry)%cast.length;
    let cue=cast[start];
    for(let i=1;i<cast.length;i++){
      const candidate=cast[(start+i)%cast.length];
      if((playedAt.get(candidate)??-Infinity)<(playedAt.get(cue)??-Infinity))cue=candidate;
    }
    const mouth={x:actor.x,y:actor.y+1.48,z:actor.z};
    play(cue,mouth,.80*Math.min(1,(35-near)/7),hash%97+actor.panicCry);
    playedAt.set(cue,tick);
    ends.push(tick+Math.ceil(cue.duration*30));
    nextAllowed=tick+5;
  }
  return {reset,step};
}
