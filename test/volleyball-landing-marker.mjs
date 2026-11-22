import assert from 'node:assert/strict';
import {volleyballLandingScale} from '../public/volleyball-view.js';

const returnShot={tick:33,duration:51,from:[0,2,0],to:[0,.125,7],lift:2.24};
const wide=volleyballLandingScale(returnShot,returnShot.tick);
assert.equal(volleyballLandingScale(returnShot,returnShot.tick+15),wide,'The marker holds wide through ascent');
let prior=wide;
for(let tick=returnShot.tick+21;tick<=returnShot.tick+returnShot.duration;tick++){
  const scale=volleyballLandingScale(returnShot,tick);
  assert(scale<prior,'The marker tightens through descent');
  prior=scale;
}
assert(prior>.5 && prior<.75,'The final ring remains readable');
assert.equal(volleyballLandingScale(returnShot,1000),prior);

const drivenShot={tick:33,duration:32,from:[0,3.05,0],to:[0,.125,6],lift:.28};
assert(volleyballLandingScale(drivenShot,38)<wide,'A descending spike starts tightening immediately');
assert.equal(volleyballLandingScale(drivenShot,65),prior);
