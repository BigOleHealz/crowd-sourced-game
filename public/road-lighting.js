import * as THREE from 'three';
import {civilianProfiles} from './civilian-fleet.js';
import {lampWorking} from './road-fittings.js';
import {CITY,groundHeight} from './world.js';

export const skyDarkness={value:0};
const presets={
  day:[0,1.74,1.93,0xd6dce1,0xffe3b5,CITY?0xc0d3d9:0x95a3ac],
  dusk:[.55,1.05,1.08,0x9daaca,0xffa270,0x9996a8],
  night:[1,.82,.48,0x9fafd3,0xa9bdef,0x48546e],
};
export function lampPose(car,side,rear=false){
  const profile=civilianProfiles[car.model],gt=car.kind==='supercar';
  const span=profile?.bodyWidth??(gt?1.02:.82),nose=profile?.nose??(gt?-2.32:-1.67),tail=profile?.tail??(gt?2.32:1.69);
  const yaw=car.yaw,pitch=car.suspension?.pitch??0,roll=car.suspension?.roll??0;
  const along=rear?tail:nose,across=side*span*.70,c=Math.cos(yaw),s=Math.sin(yaw);
  const y=car.y+(gt?.52:.80)+(car.suspension?.heave??0)-along*Math.sin(pitch)+across*Math.sin(roll);
  return {x:car.x+across*c-along*s,y,z:car.z+across*s+along*c,aim:pitch-.085};
}

export function roadLighting(scene,ambient,sun){
  let level='day';
  const beams=[-1,1].map(()=>{
    const spot=new THREE.SpotLight(0xffeccb,0,33,.34,.64,1.6);
    spot.visible=false;scene.add(spot,spot.target);return spot;
  });
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(32,32,1,32,32,32);
  grad.addColorStop(0,'white');grad.addColorStop(.43,'rgba(255,255,255,.62)');grad.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(canvas);
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.50,depthWrite:false,blending:THREE.AdditiveBlending});
  const pools=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),material,48);
  pools.name='Headlight and brake spill';pools.count=0;pools.frustumCulled=false;pools.visible=false;scene.add(pools);
  const node=new THREE.Object3D(),warm=new THREE.Color(0xffe4af),red=new THREE.Color(0xff392b);
  function setLevel(value){
    level=Object.hasOwn(presets,value)?value:'day';
    const [dark,hemi,key,sky,keyColor,fog]=presets[level];
    skyDarkness.value=dark;ambient.intensity=hemi;ambient.color.setHex(sky);sun.intensity=key;sun.color.setHex(keyColor);scene.fog.color.setHex(fog);
  }
  function frame(world,local){
    let count=0,lead=null,leadDist=Infinity;
    if(level!=='day'){
      for(const car of [world.rover,world.supercar,...(world.traffic??[])]){
        if(!car || car.wrecked || (car.driver==null && car.npcDriver==null) || car.bridgeFlight)continue;
        const dist=Math.hypot(car.x-local.x,car.z-local.z);
        if(dist>70)continue;
        const priority=car.driver===local.id?-1:dist;
        if(priority<leadDist){lead=car;leadDist=priority;}
        for(const rear of [false,true]){
          if(rear && !car.braking)continue;
          for(const side of [-1,1]){
            const corner=(side<0?0:2)+(rear?1:0);
            if(!lampWorking(car,corner) || count>=pools.instanceMatrix.count)continue;
            const pos=lampPose(car,side,rear);
            const reach=rear?-1.15:THREE.MathUtils.clamp(pos.y-car.y,.3,1.3)*5;
            const x=pos.x+Math.sin(car.yaw)*reach,z=pos.z-Math.cos(car.yaw)*reach;
            const y=groundHeight(x,z,car.y+1.15,world.doors);
            if(Math.abs(y-car.y)>1.1)continue;
            node.position.set(x,y+.035,z);node.rotation.y=-car.yaw;
            node.scale.set(rear?1.35:2.55,1,rear?2.6:reach*2.1);node.updateMatrix();
            pools.setMatrixAt(count,node.matrix);pools.setColorAt(count++,rear?red:warm);
          }
        }
      }
    }
    pools.count=count;pools.visible=count>0;
    if(count){pools.instanceMatrix.needsUpdate=true;pools.instanceColor.needsUpdate=true;}
    for(let i=0;i<2;i++){
      const b=beams[i];b.visible=!!lead && lampWorking(lead,i*2);
      if(!b.visible)continue;
      const pos=lampPose(lead,i?1:-1);b.position.set(pos.x,pos.y,pos.z);
      b.target.position.set(pos.x+Math.sin(lead.yaw)*18,pos.y+Math.tan(pos.aim)*18,pos.z-Math.cos(lead.yaw)*18);
      b.intensity=level==='night'?62:34;
    }
  }
  return {setLevel,frame};
}
