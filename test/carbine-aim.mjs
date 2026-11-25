import assert from 'node:assert/strict';
import {fire,newExpedition} from '../public/expedition.js';
import {firearmSpecs} from '../public/rounds.js';
import {newLife} from '../public/rivals.js';
import {sightedCarbineAim,handheldFireAim} from '../public/view-pitch.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,
  `${actual} differs from ${expected}`);

for(const [yaw,pitch] of [[0,0],[.48,.2],[-1.2,-.35],[2.6,.6]]) {
  // The view may turn again after the scene rendered or mouse-down cached an aim.
  const view={sighted:true,yaw,pitch};
  const aim=sightedCarbineAim(view,1,null);
  assert.deepEqual(aim,{yaw,pitch});
  assert.deepEqual(sightedCarbineAim(view,3,null),{yaw,pitch});
  assert.equal(sightedCarbineAim(view,2,null),null);
  assert.equal(sightedCarbineAim(view,1,'heli'),null);
  assert.equal(sightedCarbineAim({...view,sighted:false},1,null),null);
  assert.deepEqual(handheldFireAim(view,3,null,()=>{throw Error('stale rendered camera');},{yaw:9,pitch:9}),{yaw,pitch});
  assert.deepEqual(handheldFireAim({...view,sighted:false},1,null,()=>({yaw,pitch}),{yaw:9,pitch:9}),{yaw,pitch});

  for(const weapon of [1,3]){
    const world=newExpedition();
    const player={id:1,weapon,state:{x:0,y:180,z:0},life:newLife(0,false),fireReady:0};
    fire(world,player,{aimYaw:aim.yaw,aimPitch:aim.pitch},1,new Map([[1,player]]),[]);
    const round=world.bullets[0],speed=firearmSpecs[weapon].speed;
    near(round.vx/speed,Math.sin(yaw)*Math.cos(pitch));
    near(round.vy/speed,Math.sin(pitch));
    near(round.vz/speed,-Math.cos(yaw)*Math.cos(pitch));
  }
}
console.log('PASS both sighted rifles follow the current center-view ray and on-foot shots prefer the fresh trace.');
