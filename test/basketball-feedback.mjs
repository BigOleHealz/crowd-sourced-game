import assert from 'node:assert/strict';
import {createBasketball} from '../basketball-game.js';
import {basketballCourt as court,hoop,shotWindow} from '../public/basketball-layout.js';
import {basketballHud} from '../public/basketball-hud.js';
import {courtContactAudio,courtContactBuffer} from '../public/basketball-audio.js';

const dt=1/30;
function fakePanel(){
  const node=()=>({style:{},classList:{toggle(){}},setAttribute(k,v){this[k]=v;}});
  const status=node(),meter=node(),fill=node(),gold=node();
  meter.querySelector=s=>s==='i'?fill:gold;
  const panel={querySelector:s=>s==='output'?status:meter,querySelectorAll:()=>[]};
  return {panel,status,meter,fill,gold};
}
function play(range,hold){
  const world={},p={id:1,life:{hp:100},yaw:0,state:{id:1,x:hoop.x,y:court.y,z:hoop.z+range,grounded:true}};
  const game=createBasketball(world,new Map([[p.id,p]])),g=world.basketball=game.state;
  game.interact(p,'join');
  const ui=fakePanel(),hud=basketballHud(ui.panel),listen=courtContactAudio(),played=[];
  listen.reset(g);
  const captured=shotWindow(p.state);
  for(let n=0;n<hold;n++){game.input(p,{hoopShot:true});game.step(dt);}
  game.input(p,{hoopShot:false});game.step(dt);
  const {power,timing}=g.shot;
  assert(Math.abs(power-Math.min(1,hold*dt*.66))<1e-7);
  // Move after release. Neither the frozen power nor its target follows the shooter.
  p.state.z+=2;
  for(let n=0;n<63;n++){
    game.step(dt);hud.update(g,p.state,0,false);
    for(let duplicate=0;duplicate<2;duplicate++)listen.step(g,e=>played.push(e.kind));
    assert.equal(ui.meter.hidden,false);
    assert.equal(ui.meter['aria-valuenow'],Math.round(power*100));
    assert.equal(ui.gold.style.left,(captured.center-captured.halfWidth)*100+'%');
    assert(ui.status.textContent.includes(timing));
  }
  assert.deepEqual(played,g.shot.contacts.map(c=>c.kind));
  const late=courtContactAudio();late.reset(g);late.step(g,()=>assert.fail('cold join replayed an old sound'));
  return {played,timing,points:g.result.points};
}
assert.deepEqual(play(3,19),{played:['swish'],timing:'Perfect',points:2});
assert.deepEqual(play(3,12),{played:['rim','backboard'],timing:'Early',points:0});
assert.deepEqual(play(3,33),{played:['backboard','rim'],timing:'Late',points:0});
assert.deepEqual(play(1,15),{played:['swish'],timing:'Perfect',points:2});
assert.deepEqual(play(1,1),{played:['rim'],timing:'Early',points:0});
assert.deepEqual(play(1,40),{played:['rim'],timing:'Late',points:0});
const context={sampleRate:16000,createBuffer(_,length){
  const data=new Float32Array(length);return {getChannelData:()=>data};
}};
const signals=['swish','rim','backboard'].map(kind=>courtContactBuffer(context,kind).getChannelData(0));
for(const samples of signals)assert(samples.every(Number.isFinite) && samples.some(s=>Math.abs(s)>.12));
assert(new Set(signals.map(s=>s.length)).size===3);
console.log('Both releases freeze their real meter, label all three timing ranges, and reproduce swish/rim/backboard once at their physical contacts.');
