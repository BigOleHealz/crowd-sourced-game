import {helmFeet,helmOffset,helmWheel,seatedScale} from './patrol-boats.js';
import * as THREE from 'three';
import {newGait,advanceGait,newFoot,placeFoot} from './locomotion.js';
import {groundHeight,stanceDrop} from './world.js';
import {mountPosition,gunnerFeet} from './mounts.js';
const TAU=Math.PI*2, clamp=THREE.MathUtils.clamp;
export function createRangerRig() {
  const joint=(parent,x=0,y=0,z=0)=>{
    const node=new THREE.Group();node.position.set(x,y,z);parent.add(node);return node;
  };
  const root=new THREE.Group(), body=joint(root), spine=joint(body,0,1.01), upper=joint(spine,0,-1.01);
  const head=joint(upper,0,1.525);
  const limbs=[-1,1].map(side=>{
    const leg=joint(body,side*.108,.975),knee=joint(leg,0,-.405),ankle=joint(knee,0,-.395);
    const arm=joint(upper,side*.203,1.447),forearm=joint(arm,0,-.275);
    return {side,leg,knee,ankle,arm,forearm,foot:newFoot()};
  });
  return {root,body,spine,upper,head,limbs,tools:[new THREE.Group(),new THREE.Group(),new THREE.Group()],cycle:0,gait:null};
}
const downArm=new THREE.Vector3(0,-1,0), reach=new THREE.Vector3(), bend=new THREE.Vector3();
const grip=new THREE.Vector3(),elbow=new THREE.Vector3(),segment=new THREE.Vector3(),inverseUpper=new THREE.Quaternion();
const upperLength=.275, lowerLength=.265;

// Solve the two visible arm segments in body space. An outward elbow bend keeps
// both hands on the grips as the field kit bobs, including on a turning turret.
function gripPose(arm,forearm,x,y,z,side,prone=false) {
  reach.set(x,y,z).sub(arm.position);
  const distance=clamp(reach.length(),.04,upperLength+lowerLength-.0001);
  reach.normalize();
  if(prone) bend.set(side*.82,-.15,-.95);
  else bend.set(side*.70,-1,.62);
  bend.addScaledVector(reach,-bend.dot(reach)).normalize();
  const along=(distance*distance+upperLength*upperLength-lowerLength*lowerLength)/(2*distance);
  elbow.copy(reach).multiplyScalar(along).addScaledVector(bend,Math.sqrt(Math.max(0,upperLength*upperLength-along*along)));
  arm.quaternion.setFromUnitVectors(downArm,segment.copy(elbow).normalize());
  segment.copy(reach).multiplyScalar(distance).sub(elbow).normalize();
  inverseUpper.copy(arm.quaternion).invert();
  forearm.quaternion.setFromUnitVectors(downArm,segment.applyQuaternion(inverseUpper));
}

