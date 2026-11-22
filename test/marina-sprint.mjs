import assert from 'node:assert/strict';
import {createMarinaSprint,raceClock,sprintStart,sprintGates} from '../public/marina-sprint.js';

const race=createMarinaSprint();
const racer=()=>({life:{hp:100}});
const car=()=>({...sprintStart,speed:0});
const a=racer(),b=racer(),pickup=car(),sedan=car();
assert.equal(race.start(a,null,0),false);
assert.equal(race.start(a,{...pickup,speed:12},0),false);
assert.equal(race.start(a,pickup,0),true);
race.update(a,Object.assign(pickup,{z:0}),1000);
assert.equal(race.state(a),undefined,'jumping the start cancels the attempt');
Object.assign(pickup,sprintStart);
race.start(a,pickup,2000);race.start(b,sedan,2000);
race.update(a,pickup,4999);assert.equal(race.state(a).phase,'countdown');
race.update(a,pickup,5000);assert.equal(race.state(a).phase,'racing');
Object.assign(pickup,sprintGates.at(-1));race.update(a,pickup,5500);
assert.equal(race.state(a).next,0,'cannot skip gates');
for(const [i,gate] of sprintGates.entries())race.update(a,Object.assign(pickup,gate),6000+1000*i);
assert.equal(race.state(a).phase,'finished');assert.equal(raceClock(race.state(a).elapsed),'0:05.00');
assert.deepEqual(race.board(),[{driver:1,time:5000}]);
race.update(b,sedan,5000);race.update(b,null,5001);
assert.equal(race.state(b),undefined,'leaving the car cancels only that driver');
for(const [vehicle,player,interval] of [[sedan,b,600],[pickup,a,1500],[pickup,a,500]]){
  race.start(player,Object.assign(vehicle,sprintStart),20000);
  for(const [i,gate] of sprintGates.entries()){
    if(!i)race.update(player,vehicle,23000);
    race.update(player,Object.assign(vehicle,gate),23000+(i+1)*interval);
  }
}
assert.deepEqual(race.board(),[{driver:1,time:2500},{driver:2,time:3000}]);
for(let i=0;i<10;i++){
  const p=racer(),v=car();
  race.start(p,v,30000);race.update(p,v,33000);
  for(const [j,g] of sprintGates.entries())race.update(p,Object.assign(v,g),33000+(j+1)*(300+i));
}
assert.equal(race.board().length,10);
assert(!race.board().some(row=>row.driver===2));
assert.equal(race.state(b).best,3000,'A personal best survives dropping out of the session top ten');
console.log('PASS Marina Sprint countdown, false start, ordered checkpoints, independent drivers and session personal bests');
