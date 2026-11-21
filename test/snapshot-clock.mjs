import assert from 'node:assert/strict';
import {SnapshotClock} from '../public/snapshot-clock.js';
const clock=new SnapshotClock(),sequence=[],jitter=[5,95,10,30,115,18,0];
let arrival=-1;
for(let i=0;i<128;i++){
  const sim=i*200/3;
  arrival=Math.max(arrival+1,sim+jitter[i%jitter.length]);sequence.push({sim,arrival});
}
let next=0,previous=-1e6,stalls=0;
for(let t=16;t<8200;t+=16){
  while(next<sequence.length && sequence[next].arrival<=t){const s=sequence[next++];clock.accept(s.sim,s.arrival);}
  const play=clock.target(t);assert(play>=previous);
  if(t>900){assert(play-previous<=18.4);if(play===previous)stalls++;assert(t-play<310 && t-play>70);}
  previous=play;
}
assert(stalls<3);clock.accept(0,10000);assert(clock.target(10000)<=0);
console.log('PASS monotonic motion under clustered/delayed snapshots, bounded delay, and session reset.');
