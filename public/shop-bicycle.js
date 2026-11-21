import * as THREE from 'three';

export function bicycleModel(Batch,color){
  const bike=new THREE.Group(),frame=new Batch(true);
  const cube=new THREE.BoxGeometry(1,1,1),saddle=new THREE.SphereGeometry(1,10,6);
  const crank=[0,.32,.04],rear=[0,.345,.54],seat=[0,.86,.19],head=[0,.81,-.32],front=[0,.345,-.53];
  for(const [a,b] of [[rear,seat],[rear,crank],[seat,crank],[seat,head],[crank,head],[head,front]])frame.beam(color,a,b,.044);
  frame.beam(0xb3bbc0,seat,[0,.98,.22],.03);
  frame.add(saddle,0x282727,0,.98,.21,.104,.047,.157);
  frame.beam(0x49535a,head,[0,1.04,-.36],.034);
  frame.beam(0x929da2,[-.28,1.055,-.33],[.28,1.055,-.33],.028);
  for(const side of [-1,1])frame.add(cube,0x283138,side*.23,1.055,-.33,.11,.037,.047);
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.63});
  frame.mesh(bike,material,false);
  const wheelBatch=new Batch(true),rotor=new THREE.TorusGeometry(.313,.025,7,22);
  wheelBatch.add(rotor,0x272b2b,0,0,0,1,1,1,0,Math.PI/2);
  rotor.scale(.92,.92,.65);wheelBatch.add(rotor,0x98a5a5,0,0,0,1,1,1,0,Math.PI/2);
  for(let n=0;n<8;n++){
    const a=n*Math.PI/8,y=.29*Math.sin(a),z=.29*Math.cos(a);
    wheelBatch.beam(0x98a2a0,[0,-y,-z],[0,y,z],.011);
  }
  const frontWheel=wheelBatch.mesh(bike,material,false),rearWheel=frontWheel.clone();bike.add(rearWheel);
  frontWheel.position.set(...front);rearWheel.position.set(...rear);
  const pedals=new Batch(true);
  for(const side of [-1,1]){
    pedals.beam(0x8b9495,[side*.07,0,0],[side*.07,-side*.13,0],.021);
    pedals.add(cube,0x353835,side*.115,-side*.13,0,.105,.03,.07);
  }
  const crankMesh=pedals.mesh(bike,material,false);crankMesh.position.set(...crank);
  bike.userData.animate=(ride,dt)=>{
    if(!ride)return;
    rearWheel.rotation.x-=ride.speed*dt/.33;
    frontWheel.rotation.set(rearWheel.rotation.x,-ride.steer*.33,0,'YXZ');
    if(ride.pushing)crankMesh.rotation.x-=Math.min(10,ride.speed*1.8)*dt;
  };
  cube.dispose();saddle.dispose();rotor.dispose();return bike;
}

export function cyclistPose(a,state){
  const r=state.ride,phase=r.phase || 0;
  a.root.position.set(state.x,state.y+.19,state.z);a.root.rotation.set(0,-r.yaw,-r.steer*Math.min(.16,r.speed*.02),'YXZ');
  a.body.position.set(0,-.15,.08);a.spine.rotation.set(-.29,0,0);
  a.head.rotation.set(.16,0,0);
  for(const l of a.limbs){
    const swing=Math.sin(phase+(l.side>0?0:Math.PI));
    l.leg.rotation.set(.75+swing*.38,0,l.side*.095);l.knee.rotation.set(-1.20-swing*.52,0,0);
    l.ankle.rotation.set(.47+swing*.17,0,0);l.arm.rotation.set(.72,0,l.side*.16);l.forearm.rotation.set(.38,0,0);
  }
  for(const tool of a.tools)tool.visible=false;
}
