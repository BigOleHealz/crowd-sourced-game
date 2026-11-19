// Camera and independently aimed stations share the vertical look range.
export const zenith=Math.PI/2;
export const viewPitch=value=>Math.max(-.95,Math.min(zenith,value));
