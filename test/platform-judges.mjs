import assert from 'node:assert/strict';
import {judgePlatform,platformTotal,platformReport} from '../public/platform-judges.js';
assert.equal(platformTotal([0,10,9,4,7.5,8,7],1.6),36);
for(const flip of [false,true]){
  const d={duration:1,release:.76,centerX:1,startX:1,flip};
  const angle=(flip?-3:-1)*Math.PI,perfect=judgePlatform(d,1,angle);
  assert.deepEqual(perfect.awards,Array(7).fill(10));
  assert.equal(perfect.points,flip?45:48);
  const rough=judgePlatform({...d,release:.59},1.3,angle+.35);
  assert(rough.points>0 && rough.points<perfect.points);
  assert(rough.awards.every(n=>Number.isInteger(n*2) && n>=0 && n<=10));
  assert.equal(judgePlatform(d,1,angle+Math.PI).points,0);
  assert(platformReport({judging:rough,note:'Opened early'}).includes(rough.code));
}
console.log('PASS official trim, 10 m difficulty coefficients, clean, imperfect and failed dives.');
