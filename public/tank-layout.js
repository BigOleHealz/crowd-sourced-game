import {mountPosition} from './mounts.js';
// Local game units, with the nose facing -Z and the turret centered over the hull.
export const tankScale=2;
export const tankHull={halfWidth:1.18*tankScale,halfLength:2.09*tankScale,corner:.24*tankScale,height:1.52*tankScale};
export const tankPad={x:20,z:8};
// The replacement barrel pivots ahead of the turret centre and ends three units ahead.
export const tankPivot=1.00*tankScale, tankBarrel=2.20*tankScale;
export function tankMuzzle(tank){
  const reach=tankBarrel*Math.cos(tank.turretPitch);
  const pivot=mountPosition(tank,[0,tankPivot,-.80*tankScale]);
  return {x:pivot.x+reach*Math.sin(tank.turretYaw),y:pivot.y+tankBarrel*Math.sin(tank.turretPitch),
    z:pivot.z-reach*Math.cos(tank.turretYaw)};
}
