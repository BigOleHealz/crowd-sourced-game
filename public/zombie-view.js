export function poseInfected(avatar, state, time) {
  if(state.dead || state.fall)return;
  const sway=Math.sin(time*4+state.infected);
  // The upper mesh uses model-space heights. Hinge the lean at the belt.
  avatar.spine.rotation.x-=.22;
  avatar.head.rotation.z=.11+.065*sway;
  for(const {arm, forearm, side} of avatar.limbs){
    arm.rotation.set(1.30+side*.16*sway,0,side*.14);
    forearm.rotation.x=.22+.12*side*sway;
  }
}
