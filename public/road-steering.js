import {civilianProfiles} from './civilian-fleet.js';
import {supercarLayout} from './supercar-layout.js';
import {wheelStations} from './road-wheel-layout.js';

// Wheelbase comes from each model's actual axle positions. Rack travel is
// expressed as a fraction of parking lock and can also be used by the view.
const fullLock=.64;
export const frontWheelAngle=car=>(car.steer??0)*fullLock;

export function steerRoadWheels(car,input,dt){
  const speed=Math.abs(car.speed);
  const lock=1/(1+(speed/9.5)**1.65);
  const target=Math.max(-1,Math.min(1,input))*lock;
  const was=car.steer??0;
  const response=(input?9.5:12)/(1+Math.min(1.45,speed/17));
  const steer=target+(was-target)*Math.exp(-response*dt);
  car.steer=Math.abs(steer-target)<.0003?target:steer;
  const profile=civilianProfiles[car.model];
  const wheelbase=profile?profile.axles[1]-profile.axles[0]:car.kind==='supercar'?
    supercarLayout.wheels[1]-supercarLayout.wheels[0]:wheelStations[1][1]-wheelStations[0][1];
  return car.speed*Math.tan(frontWheelAngle(car))/wheelbase;
}
