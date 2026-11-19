import * as THREE from 'three';
import { groundHeight, MAP } from './world.js';
import { mountPosition } from './mounts.js';

// Emit at the engine deck of the moving wreck. Puffs already emitted stay in world space.
export function aircraftWreck(scene,puff,particle,random) {
  const light=new THREE.PointLight(0xffad59,0,11,2);
  scene.add(light);
  const origin=new THREE.Vector3(),velocity=new THREE.Vector3();
  let previous,age=0,nextFlame=0,nextSmoke=0,touchedGround=false;
  function radial(speed,lift) {
    const a=random()*Math.PI*2;
    return new THREE.Vector3(Math.cos(a)*speed,lift,Math.sin(a)*speed);
  }
  function ignition(heli) {
    for(let i=0;i<12;i++){
      const v=radial(2+random()*5,1.5+random()*3);
      const at=origin.clone().addScaledVector(v,.22);
      puff(at,v,1.1,2.3+random()*1.3,.26+random()*.35,i%3?0xff8134:0xffcf7c,.95);
    }
    for(const side of [-1,1]){
      const deck=mountPosition(heli,[side*.94,1.93,.45]);
      puff(new THREE.Vector3(deck.x,deck.y,deck.z),new THREE.Vector3(0,2.3,0),
        1.65,3.55,.25,0xffeabd,1);
    }
    for(let i=0;i<15;i++){
      const v=radial(2+random()*4,1.2+random()*4);
      const size=.04+random()*.08;
      particle(origin.clone(),v,new THREE.Vector3(size*1.8,size*.48,size),i%4?0x555750:0xd99a59,.38+random()*.54);
    }
  }
  return function update(heli,dt) {
    if(!heli.wrecked) {
      previous=false;light.intensity=0;return;
    }
    const deck=mountPosition(heli,[0,1.38,.40]);
    origin.set(deck.x,deck.y,deck.z);
    if(previous!==true){
      age=previous===false ? 0 : 2;
      nextFlame=age;nextSmoke=age;
      touchedGround=previous===undefined;
      if(previous===false) ignition(heli);
    }
    previous=true;
    const ground=groundHeight(heli.x,heli.z);
    if(!touchedGround && heli.y<Math.max(ground,MAP.waterY)+.28) {
      touchedGround=true;
      if(ground>=MAP.waterY) for(let i=0;i<10;i++){
        const drift=radial(2.5+random()*2,.42+random()*.4);
        const at=new THREE.Vector3(heli.x,ground+.28,heli.z).addScaledVector(drift,.23);
        puff(at,drift,.65,2.0+random()*1.2,.70+random()*.55,0x93887a,.52);
      }
    }
    age+=dt;
    while(age<1.25 && nextFlame<=age) {
      const v=radial(.8+random()*1.35,2.3+random()*2.7);
      const at=origin.clone().addScaledVector(v,.15);
      puff(at,v,.8,2.2+random(),.34+random()*.22,nextFlame<.22?0xffb458:0xcf5927,.90);
      nextFlame+=.085;
    }
    while(nextSmoke<=age) {
      velocity.copy(radial(.5+random()*.9,3.2+random()*2.8));velocity.x+=1.15;
      const at=origin.clone().addScaledVector(velocity,.10);
      puff(at,velocity.clone(),.82,2.5+random()*1.55,1.5+random()*.68,
        random()<.5?0x474645:0x68615b,age<2?.86:.60);
      nextSmoke+=age<1.25?.085:.23;
    }
    light.position.copy(origin);
    light.intensity=age<1.1 ? (age<.18 ? 54 : 13)*(1-age/1.1) : 0;
  };
}
