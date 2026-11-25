import assert from 'node:assert/strict';
import {vehicleContact} from '../public/vehicle-contact.js';
import {CITY, stepPlayer, groundHeight} from '../public/world.js';

function worldPoint(body, side, along, height=0) {
  const c=Math.cos(body.yaw),s=Math.sin(body.yaw);
  return {x:body.x+side*c-along*s,y:body.y+height,z:body.z+side*s+along*c};
}
for(const city of [true,false]) {
  for(const yaw of [0,.73,Math.PI/2,2.88]) {
    const rover={x:9,y:1.5,z:-7,yaw};
    const heli={x:-5,y:8,z:11,yaw};
    const world={rover,heli};
    const contact=(body,side,along,height)=> {
      const p=worldPoint(body,side,along,height);
      return vehicleContact(p.x,p.y,p.z,world,city);
    };
    assert.ok(contact(rover,1,0,0).depth>.16);
    assert.equal(contact(rover,1.18,0,0).depth,0);
    assert.equal(contact(rover,0,0,4).floor,rover.y+(city ? 1.66 : 1.60));
    assert.equal(contact(rover,0,-1.99,0).depth>0,city);
    assert.ok(contact(heli,0,3.5,0).depth>0);
    assert.ok(contact(heli,0,-2.85,0).depth>0);
    assert.equal(contact(heli,0,3.5,-3).depth,0);
    assert.equal(contact(heli,1.2,3.5,0).depth,0);
  }
}
const flat={x:0,z:18,y:groundHeight(0,18),yaw:.8};
let state={...flat,vy:0,grounded:true};
const world={rover:flat};
state=stepPlayer(state,{},1/30,{},world);
assert.ok(vehicleContact(state.x,state.y,state.z,world,CITY).depth<.00001,'moving chassis displaces an idle hiker');
state={...flat,y:flat.y+3.4,vy:-1,grounded:false};
for(let i=0;i<50;i++)state=stepPlayer(state,{},1/30,{},world);
assert.ok(state.grounded && Math.abs(state.y-(flat.y+(CITY ? 1.66 : 1.60)))<.01,'land on the local vehicle roof');
console.log('PASS rotated pickup, jeep and helicopter hulls, hovering clearance, displacement and vehicle roof landing.');

const cheetah={kind:'supercar',x:9,y:1.5,z:-7,yaw:.73};
for(const [side,along,height] of [[1,0,.5],[0,0,1.21],[.8,1,.8],[1.6,0,.5]]){
  const p=worldPoint(cheetah,side,along,height);
  const expected=vehicleContact(p.x,p.y,p.z,{supercar:cheetah},true);
  for(const model of ['falco','veloce'])assert.deepEqual(
    vehicleContact(p.x,p.y,p.z,{traffic:[{...cheetah,kind:'valet-'+model,model}]},true),expected,
    'All Cheetah paint variants share the same walking collider');
}
