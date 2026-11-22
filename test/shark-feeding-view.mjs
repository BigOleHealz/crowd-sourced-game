import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sharkSizes} from '../public/shark-swim.js';
import {sharkView} from '../public/shark-view.js';

const water=-.14,dt=1/30,local={x:100,y:1,z:-220};
const states=sharkSizes.map((size,i)=>({x:local.x+4*i,y:water-.35,z:local.z,yaw:0,stroke:0,
  size,hp:100,phase:'scavenging',scavenge:{biteTick:0}}));
const scene=new THREE.Scene(),update=sharkView(scene,water);
update(states,local,0,dt);
const foam=scene.getObjectByName('Feeding shark foam'),spray=scene.getObjectByName('Feeding shark spray');
assert.equal(foam.count,states.length,'A first bite makes foam at each shark simultaneously');
update(states,local,6,dt);
assert(spray.count>=6*states.length,'Every nearby bite puts visible droplets above the water');

const mark=new THREE.Matrix4(),position=new THREE.Vector3();
for(let i=0;i<states.length;i++){
  foam.getMatrixAt(i,mark);
  position.setFromMatrixPosition(mark);
  assert(Math.abs(position.x-states[i].x)<.18);
  assert(Math.abs(position.z-(states[i].z-1.54*states[i].size))<.18);
}
let peak=0;
for(let tick=7;tick<=44;tick++){
  update(states,local,tick,dt);
  peak=Math.max(peak,foam.count);
  assert(foam.count<=foam.instanceMatrix.count && spray.count<=spray.instanceMatrix.count);
}
assert(peak>states.length,'Tail strikes add their own simultaneous foam');

states.forEach(s=>{s.phase='patrol';});
update(states,local,68,dt);
assert(!foam.visible && !spray.visible,'The last strike fades when sharks disperse');

const arrivals=[{sharkIndex:1,tick:74},{sharkIndex:2,tick:77}];
const defeat={sharkIndex:0,tick:71,arrivals};
states.slice(0,3).forEach(s=>{s.phase='feeding';});
for(let tick=71;tick<=81;tick++){
  update(states,local,tick,dt,[defeat]);
  if(tick===71 || tick===74 || tick===77){
    assert.equal(foam.count,1+(tick-71)/3,'Each late joiner gets foam at its own contact');
  }
}
assert(spray.count>0);

const deepScene=new THREE.Scene(),updateDeep=sharkView(deepScene,water);
for(const s of states)s.y=water-3;
for(let tick=71;tick<=105;tick++)updateDeep(states,local,tick,dt,[defeat]);
assert(!deepScene.getObjectByName('Feeding shark spray'),'Fully submerged sharks create no surface spray');
