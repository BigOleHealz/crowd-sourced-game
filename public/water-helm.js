import {marinaModel} from './marina-fleet-layout.js';

// The signed water speed determines rudder authority. Both the hull rotation
// and the direction of travel settle gradually as the helm returns to center.
const patrol={ahead:12.5,astern:3.2,thrust:4.7,brake:7.5,drag:1.4,dragSpeed:.055,
  rudder:1.22,flow:2.35,response:3.4,grip:5};
const solana={ahead:5.2,astern:2,thrust:1.1,brake:2,drag:.39,dragSpeed:.085,
  rudder:.31,flow:1.8,response:1.25,grip:2.5};
export function waterHelm(hull,input,dt){
  const profile=hull.id==='superyacht'?solana:marinaModel(hull)?.hydrodynamics??patrol;
  const throttle=hull.driver==null || hull.fuel===0 ? 0 : Math.max(-1,Math.min(1,input?.throttle||0));
  const steer=hull.driver==null?0:Math.max(-1,Math.min(1,input?.steer||0));
  hull.throttle=throttle;
  const target=throttle*(throttle<0?profile.astern:profile.ahead);
  const rate=!throttle ? profile.drag+profile.dragSpeed*Math.abs(hull.speed)
    : target*hull.speed<0 ? profile.brake : profile.thrust;
  hull.speed+=Math.max(-rate*dt,Math.min(rate*dt,target-hull.speed));
  const response=1-Math.exp(-dt*profile.response);
  const targetRate=steer*profile.rudder*hull.speed/(profile.flow+Math.abs(hull.speed));
  hull.yawRate=(hull.yawRate??0)+(targetRate-(hull.yawRate??0))*response;
  if(Math.abs(hull.yawRate)<.0001 && !targetRate)hull.yawRate=0;
  const slip=Math.max(-.14,Math.min(.14,-hull.yawRate/profile.grip));
  hull.slip=(hull.slip??0)+(slip-(hull.slip??0))*(1-Math.exp(-dt*profile.grip));
  return hull.yawRate*dt;
}