export function poseRig(avatar,state,dt,seated=null,station=null) {
  const fall = state.fall, climb=state.climb;
  const onFoot=!fall && !seated && !station && !state.dead && state.grounded!==false && !state.parachute;
  const prone=onFoot && state.stance==='prone';
  const crouch=onFoot && state.stance==='crouch';
  let gait=avatar.gait;
  if(onFoot) {
    if(!gait || Math.hypot(state.x-gait.x,state.z-gait.z)>1.8) {
      gait=avatar.gait=newGait(state,avatar.initialized ? avatar.root.rotation.y : -state.yaw);
      for(const limb of avatar.limbs) limb.foot.planted=false;
    }
    advanceGait(gait,state,Math.max(.001,dt));
    if(crouch)gait.pelvisY-=stanceDrop(state)-.055;
  } else gait=avatar.gait=null;
  avatar.initialized=true;
  const weight=gait?.weight ?? 0, run=gait?.run ?? 0;
  const swing=gait ? Math.sin(gait.phase*TAU) : 0;
  const roll=gait ? .046*swing*weight : 0;
  const breathe=Math.sin(avatar.cycle+=dt*2.0);
  const airborne=state.grounded===false;
  const swimming=!!state.swimming && !seated && !station && !fall && !state.dead;
  const open = state.parachute === 'open' && !state.dead;
  if (open && avatar.makeCanopy && !avatar.canopy) avatar.canopy = avatar.makeCanopy(avatar.root,avatar.material);
  if (avatar.canopy) avatar.canopy.visible = open;
  avatar.root.position.set(state.x,state.y,state.z);
  avatar.root.scale.setScalar(seated ? seatedScale : 1);
  if (seated) {
    const seat=seated.id ? helmFeet(seated) : mountPosition(seated,[-.322,.025,-.085]);
    avatar.root.position.set(seat.x,seat.y,seat.z);
  }
  if(station) {
    const feet=gunnerFeet(station,station.id??'rover');
    avatar.root.position.set(feet.x,feet.y,feet.z);
  }
  const yaw=station ? -station.turretYaw : -(Number.isFinite(state.yaw)?state.yaw:0);
  const delta=Math.atan2(Math.sin(yaw-avatar.root.rotation.y),Math.cos(yaw-avatar.root.rotation.y));
  avatar.root.rotation.y = station ? yaw : seated ? -seated.yaw : gait ? gait.yaw : avatar.root.rotation.y+delta*(1-Math.exp(-dt*19));
  const ride=seated?.id ? seated : (seated || station)?.suspension;
  const deltaHeading=station ? station.turretYaw-station.yaw : 0;
  avatar.root.rotation.order='YXZ';
  avatar.root.rotation.x=ride ? ride.pitch*Math.cos(deltaHeading)+ride.roll*Math.sin(deltaHeading) : 0;
  avatar.root.rotation.z=ride ? ride.roll*Math.cos(deltaHeading)-ride.pitch*Math.sin(deltaHeading) : 0;
  avatar.body.position.set(gait?.pelvisX ?? 0,gait?.pelvisY ?? 0,0);
  avatar.spine.rotation.set(gait ? -.048-.065*weight-.095*run+.009*breathe : 0,
    gait ? .065*(1-weight)+gait.twist+swing*(.056+.082*run)*weight : 0,
    gait ? gait.bank-roll-.026*(1-weight) : 0,'YXZ');
  if(crouch)avatar.spine.rotation.x-=.20*stanceDrop(state);
  // Neck counter-rotation steadies the gaze above the shoulders through each
  // foot strike and lets the head lead the torso into a change of direction.
  avatar.head.position.set(0,1.525,0);
  avatar.head.rotation.set(gait ? -.42*avatar.spine.rotation.x-.018 : 0,
    gait ? .28*gait.twist-.62*swing*(.056+.082*run)*weight-.045*(1-weight) : 0,
    gait ? -.58*avatar.spine.rotation.z : 0,'YXZ');
  if(swimming) avatar.stroke=(avatar.stroke ?? 0)+dt*(state.moving ? 5.4 : 2.9);
  const stroke=avatar.stroke ?? 0;
  avatar.body.rotation.x=swimming ? (state.moving ? -1.06 : -.48) : 0;
  if(prone) {
    // Face down around the hips. The head and hands counter-rotate to look along the ground.
    avatar.body.rotation.x=-1.38;
    avatar.body.position.set(0,.14+.012*swing*weight,.96);
    avatar.spine.rotation.set(.065,.040*swing*weight,.022*swing*weight,'YXZ');
    avatar.head.rotation.set(.87+.018*breathe,.02*swing*weight,0,'YXZ');
    // Lift the gaze about the skull rather than lifting the skull out of its low hit volume.
    grip.set(0,.143,-.008).applyQuaternion(avatar.head.quaternion);
    avatar.head.position.set(-grip.x,1.525+.143-grip.y,-.008-grip.z-.045*weight);
  }
  if(swimming) {
    avatar.body.position.y=.72-1.34*Math.cos(avatar.body.rotation.x)+.07+.03*Math.sin(stroke);
    avatar.body.position.z=-Math.sin(avatar.body.rotation.x)*1.12;
    avatar.spine.rotation.x=.17;
  }
  const bloom = state.weapon === 2;
  avatar.body.rotation.z=0;
  let collapse = 0, flail = 0;
  if (fall) {
    avatar.root.rotation.y = -fall.yaw;
    const progress = Math.min(1, fall.age * (2.9 + Math.min(10,fall.speed)*.23));
    const recovery = fall.recovery || 0;
    collapse = Math.sin(progress * Math.PI/2) * (1 - recovery*recovery*(3-2*recovery));
    flail = Math.sin(progress*Math.PI) * Math.min(1,.32 + fall.speed*.12);
    avatar.body.rotation.x = -1.53 * collapse;
    avatar.body.rotation.z = .21*flail;
    avatar.body.position.y += .21*collapse;
    avatar.spine.rotation.x = -.13*collapse + .19*flail;
    avatar.spine.rotation.y = .12*collapse;
  }
  if(climb){
    avatar.root.rotation.y=-climb.yaw;
    const tuck=Math.sin(Math.PI*climb.t);
    avatar.body.position.y-=.12*tuck;
    avatar.spine.rotation.x=-.40*tuck;
  }
  const toolIndex=(state.weapon ?? 1)-1;
  const carrying=!climb && !fall && !swimming && !state.dead && !seated && !station;
  avatar.tools.forEach((tool,i)=>{tool.visible=carrying && i===toolIndex;});
  avatar.label?.update(state);
  for(const {leg,arm,forearm,knee,ankle,foot,side} of avatar.limbs) {
    if(prone) {
      leg.rotation.set(.09+side*swing*.25*weight,side*.10,side*.06,'ZXY');
      knee.rotation.x=-.19-Math.max(0,side*swing)*.37*weight;
      ankle.rotation.set(-.52,0,0);
    } else if(gait) {
      placeFoot(gait,foot,side);
      const c=Math.cos(gait.yaw),s=Math.sin(gait.yaw);
      const wx=state.x+c*foot.sideOffset+s*foot.forwardOffset;
      const wz=state.z-s*foot.sideOffset+c*foot.forwardOffset;
      const slope=clamp(groundHeight(wx,wz)-groundHeight(state.x,state.z),-.15,.15);
      const down=leg.position.y+gait.pelvisY-.134-foot.lift-slope;
      const lateral=foot.sideOffset-leg.position.x-gait.pelvisX;
      const vertical=Math.hypot(down,lateral);
      const distance=clamp(Math.hypot(vertical,foot.forwardOffset),.20,.7999);
      const hipBend=Math.acos(clamp((.405**2+distance**2-.395**2)/(.81*distance),-1,1));
      leg.rotation.set(Math.atan2(-foot.forwardOffset,vertical)+hipBend,0,Math.atan2(lateral,down),'ZXY');
      knee.rotation.x=-Math.acos(clamp((distance**2-.405**2-.395**2)/(2*.405*.395),-1,1));
      ankle.rotation.x=foot.pitch-leg.rotation.x-knee.rotation.x;
      ankle.rotation.z=-leg.rotation.z;
    } else {
      leg.rotation.set(station ? .08 : seated ? 1.36 : airborne ? .20*side : .14,0,0,'ZXY');
      knee.rotation.x=station ? -.15 : seated ? -1.3 : airborne ? -.65 : -.23;
      ankle.rotation.set(0,0,0);
    }
    arm.rotation.x=station ? .64-.34*station.turretPitch : seated ? 1.04 : side===1 ? .77 : bloom ? .62 : airborne ? -.42 : side*swing*.62;
    arm.rotation.z=side*(station ? -.08 : seated ? -.12 : open ? 2.45 : state.parachute ? 1.1 : side===1 ? .26 : airborne?.20:.065);
    forearm.rotation.set(0,0,0);
    if (fall) {
      leg.rotation.set((side < 0 ? -.16 : -.32)*collapse + side*.34*flail,0,side*.24*collapse,'ZXY');
      knee.rotation.x = -.38*collapse - (side < 0 ? .78 : .20)*flail;
      ankle.rotation.set(.19*collapse,0,0);
      arm.rotation.set(-.18*collapse + side*.48*flail,0,side*(.88*collapse + .73*flail));
      forearm.rotation.x = (.33 + .29*side)*collapse + .65*flail;
    } else if(climb) {
      const reach=Math.min(1,climb.t/.23),release=1-THREE.MathUtils.smoothstep(climb.t,.76,1);
      const lift=THREE.MathUtils.smoothstep(climb.t,.37,.75);
      const handHeight=clamp(climb.top-state.y+.06,.83,1.93);
      const fold=Math.sin(Math.PI*climb.t);
      leg.rotation.set((side===1?.99:.46)*fold,0,side*.12*fold);
      knee.rotation.x=-(side===1?1.57:1.12)*fold;
      ankle.rotation.x=.27*fold;
      gripPose(arm,forearm,side*.20,THREE.MathUtils.lerp(1.42,handHeight,reach*release),
        -.14-reach*release*(.17+.08*lift),side);
    } else if(swimming) {
      const wave=stroke+(side===1?Math.PI:0);
      leg.rotation.x=-.16+.25*Math.sin(wave);
      knee.rotation.x=-.21-.19*Math.sin(wave+.9);
      arm.rotation.set(.45+1.07*Math.cos(wave),side*.23,side*(.76+.48*Math.sin(wave)));
      forearm.rotation.x=.5+.36*Math.sin(wave);
    } else if(station) {
      const p=station.turretPitch;
      gripPose(arm,forearm,side*.177,2.04-.062*Math.cos(p)-.19*Math.sin(p)-.80,
        -.062*Math.sin(p)+.19*Math.cos(p)-.44,side);
    } else if(!seated && !state.parachute && !state.dead) {
      const weapon=avatar.tools[toolIndex];
      const kit=weapon.position;
      kit.x=(bloom ? .062 : .122)+.011*swing*weight;
      kit.y=(bloom ? 1.290 : 1.340)+.005*breathe-.059*run;
      kit.z=(bloom ? -.322 : -.185)+.037*run;
      weapon.rotation.set(-.12-.30*run,-.05-.11*run,.018+swing*.024*run,'YXZ');
      if(prone) {
        kit.set(bloom ? .060 : .099,1.515+.014*swing*weight,bloom ? -.037 : -.010);
        weapon.rotation.set(-avatar.body.rotation.x-avatar.spine.rotation.x,-.035,.012,'YXZ');
      } else if(crouch) {
        // Retain the sightline as the torso leans over the bent knees.
        weapon.rotation.x+=.20*stanceDrop(state);
      }
      // Aim each wrist at its own contact on the prop, including during the running tilt.
      const handX=side===1 ? .027 : bloom ? -.028 : -.036;
      const handY=side===1 ? -.048 : bloom ? -.049 : .038;
      const handZ=side===1 ? .037 : bloom ? .031 : -.21;
      grip.set(handX,handY,handZ).applyQuaternion(weapon.quaternion).add(kit);
      gripPose(arm,forearm,grip.x,grip.y,grip.z,side,prone);
    } else if(seated?.id) {
      // Hold the upper left/right spokes in the same frame as the cushion.
      const {y,z,radius,tilt}=helmWheel, up=radius*.5;
      gripPose(arm,forearm,side*radius*Math.cos(Math.PI/6)/seatedScale,
        (y+up*Math.cos(tilt)-helmOffset[1])/seatedScale,
        (z+up*Math.sin(tilt)-helmOffset[2])/seatedScale,side);
    } else if(seated) {
      forearm.rotation.x=.42;
    }
  }
  if(!avatar.shadow)return;
  const y=groundHeight(state.x,state.z),height=clamp(state.y-y,0,1.75);
  avatar.shadow.position.set(state.x,y+.026,state.z);
  avatar.shadow.rotation.y = prone ? avatar.root.rotation.y : fall ? -fall.yaw : 0;
  if (collapse) {
    avatar.shadow.position.x += .75*collapse*Math.sin(fall.yaw);
    avatar.shadow.position.z -= .75*collapse*Math.cos(fall.yaw);
  }
  avatar.shadow.scale.set(.37+height*.05,1,prone ? .87 : .30+height*.04+.7*collapse);
  avatar.shadow.material.opacity=.4-height*.12;
}
