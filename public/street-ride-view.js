import {trickTime} from './skate-jam.js';
import {bicycleModel,cyclistPose} from './shop-bicycle.js';
import * as THREE from 'three';

function skateboard(){
  const group=new THREE.Group();
  const mesh=(geo,color)=>{const part=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color}));group.add(part);return part;};
  const outline=new THREE.Shape();
  outline.moveTo(-.109,-.31);outline.quadraticCurveTo(-.109,-.438,0,-.438);
  outline.quadraticCurveTo(.109,-.438,.109,-.31);outline.lineTo(.109,.31);
  outline.quadraticCurveTo(.109,.438,0,.438);outline.quadraticCurveTo(-.109,.438,-.109,.31);outline.closePath();
  const deck=new THREE.ExtrudeGeometry(outline,{depth:.019,bevelEnabled:false,curveSegments:6});
  deck.rotateX(-Math.PI/2);
  const p=deck.getAttribute('position');
  for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)+Math.max(0,Math.abs(p.getZ(i))-.27)*.36);
  deck.computeVertexNormals();mesh(deck,0xbd763e).position.y=.087;
  const grip=mesh(deck,0x273034);grip.scale.set(.95,.85,.97);grip.position.y=.094;
  for(const z of [-.25,.25]){
    const axle=mesh(new THREE.CylinderGeometry(.016,.016,.19,8),0x969da0);
    axle.rotation.z=Math.PI/2;axle.position.set(0,.048,z);
    for(const x of [-.092,.092]){
      const wheel=mesh(new THREE.CylinderGeometry(.038,.038,.042,12),0xedbf66);
      wheel.rotation.z=Math.PI/2;wheel.position.set(x,.038,z);
    }
  }
  return group;
}

export function streetRideView(scene,Batch){
  const models=new Map();
  return (rides,local,remotes,dt)=>{
    for(const item of rides || []){
      let model=models.get(item.id);
      if(!model){model=item.kind==='bike'?bicycleModel(Batch,item.color):skateboard();scene.add(model);models.set(item.id,model);}
      const actor=item.rider===local.id?local:remotes.find(p=>p.id===item.rider);
      const at=actor?.ride?.id===item.id?actor:item;
      model.userData.animate?.(at.ride,dt);
      model.position.set(at.x,at.y+.007,at.z);
      const trick=at.ride?.trick,turn=trick?Math.min(1,trick.age/trickTime(trick.kind))*2*Math.PI:0;
      model.rotation.set(at.ride && !at.grounded?-.10*Math.tanh(at.vy):0,-(at.ride?.yaw??item.yaw)+(trick?.kind==='shove'?turn:0),trick?.kind==='kickflip'?turn:0,'YXZ');
    }
  };
}

export function riderPose(a,state){
  const r=state.ride;
  if(!r)return;
  if(r.kind==='bike'){cyclistPose(a,state);return;}
  a.root.position.set(state.x,state.y+.117,state.z);a.root.rotation.set(0,-r.yaw+1.30,0);
  a.body.position.set(0,-.085,0);a.spine.rotation.set(-.07,-.24,r.steer*.10);
  a.head.rotation.y=-.68;
  for(const l of a.limbs){
    l.leg.rotation.set(.33,0,l.side*.22);l.knee.rotation.set(-.60,0,0);
    l.ankle.rotation.set(.27,0,-l.side*.22);l.arm.rotation.set(.03,0,l.side*(.44+Math.abs(r.steer)*.21));l.forearm.rotation.set(.21,0,0);
  }
  if(r.pushing){
    const back=a.limbs[1],stroke=Math.max(0,Math.sin(a.cycle*4.2));
    back.leg.rotation.z+=stroke*.50;back.knee.rotation.x-=stroke*.30;
    back.ankle.rotation.z-=stroke*.40;
  }
  for(const tool of a.tools)tool.visible=false;
}
