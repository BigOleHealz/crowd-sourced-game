import {arena} from './zombie-arena.js';
import {groundHeight} from './world.js';

// The cordon is one static batch, including the alternating hazard markings.
export function buildCordon(scene,Batch,material,box) {
  const batch = new Batch();
  const {west,east,north,south} = arena;
  function segment(x,z,alongX,post) {
    const y=groundHeight(x,z);
    if(post){
      batch.add(box,0x323a34,x,y+.51,z,.07,1.02,.07);
      batch.add(box,0xe15c30,x,y+1.04,z,.12,.10,.12);
    }
    for (let i=0;i<2;i++) {
      const offset=.25+i*.5;
      batch.add(box,i?0x332e2b:0xf0b746,x+(alongX?offset:0),y+.75,z+(alongX?0:offset),
        alongX?.5:.035,.12,alongX?.035:.5);
    }
  }
  for(const x of [west-.5,east+.5])for(let z=north-.5;z<south+.5;z++)segment(x,z,false,(z-north+.5)%3===0);
  for(const z of [north-.5,south+.5])for(let x=west-.5;x<east+.5;x++)segment(x,z,true,(x-west+.5)%3===0);
  return batch.mesh(scene,material,false);
}

export function poseInfected(avatar, state, time) {
  if(state.dead || state.fall)return;
  const sway=Math.sin(time*4+state.infected);
  avatar.upper.rotation.x=-.22;
  avatar.head.rotation.z=.11+.065*sway;
  for(const {arm, forearm, side} of avatar.limbs){
    arm.rotation.set(1.30+side*.16*sway,0,side*.14);
    forearm.rotation.x=.22+.12*side*sway;
  }
}
