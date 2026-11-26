// The pumper's cab and hosebed are taller and longer than a normal car.
// Keep the chase camera outside their visible shell after a player exits.
const halfWidth=1.18,halfLength=3.56,low=.10,high=2.55;
const local=(car,x,z)=>{
  const dx=x-car.x,dz=z-car.z,c=Math.cos(car.yaw),s=Math.sin(car.yaw);
  return [dx*c+dz*s,dz*c-dx*s];
};

export function fireEngineCameraContains(cars,x,y,z){
  return cars.some(car=>{
    const [side,along]=local(car,x,z);
    return Math.abs(side)<halfWidth && Math.abs(along)<halfLength && y>car.y+low && y<car.y+high;
  });
}

export function fireEngineCameraClearance(cars,target,vector,wanted){
  let clear=wanted;
  for(const car of cars){
    const [side,along]=local(car,target.x,target.z),c=Math.cos(car.yaw),s=Math.sin(car.yaw);
    const axes=[
      [side,vector.x*c+vector.z*s,-halfWidth,halfWidth],
      [along,vector.z*c-vector.x*s,-halfLength,halfLength],
      [target.y-car.y,vector.y,low,high],
    ];
    let enter=0,leave=clear;
    for(const [origin,direction,min,max] of axes){
      if(Math.abs(direction)<1e-8){if(origin<min || origin>max){enter=Infinity;break;}continue;}
      const a=(min-origin)/direction,b=(max-origin)/direction;
      enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));
    }
    if(enter<=leave)clear=Math.min(clear,Math.max(.1,enter-.18));
  }
  return clear;
}
