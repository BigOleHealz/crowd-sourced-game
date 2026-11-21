import * as THREE from 'three';
import {fireSite} from './district-fire.js';

// All smoke and glow use the scene's existing bounded billboard pool.
export function districtFireEffects(puff,random){
  const at=new THREE.Vector3(),velocity=new THREE.Vector3();
  let delay=0,sequence=0;
  function pulse(shot){
    const dx=shot.to.x-shot.from.x,dy=shot.to.y-shot.from.y,dz=shot.to.z-shot.from.z;
    const length=Math.hypot(dx,dy,dz);
    if(length<.01)return;
    const count=Math.max(1,Math.ceil(length/.72));
    for(let i=0;i<count;i++){
      const t=(i+.55)/count,w=(.04+t*.16);
      at.set(shot.from.x+dx*t+(random()-.5)*w,shot.from.y+dy*t,shot.from.z+dz*t+(random()-.5)*w);
      velocity.set(dx*.18,.46+dy*.18,dz*.18);
      puff(at,velocity.clone(),.12+t*.30,.20+t*.48,.12+t*.09,i%3?0xff9b32:0xffda73,.93);
    }
  }
  function update(doors,local,dt){
    if(!doors?.fires)return;
    delay-=dt;if(delay>0)return;
    delay=.12;sequence++;
    const active=Object.entries(doors.fires).filter(([,v])=>v.stage==='burning' && Math.hypot(local.x-v.x,local.z-v.z)<82)
      .sort(([,a],[,b])=>Math.hypot(local.x-a.x,local.z-a.z)-Math.hypot(local.x-b.x,local.z-b.z)).slice(0,3);
    for(const [id,f] of active){
      const site=fireSite(id),house=site.kind==='house',station=site.kind==='station',spread=f.level;
      for(let j=0;j<spread+1;j++){
        let x=f.x,y=f.y,z=f.z;
        if(house && j>0){
          const eastWest=Math.abs(f.x-site.x)/site.w>Math.abs(f.z-site.z)/site.d;
          const drift=Math.sin((sequence%13+j)*2.4)*spread*.8;
          if(eastWest)z=THREE.MathUtils.clamp(z+drift,site.z-site.d/2,site.z+site.d/2);
          else x=THREE.MathUtils.clamp(x+drift,site.x-site.w/2,site.x+site.w/2);
          y+=random()*spread*.72;
        }else if(station && j>0){
          x=site.x+(j%2?3.7:-3.7);z=site.z+(random()-.5)*1.05;y=1.17+j*.2;
        }
        at.set(x+(random()-.5)*.42,Math.max(1,y-.22),z+(random()-.5)*.46);
        velocity.set(.12,1.4+random()*.98,.05);
        puff(at,velocity.clone(),.46+spread*.16,.30+spread*.21,.42+random()*.24,0xf05d22,.89);
        at.y-=.16;velocity.y=1.8;
        puff(at,velocity.clone(),.28+spread*.09,.18+spread*.09,.34,0xffc75a,.98);
        if((sequence+j)%2===0){
          at.y+=.78;velocity.set(.38+random()*.2,1.3+random()*.6,.12);
          puff(at,velocity.clone(),.35+spread*.14,1.00+spread*.50,1.42+random()*.65,0x534f48,.59);
        }
      }
    }
  }
  return {pulse,update};
}
