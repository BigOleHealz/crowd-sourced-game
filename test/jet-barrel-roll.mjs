import assert from 'node:assert/strict';
import {newExpedition} from '../public/expedition.js';
import {stepJet} from '../public/jet.js';

for(const direction of [-1,1]){
  const world=newExpedition(),jet=world.jet;
  Object.assign(jet,{pilot:1,grounded:false,y:35,speed:20});
  const crew=new Map();
  const start=jet.roll;
  stepJet(world,{barrelRoll:direction},1/30,crew);
  assert.equal(jet.rollManeuver.direction,direction);
  let previous=jet.roll;
  for(let frame=1;frame<33;frame++){
    stepJet(world,{barrelRoll:-direction,steer:.5},1/30,crew);
    assert((jet.roll-previous)*direction>0,'roll keeps its original direction');
    previous=jet.roll;
  }
  assert.equal(jet.rollManeuver,null);
  assert(Math.abs(jet.roll-start-direction*Math.PI*2)<1e-9,'one press completes one turn');
  const after=jet.roll;
  stepJet(world,{steer:.5},1/30,crew);
  assert(Math.abs(jet.roll-after)<.1,'ordinary bank resumes without snapping back');
  assert(!jet.wrecked,'maneuver preserves flight');
}

const world=newExpedition();
world.jet.pilot=1;
stepJet(world,{barrelRoll:1},1/30,new Map());
assert.equal(world.jet.rollManeuver,null,'grounded aircraft cannot start a roll');
console.log('PASS jet barrel rolls in either direction, ignores retriggers, resumes banking, and stays grounded on runway');
