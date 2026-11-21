import * as THREE from 'three';
import {mountPosition} from './mounts.js';

// Bodywork dimensions in the same street coordinates as the animated driver rigs.
const fleet={
  sedan:{paint:0x758d9b,w:.86,nose:-2.08,tail:2.12,roof:1.56,roofEnd:.70,cabinEnd:1.20,axles:[-1.34,1.30]},
  hatchback:{paint:0x309a8a,w:.82,nose:-1.82,tail:1.71,roof:1.61,roofEnd:1.01,cabinEnd:1.42,axles:[-1.14,1.13]},
  van:{paint:0xe5e0cf,w:.95,nose:-2.04,tail:2.27,roof:2.12,roofEnd:2.00,cabinEnd:2.13,axles:[-1.28,1.49]},
};
const cube=new THREE.BoxGeometry(), roller=new THREE.CylinderGeometry(1,1,1,22);
const ring=new THREE.TorusGeometry(.145,.016,6,18);
const cabinTrim=0x30383c,chrome=0x9da9a9,seatCloth=0x54595a;
const smooth=THREE.MathUtils.smoothstep, mix=THREE.MathUtils.lerp;

// Give the hood, rocker and cargo box pressed shoulders and tapered ends.
function shell(batch,paint,sections){
  const positions=[],indices=[];
  for(const [z,w,base,top] of sections){
    const bevel=Math.min(.09,(top-base)*.36);
    for(const [x,y] of [[-w+.07,base],[-w,base+bevel],[-w,top-bevel],[-w+.07,top],
      [w-.07,top],[w,top-bevel],[w,base+bevel],[w-.07,base]])positions.push(x,y,z);
  }
  for(let row=1;row<sections.length;row++)for(let col=0;col<8;col++){
    const a=(row-1)*8+col,b=(row-1)*8+(col+1)%8;
    indices.push(a,a+8,b,b,a+8,b+8);
  }
  const end=(sections.length-1)*8;
  for(let j=1;j<7;j++)indices.push(0,j,j+1,end,end+j+1,end+j);
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  batch.add(g,paint,0,0,0);g.dispose();
}

function addPane(batch,a,b,c,d){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...d],3));
  g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();batch.add(g,0x99b1b7,0,0,0);g.dispose();
}

