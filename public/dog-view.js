import * as THREE from 'three';
import {holdWorld} from './ranger-pose.js';

const coats={
  spaniel:{fur:0x824a29,dark:0x503021,light:0xe1c49d,muzzle:0xc39a70,collar:0x387968,ear:.24},
  retriever:{fur:0xcca160,dark:0x9d723e,light:0xe8d1a1,muzzle:0xd9b879,collar:0x42728d,ear:.17},
  shepherd:{fur:0xac7a4e,dark:0x443a34,light:0xddbc86,muzzle:0x61554b,collar:0xad6343,ear:.14},
};
const globe=new THREE.SphereGeometry(1,12,9),cone=new THREE.ConeGeometry(1,1,9);
const finish=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.90});
const cordMaterial=new THREE.LineBasicMaterial({color:0x584533});
const foot=new THREE.Vector3(),palm=new THREE.Vector3(),clip=new THREE.Vector3(),target=new THREE.Vector3();
const joint=(parent,x,y,z)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};
const clamp=THREE.MathUtils.clamp;

function dogRig(scene,Batch,dog){
  const root=new THREE.Group();root.name='Dog · '+dog.name;scene.add(root);root.scale.setScalar(dog.size);
  const body=joint(root,0,0,0),neck=joint(body,0,.56,-.285),tail=joint(body,0,.52,.385);
  const c=coats[dog.coat],shepherd=dog.coat==='shepherd',spaniel=dog.coat==='spaniel';
  const shape=(batch,tint,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>batch.add(globe,tint,x,y,z,w,h,d,rx,ry,rz);
  const shell=new Batch();
  shape(shell,c.fur,0,.455,.045,.147,.182,.404,-.035);
  shape(shell,c.fur,0,.47,-.19,.155,.22,.208,.12);
  shape(shell,c.light,0,.426,-.29,.11,.149,.121,-.35);
  shape(shell,c.fur,0,.445,.28,.15,.175,.184,-.12);
  if(shepherd || spaniel)shape(shell,shepherd?c.dark:c.light,0,.522,.085,.137,.128,.288,-.015);
  shell.mesh(body,finish);
  const head=new Batch();
  shape(head,c.fur,0,.065,-.005,.124,.177,.142,-.27);
  shape(head,c.fur,0,.212,-.063,.135,.145,.158);
  shape(head,c.muzzle,0,.168,-.221,.092,.066,.133,-.05);
  shape(head,c.dark,0,.115,-.222,.068,.028,.103,-.10);
  shape(head,0x302a28,0,.193,-.335,.061,.035,.030);
  for(const s of [-1,1]){
    shape(head,c.dark,s*.087,.253,-.161,.041,.021,.032,0,0,s*.17);
    shape(head,0x352e25,s*.10,.241,-.170,.024,.024,.028);
    shape(head,0xf2e2bf,s*.108,.247,-.191,.006,.006,.006);
    if(shepherd){
      head.add(cone,c.dark,s*.083,.407,-.025,.067,.212,.053,-.10,0,-s*.17);
      head.add(cone,0x896e5d,s*.083,.402,-.041,.039,.162,.041,-.10,0,-s*.17);
    }else{
      shape(head,c.dark,s*.126,.194,.002,.052,c.ear*.81,.092,-.23,0,s*.12);
      shape(head,c.fur,s*.145,.177,-.032,.024,c.ear*.64,.039,-.13);
    }
  }
  shape(head,c.collar,0,.001,.005,.127,.035,.147,-.23);
  shape(head,0xbc945c,.025,-.04,-.135,.017,.026,.008);
  head.mesh(neck,finish);
  const tailFur=new Batch();
  shape(tailFur,c.fur,0,.037,.122,.052,.057,.167,-.28);
  shape(tailFur,c.fur,0,.11,.267,.043,.048,.12,-.52);
  shape(tailFur,shepherd?c.dark:c.light,0,.176,.353,.030,.035,.073,-.59);
  tailFur.mesh(tail,finish);
  const legs=[];
  for(const side of [-1,1])for(const rear of [false,true]){
    const hip=joint(body,side*.109,.414,rear?.268:-.207),knee=joint(hip,0,-.188,rear?-.045:.015);
    const thigh=new Batch(),shin=new Batch();
    shape(thigh,c.fur,0,-.085,rear?-.02:0,rear?.067:.048,.133,rear?.088:.057,rear?.21:-.09);
    shape(shin,c.muzzle,0,-.081,rear?.026:0,.038,.111,.042,rear?-.39:0);
    shape(shin,c.light,0,-.167,rear?.046:.002,.030,.065,.032);
    shape(shin,c.light,0,-.196,rear?.026:-.016,.042,.030,.06);
    for(const j of [-1,0,1])shape(shin,c.muzzle,j*.02,-.201,rear?-.006:-.048,.015,.019,.026);
    thigh.mesh(hip,finish,false);shin.mesh(knee,finish,false);legs.push({hip,knee,side,rear});
  }
  const points=new Float32Array(10*3),ropeGeo=new THREE.BufferGeometry();
  ropeGeo.setAttribute('position',new THREE.BufferAttribute(points,3).setUsage(THREE.DynamicDrawUsage));
  const leash=new THREE.Line(ropeGeo,cordMaterial);leash.name='Leash · '+dog.name;leash.frustumCulled=false;scene.add(leash);
  root.position.set(dog.x,dog.y,dog.z);root.rotation.y=-dog.yaw;
  return {root,body,neck,tail,legs,leash,points,phase:0,vertical:0,lastY:dog.y};
}

export function dogView(scene,Batch){
  const models=new Map();
  return (dogs,avatars,local,dt,clock,tick)=>{
    const live=new Set();
    for(const dog of dogs??[]){
      if(dog.mode==='removed' || Math.hypot(dog.x-local.x,dog.z-local.z)>65)continue;
      live.add(dog.id);
      let rig=models.get(dog.id);if(!rig){rig=dogRig(scene,Batch,dog);models.set(dog.id,rig);}
      const {root,body,neck,tail,legs,leash,points}=rig,held=dog.mode==='carried',swim=dog.mode==='swimming';
      const flying=dog.mode==='thrown' || dog.mode==='startled',down=dog.mode==='down';
      const sinceBite=(tick-(dog.lastBiteTick??-1000))/30;
      const lunge=sinceBite>=0 && sinceBite<.35?Math.sin(sinceBite/.35*Math.PI):0;
      const holder=avatars.get(held?dog.carrier:dog.walker);
      const blend=-Math.expm1(-dt*20);target.set(dog.x,dog.y,dog.z);
      if(held && holder?.root.visible){
        holder.root.updateWorldMatrix(true,false);
        holder.root.localToWorld(target.set(0,.91,-.31));
      }
      if(!root.visible || (held && rig.mode!==dog.mode) || root.position.distanceToSquared(target)>12)root.position.copy(target);
      else root.position.lerp(target,blend);
      rig.mode=dog.mode;root.visible=true;
      const yaw=held && holder?.root.visible?holder.root.rotation.y-Math.PI/2:-dog.yaw;
      root.rotation.y+=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y))*blend;
      const stride=Math.min(1,dog.speed/.95);
      rig.phase+=dt*(swim?7:2.8+Math.min(3.5,dog.speed)*4.2);
      rig.vertical=THREE.MathUtils.lerp(rig.vertical,(dog.y-rig.lastY)/Math.max(.001,dt),blend);rig.lastY=dog.y;
      body.position.y=down?-.22:held?-.10:swim?.035*Math.sin(clock*3.1):.018*Math.abs(Math.sin(rig.phase))*stride;
      body.rotation.z=THREE.MathUtils.lerp(body.rotation.z,down?1.36:0,blend);
      body.rotation.x=flying?clamp(rig.vertical*.09,-.42,.35):swim?-.075:held?.1:0;
      neck.position.z=-.285-lunge*.095;
      neck.rotation.set(down?.23:swim?.14:held?-.12:.035*Math.sin(rig.phase)*stride+lunge*.28,.09*Math.sin(clock*1.7+dog.size*3),0);
      tail.rotation.y=down?0:Math.sin(clock*(held?4:7)+dog.size*2)*(swim?.13:.31);
      tail.rotation.x=dog.mode==='startled'?.68:swim?.26:.06;
      for(const {hip,knee,side,rear} of legs){
        const beat=rig.phase+((side===1)!==rear?Math.PI:0),lift=Math.max(0,Math.sin(beat));
        hip.rotation.x=down?(rear?-.36:.22):held?(rear?-.65:.48):flying?(rear?-.72:.61):Math.cos(beat)*(swim?.77:.53*stride);
        knee.rotation.x=down || held || flying?(rear?.85:-.49):(rear?1:-1)*lift*(swim?.69:.5*stride);
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
      const kickAge=(tick-(dog.lastKickTick??-1000))/30;
      const kicker=kickAge>=0 && kickAge<.43 && avatars.get(dog.kicker);
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
          body.localToWorld(target.set(0,.24,limb.side*.22));
          holdWorld(holder,limb.arm,limb.forearm,limb.side,target);
        }
      }
    }
    for(const [id,m] of models)if(!live.has(id)){m.root.visible=m.leash.visible=false;}
  };
}
