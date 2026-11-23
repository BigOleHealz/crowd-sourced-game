import * as THREE from 'three';
import {strikeWaterFilm} from './shark-strike-water.js';

export function roadSplashView(scene,puff,particle,random){
  const rings=[],capacity=12;
  let film;
  function enter({to,power,id}){
    const size=.85+1.35*power;
    if(!film)film=strikeWaterFilm(scene,0,capacity,true,'Road vehicle splash foam');
    if(rings.length===capacity)rings.shift();
    rings.push({point:to,size,phase:id*2.4,age:0});

    // A low collar of displaced water breaks into separate airborne drops.
    for(let i=0;i<16;i++){
      const angle=(i+random()*.6)*Math.PI/8;
      const x=Math.cos(angle),z=Math.sin(angle),radius=(.78+random()*.25)*size;
      const at=new THREE.Vector3(to.x+x*radius,to.y+.06,to.z+z*radius);
      const velocity=new THREE.Vector3(x*1.8,2+random()*1.55,z*1.8).multiplyScalar(size);
      const width=(.047+.033*random())*size;
      particle(at,velocity,new THREE.Vector3(width,width*2.2,width),i%2?0xd5f2ed:0xabcfcf,.40+.40*random());
      if(i%2===0){
        const wash=new THREE.Vector3(x*2.1,1.2+random(),z*2.1).multiplyScalar(size);
        puff(at,wash,.45*size,1.12*size,.35+.24*random(),0xd4ede9,.71);
      }
    }
  }
  function update(dt){
    if(!film)return;
    let count=0;
    for(const ring of rings){
      ring.age+=dt;
      if(ring.age>=1)continue;
      const {point,age,size,phase}=ring;
      film.mark(count,point.x,point.z,phase,age+.07,1-age,3.1*size,phase,point.y);
      rings[count++]=ring;
    }
    rings.length=count;film.finish(count);
  }
  return {enter,update};
}
