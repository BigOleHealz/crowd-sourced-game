import {mountPosition} from './mounts.js';
// Local game units, with the nose facing -Z and the turret centered over the hull.
// The GLB's 429-unit track width becomes 3.76 m, close to a full-size MBT.
export const tankScale=1.75;
export const tankHull={halfWidth:1.88,halfLength:3.78,corner:.32,height:2.70};
export const tankPad={x:20,z:8};
// The replacement barrel pivots ahead of the turret centre and ends three units ahead.
export const tankPivot=1.00*tankScale, tankBarrel=2.20*tankScale;
export function tankMuzzle(tank){
  const reach=tankBarrel*Math.cos(tank.turretPitch);
  const pivot=mountPosition(tank,[0,tankPivot,-.80*tankScale]);
  return {x:pivot.x+reach*Math.sin(tank.turretYaw),y:pivot.y+tankBarrel*Math.sin(tank.turretPitch),
    z:pivot.z-reach*Math.cos(tank.turretYaw)};
}
