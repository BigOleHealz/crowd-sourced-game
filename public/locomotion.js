// Render each hiker from the distance they actually cover, including peers and
// patrols. Positions and planted contacts are in world metres; yaw is model yaw.
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const smooth=x=>x*x*(3-2*x);
const follow=(rate,dt)=>1-Math.exp(-rate*dt);
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const tau=2*Math.PI;

export function newGait(state,yaw) {
  return {x:state.x,z:state.z,yaw,turnRate:0,vx:0,vz:0,speed:0,weight:0,run:0,phase:0,
    duty:.58,span:0,twist:0,bank:0,pelvisY:-.045,pelvisX:0,footLift:0,pivot:0};
}

export function advanceGait(g,state,dt) {
  const dx=state.x-g.x,dz=state.z-g.z;
  const blend=follow(17,dt),distance=Math.hypot(dx,dz);
  g.vx+=(dx/dt-g.vx)*blend;
  g.vz+=(dz/dt-g.vz)*blend;
  g.x=state.x;g.z=state.z;
  g.speed=Math.min(7.8,Math.hypot(g.vx,g.vz));
  g.weight+=(smooth(clamp(g.speed/.78,0,1))-g.weight)*follow(18,dt);
  g.run+=(smooth(clamp((g.speed-1.6)/5.8,0,1))-g.run)*follow(11,dt);

  // A critically damped turn eases in when the player reverses direction.
  // Choose the short arc across north and cap the swing at a full sprint.
  const error=wrap(-state.yaw-g.yaw), stiffness=15, decay=Math.exp(-stiffness*dt);
  const impulse=g.turnRate-stiffness*error;
  const turn=clamp(error+(-error+impulse*dt)*decay,-9*dt,9*dt);
  g.turnRate=clamp((g.turnRate-stiffness*impulse*dt)*decay,-9,9);
  g.yaw=wrap(g.yaw+turn);
  g.twist=clamp(wrap(-state.yaw-g.yaw)*.52,-.53,.53);
  const turning=turn/dt;
  g.bank+=(clamp(-turning*g.speed*.0055,-.19,.19)-g.bank)*follow(10,dt);
  g.pivot+=(clamp(Math.abs(turning)/3,0,1)*(1-g.weight)-g.pivot)*follow(18,dt);

  // A full cycle is two steps. Faster runners lengthen the stride and spend
  // less of each cycle on the supporting leg.
  const stride=1.08+.405*g.speed;
  g.phase=(g.phase+distance/stride+Math.abs(turn)*.43*(1-g.weight))%1;
  g.duty=.58-.30*smooth(clamp((g.speed-.7)/6.5,0,1));
  g.span=stride*g.duty*g.weight;
  const bounce=-Math.cos(tau*(2*g.phase-g.duty));
  g.pelvisY=-.046-g.weight*(.040+.084*g.run)+bounce*g.weight*(.016+.028*g.run);
  g.pelvisX=.035*Math.cos(tau*(g.phase-g.duty/2))*g.weight;
  g.footLift=g.weight*(.065+.245*g.run)+g.pivot*.085;
}

export function newFoot() {return {planted:false,x:0,z:0,sideOffset:0,forwardOffset:0,lift:0,pitch:0};}

export function placeFoot(g,foot,side) {
  const phase=(g.phase+(side===1 ? .5 : 0))%1;
  const swing=clamp((phase-g.duty)/(1-g.duty),0,1);
  const c=Math.cos(g.yaw),s=Math.sin(g.yaw);
  const dirLength=Math.hypot(g.vx,g.vz);
  const vx=dirLength>.05 ? g.vx/dirLength : -s, vz=dirLength>.05 ? g.vz/dirLength : -c;
  const spread=.13+.026*(1-g.weight);
  const neutralX=g.x+side*(spread*c+.058*s);
  const neutralZ=g.z+side*(-spread*s+.058*c);
  const strideOffset=g.span*(phase<g.duty ? .5-phase/g.duty : smooth(swing)-.5);
  let x=neutralX+strideOffset*vx,z=neutralZ+strideOffset*vz;
  const planted=phase<g.duty && g.weight+g.pivot>.10;
  if(planted) {
    if(!foot.planted) {foot.x=x;foot.z=z;}
    // Ease back to the ready stance as the runner brakes mid-step.
    const lock=clamp((g.weight+g.pivot-.10)/.35,0,1);
    x+=(foot.x-x)*lock;z+=(foot.z-z)*lock;
  }
  foot.planted=planted;
  const dx=x-g.x,dz=z-g.z;
  foot.sideOffset=c*dx-s*dz;
  foot.forwardOffset=s*dx+c*dz;
  const arc=Math.sin(Math.PI*swing);
  foot.lift=arc*arc*(1.4-.8*swing)*g.footLift;
  const roll=phase<g.duty ? -.16+.55*smooth(phase/g.duty) : .39*Math.cos(Math.PI*swing);
  foot.pitch=-roll*g.weight;
}
