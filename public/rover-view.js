import * as THREE from 'three';
import { alpineGlass } from './landscape.js';
import { groundHeight } from './world.js';

// The chassis, cab panels and doors share a single static mesh; each wheel
// gets one rotating mesh and each load unit gets one toggled mesh.
export function createRoverView(scene, Batch, material, shadowMap, panorama) {
  const root = new THREE.Group(), chassis = new Batch();
  scene.add(root);
  const cube = new THREE.BoxGeometry(1,1,1);
  const disc = new THREE.CylinderGeometry(1,1,1,18);
  const seatForm = new THREE.SphereGeometry(1,10,8);
  const green=0x667662, darkGreen=0x485a4b, trim=0xc4bc9e, steel=0x626660, rubber=0x303332;
  const box=(t,x,y,z,w,h,l) => chassis.add(cube,t,x,y,z,w,h,l);
  function panel(batch,tint,a,b,c,d) {
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));
    geom.computeVertexNormals(); batch.add(geom,tint,0,0,0); geom.dispose();
  }
  // Narrow the end sections and bevel the shoulders, keeping bumpers and wheel wells clear.
  function shell(tint,sections,bevel) {
    const rings=sections.map(([z,half,base,top])=>[
      [-half+bevel,top,z],[half-bevel,top,z],[half,top-bevel,z],[half,base+bevel,z],
      [half-bevel,base,z],[-half+bevel,base,z],[-half,base+bevel,z],[-half,top-bevel,z]
    ]);
    for(let k=0;k<rings.length-1;k++) for(let j=0;j<8;j++) {
      const next=(j+1)%8;
      panel(chassis,tint,rings[k][j],rings[k+1][j],rings[k+1][next],rings[k][next]);
    }
    for (const [end,back] of [[rings[0],false],[rings.at(-1),true]]) {
      const mid=[0,(end[0][1]+end[4][1])/2,end[0][2]];
      for(let i=0;i<8;i++){
        const v=end[i],w=end[(i+1)%8];
        panel(chassis,tint,mid,back?w:v,back?v:w,mid);
      }
    }
  }
  shell(rubber,[[-1.45,.48,.40,.63],[-1.25,.61,.34,.65],[1.28,.61,.34,.65],[1.48,.49,.40,.63]],.075);
  shell(green,[[-1.48,.62,.62,.88],[-1.34,.70,.61,.96],[-.67,.72,.57,1.02],[-.55,.70,.57,1.02]],.055);
  shell(green,[[-.60,.69,.56,1.04],[-.36,.72,.50,1.02],[.30,.71,.5,1.01],[.42,.68,.56,1.02]],.045);
  box(steel,0,.48,-1.49,1.54,.125,.14);
  box(darkGreen,0,.735,-1.479,.79,.155,.027);
  for(let n=0;n<3;n++) box(steel,0,.686+n*.043,-1.499,.74,.014,.025);
  // The cabin has actual interior volume: glazed panels sit inside its pillars.
  const glazing=new Batch();
  panel(glazing,0x7896a0,[-.611,1.02,-.633],[.611,1.02,-.633],[.553,1.55,-.40],[-.553,1.55,-.40]);
  panel(glazing,0x718e95,[-.635,1.015,.37],[-.573,1.53,.298],[.573,1.53,.298],[.635,1.015,.37]);
  box(0x41473e,0,1.075,-.51,1.20,.12,.24);
  for(const side of [-1,1]) {
    const x=v=>side*v;
    panel(glazing,0x6e8790,[x(.667),1.023,-.58],[x(.597),1.54,-.397],
      [x(.599),1.53,.299],[x(.665),1.02,.356]);
    chassis.beam(green,[x(.668),1.025,-.613],[x(.59),1.55,-.4],.065);
    chassis.beam(green,[x(.665),1.02,.37],[x(.585),1.55,.302],.079);
    chassis.beam(darkGreen,[x(.67),1.023,-.60],[x(.668),1.023,.36],.043);
    chassis.beam(steel,[x(.70),1.21,-.49],[x(.816),1.24,-.52],.033);
    box(rubber,x(.838),1.265,-.517,.092,.116,.142);
    box(0x999e92,x(.838),1.268,-.442,.084,.095,.015);
    chassis.beam(darkGreen,[x(.711),.96,.265],[x(.711),.616,.235],.015);
    chassis.beam(darkGreen,[x(.711),.616,.235],[x(.716),.597,-.35],.015);
    box(rubber,x(.719),.953,.20,.018,.046,.152);
    box(steel,x(.738),.964,.204,.032,.024,.116);
    box(rubber,x(.733),.47,-.1,.16,.073,.77);
    chassis.add(seatForm,0x615d4d,x(.323),.991,-.034,.257,.115,.229);
    chassis.add(seatForm,0x605c4f,x(.322),1.127,.091,.247,.256,.104,-.10);
    chassis.add(seatForm,0x555347,x(.322),1.365,.117,.129,.10,.064);
    // Curved fender lips cover the tire shoulders rather than a squared-off cap.
    for(const z of [-.94,.95]){
      for(let i=0;i<12;i++){
        const arc=(angle,radius,width)=>[x(width),.369+radius*Math.sin(angle),z+radius*Math.cos(angle)];
        const a=(i/12)*Math.PI, b=((i+1)/12)*Math.PI;
        const inner=arc(a,.409,.747), outer=arc(a,.468,.811);
        const inner2=arc(b,.409,.747), outer2=arc(b,.468,.811);
        const top=arc(a,.477,.677), top2=arc(b,.477,.677);
        // Both sides share paint and each arch carries twelve small facets.
        if(side>0){
          panel(chassis,darkGreen,inner,inner2,outer2,outer);
          panel(chassis,green,outer,outer2,top2,top);
        }else{
          panel(chassis,darkGreen,outer,outer2,inner2,inner);
          panel(chassis,green,top,top2,outer2,outer);
        }
      }
    }
    box(0xffe3a5,x(.548),.787,-1.475,.19,.127,.058);
    box(0xc28440,x(.677),.79,-1.405,.038,.076,.083);
  }
  shell(trim,[[-.52,.54,1.52,1.58],[-.43,.63,1.525,1.618],[.27,.65,1.515,1.603],[.397,.59,1.50,1.56]],.025);
  chassis.beam(steel,[-.36,1.12,-.45],[-.36,1.17,-.3],.035);
  const steeringWheel=new THREE.TorusGeometry(.117,.015,6,14);
  chassis.add(steeringWheel,rubber,-.36,1.195,-.29,1,1,1,-.50);
  steeringWheel.dispose();
  // Shallow ribbed load bed with rolled upper edges, latches and a drop step.
  box(darkGreen,0,.693,.921,1.38,.17,1.16);
  for(let i=-5;i<=5;i++) box(0x76806d,i*.109,.783,.916,.084,.021,1.01);
  for(const side of [-1,1]) {
    const x=side*.704;
    box(green,x,.854,.929,.093,.31,1.15);
    box(trim,x,.998,.928,.104,.031,1.18);
    box(0xa8a486,side*.753,.918,.99,.007,.019,.87);
    box(0x51554c,side*.645,.842,1.453,.122,.254,.064);
    box(0xb9644e,side*.645,.884,1.495,.097,.102,.022);
    box(0xd89450,side*.645,.797,1.495,.097,.046,.022);
    box(steel,side*.43,.649,1.49,.132,.046,.069);
    box(rubber,side*.68,.302,1.315,.22,.247,.043);
  }
  box(green,0,.827,1.453,1.16,.294,.074);
  box(darkGreen,0,.87,1.496,1.048,.124,.027);
  box(steel,0,.51,1.49,1.53,.122,.123);
  box(rubber,0,.558,1.532,.94,.052,.115);
  chassis.mesh(root,material,false);
  const glassMat=alpineGlass(panorama,{transparent:true,opacity:.50,depthWrite:false,side:THREE.DoubleSide});
  glazing.mesh(root,glassMat,false);
  // An original fleet wordmark is legible at the normal third-person distance.
  const tag=document.createElement('canvas');tag.width=384;tag.height=64;
  const ink=tag.getContext('2d');ink.fillStyle='#52604f';ink.fillRect(0,0,384,64);
  ink.fillStyle='#dcd4b3';ink.font='bold 36px sans-serif';ink.textBaseline='middle';
  ink.fillText('PINEWATCH',10,35);ink.textAlign='right';ink.fillText('04',373,35);
  const tagMap=new THREE.CanvasTexture(tag);tagMap.colorSpace=THREE.SRGBColorSpace;
  const tailTag=new THREE.Mesh(new THREE.PlaneGeometry(.97,.127),new THREE.MeshLambertMaterial({map:tagMap}));
  tailTag.position.set(0,.87,1.511);root.add(tailTag);
  const wheels=[];
  const tireSection=[[.18,-.11],[.245,-.139],[.309,-.136],[.356,-.095],[.36,.087],[.31,.136],[.246,.14],[.18,.111]]
    .map(([r,w])=>new THREE.Vector2(r,w));
  const tire = new THREE.LatheGeometry(tireSection,20);
  for(const side of [-1,1]) for(const z of [-.94,.95]) {
    const wheelBatch=new Batch();
    wheelBatch.add(tire,rubber,0,0,0,1,1,1,0,0,Math.PI/2);
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8;
      for(const row of [-1,1]){
        const t=a+row*.043;
        wheelBatch.add(cube,0x3d403c,row*.061,.356*Math.cos(t),.356*Math.sin(t),
          .126,.023,.064,t,row*.18,0);
      }
    }
    wheelBatch.add(disc,0x48514b,side*.087,0,0,.193,.077,.193,0,0,Math.PI/2);
    wheelBatch.add(disc,0xb0ada0,side*.13,0,0,.152,.045,.152,0,0,Math.PI/2);
    wheelBatch.add(disc,steel,side*.157,0,0,.070,.037,.070,0,0,Math.PI/2);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      wheelBatch.add(disc,0x41453f,side*.155,.112*Math.cos(a),.112*Math.sin(a),.021,.019,.021,0,0,Math.PI/2);
    }
    const wheel=wheelBatch.mesh(root,material,false);
    wheel.position.set(side*.70,.368,z);
    wheels.push(wheel);
  }
  tire.dispose(); seatForm.dispose();
  const cargo=[];
  for(const [cx,cy,cz] of [[-.32,.80,.75],[.32,.80,.79],[0,1.13,.77]]) {
    const crate=new Batch();
    crate.add(cube,0xba8b55,cx,cy+.16,cz,.54,.31,.52);
    for (const off of [-.16,.16]) crate.add(cube,0x4a6352,cx+off,cy+.164,cz,.043,.337,.535);
    cargo.push(crate.mesh(root,material,false));
  }
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.3,3.5).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({map:shadowMap,color:0x28352a,transparent:true,opacity:.36,depthWrite:false}));
  scene.add(shadow);
  cube.dispose(); disc.dispose();
  return function update(r,dt) {
    const sn=Math.sin(r.yaw), cs=Math.cos(r.yaw);
    const front=groundHeight(r.x+sn*.84,r.z-cs*.84), back=groundHeight(r.x-sn*.84,r.z+cs*.84);
    const right=groundHeight(r.x+cs*.68,r.z+sn*.68), left=groundHeight(r.x-cs*.68,r.z-sn*.68);
    root.position.set(r.x,r.y,r.z);
    root.rotation.set(Math.atan2(front-back,1.68),-r.yaw,Math.atan2(right-left,1.36),'YXZ');
    shadow.position.set(r.x,r.y+.055,r.z); shadow.rotation.copy(root.rotation);
    for(const wheel of wheels) wheel.rotation.x-=r.speed*dt/.36;
    for(let i=0;i<cargo.length;i++) cargo[i].visible=i<(r.cargo||0);
  };
}
