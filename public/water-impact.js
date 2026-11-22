import {waterSurfaceAt,groundHeight} from './world.js';

// Sample before damage: a fatal hit can immediately switch a swimmer into a ragdoll.
export function immersedSurface(state,doors){
  if(!state || state.onYacht || state.ride || state.climb || state.parachute || state.liftTravel)return;
  const {x,y,z}=state,water=waterSurfaceAt(x,z,y);
  if(!Number.isFinite(water) || y>water-.065 || groundHeight(x,z,y+.48,doors)>water-.11)return;
  return water;
}
