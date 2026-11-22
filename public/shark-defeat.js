// The swimmer, shark and water effects use the same three-second contact path.
const smooth=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
export function sharkDefeatPose(event,age){
  const grab=smooth(0,.30,age),tow=smooth(.26,1.85,age),sink=smooth(.58,2.30,age);
  const tension=grab*(1-smooth(1.50,2.35,age));
  const forward=.45*grab+2.40*tow,side=.27*Math.sin(9.6*age)*tension;
  const towYaw=event.towYaw??event.yaw,c=Math.cos(towYaw),s=Math.sin(towYaw);
  return {x:event.x+s*forward+c*side,y:event.y+.16*Math.sin(Math.PI*grab)-.90*sink,
    z:event.z-c*forward+s*side,yaw:event.yaw+.34*Math.sin(6.7*age)*tension,
    pitch:-.54-.79*grab+.12*Math.sin(12*age)*tension,
    roll:.18*grab+1.12*Math.sin(10.5*age)*tension+.33*sink};
}

export function poseBittenSwimmer(a,event,age){
  const p=sharkDefeatPose(event,age);
  const fight=(1-smooth(.46,1.30,age)),pull=smooth(0,.25,age);
  a.gait=null;
  a.root.position.set(p.x,p.y,p.z);
  a.root.rotation.set(0,-p.yaw,0,'YXZ');a.root.scale.setScalar(1);
  a.body.rotation.set(p.pitch,0,p.roll,'ZXY');
  // Rotate about the hips. The pelvis stays at the shark's jaws while hands
  // break the surface and the feet swing away from the direction of the pull.
  const hip=.975,reach=Math.cos(p.pitch)*hip;
  a.body.position.set(Math.sin(p.roll)*reach,.78-Math.cos(p.roll)*reach,-Math.sin(p.pitch)*hip);
  a.spine.rotation.set(.28*pull,.23*Math.sin(age*11)*fight,-.10*pull);
  a.head.rotation.set(.45-.55*fight,-.38*Math.sin(age*8)*fight,.19*pull);
  for(const {side,leg,knee,ankle,arm,forearm} of a.limbs){
    const kick=Math.sin(age*13+side*1.2)*fight;
    const sweep=Math.sin(age*9.4+side*1.75)*fight;
    leg.rotation.set(.13+.55*kick,0,side*(.15+.14*pull));
    knee.rotation.set(-.49-.38*kick,0,0);ankle.rotation.set(-.15-.12*kick,0,0);
    arm.rotation.set(.55+.79*fight+.72*sweep,0,side*(.31+.65*fight));
    forearm.rotation.set(.38+.56*fight-.32*sweep,0,0);
  }
  for(const tool of a.tools)tool.visible=false;
  if(a.canopy)a.canopy.visible=false;
  for(const ring of a.ripples?.rings??[])ring.visible=false;
  a.shadow.visible=false;a.label.sprite.visible=false;
}
