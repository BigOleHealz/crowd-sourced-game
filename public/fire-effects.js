import * as THREE from 'three';
import {emberStreams} from './ember-stream.js';
import {flameSheets} from './flame-sheets.js';
import {fireSite} from './district-fire.js';

// All smoke and glow use the scene's existing bounded billboard pool.
export function districtFireEffects(scene,puff,random){
  const sheets=flameSheets(scene),streams=emberStreams(scene);
  const at=new THREE.Vector3(),velocity=new THREE.Vector3();
  let delay=0,sequence=0;
  function pulse(shot){
    const dx=shot.to.x-shot.from.x,dy=shot.to.y-shot.from.y,dz=shot.to.z-shot.from.z;
    const length=Math.hypot(dx,dy,dz);
    if(length<.01)return;
    streams.pulse(shot);
    // The last few wisps peel off the visible end within the shared particle cap.
    for(let i=0;i<3;i++){
      const t=.72+.21*random();
      at.set(shot.from.x+dx*t,shot.from.y+dy*t,shot.from.z+dz*t);
      velocity.set((random()-.5)*.52,.64+random()*.62,(random()-.5)*.52);
      puff(at,velocity.clone(),.13,.38,.16+random()*.14,i===0?0xffcf73:0xe47836,.74);
    }
  }
  function update(doors,local,dt){
    sheets.tick(dt);streams.update(dt);
    if(!doors?.fires){sheets.begin();sheets.finish();return;}
    delay-=dt;if(delay>0)return;
    delay=.12;sequence++;sheets.begin();
    const active=Object.entries(doors.fires).filter(([,v])=>v.stage==='burning' && Math.hypot(local.x-v.x,local.z-v.z)<82)
      .sort(([,a],[,b])=>Math.hypot(local.x-a.x,local.z-a.z)-Math.hypot(local.x-b.x,local.z-b.z)).slice(0,3);
    for(const [id,f] of active){
      const site=fireSite(id),house=site.kind==='house',station=site.kind==='station',spread=f.level;
      const alongX=house && Math.abs(f.z-site.z)/site.d>Math.abs(f.x-site.x)/site.w;
      // Fire travels along the siding from the point of impact. Give the
      // sheets a little clearance so the facade cannot hide their centers.
      const ox=house&&!alongX?Math.sign(f.x-site.x)*.18:0;
      const oz=house&&alongX?Math.sign(f.z-site.z)*.18:0;
      for(let k=0;k<2+spread*2;k++){
        const u=k/(1+spread*2)-.5;
        let x=f.x,z=f.z,y=Math.max(.87,f.y-.63),size=1;
        if(house){
          const span=spread*(1.45+spread*.48);
          x=alongX?THREE.MathUtils.clamp(x+u*span,site.x-site.w/2,site.x+site.w/2):x+ox;
          z=alongX?z+oz:THREE.MathUtils.clamp(z+u*span,site.z-site.d/2,site.z+site.d/2);
          y+=Math.abs(u)*spread*.20;size=1.19;
        }else if(station){
          x=spread===1?f.x+u*.82:site.x+(k%2?3.7:-3.7)+u*1.2;
          z=site.z+.62-(k%3)*.46;y=1;size=1.06;
        }else{x+=u*.9;z+=Math.sin(k*3.1)*.20;size=.77;}
        const variation=.82+.18*Math.sin(k*9.8);
        sheets.add(x,y,z,size*(.46+spread*.31),size*(.54+spread*.91)*variation);
      }
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
    sheets.finish();
  }
  return {pulse,update};
}
