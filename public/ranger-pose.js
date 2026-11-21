import {roadCabin,roadWheelGrip,roadHandle} from './road-cabin.js';
import {helmFeet,helmOffset,helmWheel,seatedScale} from './patrol-boats.js';
import * as THREE from 'three';
import {newGait,advanceGait,newFoot,placeFoot,bootSupport,fitPlantedBoot} from './locomotion.js';
import {groundHeight,stanceDrop,waterBlend} from './world.js';
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
  return {root,body,spine,upper,head,limbs,tools:Array.from({length:4},()=>new THREE.Group()),cycle:0,gait:null};
}
const downArm=new THREE.Vector3(0,-1,0), reach=new THREE.Vector3(), bend=new THREE.Vector3();
const relaxedPalm=new THREE.Vector3(),grip=new THREE.Vector3(),elbow=new THREE.Vector3(),segment=new THREE.Vector3(),inverseUpper=new THREE.Quaternion();
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

function holdWorld(avatar,arm,forearm,side,target){
  grip.set(target.x,target.y,target.z);
  avatar.upper.worldToLocal(grip);
  gripPose(arm,forearm,grip.x,grip.y,grip.z,side);
}

// The same authoritative progress moves the occupant and the hinged door.
// The tracking hand follows the handle through its swing before both hands settle on the rim.
export function poseRoadBoarding(avatar,car,action){
  const {progress:t,startX,startY,startZ}=action,cabin=roadCabin(car),seat=mountPosition(car,cabin.seat);
  const approach=THREE.MathUtils.smoothstep(t,0,.24),enter=THREE.MathUtils.smoothstep(t,action.npcId ? .65 : .45,.97);
  const handle=roadHandle(car,t),c=Math.cos(car.yaw),s=Math.sin(car.yaw),mix=THREE.MathUtils.lerp;
  const standX=handle.x-c*.27+s*.12,standZ=handle.z-s*.27-c*.12;
  const {root,body,spine,limbs}=avatar;
  avatar.gait=null;
  root.scale.setScalar(mix(1,cabin.scale,enter));
  root.position.set(mix(mix(startX,standX,approach),seat.x,enter),
    mix(mix(startY,car.y,approach),seat.y,enter),mix(mix(startZ,standZ,approach),seat.z,enter));
  root.rotation.set((car.suspension?.pitch??0)*enter,-car.yaw-1.57*(1-enter),(car.suspension?.roll??0)*enter,'YXZ');
  const crouch=approach*(1-enter)*Math.max(.12,1.13-cabin.handle[1]);
  body.position.set(0,-crouch,0);
  spine.rotation.set(-.24*approach*(1-enter)+(car.kind==='supercar' ? .35*enter : 0),0,0);
  for(const {leg,knee,ankle,arm,forearm,side} of limbs){
    const bend=crouch*2;
    leg.rotation.set(1.36*enter+bend,0,side*.075*(1-enter),'ZXY');
    knee.rotation.set(-1.30*enter-1.8*bend,0,0);ankle.rotation.set(bend*.65,0,0);
    const wheel=roadWheelGrip(car,side);
    if(side===1){wheel.x=mix(handle.x,wheel.x,enter);wheel.y=mix(handle.y,wheel.y,enter);wheel.z=mix(handle.z,wheel.z,enter);}
    const weight=side===1?approach:enter;
    if(weight<1){
      arm.rotation.set(.25,0,side*.07);forearm.rotation.set(.26,0,0);
      if(!weight)continue;
      forearm.localToWorld(relaxedPalm.set(0,-lowerLength,0));
      wheel.x=mix(relaxedPalm.x,wheel.x,weight);wheel.y=mix(relaxedPalm.y,wheel.y,weight);wheel.z=mix(relaxedPalm.z,wheel.z,weight);
    }
    holdWorld(avatar,arm,forearm,side,wheel);
  }
  for(const tool of avatar.tools)tool.visible=false;
}

