import assert from 'node:assert/strict';
import {touchLayout,touchUseLabel} from '../public/touch-controls.js';
const has=(list,code)=>list.some(a=>a[0]===code);
for(const [role,fire] of [['foot',true],['armed-car',true],['turret',true],['car',false],['helm',false],['heli',true],['jet',true],['tank',true]]){
  const {quick,tools}=touchLayout({role,active:true,canAim:role==='foot',jump:'Jump',use:'Exit',seat:null,stance:role==='foot'?'stand':null});
  assert.equal(has(quick,'KeyF'),fire,role);
  assert(has(quick,'KeyE'));
  if(role==='heli'){assert(has(quick,'Space')&&has(quick,'ShiftLeft')&&has(tools,'KeyK'));}
  if(role==='jet'){assert(has(quick,'KeyR')&&has(quick,'KeyB'));}
  if(role==='foot'){assert(has(tools,'KeyC')&&has(tools,'KeyZ')&&has(tools,'tool'));}
}
console.log('PASS phone action layouts for on-foot play and seven vehicle roles');

const driver=touchLayout({role:'armed-car',active:true,use:'Exit pickup',seat:['Driver','Gunner']});
assert.equal(driver.axis,'Steer');assert(driver.quick.some(([code,label])=>code==='KeyF'&&label==='Fire missile'));
assert(driver.tools.some(([,label])=>label==='Gunner seat'));assert(driver.quick.some(([,label])=>label==='Driver tools'));
const gunner=touchLayout({role:'turret',active:true,use:'Exit pickup',seat:['Driver','Gunner']});
assert.equal(gunner.axis,undefined);assert(gunner.quick.some(([,label])=>label==='Fire turret'));
const booth=touchLayout({role:'seat',active:true,use:'Leave dance'});
assert.deepEqual(booth.quick,[['KeyE','Leave dance']]);assert.equal(booth.axis,undefined);

assert.equal(touchUseLabel({target:'rover',role:'drive',label:'Drive pickup'}),'Get in pickup');
for(const [target,label] of [['tank','Drive tracked tank'],['jet','Pilot strike jet'],['traffic-2','Take the wheel of the sedan']]){
  assert.equal(touchUseLabel({target,role:'drive',label}),label);
}

const seats=touchLayout({role:'armed-car',active:true,seat:['Driver','Gunner'],occupancy:['You','Taken']});
assert.deepEqual(seats.tools.slice(0,2),[['Digit1','Driver · You',true],['Digit2','Gunner · Taken',true]]);
