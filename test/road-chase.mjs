import assert from 'node:assert/strict';
import {roadFraming} from '../public/road-chase.js';
const rest=roadFraming(null,{speed:0},1/60),fast=roadFraming(null,{speed:33},1/60);
assert(rest.height>fast.height && fast.reach>rest.reach && fast.lead>0);
for(const fps of [30,60,144]){
  let f=fast;
  for(let i=0;i<fps;i++){
    const next=roadFraming(f,{speed:-4},1/fps);
    assert(Math.abs(next.lead-f.lead)<.46);
    f=next;
  }
  assert(f.lead<-.40 && f.height>fast.height && f.reach<fast.reach);
  for(let i=0;i<fps;i++)f=roadFraming(f,{speed:23,bridgeFlight:{vy:-10}},1/fps);
  assert(f.lift<-.50);
  const landed=roadFraming(f,{speed:20},1/fps);
  assert(landed.lift>f.lift && landed.lift<-.40);
}
console.log('PASS smooth chase lead, parking and reverse framing, braking and airborne transitions at 30/60/144 Hz.');
