import {mountPosition} from './mounts.js';

const rover={seat:[-.322,.11,-.085],scale:.85,wheel:[-.36,1.195,-.29],radius:.117,tilt:-.50,handle:[-.738,.964,.204]};
const gt={seat:[-.365,-.27,-.070],scale:.8,wheel:[-.36,.802,-.325],radius:.144,tilt:-.40,handle:[-.966,.604,.28]};
function traffic(width,lift,van=false){
  return {seat:[-.43,-.22+lift,-.28],scale:.91,wheel:[-.43,1.05+lift,-.65],radius:.145,tilt:-.42,
    handle:[-width-.008,.85+lift,van?.13:.11],hinge:[-width+.025,van?-1.07:-1.02],lift};
}
const fleet={engine:traffic(1.03,.24,true),sedan:traffic(.86,0),hatchback:traffic(.82,.035),van:traffic(.95,.135,true)};
export const roadCabin=car=>fleet[car.model]??(car.kind==='supercar'?gt:rover);
const smooth=(v,a,b)=>{const f=Math.max(0,Math.min(1,(v-a)/(b-a)));return f*f*(3-2*f);};
export function boardingDoorAngle(t){return -1.05*smooth(t,.16,.43)*(1-smooth(t,.76,1));}
export function roadHandle(car,t){
  const {handle:[x,y,z],hinge}=roadCabin(car);
  if(!hinge)return mountPosition(car,[x,y,z]);
  const a=boardingDoorAngle(t),c=Math.cos(a),s=Math.sin(a),dx=x-hinge[0],dz=z-hinge[1];
  return mountPosition(car,[hinge[0]+c*dx+s*dz,y,hinge[1]-s*dx+c*dz]);
}
// Shared by the animated body and authoritative occupant during a door transition.
export function roadBoardingPosition(car,action){
  const t=action.progress,approach=smooth(t,0,.24),enter=smooth(t,action.npcId ? .65 : .45,.97);
  const handle=roadHandle(car,t),seat=mountPosition(car,roadCabin(car).seat);
  const c=Math.cos(car.yaw),s=Math.sin(car.yaw),mix=(a,b,f)=>a+(b-a)*f;
  return {x:mix(mix(action.startX,handle.x-c*.27+s*.12,approach),seat.x,enter),
    y:mix(mix(action.startY,car.y,approach),seat.y,enter),
    z:mix(mix(action.startZ,handle.z-s*.27-c*.12,approach),seat.z,enter)};
}
export function roadWheelGrip(car,side){
  const {wheel:[x,y,z],radius,tilt}=roadCabin(car),up=radius*.50;
  return mountPosition(car,[x+side*radius*Math.cos(Math.PI/6),y+up*Math.cos(tilt),z+up*Math.sin(tilt)]);
}
export const boardingSeconds=.78;
export function beginRoadBoarding(car,state){
  car.boarding={startX:state.x,startY:state.y,startZ:state.z,progress:0};
}
export function stepRoadBoarding(car,dt){
  if(!car?.boarding)return;
  car.boarding.progress+=dt/boardingSeconds;
  if(car.boarding.progress>=1 || car.driver==null || car.wrecked)delete car.boarding;
}
