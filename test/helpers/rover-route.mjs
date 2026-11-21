// A driver can steer while creeping. Slow before a sharp corner and track
// the remaining distance so the rover can park at the checkpoint.
export function approachPoint(car,x,z,cruise,stopRadius=.24){
  const dx=x-car.x,dz=z-car.z,distance=Math.hypot(dx,dz);
  if(distance<stopRadius)return {throttle:0,steer:0};
  const aim=Math.atan2(dx,-dz)-car.yaw,error=Math.atan2(Math.sin(aim),Math.cos(aim));
  const speed=Math.min(cruise,1.9+cruise*Math.max(0,Math.cos(error))**5,Math.max(.65,distance*1.65));
  return {throttle:Number(car.speed<speed),steer:Math.max(-1,Math.min(1,error*3))};
}
