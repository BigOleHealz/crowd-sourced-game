// Camera and independently aimed stations share the vertical look range.
export const zenith=Math.PI/2;
export const viewPitch=value=>Math.max(-.95,Math.min(zenith,value));

// The first-person carbine dot is the center ray of the current view.
// A rendered-camera ray can lag behind mouse movement between frames.
export const sightedCarbineAim=(view,weapon,station)=>
  view.sighted && weapon===1 && !station ? {yaw:view.yaw,pitch:viewPitch(view.pitch)} : null;
