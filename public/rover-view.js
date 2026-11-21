import {shapedBodywork,paintedFinish} from './rover-bodywork.js';
import {glassQuads} from './vehicle-glass-layout.js';
import {paneBatch} from './pane-damage-view.js';
import {tireContactPatch} from './tire-contact-patch.js';
import * as THREE from 'three';
import {roverPanelDamage} from './rover-panel-damage.js';
import { missileLaunchers } from './mount-view.js';
import { alpineGlass, fieldPaint } from './landscape.js';
import { CITY } from './world.js';
import { wheelStations,flatWheelDrop,isFlat } from './road-wheel-layout.js';

// The chassis, cab panels and doors share a single static mesh; each wheel
// gets one rotating mesh and each load unit gets one toggled mesh.
import {damagedFittings} from './road-fittings.js';
import {crushedScale} from './vehicle-wreck-view.js';

export function createRoverView(scene, Batch, material, shadowMap, panorama) {
  const root = new THREE.Group(), chassis = new Batch();
  const axles=new THREE.Group();
  scene.add(root,axles);
  const cube = new THREE.BoxGeometry(1,1,1);
  const sheet = new THREE.BoxGeometry(1,1,1,5,2,5);
  const disc = new THREE.CylinderGeometry(1,1,1,18);
  const seatForm = new THREE.SphereGeometry(1,10,8);
  const pickup=CITY;
  const green=pickup?0x6a8490:0x6d7355, darkGreen=pickup?0x41555d:0x505943;
  const trim=pickup?0xb2b3a6:0x747861, steel=0x626660, rubber=0x2c302e;
  const box=(t,x,y,z,w,h,l) => {
    const widePanel=y<1.1 && (w>.75 || l>.75);
    chassis.add(widePanel ? sheet : cube,t,x,y,z,w,h,l);
  };
  function panel(batch,tint,a,b,c,d) {
    const span=(from,to)=>Math.hypot(...to.map((value,i)=>value-from[i]));
    const cols=Math.max(1,Math.ceil(span(a,b)/.30)),rows=Math.max(1,Math.ceil(span(a,d)/.30));
    const vertices=[],indices=[];
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
      const u=i/cols,v=j/rows;
      for(let k=0;k<3;k++)vertices.push((a[k]*(1-u)+b[k]*u)*(1-v)+(d[k]*(1-u)+c[k]*u)*v);
      if(j<rows && i<cols){
        const n=j*(cols+1)+i;
        indices.push(n,n+1,n+cols+2,n,n+cols+2,n+cols+1);
      }
    }
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geom.setIndex(indices);
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
  shell(darkGreen,[[-1.49,.46,.55,.826],[-1.33,.52,.50,.909],[-.68,.54,.47,.935],[-.56,.54,.47,.939]],.049);
  shapedBodywork(chassis,pickup,green,darkGreen,cube);
  shell(green,[[-.60,.69,.56,1.04],[-.36,.72,.50,1.02],[.30,.71,.5,1.01],[.42,.68,.56,1.02]],.045);
  box(darkGreen,0,.49,-1.47,1.29,.106,.14);
  const trimMap=new THREE.TextureLoader().load('./vehicle-trim.webp');
  trimMap.colorSpace=THREE.SRGBColorSpace;
  const facingMaterial=new THREE.MeshPhongMaterial({map:trimMap,specular:0x555958,shininess:36,vertexColors:true});
  function trimFace(geometry,col,row){
    const uv=geometry.attributes.uv.clone();
    for(let i=0;i<uv.count;i++) uv.setXY(i,(col+.008+.984*uv.getX(i))/2,(row+.008+.984*uv.getY(i))/2);
    geometry.setAttribute('batchUv',uv);
    return geometry;
  }
  const brightwork=new Batch(true);
  const lensFace=trimFace(pickup?new THREE.PlaneGeometry():new THREE.CircleGeometry(1,24),0,1);
  const grilleFace=trimFace(new THREE.PlaneGeometry(),1,1);
  const rimFace=trimFace(new THREE.CircleGeometry(1,32),pickup?1:0,0);
  const nose=pickup?-1.67:-1.51;
  brightwork.add(grilleFace,0xc6c6bf,0,.753,nose-.021,.925,.213,1,0,Math.PI);
  if(pickup) shell(green,[[-1.655,.65,.658,.857],[-1.56,.70,.63,.881],[-1.41,.67,.608,.914]],.040);
  box(rubber,0,.753,nose,.94,.223,.04);
  if(pickup) {
    for(let row=0;row<3;row++) box(steel,0,.679+row*.071,nose-.030,.89,.012,.017);
    box(darkGreen,0,.907,nose+.015,1.18,.028,.08);
    for(const side of [-1,1]){
      chassis.beam(trim,[side*.46,.859,nose-.03],[side*.58,.877,nose-.024],.023);
      box(0xdce4e3,side*.551,.869,nose-.057,.205,.020,.022);
    }
  } else {
    for(let slot=-3;slot<=3;slot++) box(green,slot*.090,.756,nose-.023,.036,.211,.035);
    for(const side of [-1,1]) {
      chassis.beam(steel,[side*.60,.96,-1.22],[side*.60,.98,-1.04],.024);
      box(rubber,side*.69,.84,-1.05,.018,.11,.032);
    }
  }
  // The cabin has actual interior volume: glazed panels sit inside its pillars.
  const glazing=new Batch();
  const carPanes=paneBatch(glazing);
  for(const {id,corners} of glassQuads.rover)if(pickup || id==='front')
    carPanes.add(id,()=>panel(glazing,id==='front'?0x7896a0:id==='rear'?0x718e95:0x6e8790,...corners));
  box(0x41473e,0,1.075,-.51,1.20,.12,.24);
  for(const side of [-1,1]) {
    const x=v=>side*v;
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
    brightwork.add(lensFace,0xf9f9ef,x(.555),pickup?.830:.810,nose-.053,pickup?.184:.084,pickup?.104:.084,1,0,Math.PI);
    if(pickup) {
      box(rubber,x(.58),.824,nose,.276,.155,.055);
      box(0xd9dfd7,x(.555),.83,nose-.030,.186,.10,.025);
      box(0xbe793f,x(.687),.83,nose-.025,.048,.108,.022);
      for(let k=0;k<3;k++) box(trim,x(.50+.048*k),.83,nose-.044,.012,.093,.006);
      chassis.beam(trim,[x(.61),1.55,-.4],[x(.61),1.55,.41],.034);
    } else {
      for(const [color,r,depth] of [[rubber,.116,0],[steel,.099,.020],[0xd9d9bf,.081,.032]])
        chassis.add(disc,color,x(.555),.81,nose-depth,r,.032,r,Math.PI/2);
      chassis.beam(rubber,[x(.60),1.03,.39],[x(.575),1.62,.32],.071);
      chassis.beam(rubber,[x(.575),1.62,.32],[x(.565),1.07,1.04],.071);
      chassis.beam(rubber,[x(.57),1.60,.32],[x(.58),1.55,-.39],.060);
    }
    chassis.beam(rubber,[x(.055),1.064,-.622],[x(.445),1.137,-.590],.019);
    box(0x9e9c89,x(.721),.894,-.407,.020,.072,.096);
  }
  if(pickup){
    shell(green,[[-.52,.54,1.54,1.60],[-.43,.63,1.545,1.657],[.34,.65,1.535,1.643],[.46,.59,1.52,1.59]],.025);
    for(const side of [-1,1]) {
      box(green,side*.68,.98,1.53,.10,.37,.36);
      box(steel,side*.68,1.162,1.51,.108,.026,.40);
    }
    box(darkGreen,0,.705,1.52,1.38,.17,.37);
    box(green,0,.932,1.69,1.36,.42,.06);
    for(const side of [-1,1]){
      box(0x484e50,side*.633,.945,1.728,.112,.285,.025);
      box(0xb74036,side*.633,.999,1.744,.082,.143,.019);
      box(0xd9c8a7,side*.633,.891,1.744,.081,.048,.018);
    }
    box(steel,0,.586,1.695,1.48,.10,.125);
    box(rubber,0,.644,1.705,1.31,.031,.148);
  } else {
    chassis.beam(green,[-.599,1.565,-.405],[.599,1.565,-.405],.060);
    chassis.beam(rubber,[-.575,1.62,.32],[.575,1.62,.32],.071);
    for(const x of [-.337,.338]){
      chassis.add(cube,0x69705e,x,1.045,-.606,.172,.048,.096,.30);
      chassis.beam(rubber,[x,1.075,-.633],[x+.164,1.176,-.593],.013);
    }
    const spare=new THREE.TorusGeometry(.216,.070,10,22);
    chassis.add(spare,rubber,-.21,.986,1.55,1,1,1);
    chassis.add(disc,green,-.21,.986,1.60,.165,.085,.165,Math.PI/2);
    spare.dispose();
  }
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
  missileLaunchers(chassis,'rover');
  for(const side of [-1,1]){
    const hub=side*.7;
    for(const z of [-.94,.95]) {
      chassis.beam(steel,[hub*.52,.43,z],[hub,.37,z],.058);
    }
  }
  // Recovery eyes, exposed tow points and shaded bumper insets pick up light
  // separately from the painted sheet metal on the front apron.
  const eye=new THREE.TorusGeometry(.049,.012,7,14);
  for(const side of [-1,1]){
    chassis.add(eye,steel,side*.455,.50,nose-.094,1,.80,1);
    box(rubber,side*.63,.55,nose-.073,.12,.045,.023);
    chassis.beam(steel,[side*.62,.566,-.52],[side*.83,.49,-.52],.046);
  }
  eye.dispose();
  const paint=fieldPaint();
  paintedFinish(paint,panorama,pickup);
  const body=chassis.mesh(root,paint,false);
  Object.assign(body.userData,{impactSurface:'metal',vehicle:'rover',target:'rover'});
  const trimMesh=brightwork.mesh(root,facingMaterial,false);
  const glassMat=alpineGlass(panorama,{transparent:true,opacity:pickup?.39:.31,depthWrite:false,side:THREE.DoubleSide});
  const windows=glazing.mesh(root,glassMat,false);
  const updatePanes=carPanes.bind(windows);
  Object.assign(windows.userData,{impactSurface:'solid',vehicle:'rover'});
  // An original fleet wordmark is legible at the normal third-person distance.
  const tag=document.createElement('canvas');tag.width=384;tag.height=64;
  const ink=tag.getContext('2d');ink.fillStyle='#52604f';ink.fillRect(0,0,384,64);
  ink.fillStyle='#dcd4b3';ink.font='bold 36px sans-serif';ink.textBaseline='middle';
  ink.fillText(pickup?'BAY SERVICE':'FIELD UNIT',10,35);ink.textAlign='right';ink.fillText(pickup?'07':'04',373,35);
  const tagMap=new THREE.CanvasTexture(tag);tagMap.colorSpace=THREE.SRGBColorSpace;
  const tailTag=new THREE.Mesh(new THREE.PlaneGeometry(.97,.127,5,2),new THREE.MeshLambertMaterial({map:tagMap}));
  tailTag.scale.setScalar(pickup?.69:.46);tailTag.position.set(pickup?0:.32,pickup?.94:.86,pickup?1.73:1.511);root.add(tailTag);
  tailTag.updateMatrix();
  tailTag.geometry.applyMatrix4(tailTag.matrix);
  tailTag.position.set(0,0,0);tailTag.scale.setScalar(1);
  const fittings=damagedFittings([body,trimMesh],nose,pickup?1.75:1.62,.82,.72);
  const updatePanelDamage=roverPanelDamage([body,trimMesh,windows,tailTag],paint);
  const wheels=[];
  const tireSection=[[.18,-.11],[.245,-.139],[.309,-.136],[.356,-.095],[.36,.087],[.31,.136],[.246,.14],[.18,.111]]
    .map(([r,w])=>new THREE.Vector2(r,w));
  const tire = new THREE.LatheGeometry(tireSection,36);
  for(const [x,z] of wheelStations) {
    const side=Math.sign(x);
    const wheelBatch=new Batch();
    wheelBatch.add(tire,rubber,0,0,0,1,1,1,0,0,Math.PI/2);
    for(let i=0;i<30;i++){
      const a=i*Math.PI/15;
      for(const row of [-1,1]){
        const t=a+row*.043;
        wheelBatch.add(cube,0x3d403c,row*.061,.356*Math.cos(t),.356*Math.sin(t),
          .117,.012,.047,t,row*.22,0);
      }
    }
    const bead=new THREE.TorusGeometry(.203,.010,6,32);
    wheelBatch.add(bead,0x4e5350,side*.14,0,0,1,1,1,0,Math.PI/2);
    bead.dispose();
    wheelBatch.add(disc,0x48514b,side*.087,0,0,.193,.077,.193,0,0,Math.PI/2);
    wheelBatch.add(disc,0xb0ada0,side*.13,0,0,.152,.045,.152,0,0,Math.PI/2);
    wheelBatch.add(disc,steel,side*.157,0,0,.070,.037,.070,0,0,Math.PI/2);
    for(let i=0;i<5;i++){
      const a=i*Math.PI*2/5;
      wheelBatch.add(disc,0x41453f,side*.155,.112*Math.cos(a),.112*Math.sin(a),.021,.019,.021,0,0,Math.PI/2);
    }
    const wheelFinish=material.clone(),rubberState=tireContactPatch(wheelFinish,.356);
    const wheel=wheelBatch.mesh(axles,wheelFinish,false);
    wheel.userData.rubberState=rubberState;
    wheel.position.set(x,.368,z);
    const trimBatch=new Batch(true);
    trimBatch.add(rimFace,0xe7e6dc,side*.164,0,0,.181,.181,.181,0,side*Math.PI/2);
    trimBatch.mesh(wheel,facingMaterial,false);
    Object.assign(wheel.userData,{impactSurface:'solid',vehicle:'rover'});
    wheels.push(wheel);
  }
  tire.dispose(); seatForm.dispose();
  lensFace.dispose();grilleFace.dispose();rimFace.dispose();
  const cargo=[];
  for(const [cx,cy,cz] of [[-.47,.79,.58],[.47,.79,.58],[-.47,1.01,.58]]) {
    const crate=new Batch();
    crate.add(cube,0xba8b55,cx,cy+.11,cz,.30,.21,.26);
    for (const off of [-.09,.09]) crate.add(cube,0x4a6352,cx+off,cy+.112,cz,.024,.22,.27);
    cargo.push(crate.mesh(root,material,false));
  }
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.3,3.5).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({map:shadowMap,color:0x28352a,transparent:true,opacity:.36,depthWrite:false}));
  scene.add(shadow);
  sheet.dispose(); cube.dispose(); disc.dispose();
  const scorchedGlass=new THREE.MeshLambertMaterial({color:0x272e2d,vertexColors:true,side:THREE.DoubleSide});
  const crumpled={front:.92,rear:.42,left:.65,right:.26};
  let burned=false;
  return function update(r,dt) {
    root.scale.y=axles.scale.y=crushedScale(r);root.visible=axles.visible=root.scale.y>0;
    updatePanes(r.brokenGlass);
    if(burned!==r.wrecked){
      burned=r.wrecked;
      paint.color.setHex(burned ? 0x62584f : 0xffffff);
      facingMaterial.color.setHex(burned ? 0x504b46 : 0xffffff);
      windows.material=burned ? scorchedGlass : glassMat;tailTag.visible=!burned;
    }
    const rebuilt=updatePanelDamage(burned ? crumpled : r.bodyDamage);
    fittings(r,rebuilt);
    const pose=r.suspension;
    axles.position.set(r.x,r.y,r.z);
    axles.rotation.set(r.bridgeFlight ? pose?.pitch??0 : 0,-r.yaw,0,'YXZ');
    // A collapsed front corner settles onto the axles. The six-second
    // authoritative recovery clock also places late joiners in the right pose.
    const age=burned ? Math.max(0,6-r.recoverySeconds) : 0;
    const sag=1-Math.exp(-2.8*age);
    root.position.set(r.x,r.y+(pose?.heave ?? 0)-.20*sag,r.z);
    root.rotation.set((pose?.pitch ?? 0)-.13*sag,-r.yaw,(pose?.roll ?? 0)-.18*sag,'YXZ');
    shadow.visible=root.visible && !r.bridgeFlight;
    shadow.position.set(r.x,r.y+.055,r.z); shadow.rotation.copy(root.rotation);
    wheels.forEach((wheel,i)=>{
      wheel.position.y=.368+(pose?.wheels[i] ?? 0);
      wheel.rotation.x-=r.speed*dt/.36;
      wheel.userData.rubberState.value.set(isFlat(r,i)?flatWheelDrop:0,Math.cos(wheel.rotation.x),Math.sin(wheel.rotation.x));
    });
    for(let i=0;i<cargo.length;i++) cargo[i].visible=!burned && i<(r.cargo||0);
  };
}
