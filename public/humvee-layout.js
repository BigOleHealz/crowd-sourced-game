// The M1151 is 4.93 m long and 2.31 m wide. The source art is 12.815 by
// 6.862 units, so its axes need different scales to keep the tires roundly
// spaced while matching the real chassis footprint.
export const humveeScale={x:2.31/6.862,y:.385,z:4.93/12.815};
export const humveePlacement={y:1.406*humveeScale.y,z:-.3425*humveeScale.z};
export const humveeHull={halfWidth:1.155,halfLength:2.465,corner:.18};
// Walking collision follows the lower body and the raised passenger cabin.
export const humveeWalkShapes=[
  [1.155,-2.465,2.465,.04,.90],
  [1.02,-1.45,1.25,.90,2.02],
];
export const humveeWheelLift=(pose,index)=>(pose?.wheels[index]??0)-(pose?.heave??0);
