import assert from 'node:assert/strict';
import {touchLayout} from '../public/touch-controls.js';
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
