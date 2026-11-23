const infectedLooks=['rival-maia','rival-omar','rival-ines','rival-diego'];
export const infectedLook=id=>infectedLooks[id%infectedLooks.length];

export function poseInfected(avatar, state, time) {
  if(state.dead)return;
  if(state.fall){
    if(state.fall.cause==='lostLeg'){
      // Tip forward into the same hip position as the prone rig. Stay down
      // through the last frames of the fall instead of playing its get-up.
      const t=Math.min(1,state.fall.age/.42);
      const lean=t*t*(3-2*t);
      avatar.body.rotation.x=-1.38*lean;
      avatar.body.position.y=.14*lean;
      avatar.body.position.z=.96*lean;
      avatar.head.rotation.x=.87*lean;
    }
    return;
  }
  if(state.stance==='prone'){
    const pull=state.moving ? Math.sin(time*5+state.infected) : 0;
    for(const {arm,forearm,side} of avatar.limbs){
      arm.rotation.set(2.05+side*.42*pull,side*.12,side*.24);
      forearm.rotation.set(.91-side*.40*pull,0,0);
    }
    return;
  }
  const sway=Math.sin(time*4+state.infected);
  // The upper mesh uses model-space heights. Hinge the lean at the belt.
  avatar.spine.rotation.x-=.22;
  avatar.head.rotation.z=.11+.065*sway;
  for(const {arm, forearm, side} of avatar.limbs){
    arm.rotation.set(1.30+side*.16*sway,0,side*.14);
    forearm.rotation.x=.22+.12*side*sway;
  }
}
