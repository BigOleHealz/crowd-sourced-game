// Inputs have already passed the radial thumb dead zone. A narrower release
// band lets a runner steer around the rim without flickering between gaits.
export function footStickPace(x,forward,wasSprinting){
  const amount=Math.hypot(x,forward);
  if(!amount)return {x:0,y:0,sprint:false};
  const sprint=forward/amount>.55 && amount>=(wasSprinting?.77:.90);
  return {x:x/amount,y:forward/amount,sprint};
}
