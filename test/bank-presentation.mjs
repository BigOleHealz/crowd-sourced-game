import assert from 'node:assert/strict';
import {bankPresentation} from '../public/bank-presentation.js';
import {bankAlarmSeconds} from '../public/bank-rules.js';

const since=300;
const alarm={phase:'alarm',since};
const end=since+bankAlarmSeconds*30;
const handoff={phase:'handoff',since:end};
const early=bankPresentation(alarm,since+15);
const lift=bankPresentation(alarm,end-35);
const offer=bankPresentation(alarm,end-20);
const settled=bankPresentation(handoff,end);

assert.equal(early.parcel,null);
assert.equal(early.sign,'alarm');
assert(lift.offering && offer.offering);
assert(offer.parcel.z<lift.parcel.z && offer.parcel.y>1.84,'parcel clears the desktop as it approaches the customer');
assert.deepEqual(bankPresentation(alarm,end-3).parcel,settled.parcel,'cash is settled for the first collectable tick');
assert.equal(settled.sign,'cash');
assert.equal(settled.cashGrip,1);
assert.equal(bankPresentation(handoff,end+25).cashGrip,0,'teller lets go of the cash');
assert.deepEqual(bankPresentation(handoff,end+300).parcel,settled.parcel,'late observers see the parcel at rest');

const reduced=bankPresentation(alarm,end-20,true);
assert.equal(reduced.parcel,null);
assert.equal(reduced.glow,bankPresentation(alarm,since,true).glow,'reduced motion holds the alarm light steady');
assert.equal(reduced.threat,1);
assert.deepEqual(bankPresentation(handoff,end,true).parcel,settled.parcel);

for(const [outcome,sign] of [['collected','collected'],['aborted','interrupted']]){
  const cooldown={phase:'cooldown',since:end+6,outcome};
  const aftermath=bankPresentation(cooldown,cooldown.since);
  assert.equal(aftermath.glow,0);
  assert.equal(aftermath.parcel,null);
  assert.equal(aftermath.sign,sign);
  assert(aftermath.threat>bankPresentation(cooldown,cooldown.since+90).threat);
}
console.log('PASS synchronized cash motion, settled handoff, reduced motion, and encounter aftermath');