function model(Batch,type,materials){
  const {paint,w,nose,tail,roof,roofEnd,cabinEnd,axles}=fleet[type],van=type==='van';
  const root=new THREE.Group(), chassis=new THREE.Group(), door=new THREE.Group();
  door.name='Driver door';root.add(chassis);chassis.add(door);
  const body=new Batch(), leaf=new Batch(), glazing=new Batch(), lamps=new Batch();
  const box=(b,c,x,y,z,sx,sy,sz)=>b.add(cube,c,x,y,z,sx,sy,sz);
  const sill=.91,front=-.98,post=.17,hinge=-w+.025;
  const topW=w-(van?.07:.15),topFront=van?-.65:-.45;
  shell(body,paint,[[nose,w-.15,.39,.70],[nose+.17,w-.035,.35,.83],[front,w,.36,sill]]);
  shell(body,paint,[[front,w,.35,.51],[post,w,.32,.49],[tail-.12,w,.36,.53],[tail,w-.1,.42,.55]]);
  shell(body,paint,[[post,w,.40,sill],[cabinEnd,w,.39,sill],[tail-.14,w-.02,.38,sill-.04],[tail,w-.10,.42,sill-.09]]);
  shell(body,paint,[[topFront-.045,topW-.06,roof-.10,roof-.04],[topFront+.07,topW,roof-.07,roof],
    [roofEnd-.12,topW,roof-.067,roof],[roofEnd+.03,topW-.045,roof-.09,roof-.04]]);
  const fascia=0x393e40;
  box(body,fascia,0,.57,nose-.008,w*1.19,.16,.045);
  for(const y of [.525,.57,.615])box(body,chrome,0,y,nose-.035,w*1.12,.012,.018);
  box(body,0xeadfc2,0,.46,nose-.03,.31,.075,.026);
  box(body,0xeee4d4,0,.58,tail+.006,.32,.087,.027);
  for(const side of [-1,1]){
    const x=v=>side*v;
    body.beam(paint,[x(w-.045),sill,front],[x(topW),roof-.07,topFront],van?.079:.058);
    body.beam(cabinTrim,[x(w-.04),sill,post],[x(topW),roof-.07,post],.077);
    body.beam(paint,[x(w-.045),sill,cabinEnd],[x(topW),roof-.07,roofEnd],van?.11:.085);
    box(body,cabinTrim,x(w-.026),.396,(front+cabinEnd)*.5,.056,.073,cabinEnd-front);
    box(body,0xe8e9cd,x(w-.28),.736,nose-.009,van?.30:.34,.087,.039);
    box(body,0xd68d49,x(w-.15),.733,nose-.012,.067,.088,.043);
    box(body,0x793a39,x(w-.19),.74,tail,.23,.15,.039);
    box(lamps,0xfa493a,x(w-.19),.74,tail+.022,.20,.071,.024);
    box(body,chrome,x(w+.004),.849,.39,.023,.027,.142);
    if(!van)addPane(glazing,[x(w-.045),sill+.016,post+.05],[x(topW),roof-.092,post+.05],
      [x(topW),roof-.092,roofEnd-.037],[x(w-.05),sill+.016,cabinEnd-.04]);
    // The front side windows are rolled down so drivers remain visible from the sidewalk.
    const moving=side===-1, b=moving?leaf:body;
    const xx=moving?0:x(w-.025),zz=moving?-front:0;
    box(b,paint,xx,.705,(front+post)*.5+zz,.07,.408,post-front-.027);
    box(b,cabinTrim,xx,.916,(front+post)*.5+zz,.081,.04,post-front-.022);
    box(b,chrome,xx+x(.046),.858,post-.15+zz,.031,.027,.147);
    box(b,paint,xx+x(.127),.982,front+.17+zz,.175,.095,.126);
    box(b,chrome,xx+x(.128),.98,front+.236+zz,.128,.057,.01);
    for(const z of [-.28,.60]){
      box(body,seatCloth,x(.42),.611,z,.46,.115,.40);
      body.add(cube,seatCloth,x(.42),.821,z+.19,.44,.451,.10,.095);
      box(body,0x44494c,x(.42),1.085,z+.21,.24,.148,.090);
    }
  }
  door.position.set(hinge,0,front);
  addPane(glazing,[-w+.065,sill,front],[w-.065,sill,front],[topW-.04,roof-.073,topFront],[-topW+.04,roof-.073,topFront]);
  if(van){
    shell(body,paint,[[.24,w-.033,.88,roof-.086],[roofEnd,w-.027,.88,roof-.080],[cabinEnd,w-.061,.88,roof-.12]]);
    for(const side of [-1,1]){
      const x=side*(w-.019);
      box(body,0x238e87,x,1.38,1.14,.038,.125,1.58);
      box(body,0xce9b55,x,1.27,1.14,.037,.043,1.58);
      box(body,0x596164,side*.30,1.34,cabinEnd+.006,.56,.53,.022);
      box(body,chrome,side*.052,.99,cabinEnd+.018,.045,.108,.026);
    }
    box(body,cabinTrim,0,1.48,cabinEnd+.013,.022,1.00,.018);
  }else{
    addPane(glazing,[-topW+.039,roof-.073,roofEnd],[topW-.039,roof-.073,roofEnd],[w-.064,sill+.025,cabinEnd],[-w+.064,sill+.025,cabinEnd]);
    if(type==='hatchback'){
      box(body,cabinTrim,0,roof-.055,roofEnd+.079,topW*1.92,.051,.175);
      box(body,0xbd3d32,0,roof-.069,roofEnd+.17,.39,.023,.018);
    }
  }
  box(body,cabinTrim,0,.934,front+.09,1.39,.13,.27);
  body.add(ring,cabinTrim,-.43,1.035,-.65,1,1,1,-.40);
  body.mesh(chassis,materials.paint,false);leaf.mesh(door,materials.paint,false);
  glazing.mesh(chassis,materials.glass,false);
  const brake=lamps.mesh(chassis,materials.lights,false);
  const wheelBatch=new Batch();
  wheelBatch.add(roller,0x242729,0,0,0,.295,.166,.295,0,0,Math.PI/2);
  for(const s of [-1,1]){
    wheelBatch.add(roller,0x676e70,s*.088,0,0,.195,.015,.195,0,0,Math.PI/2);
    wheelBatch.add(roller,0x303739,s*.098,0,0,.155,.014,.155,0,0,Math.PI/2);
    for(let n=0;n<5;n++){
      const a=n*2*Math.PI/5;
      wheelBatch.add(cube,0xbcc2c0,s*.11,.096*Math.cos(a),.096*Math.sin(a),.023,.163,.037,a);
    }
  }
  const wheelGeometry=wheelBatch.geometry(), wheels=[];
  for(const z of axles)for(const sign of [-1,1]){
    const wheel=new THREE.Mesh(wheelGeometry,materials.paint);
    wheel.position.set(sign*(w-.038),.29,z);root.add(wheel);wheels.push(wheel);
  }
  const shadow=new THREE.Mesh(materials.shadowGeometry,materials.shadow);
  shadow.scale.set(w*1.32,(tail-nose)*.59,1);shadow.rotation.x=-Math.PI/2;shadow.position.y=.028;root.add(shadow);
  return {root,chassis,door,brake,wheels};
}