export function poseRig(avatar,state,dt,seated=null,station=null,doors) {
  const fall = state.fall, climb=state.climb;
  const onFoot=!fall && !seated && !station && !state.dead && state.grounded!==false && !state.parachute;
  const prone=onFoot && state.stance==='prone';
  const crouch=onFoot && state.stance==='crouch';
  let gait=avatar.gait;
  if(onFoot) {
    if(!gait || Math.hypot(state.x-gait.x,state.z-gait.z)>1.8) {
      gait=avatar.gait=newGait(state,avatar.initialized ? avatar.root.rotation.y : -state.yaw);
      for(const limb of avatar.limbs){limb.foot.planted=false;limb.foot.sampleY=undefined;}
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
  const eligibleWater=!seated && !station && !prone && !crouch && !fall && !climb && !state.dead && !state.parachute;
  const targetWater=eligibleWater?waterBlend(state):0,previousWater=avatar.waterMix??targetWater;
  const water=avatar.waterMix=eligibleWater?previousWater+clamp(targetWater-previousWater,-dt*3.8,dt*3.8):0;
  const open = state.parachute === 'open' && !state.dead;
  if (open && avatar.makeCanopy && !avatar.canopy) avatar.canopy = avatar.makeCanopy(avatar.root,avatar.material);
  if (avatar.canopy) avatar.canopy.visible = open;
  avatar.root.position.set(state.x,state.y,state.z);
  const trafficSeat=seated?.model && seated.npcDriver!==undefined;
  const helm=seated?.id && !trafficSeat;
  const cabin=seated && !helm ? roadCabin(seated) : null;
  const lowCockpit=seated?.kind==='supercar';
  avatar.root.scale.setScalar(cabin?.scale??(helm ? seatedScale : 1));
  if (avatar.civilian){avatar.root.scale.x*=avatar.civilian.width;avatar.root.scale.y*=avatar.civilian.height;}
  if (seated) {
    const seat=helm ? helmFeet(seated) : mountPosition(seated,cabin.seat);
    avatar.root.position.set(seat.x,seat.y,seat.z);
  }
  if(station) {
    const feet=gunnerFeet(station,station.id??'rover');
    avatar.root.position.set(feet.x,feet.y,feet.z);
  }
  const yaw=station ? -station.turretYaw : -(Number.isFinite(state.yaw)?state.yaw:0);
  const delta=Math.atan2(Math.sin(yaw-avatar.root.rotation.y),Math.cos(yaw-avatar.root.rotation.y));
  avatar.root.rotation.y = station ? yaw : seated ? -seated.yaw : gait ? gait.yaw : avatar.root.rotation.y+delta*(1-Math.exp(-dt*19));
  const ride=helm ? seated : (seated || station)?.suspension;
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
  if(avatar.civilian && gait){
    const glance=Math.sin(avatar.cycle*.48+avatar.civilian.face*2.4);
    avatar.head.rotation.y+=glance*(.06+.19*(1-weight));
    avatar.spine.rotation.x+=.025*avatar.civilian.swing;
  }
  if(lowCockpit){
    // Recline at the hips under the coupe roof, keeping the driver's eyes on the road.
    avatar.spine.rotation.x=.35;avatar.head.rotation.x=-.25;
  }
  if(water>0) avatar.stroke=(avatar.stroke ?? 0)+dt*(state.moving ? 5.4 : 2.9);
  const stroke=avatar.stroke ?? 0;
  avatar.body.rotation.x=water*(state.moving ? -1.06 : -.48);
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
  if(water>0) {
    const swimPitch=state.moving?-1.06:-.48;
    avatar.body.position.y=THREE.MathUtils.lerp(avatar.body.position.y,.79-1.34*Math.cos(swimPitch)+.03*Math.sin(stroke),water);
    avatar.body.position.z=-Math.sin(swimPitch)*1.12*water;
    avatar.spine.rotation.x=THREE.MathUtils.lerp(avatar.spine.rotation.x,.17,water);
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
    const contact=THREE.MathUtils.smoothstep(climb.t,.04,.22)*(1-THREE.MathUtils.smoothstep(climb.t,.55,.78));
    avatar.body.position.y-=.12*tuck+Math.min(.68,Math.max(0,1.34-(climb.top-state.y)))*contact;
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
      fitPlantedBoot(gait,foot,leg.position,state.y,avatar.root.scale.y,doors,groundHeight);
      const floor=bootSupport(foot,state.y,gait.yaw,doors,groundHeight);
      const down=leg.position.y+gait.pelvisY-.126-foot.lift*(1+1.3*water*(1-water))-floor/avatar.root.scale.y;
      const lateral=foot.sideOffset-leg.position.x-gait.pelvisX;
      const vertical=Math.hypot(down,lateral);
      const distance=clamp(Math.hypot(vertical,foot.forwardOffset),.20,.7999);
      const hipBend=Math.acos(clamp((.405**2+distance**2-.395**2)/(.81*distance),-1,1));
      leg.rotation.set(Math.atan2(-foot.forwardOffset,vertical)+hipBend,0,Math.atan2(lateral,down),'ZXY');
      knee.rotation.x=-Math.acos(clamp((distance**2-.405**2-.395**2)/(2*.405*.395),-1,1));
      ankle.rotation.x=(foot.floorPitch??0)+(foot.planted?foot.pitch*.25:foot.pitch)-leg.rotation.x-knee.rotation.x;
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
      const hold=THREE.MathUtils.smoothstep(climb.t,0,.22)*(1-THREE.MathUtils.smoothstep(climb.t,.55,.78));
      const fold=Math.sin(Math.PI*climb.t);
      leg.rotation.set((side===1?.99:.46)*fold,0,side*.12*fold);
      knee.rotation.x=-(side===1?1.57:1.12)*fold;
      ankle.rotation.x=.27*fold;
      // Grip the measured world-space lip throughout the hang, even as the
      // torso turns or rises. Convert to the moving shoulder rig for IK.
      grip.set((climb.lipX??climb.tx)+side*.2*Math.cos(climb.yaw),climb.top+.035,
        (climb.lipZ??climb.tz)+side*.2*Math.sin(climb.yaw));
      arm.parent.worldToLocal(grip);
      gripPose(arm,forearm,THREE.MathUtils.lerp(side*.22,grip.x,hold),
        THREE.MathUtils.lerp(1.24,grip.y,hold),THREE.MathUtils.lerp(-.18,grip.z,hold),side);
    } else if(state.reaction && !seated && !station){
      const shield=state.reaction!=='horn';
      arm.rotation.set(shield?.93:.24,side*.06,side*(shield?.49:.24));
      forearm.rotation.x=shield?1.20:.39;
    } else if(station) {
      const p=station.turretPitch;
      gripPose(arm,forearm,side*.177,2.04-.062*Math.cos(p)-.19*Math.sin(p)-.80,
        -.062*Math.sin(p)+.19*Math.cos(p)-.44,side);
    } else if(avatar.civilian && !seated && !state.dead) {
      const person=avatar.civilian;
      // Swing opposite the planted foot. A shoulder bag damps its carrying arm.
      const bag=side===-1 && (person.extra==='tote' || person.extra==='satchel');
      const travel=(gait ? foot.forwardOffset : 0)*person.swing*(bag?.36:1);
      arm.rotation.set(.025+travel,side*.04,side*(bag?.145:.092));
      forearm.rotation.x=(bag?.39:.15)+Math.max(0,travel)*.48;
    } else if(!seated && !state.parachute && !state.dead && !swimming) {
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
    } else if(cabin) {
      holdWorld(avatar,arm,forearm,side,roadWheelGrip(seated,side));
    } else if(helm) {
      // Hold the upper left/right spokes in the same frame as the cushion.
      const {y,z,radius,tilt}=helmWheel, up=radius*.5;
      gripPose(arm,forearm,side*radius*Math.cos(Math.PI/6)/seatedScale,
        (y+up*Math.cos(tilt)-helmOffset[1])/seatedScale,
        (z+up*Math.sin(tilt)-helmOffset[2])/seatedScale,side);
    }
    if(water>0){
      const wave=stroke+(side===1?Math.PI:0),mix=THREE.MathUtils.lerp;
      leg.rotation.x=mix(leg.rotation.x,-.16+.25*Math.sin(wave),water);
      knee.rotation.x=mix(knee.rotation.x,-.21-.19*Math.sin(wave+.9),water);
      arm.rotation.set(mix(arm.rotation.x,.45+1.07*Math.cos(wave),water),mix(arm.rotation.y,side*.23,water),
        mix(arm.rotation.z,side*(.76+.48*Math.sin(wave)),water));
      forearm.rotation.x=mix(forearm.rotation.x,.5+.36*Math.sin(wave),water);
    }
  }
  if(!avatar.shadow)return;
  const y=groundHeight(state.x,state.z,state.y+.28,doors),height=clamp(state.y-y,0,1.75);
  avatar.shadow.position.set(state.x,y+.026,state.z);
  avatar.shadow.rotation.y = prone ? avatar.root.rotation.y : fall ? -fall.yaw : 0;
  if (collapse) {
    avatar.shadow.position.x += .75*collapse*Math.sin(fall.yaw);
    avatar.shadow.position.z -= .75*collapse*Math.cos(fall.yaw);
  }
  avatar.shadow.scale.set(.37+height*.05,1,prone ? .87 : .30+height*.04+.7*collapse);
  avatar.shadow.material.opacity=.4-height*.12;
}
