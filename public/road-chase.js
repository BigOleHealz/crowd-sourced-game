// Frame the road in the direction of travel while preserving the driver's orbit.
export function roadFraming(previous,car,dt){
  const speed=car.speed??0;
  const pace=Math.min(1,Math.abs(speed)/22),parking=1-Math.min(1,Math.abs(speed)/7);
  const lead=Math.max(-1.6,Math.min(2.6,speed*.12));
  const air=car.bridgeFlight;
  const desired={
    lead,
    height:.22+parking*.5+(speed<-.3?.28:0),
    reach:-.8*parking+1.3*pace+(air?.45:0),
    // Ease vertical speed into the aim point to keep the landing zone visible.
    lift:air?Math.max(-.52,Math.min(.35,air.vy*.075)):0,
  };
  if(!previous)return desired;
  const blend=-Math.expm1(-dt*4.2);
  for(const key of Object.keys(desired))desired[key]=previous[key]+(desired[key]-previous[key])*blend;
  return desired;
}
