import assert from 'node:assert/strict';
import {dogOwnerDialogue,ownerSpeech} from '../public/dog-owner-dialogue.js';
const dog={id:'dog-pip',walker:'rival-fern'},owner={id:'rival-fern',name:'Fern',x:0,y:0,z:0,hp:100};
const listener={x:1,y:0,z:1},tracker=dogOwnerDialogue(),cues=[];
const world=(stamp,tick=stamp,extra={})=>({simTick:tick,dogs:[{...dog,theftTick:stamp}],npcs:[owner],...extra});
const step=(w,ear=listener)=>tracker.step(w,ear,(...cue)=>cues.push(cue));
tracker.reset(world(40).dogs);step(world(40));assert.equal(cues.length,0,'late join');
step(world(70));step(world(70));assert.equal(cues.length,1);assert.equal(cues[0][0].say,'Hey! Bring my dog back!');
assert.equal(cues[0][1].name,'Fern');assert.equal(cues[0][2].y,1.45);assert.equal(cues[0][3],1);
step(world(80),{x:40,y:0,z:0});step(world(80));assert.equal(cues.length,1,'out-of-range event is consumed');
step(world(90,120));step(world(121,122,{npcs:[]}));assert.equal(cues.length,1);
step(world(125),{x:24,y:0,z:0});assert.ok(cues[1][3]>0 && cues[1][3]<.36);
const line=cues[0][0];
class Utterance{constructor(text){this.text=text;}}
let spoken,canceled=0,fallback=0;
const browser={SpeechSynthesisUtterance:Utterance,speechSynthesis:{getVoices:()=>[{localService:true,lang:'en-US',default:true}],
  speak:u=>{spoken=u;},cancel:()=>{canceled++;}}};
const speech=ownerSpeech(browser),record=()=>fallback++;
speech.say(line,.43,record);assert.equal(spoken.text,line.say);assert.equal(spoken.volume,.43);
speech.stop();assert.equal(canceled,1);assert.equal(spoken.onerror,null);assert.equal(fallback,0);
speech.say(line,.62,record);spoken.onerror();assert.equal(canceled,2);assert.equal(fallback,1);
speech.say(line,.62,record);spoken.onstart();spoken.onerror();assert.equal(fallback,1,'never doubles an audible line');
browser.speechSynthesis.getVoices=()=>[];speech.say(line,.5,record);assert.equal(fallback,2,'recorded fallback');
assert.ok(line.clip.duration>.6);
console.log('PASS owner/source matching, hearing range, attenuation, muted speech cancellation, recorded fallback, no repeats or late-join playback.');
