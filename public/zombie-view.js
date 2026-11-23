const infectedLooks=['rival-maia','rival-omar','rival-ines','rival-diego'];
export const infectedLook=id=>infectedLooks[id%infectedLooks.length];

const pallor=[0x99977c,0x888778,0xa79e88,0xaba58e];
const cloth=[0x765251,0x4b5a61,0x827768,0x758182];
export function infectedWardrobe(look,id){
  const cell=id%infectedLooks.length;
  return {...look,infectedFace:cell,skin:pallor[cell],top:cloth[cell],hair:0x383532,extra:null};
}

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
  // Bias one shoulder forward and leave the other arm trailing. Tie the
  // lurch to the planted-foot cycle so it survives changes in chase speed.
  const lead=state.infected%2 ? -1 : 1;
  const gait=avatar.gait;
  const phase=state.moving && gait ? gait.phase*2*Math.PI : time*1.55+state.infected;
  const sway=Math.sin(phase),lurch=state.moving ? .5+.5*sway : .15;
  avatar.spine.rotation.x-=.27+.13*lurch;
  avatar.spine.rotation.z+=lead*(.055+.045*sway);
  avatar.head.rotation.x+=.11+.09*lurch;
  avatar.head.rotation.z=lead*(.17+.055*sway);
  for(const {arm,forearm,side} of avatar.limbs){
    const reaching=side===lead;
    arm.rotation.set(reaching?1.20+.27*lurch:.39-.20*sway,side*.09,side*(reaching?.18:.24));
    forearm.rotation.set(reaching?.20+.19*lurch:.51+.16*sway,0,-side*.09);
  }
}
