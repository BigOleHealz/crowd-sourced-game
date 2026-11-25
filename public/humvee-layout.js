// World-space dimensions of the supplied GLB at its current game scale.
export const humveeScale=.27*2.2*.85;
export const humveePlacement={y:.71,z:-.09*2.2*.85};
export const humveeHull={halfWidth:1.73,halfLength:3.55,corner:.24};
// Walking collision follows the lower body and the raised passenger cabin.
export const humveeWalkShapes=[
  [1.73,-3.55,3.00,.04,1.35],
  [1.52,-1.65,1.15,1.35,2.25],
];
export const humveeWheelLift=(pose,index)=>(pose?.wheels[index]??0)-(pose?.heave??0);