export function cityTrafficView(scene,Batch,shadowMap){
  const materials={
    paint:new THREE.MeshPhongMaterial({vertexColors:true,shininess:52,specular:0x787d80,side:THREE.DoubleSide}),
    glass:new THREE.MeshPhongMaterial({vertexColors:true,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide,shininess:92}),
    lights:new THREE.MeshBasicMaterial({vertexColors:true}),
    shadowGeometry:new THREE.PlaneGeometry(2,2),
    shadow:new THREE.MeshBasicMaterial({map:shadowMap,color:0x1c2d31,opacity:.49,transparent:true,depthWrite:false}),
  };
  const views=new Map();
  return (cars,dt)=>{
    for(const car of cars){
      let view=views.get(car.id);
      if(!view){
        view=model(Batch,car.model,materials);views.set(car.id,view);
        view.root.name='Traffic '+car.id;scene.add(view.root);
      }
      const {root,chassis,wheels,door,brake}=view;
      root.position.set(car.x,car.y,car.z);root.rotation.y=-car.yaw;
      chassis.rotation.set(car.suspension?.pitch??0,0,car.suspension?.roll??0);
      chassis.position.y=car.suspension?.heave??0;
      for(const wheel of wheels)wheel.rotation.x-=car.speed*dt/.295;
      const t=car.takeover?.progress??0;
      door.rotation.y=-1.05*smooth(t,0,.24)*(1-smooth(t,.75,1));
      brake.visible=!!car.takeover || (car.npcDriver!=null && Math.abs(car.speed)<1);
    }
  };
}

// The server owns both participants and the progress. A late observer sees
// the corresponding instant of the same door, reach, extraction and entry.
export function poseTakeover(avatar,car,id){
  const action=car.takeover,t=action.progress;
  const seat=mountPosition(car,[-.43,car.model==='van'?-.12:-.22,-.28]);
  const npc=id===action.npcId;
  const exit=smooth(t,.18,.76),enter=smooth(t,.65,.98);
  const stumble=Math.sin(Math.PI*exit),reach=Math.sin(Math.PI*smooth(t,.07,.67));
  const door=mountPosition(car,[-1.16,0,-.26]);
  const {root,body,spine,limbs}=avatar;
  const inSeat=npc ? 1-exit : enter;
  avatar.gait=null;
  root.scale.setScalar(mix(1,.91,inSeat));
  if(avatar.civilian){root.scale.x*=avatar.civilian.width;root.scale.y*=avatar.civilian.height;}
  if(npc){
    root.position.set(mix(seat.x,action.endX,exit),mix(seat.y,car.y,exit)+.20*stumble,mix(seat.z,action.endZ,exit));
    root.rotation.set(.12*stumble,-car.yaw-.96*exit,.69*stumble,'YXZ');
    body.position.set(0,-.18*stumble,0);spine.rotation.set(-.21*stumble,.20*stumble,0);
  }else{
    const approach=smooth(t,0,.21);
    root.position.set(mix(mix(action.startX,door.x,approach),seat.x,enter),
      mix(mix(action.startY,car.y,approach),seat.y,enter),
      mix(mix(action.startZ,door.z,approach),seat.z,enter));
    root.rotation.set(0,-car.yaw-1.52*(1-enter),0,'YXZ');
    spine.rotation.set(-.27*reach,0,0);
    body.position.set(0,-.13*reach,0);
  }
  for(const {arm,forearm,knee,leg,ankle,side} of limbs){
    arm.rotation.set(npc?.96*inSeat+.67*stumble:1.0*inSeat+1.22*reach,0,side*(npc?.42*stumble:.14));
    forearm.rotation.set(.22+.28*inSeat+.36*reach,0,0);
    leg.rotation.set(1.36*inSeat+(npc?.35*side*stumble:.20*reach),0,side*.10*stumble);
    knee.rotation.set(-1.30*inSeat-.34*stumble,0,0);
    ankle.rotation.set(0,0,0);
  }
  for(const tool of avatar.tools)tool.visible=false;
}
