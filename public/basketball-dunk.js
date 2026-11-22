import {hoop,basketballRadius} from './basketball-layout.js';

export const dunkRelease=.46,dunkLanding=.96;
const mix=(a,b,t)=>a+(b-a)*t;

// The server and both avatars sample the same takeoff, grip and release.
export function dunkFrame(shot,age,landing=shot){
  const rise=age<=dunkRelease;
  const t=Math.max(0,Math.min(1,rise?age/dunkRelease:(age-dunkRelease)/(dunkLanding-dunkRelease)));
  const blend=rise?Math.sin(t*Math.PI/2):Math.cos(t*Math.PI/2);
  const stride=rise?t*t*(3-2*t):1-t*t*(3-2*t);
  const dx=Math.sin(shot.yaw),dz=-Math.cos(shot.yaw);
  const base=rise?shot:landing;
  const tip={x:hoop.x+shot.offset*Math.cos(shot.yaw),z:hoop.z+shot.offset*Math.sin(shot.yaw)};
  const feet={x:mix(base.x,tip.x-dx*.32,stride),y:mix(base.y,hoop.y+basketballRadius+.06-1.83,blend),
    z:mix(base.z,tip.z-dz*.32,stride)};
  const reach=.40-.08*blend;
  const hand={x:feet.x+dx*reach,y:feet.y+1.47+.36*blend,z:feet.z+dz*reach};
  return {feet,hand,yaw:shot.yaw,lift:blend};
}
