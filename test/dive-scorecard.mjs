import assert from 'node:assert/strict';
import {diveScorecard,scoringJudges} from '../public/dive-scorecard.js';
import {platformTotal} from '../public/platform-judges.js';

class Element{
  children=[];attributes={};
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(key,value){this.attributes[key]=value;}
}
global.document={createElement:()=>new Element()};
const store=new Map();
global.localStorage={getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)};
const panel=new Element(),card=diveScorecard(panel);
const awards=[7,8.5,9,8.5,9.5,7,8.5];
assert.deepEqual([...scoringJudges(awards)],[1,3,6]);
const judging={awards,dd:1.5,code:'103C',points:platformTotal(awards,1.5)};
const mark={x:71.6,z:-471,tick:31,score:9,note:'Good entry',flip:true,judging};
card.observe(mark);card.show(mark,'');
assert.equal(card.targets(true),'Best · Flip 38.25 pts');
assert.equal(panel.children.find(n=>n.className==='dive-judges').children.filter(n=>n.className==='counted').length,3);
assert(panel.children.at(-1).textContent.includes('38.25 pts'));
const other={...mark,tick:33,judging:{...judging,points:45}};
card.show(other,'Hiker 2');assert.equal(panel.children.at(-1).textContent,'Hiker 2’s dive');
assert.equal(card.targets(true),'Best · Flip 38.25 pts');
const second=diveScorecard(panel);
second.observe({...mark,tick:45,flip:false,judging:{...judging,points:40}});
card.observe({...mark,tick:46,judging:{...judging,points:30}});
assert.equal(card.targets(true),'Best · Straight 40.00 / Flip 38.25 pts');
card.observe({...mark,tick:49,judging:null});assert.equal(card.targets(false),'Best · Flip 9.0 of 10');
const personal={...mark,tick:55,judging:{...judging,points:45}};
card.observe(personal);card.show(personal,'');assert.equal(panel.children.at(-1).textContent,'New personal best · +6.75');
card.observe({...mark,tick:60,judging:null,flip:false,score:8.5});
const fresh=diveScorecard(panel);
assert.equal(fresh.targets(false),'Best · Straight 8.5 / Flip 9.0 of 10');
assert.equal(fresh.targets(true),'Best · Straight 40.00 / Flip 45.00 pts');
console.log('Seven judges, trimmed ties, independent local bests for all four dives, spectator isolation and refresh persistence verified.');
