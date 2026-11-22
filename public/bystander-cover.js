// Gunfire cues come from the room's authoritative simulation. Only the pose
// changes here: a dealer, teller or court player retains the simulation position.
export function gunfireAlarm(cues,person,tick){
  let strength=0;
  for(const cue of cues??[]){
    const age=tick-cue.tick;
    if(age<0 || age>=110 || Math.abs(person.y-cue.y)>6)continue;
    if((person.x-cue.x)**2+(person.z-cue.z)**2>cue.radius*cue.radius)continue;
    const t=Math.max(0,(age-71)/39),fade=1-t*t*(3-2*t);
    strength=Math.max(strength,fade);
  }
  return strength;
}

export function poseBystanderCover(actor,state,alarm,dt,clock,athlete=false){
  const prior=actor.gunfireAlarm??0;
  const cover=actor.gunfireAlarm=prior+(alarm-prior)*(-Math.expm1(-dt*(alarm>prior?15:6)));
  if(cover<.002)return;
  const mix=(a,b)=>a+(b-a)*cover;
  const seated=state.bankRole==='waiting';
  const fixedFeet=state.grounded!==false && !seated && !athlete;
  // Flex both knees while lowering the hips, keeping the planted boots under them.
  if(fixedFeet)actor.body.position.y=mix(actor.body.position.y,-.31);
  actor.spine.rotation.x=mix(actor.spine.rotation.x,-.61);
  actor.spine.rotation.z=mix(actor.spine.rotation.z,.15);
  actor.head.rotation.x=mix(actor.head.rotation.x,-.32);
  actor.head.rotation.y=mix(actor.head.rotation.y,-.24+.13*Math.sin(clock*2.1));
  for(const {side,arm,forearm,leg,knee,ankle} of actor.limbs){
    const shield=side===-1;
    arm.rotation.x=mix(arm.rotation.x,shield?1.56:1.20);
    arm.rotation.z=mix(arm.rotation.z,side*(shield?.55:.29));
    forearm.rotation.x=mix(forearm.rotation.x,shield?1.58:1.87);
    forearm.rotation.z=mix(forearm.rotation.z,-side*.26);
    if(fixedFeet){
      leg.rotation.x=mix(leg.rotation.x,.82);
      knee.rotation.x=mix(knee.rotation.x,-1.58);
      ankle.rotation.x=mix(ankle.rotation.x,.76);
    }
  }
}
