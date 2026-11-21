import assert from 'node:assert/strict';
import {waterHelm} from '../public/water-helm.js';
const rates=[];
for(const id of ['bay-rhib','superyacht']){
  const h={id,driver:1,speed:0},dt=1/30;
  const tick=(throttle,steer)=>waterHelm(h,{throttle,steer},dt);
  for(let i=0;i<30;i++)assert.equal(tick(0,1),0);
  for(let i=0;i<50;i++)tick(1,0);
  const first=tick(1,1);
  for(let i=0;i<29;i++)tick(1,1);
  const held=h.yawRate,atRelease=h.speed;
  assert(first>0 && first<held*dt*.2);
  let coastTurn=0;
  for(let i=0;i<30;i++)coastTurn+=tick(0,0);
  assert(coastTurn>0 && h.yawRate<held*.31 && h.speed>0 && h.speed<atRelease);
  for(let i=0;i<180;i++)tick(-1,0);
  assert(h.speed<0 && tick(-1,1)<0);
  rates.push(held);
}
assert(rates[0]>rates[1]*2);
console.log('PASS motion-dependent steering, turn buildup, helm release, coasting, reverse and distinct hull agility');
