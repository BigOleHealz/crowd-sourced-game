import assert from 'node:assert/strict';
import {newExpedition,fire,advanceRounds} from '../public/expedition.js';
import {newLife,healthView} from '../public/rivals.js';
import {liveShots} from '../public/shot-events.js';

const zones=[['head',0,1.69],['torso',0,1.26],['leftArm',-.27,1.32],
  ['rightArm',.27,1.32],['leftLeg',-.13,.52],['rightLeg',.13,.52]];
for(const yaw of [0,1.57,-2.36])for(const [part,side,height] of zones) {
  const world=newExpedition(),c=Math.cos(yaw),s=Math.sin(yaw);
  const target={id:2,state:{x:0,y:18,z:0},yaw,life:newLife(0,false)};
  const shooter={id:1,weapon:1,life:newLife(0,false),fireReady:0,
    state:{x:side*c-5*s,y:18+height-1.3,z:side*s+5*c}};
  const players=new Map([[1,shooter],[2,target]]);
  function strike(tick) {
    fire(world,shooter,{aimYaw:yaw,aimPitch:0},tick,players,[]);
    for(let j=0;j<5;j++)advanceRounds(world,players,[],tick+j);
    return world.shots.at(-1);
  }
  const first=strike(0);
  assert.equal(first.injury,part==='head' ? null : part);assert.equal(first.headshot,part==='head');
  assert.equal(target.life.hp,part==='head'?25:75);
  const status=healthView(target,10);
  if(part==='torso' || part==='head')assert.equal(status.lostParts,undefined);
  else {assert.deepEqual(Object.keys(status.lostParts),[part]);assert(status.lostParts[part].age>0);}
  const again=strike(10);
  assert.equal(again.injury,part==='head' ? 'headPop' : part==='torso' ? 'torso' : null);
  target.life=newLife(30);
  assert.equal(healthView(target,30).lostParts,undefined);
  assert.equal(strike(30).injury,null);assert.equal(target.life.hp,100);
}
console.log('PASS all six anatomical hit zones at three headings, normal HP, per-life flags, shield and repeat-hit handling.');

// A replayed snapshot and a welcome snapshot with the same recent impacts
// must never repeat a defeat's visual or sound in a connected observer.
for(const npc of [false,true]) {
  const world=newExpedition(), shooter={id:1,weapon:1,fireReady:0,life:newLife(0,false),
    state:{x:0,y:18.39,z:5}};
  const target={id:npc ? 'patrol' : 2,state:{x:0,y:18,z:0},life:newLife(0,false),yaw:0};
  const players=new Map([[1,shooter]]), rivals=npc ? [target] : [];
  if(!npc)players.set(target.id,target);
  const observer=liveShots([]);const pops=shots=>shots.filter(s=>s.injury==='headPop').length;
  function strike(tick) {
    fire(world,shooter,{aimYaw:0,aimPitch:0},tick,players,rivals);
    for(let j=0;j<5;j++)advanceRounds(world,players,rivals,tick+j);
  }
  strike(1);
  const alive=healthView(target,5);
  assert.equal(alive.hp,25);assert.equal(alive.dead,false);assert.equal(alive.lostParts,undefined);
  const prior=world.shots.slice();
  assert.equal(pops(observer(prior)),0);
  strike(15);
  const defeated=healthView(target,20),impact=world.shots.at(-1);
  assert.equal(defeated.hp,0);assert(defeated.dead);assert(defeated.lostParts.head);
  assert.equal(impact.targetId,target.id);assert.equal(impact.hitKind,npc ? 'npc' : 'player');
  assert.equal(impact.injury,'headPop');assert(impact.injuryPoint);
  assert.equal(pops(observer(world.shots)),1);assert.deepEqual(observer(prior),[]);
  assert.deepEqual(observer(world.shots),[]);
  const late=liveShots(world.shots);assert.deepEqual(late(world.shots),[]);
  strike(30);assert.equal(pops(observer(world.shots)),0);assert.equal(pops(late(world.shots)),0);
  target.life=newLife(120);
  assert.equal(healthView(target,120).hp,100);assert.equal(healthView(target,120).lostParts,undefined);
  strike(125);assert.equal(healthView(target,130).hp,100);assert.equal(pops(observer(world.shots)),0);
}
console.log('PASS survivor, single defeat cue, replay, late join, shield and respawn for hikers and rivals.');

const {posedHit}=await import('../public/hit-zones.js');
const indices={hipL:0,hipR:1,shoulderL:2,shoulderR:3,elbowL:4,elbowR:5,wristL:6,wristR:7,
  kneeL:8,kneeR:9,ankleL:10,ankleR:11,toeL:12,toeR:13};
const v=(x,y,z)=>({x,y,z});
const joints=[v(-.108,.975,0),v(.108,.975,0),v(-.222,1.447,0),v(.222,1.447,0),
  v(-.27,1.22,-.08),v(.27,1.22,-.08),v(-.16,1.27,-.29),v(.12,1.28,-.34),
  v(.18,.54,-.15),v(-.16,.54,.18),v(.22,.14,-.16),v(-.18,.14,.18),v(.20,.06,-.28),v(-.18,.06,.08)];
for(const yaw of [0,1.82]) {
  const c=Math.cos(yaw),s=Math.sin(yaw);
  const rotate=p=>v(p.x*c-p.z*s,p.y,p.x*s+p.z*c);
  const actor={state:v(0,0,0),life:{},hitPose:{joints:joints.map(rotate),indices,origin:v(0,0,0)}};
  function part(point,direction) {
    return posedHit(actor,rotate(point),rotate(direction),0,.9).part;
  }
  assert.equal(part(v(.20,.37,-.42),v(0,0,1)),'leftLeg','forward leg crossed the body midline');
  assert.equal(part(v(-.17,.37,-.42),v(0,0,1)),'rightLeg');
  assert.equal(part(v(.39,1.04,0),v(-1,0,0)),'torso','side-on abdomen with arms above the ray');
  assert.equal(part(v(0,1.19,-.40),v(0,0,1)),'torso');
}
console.log('PASS posed joint occlusion, crossed moving legs and side-on abdomen at two headings.');
