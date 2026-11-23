import {mountPosition} from './mounts.js';
// Local game units, with the nose facing -Z and the turret centered over the hull.
export const tankHull={halfWidth:1.18,halfLength:2.09,corner:.24,height:1.91};
export const roofPivot=[0,2.43,1.27];
export const tankPad={x:8,z:14};
export const tankPivot=1.60, tankBarrel=2.30;
export function tankMuzzle(tank){
  const reach=tankBarrel*Math.cos(tank.turretPitch);
  const pivot=mountPosition(tank,[0,tankPivot,0]);
  return {x:pivot.x+reach*Math.sin(tank.turretYaw),y:pivot.y+tankBarrel*Math.sin(tank.turretPitch),
    z:pivot.z-reach*Math.cos(tank.turretYaw)};
}
