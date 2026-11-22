import * as THREE from 'three';
import {holdWorld} from './ranger-pose.js';
import {buildDog} from './dog-model.js';

const cordMaterial=new THREE.LineBasicMaterial({color:0x584533});
const foot=new THREE.Vector3(),palm=new THREE.Vector3(),clip=new THREE.Vector3(),target=new THREE.Vector3();
const clamp=THREE.MathUtils.clamp;

function dogRig(scene,Batch,dog){
  const parts=buildDog(scene,Batch,dog),{root}=parts;
  const points=new Float32Array(10*3),ropeGeo=new THREE.BufferGeometry();
  ropeGeo.setAttribute('position',new THREE.BufferAttribute(points,3).setUsage(THREE.DynamicDrawUsage));
  const leash=new THREE.Line(ropeGeo,cordMaterial);leash.name='Leash · '+dog.name;leash.frustumCulled=false;scene.add(leash);
  root.position.set(dog.x,dog.y,dog.z);root.rotation.y=-dog.yaw;
  return {...parts,leash,points,phase:0,vertical:0,lastY:dog.y};
}

function smoothPulse(t){
  const crest=.5+.5*Math.sin(t*2.73+.42*Math.sin(t*3.6));
  return crest*crest*crest;
}

export function dogView(scene,Batch){
  const models=new Map();
  return (dogs,avatars,local,dt,clock,tick)=>{
    const live=new Set();
    for(const dog of dogs??[]){
      if(dog.mode==='removed' || (!dog.hp && dog.deathKind==='blast') || Math.hypot(dog.x-local.x,dog.z-local.z)>65)continue;
      live.add(dog.id);
      let rig=models.get(dog.id);if(!rig){rig=dogRig(scene,Batch,dog);models.set(dog.id,rig);}
      const {root,body,neck,tail,legs,ears,jaw,leash,points}=rig,held=dog.mode==='carried',swim=dog.mode==='swimming';
      const flying=dog.mode==='thrown' || dog.mode==='startled',down=dog.mode==='down';
      const sinceBite=(tick-(dog.lastBiteTick??-1000))/30;
      const lunge=sinceBite>=0 && sinceBite<.35?Math.sin(sinceBite/.35*Math.PI):0;
      const holder=avatars.get(held?dog.carrier:dog.walker);
      const blend=-Math.expm1(-dt*20);target.set(dog.x,dog.y,dog.z);
      if(held && holder?.root.visible){
        holder.upper.localToWorld(target.set(0,1.16-.32*dog.size,-.22-.105*dog.size));
      }
      if(held || !root.visible || root.position.distanceToSquared(target)>12)root.position.copy(target);
      else root.position.lerp(target,blend);
      root.visible=true;
      const yaw=held && holder?.root.visible?holder.root.rotation.y-Math.PI/2:-dog.yaw;
      if(held)root.rotation.y=yaw;
      else root.rotation.y+=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y))*blend;
      const stride=Math.min(1,dog.speed/.95);
      rig.phase+=dt*(swim?7:2.8+Math.min(3.5,dog.speed)*4.2);
      rig.vertical=THREE.MathUtils.lerp(rig.vertical,(dog.y-rig.lastY)/Math.max(.001,dt),blend);rig.lastY=dog.y;
      const kickAge=(tick-(dog.lastKickTick??-1000))/30;
      const flinch=kickAge>=0 && kickAge<.64 ? Math.sin(Math.PI*Math.min(1,kickAge/.13)/2)*Math.exp(-Math.max(0,kickAge-.09)*6.1) : 0;
      const fidget=clock*(6.8+dog.size*.8)+dog.size*7;
      const burst=held?smoothPulse(clock*.83+dog.size*3):0;
      const lean=Math.sin(fidget)*burst,twist=Math.sin(fidget*.52)*burst;
      body.position.set(held?.017*lean:0,down?-.22:held?.012*lean:swim?.035*Math.sin(clock*3.1):.018*Math.abs(Math.sin(rig.phase))*stride-.09*flinch,0);
      body.rotation.z=THREE.MathUtils.lerp(body.rotation.z,down?1.36:held?-.09+.075*twist:.16*flinch,blend);
      body.rotation.x=flying?clamp(rig.vertical*.09,-.42,.35)-.23*flinch:swim?-.075:held?-.045+.072*lean:-.09*flinch;
      body.rotation.y=held?.09*twist:0;
      neck.visible=!(down && dog.headInjury);
      neck.position.set(0,.55-.10*flinch,-.272-lunge*.095+.075*flinch);
      neck.rotation.set(down?.23:swim?.14:held?-.12+.15*lean:.035*Math.sin(rig.phase)*stride+lunge*.28-.42*flinch,
        held?-.19+.32*Math.sin(clock*1.7)+.19*twist:.09*Math.sin(clock*1.7+dog.size*3),held?.07*lean:.12*flinch);
      jaw.rotation.x=down?-.16:held?-.14-.075*(.5+.5*Math.cos(clock*7)):swim?-.065:-(.035+.105*stride)*(.75+.25*Math.sin(clock*6));
      for(const [i,ear] of ears.entries()){
        const sign=i?1:-1,flop=dog.coat==='shepherd'?.22:1;
        ear.rotation.set(flop*(.12*Math.sin(rig.phase-.6)*stride+.22*lean),sign*(-.04+.15*twist),sign*(.37*flinch+.11*burst));
      }
      tail.rotation.y=down?0:Math.sin(clock*(held?5:7)+dog.size*2)*(swim?.13:held?.17+.25*burst:.31);
      tail.rotation.x=flinch*.82+(held?.15:swim?.26:.06);
      for(const {hip,knee,side,rear} of legs){
        const beat=rig.phase+((side===1)!==rear?Math.PI:0),lift=Math.max(0,Math.sin(beat));
        const paddle=Math.sin(fidget+side*1.4+(rear?1.75:0))*burst;
        hip.rotation.x=down?(rear?-.36:.22):held?(rear?.37+.36*paddle:.45+.50*paddle):flying?(rear?-.62:.58):Math.cos(beat)*(swim?.77:.53*stride);
        knee.rotation.x=down?(rear?.86:-.47):held?(rear?-1.04+.29*paddle:-.83+.32*paddle):flying?(rear?.85:-.49):(rear?1:-1)*lift*(swim?.69:.5*stride);
        if(!down && !held){hip.rotation.x+=(rear?-.43:.57)*flinch;knee.rotation.x+=(rear?.49:-.54)*flinch;}
        hip.rotation.z=held?side*(.13+.075*burst):0;
      }
      leash.visible=dog.mode==='leashed' && !!holder?.root.visible;
      if(leash.visible){
        const hand=holder.limbs[0].forearm;
        hand.localToWorld(palm.set(0,-.265,0));neck.localToWorld(clip.set(0,.013,.125));
        const sag=clamp(.31-(palm.distanceTo(clip)-.85)*.20,.035,.34);
        for(let i=0;i<10;i++){
          const t=i/9;foot.lerpVectors(palm,clip,t);foot.y-=sag*4*t*(1-t);foot.toArray(points,i*3);
        }
        leash.geometry.attributes.position.needsUpdate=true;
      }
      const kicker=kickAge>=0 && kickAge<.43 ? avatars.get(dog.kicker) : null;
      if(kicker?.root.visible){
        kicker.root.worldToLocal(target.set(dog.x,dog.y+.38*dog.size,dog.z));
        const weight=Math.sin(Math.PI*kickAge/.43),sweep=Math.max(0,Math.sin(Math.PI*(kickAge-.07)/.36));
        const limb=kicker.limbs.find(l=>l.side===(target.x<0?-1:1));
        limb.leg.rotation.order='YXZ';
        limb.leg.rotation.y=clamp(Math.atan2(-target.x,-target.z),-2.2,2.2)*weight;
        limb.leg.rotation.x=THREE.MathUtils.lerp(limb.leg.rotation.x,1.32,weight);
        limb.knee.rotation.x=THREE.MathUtils.lerp(limb.knee.rotation.x,-1.16+.98*sweep,weight);
        limb.ankle.rotation.x=THREE.MathUtils.lerp(limb.ankle.rotation.x,.15,weight);
      }
      if(held && holder?.root.visible){
        for(const tool of holder.tools)tool.visible=false;
        for(const limb of holder.limbs){
          // The head points toward the carrier's right. Keep the right wrist
          // under the chest and the left under the hindquarters, palms apart.
          const front=limb.side===1;
          body.localToWorld(target.set(-.034,front?.278:.306,front?-.225:.238));
          holdWorld(holder,limb.arm,limb.forearm,limb.side,target);
        }
      }
    }
    for(const [id,m] of models)if(!live.has(id)){m.root.visible=m.leash.visible=false;}
  };
}
