import assert from 'node:assert/strict';
import {Euler,Object3D,Vector3} from 'three';
import {stepSuspension,interpolateSuspension} from '../public/road-suspension.js';
import {supercarLayout as gt} from '../public/supercar-layout.js';
import {placeGTWheel} from '../public/supercar-view.js';
import {wheelsFor,flatWheelDrop,isFlat} from '../public/road-wheel-layout.js';

const dt=1/30,flat=()=>0;
const wheel=new Vector3(),point=new Vector3(),body=new Object3D(),axis=new Vector3(),steer=new Euler();
const minClearance=.012;
const tire=[];
for(const [radius,side] of [[.252,-.128],[.338,-.09],[.35,-.052],[.35,.052],[.338,.09],[.252,.128]]){
  for(let j=0;j<72;j++)tire.push(new Vector3(side,radius*Math.sin(j*Math.PI/36),radius*Math.cos(j*Math.PI/36)));
}

function check(car,h){
  body.position.y=h.heave;body.rotation.set(h.pitch,0,h.roll);
  const inverse=body.quaternion.clone().invert();
  axis.set(0,1,0).applyQuaternion(body.quaternion);
  wheelsFor(car).forEach(([x,z],i)=>{
    const hubY=gt.tire+h.wheels[i];
    placeGTWheel(wheel,x,z,hubY,body,axis);
    assert.equal(wheel.y,hubY,'hub retains sampled contact height');
    steer.set(0,z<0?-.42*car.steer:0,0);
    for(const local of tire){
      point.copy(local).applyEuler(steer).add(wheel).sub(body.position).applyQuaternion(inverse);
      if(point.y<gt.tire)continue;
      const gap=gt.archRadius-Math.hypot(point.y-gt.tire,point.z-z);
      assert(gap>minClearance,'tread enters painted fender or its lip: '+gap);
    }
  });
}

for(const side of [-1,1]){
  const car={kind:'supercar',x:0,y:0,z:0,yaw:0,speed:0,steer:0,lateralSpeed:0,flatTires:0};
  let previous;
  function advance(surface,expectPlanted=false){
    stepSuspension(car,dt,surface);
    if(expectPlanted)for(const [i,h] of car.suspension.wheels.entries())
      assert(Math.abs(h+(isFlat(car,i)?flatWheelDrop:0))<.001,'tire stays planted at speed and under combined loads');
    check(car,car.suspension);
    if(previous)check(car,interpolateSuspension(previous,car.suspension,.5));
    previous=car.suspension;
  }
  for(let i=0;i<65;i++){car.speed=Math.min(gt.maxSpeed,car.speed+15*dt);advance(flat,true);}
  car.steer=side;
  for(let i=0;i<36;i++){car.yaw+=side*.85*dt;car.speed=Math.max(0,car.speed-30*dt);advance(flat,true);}
  car.flatTires=2;for(let i=0;i<30;i++)advance(flat,true);
  // The first grounded tick can see a banked landing with a curb under just one wheel.
  car.speed=21;car.flatTires=0;car.yaw=0;
  const raisedWheel=(x,z)=>x*side>0 && z<0?.16:0;
  for(let i=0;i<36;i++)advance(raisedWheel);
  assert(car.suspension.wheels.some(h=>Math.abs(h-.16)<.001));
}
console.log('PASS GT tread and fenders keep clearance at both steering locks through braking, acceleration, a flat tire, banked touchdown, and interpolated snapshots.');
