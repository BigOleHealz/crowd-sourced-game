import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {crowdPanicAudio,crowdVoices} from '../public/crowd-panic-audio.js';

const clip=readFileSync(new URL('../public/audio/crowd-reactions.ogg',import.meta.url));
assert.equal(clip.toString('ascii',0,4),'OggS');
assert(clip.includes(Buffer.from('OpusHead')) && clip.length<256*1024);
const cues=crowdVoices.flat().sort((a,b)=>a.start-b.start);
assert.equal(cues.length,50);
for(let i=1;i<cues.length;i++)assert(cues[i-1].start+cues[i-1].duration<cues[i].start);

const tracker=crowdPanicAudio(),ear={x:0,y:0,z:0},heard=[];
let latest=Array.from({length:9},(_,i)=>({id:'actor-'+i,x:3+i,y:1,z:2,hp:100}));
tracker.reset(latest);
function step(tick){
  tracker.step(latest,tick,ear,(name,mouth,gain)=>heard.push({tick,name,mouth,gain}));
}
function cry(i,tick,state={}){
  latest=latest.map((p,j)=>j===i?{...p,reaction:'gunfire',panicCry:tick,...state}:p);
  step(tick);
}
cry(0,20);step(21);cry(1,21);cry(2,25);cry(3,30);cry(4,35);
assert(heard.length>=3);
for(const event of heard){
 const stillPlaying=heard.filter(other=>other.tick<=event.tick && other.tick+Math.ceil(other.name.duration*30)>event.tick);
 assert(stillPlaying.length<=3,'simultaneous voice budget');
}
const nearby=heard.length;
assert(heard.every(({mouth,gain})=>mouth.y===2.48 && gain>0));
assert(new Set(heard.map(s=>s.name)).size>=2);
cry(5,90,{x:200});cry(6,97,{dead:true});cry(8,108,{reaction:'vehicle'});
assert.equal(heard.length,nearby,'distant, defeated and ordinary pedestrians stay quiet');
tracker.reset(latest);step(109);assert.equal(heard.length,nearby);
cry(1,150);assert.equal(heard.length,nearby+1,'a later sustained threat can produce a fresh call');

const roster=Array.from({length:22},(_,i)=>({id:'street-'+i,x:1,y:0,z:0}));
const heardCues=new Set();
for(const npc of roster){
 const memory=crowdPanicAudio();
 memory.reset([npc]);
 const clips=[];
 for(let i=0;i<15;i++){
   const tick=(i+1)*90;
   memory.step([{...npc,reaction:'gunfire',panicCry:tick}],tick,ear,cue=>{clips.push(cue);heardCues.add(cue);});
 }
 const cast=crowdVoices.find(voice=>voice.includes(clips[0]));
 assert(clips.every(clip=>cast.includes(clip)),'same pedestrian retains their voice');
 assert.equal(new Set(clips.slice(0,cast.length)).size,cast.length,'no repeat before voice runs through its repertoire');
}
assert.equal(heardCues.size,50,'all recordings are reachable through normal panic events');
console.log('PASS 50 recorded, spaced, non-repeating crowd performances, stable voices, and fresh nearby events only');
