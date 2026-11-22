import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {crowdPanicAudio,crowdRecordings} from '../public/crowd-panic-audio.js';

for(const name of Object.keys(crowdRecordings)){
  const clip=readFileSync(new URL('../public/audio/'+name+'.ogg',import.meta.url));
  assert.equal(clip.toString('ascii',0,4),'OggS');
  assert(clip.includes(Buffer.from('OpusHead')) && clip.length>3000);
}
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
assert.equal(heard.length,3,'stagger and simultaneous voice budget');
assert(heard.every(({mouth,gain})=>mouth.y===2.48 && gain>0));
assert(new Set(heard.map(s=>s.name)).size>=2);
cry(5,90,{x:200});cry(6,97,{dead:true});cry(8,108,{reaction:'vehicle'});
assert.equal(heard.length,3,'distant, defeated and ordinary pedestrians stay quiet');
tracker.reset(latest);step(109);assert.equal(heard.length,3);
cry(1,150);assert.equal(heard.length,4,'a later sustained threat can produce a fresh call');
console.log('Crowd voices are recorded, spatial, staggered, capped, and fresh-event only.');
