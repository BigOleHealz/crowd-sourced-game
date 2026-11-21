// Render each hiker from the distance they actually cover, including peers and
// patrols. Positions and planted contacts are in world metres; yaw is model yaw.
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const smooth=x=>x*x*(3-2*x);
const follow=(rate,dt)=>1-Math.exp(-rate*dt);
const wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
const tau=2*Math.PI;

export function newGait(state,yaw) {
  return {x:state.x,z:state.z,yaw,turnRate:0,vx:0,vz:0,speed:0,weight:0,run:0,phase:0,
    duty:.58,span:0,gazeYaw:yaw,shoulderYaw:yaw,neckYaw:0,twist:0,bank:0,pelvisY:-.045,pelvisX:0,footLift:0,pivot:0};
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

  // The visor follows the look direction first. The chest follows the gaze,
  // and the weight-bearing hips catch up through the planted turn steps.
  g.gazeYaw=wrap(g.gazeYaw+wrap(-state.yaw-g.gazeYaw)*follow(32,dt));
  g.shoulderYaw=wrap(g.shoulderYaw+wrap(g.gazeYaw-g.shoulderYaw)*follow(13,dt));
  const error=wrap(g.shoulderYaw-g.yaw), stiffness=19, decay=Math.exp(-stiffness*dt);
  const impulse=g.turnRate-stiffness*error;
  const turn=clamp(error+(-error+impulse*dt)*decay,-9*dt,9*dt);
  g.turnRate=clamp((g.turnRate-stiffness*impulse*dt)*decay,-9,9);
  g.yaw=wrap(g.yaw+turn);
  g.twist=clamp(wrap(g.shoulderYaw-g.yaw),-.57,.57);
  g.neckYaw=clamp(wrap(g.gazeYaw-g.yaw-g.twist),-.72,.72);
  const turning=turn/dt;
  g.bank+=(clamp(-turning*g.speed*.0055,-.19,.19)-g.bank)*follow(10,dt);
  g.pivot+=(clamp(Math.abs(turning)/3,0,1)*(1-g.weight)-g.pivot)*follow(18,dt);

  // A full cycle is two steps. Faster runners lengthen the stride and spend
  // less of each cycle on the supporting leg.
  const stride=1.08+.405*g.speed;
  // Finish the trailing step after a sprint rather than freezing at mid-swing.
  if(g.speed>3.2)g.finishStep=true;
  const settling=g.finishStep && g.speed<.75;
  if(settling && (g.settleTarget==null))g.settleTarget=(Math.floor(g.phase*2)+1)*.5-g.phase;
  const settle=settling?Math.min(g.settleTarget,dt*1.55):0;
  if(settling && (g.settleTarget-=settle)<.0001){g.finishStep=false;g.settleTarget=null;}
  if(!settling)g.settleTarget=null;
  g.phase=(g.phase+distance/stride+Math.abs(turn)*.68*(1-g.weight)+settle)%1;
  // Release a planted boot before the pelvis travels beyond a human leg's
  // usable fore-and-aft reach, including during a short burst of speed.
  g.duty=Math.min(.58-.30*smooth(clamp((g.speed-.7)/6.5,0,1)),Math.max(.28,.74/stride));
  g.span=stride*g.duty*g.weight;
  const bounce=-Math.cos(tau*(2*g.phase-g.duty));
  // A loaded rear hip supports the idle stance; weight transfers across the
  // planted leg, with a smaller vertical excursion as cadence increases.
  g.pelvisY=-.065-g.weight*(.031+.071*g.run)+bounce*g.weight*(.017+.018*g.run);
  g.pelvisX=.016*(1-g.weight)+.029*Math.cos(tau*(g.phase-g.duty/2))*g.weight;
  g.footLift=g.weight*(.065+.245*g.run)+g.pivot*.11+(settling?.045:0);
}

export function newFoot() {return {planted:false,x:0,z:0,sideOffset:0,forwardOffset:0,lift:0,pitch:0};}

export function placeFoot(g,foot,side) {
  const phase=(g.phase+(side===1 ? .5 : 0))%1;
  const swing=clamp((phase-g.duty)/(1-g.duty),0,1);
  const c=Math.cos(g.yaw),s=Math.sin(g.yaw);
  const dirLength=Math.hypot(g.vx,g.vz);
  const vx=dirLength>.05 ? g.vx/dirLength : -s, vz=dirLength>.05 ? g.vz/dirLength : -c;
  const spread=.113+.014*(1-g.weight);
  const stagger=.092*(1-g.weight)+.011*g.weight;
  const neutralX=g.x+side*(spread*c+stagger*s);
  const neutralZ=g.z+side*(-spread*s+stagger*c);
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
  foot.wx=x;foot.wz=z;
  const roll=phase<g.duty ? -.16+.55*smooth(phase/g.duty) : .39*Math.cos(Math.PI*swing);
  foot.pitch=-roll*g.weight;
}

// Probe the tread below this boot at the actor's current storey. A toe sample
// follows a continuous slope, while a stair lip leaves the sole level.
export function bootSupport(foot,feetY,yaw,doors,height){
  if(foot.sampleY===feetY && Math.hypot(foot.wx-foot.sampleX,foot.wz-foot.sampleZ)<.015 &&
     Math.abs(wrap(yaw-foot.sampleYaw))<.035)return foot.floor;
  foot.sampleX=foot.wx;foot.sampleZ=foot.wz;foot.sampleY=feetY;foot.sampleYaw=yaw;
  const floor=height(foot.wx,foot.wz,feetY+.26,doors);
  const toe=height(foot.wx-Math.sin(yaw)*.17,foot.wz-Math.cos(yaw)*.17,feetY+.26,doors);
  const delta=toe-floor;
  foot.floorPitch=Math.abs(delta)<.095?Math.atan2(delta,.17):0;
  foot.floor=Math.abs(floor-feetY)<.37?floor-feetY:0;
  return foot.floor;
}

// Keep the support height when a planted target on a slope falls outside the
// two-bone reach. Clamping only the Euclidean distance pulls the boot upwards.
// The hip and intended plant give the local grade without sampling mesh bones.
export function fitPlantedBoot(g,foot,leg,feetY,scaleY,doors,height){
  if(!foot.planted)return;
  const hipX=leg.x+g.pelvisX,side=foot.sideOffset-hipX,forward=foot.forwardOffset;
  const horizontal=side*side+forward*forward,reach=.799;
  const hip=leg.y+g.pelvisY-.126;
  const down=hip-bootSupport(foot,feetY,g.yaw,doors,height)/scaleY;
  if(horizontal+down*down<=reach*reach || horizontal<.00001)return;
  const c=Math.cos(g.yaw),s=Math.sin(g.yaw);
  const x=g.x+hipX*c,z=g.z-hipX*s;
  const floor=height(x,z,feetY+.26,doors);
  const underHip=hip-(Math.abs(floor-feetY)<.37?(floor-feetY)/scaleY:0);
  const grade=down-underHip;
  const a=horizontal+grade*grade,b=underHip*grade;
  const t=clamp((-b+Math.sqrt(Math.max(0,b*b-a*(underHip*underHip-reach*reach))))/a,0,1);
  foot.sideOffset=hipX+side*t;foot.forwardOffset=forward*t;
  foot.wx=x+t*(c*side+s*forward);foot.wz=z+t*(-s*side+c*forward);
}
