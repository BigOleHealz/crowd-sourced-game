import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {MAP}=await import('../public/world.js');
const {collapseSoundCues,fallAudioTracker}=await import('../public/collapse-sound-cues.js');
const event={key:'tower-0',tower:0,missing:[],age:0},cues=collapseSoundCues(event,MAP.buildings);
assert(cues.length>=2 && cues.at(-1).settling);
const tracker=fallAudioTracker(MAP.buildings),heard=[];
for(let i=0;i<170;i+=2){event.age=i;tracker.step([event],p=>heard.push(p));tracker.step([event],p=>heard.push(p));}
assert.deepEqual(heard,cues);
tracker.reset();tracker.step([{...event,age:180}],()=>assert.fail('Historical impacts should not replay'));
let bytes=0;
for(const name of ['plate-glass','helicopter-rotor','concrete-impact','concrete-settle','vehicle-person-hit']){
 const file=readFileSync(new URL('../public/audio/'+name+'.ogg',import.meta.url));bytes+=file.length;
 assert.equal(file.toString('ascii',0,4),'OggS');
 if(name!=='vehicle-person-hit')assert(file.includes('OpusHead'));
}
assert(bytes<120000);console.log('PASS recorded impact assets, synchronized spatial collapse cues, stable replay and late joins, '+bytes+' bytes');
