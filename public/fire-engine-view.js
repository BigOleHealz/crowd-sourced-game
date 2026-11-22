import * as THREE from 'three';
import {nozzleSpray} from './monitor-spray-view.js';
import {monitorHeight} from './water-monitor.js';

const silver=0xb2b7b6, dark=0x2b353b, red=0xaf2928, cream=0xece7d8;
const cylinder=new THREE.CylinderGeometry(1,1,1,12);
const cushion=new THREE.SphereGeometry(1,12,8);
const hingeX=-1.005,hingeZ=-1.07;

// A cab-over pumper has a full-height windshield above its grille, a midship
// pump panel, and a low open hosebed behind the crew compartment.
export function buildPumper(Batch,materials,{skin,pane,run,box}){
  const root=new THREE.Group(),chassis=new THREE.Group(),door=new THREE.Group();
  root.add(chassis);chassis.add(door);door.name='Driver door';door.position.set(hingeX,0,hingeZ);
  const body=new Batch(),leaf=new Batch(),glass=new Batch(),lamps=new Batch();
  const cab=[[-2.30,.96],[-2.19,1],[-1.07,1.015],[-.88,1.015],[.23,1.015],[.36,.98]];

  // The fenders are cut into the skin. The rims are shaped to the front axle.
  for(const side of [-1,1]){
    const arch=[];
    for(let i=0;i<=20;i++){
      const a=Math.PI*i/20,z=-1.73-.476*Math.cos(a),y=.408+.476*Math.sin(a);
      arch.push([z,y]);
    }
    const stations=[[-2.42,.47],[-2.31,.43],[-2.205,.414],...arch.slice(1,-1),[-1.254,.415],[-1.07,.43],[.23,.43],[.36,.47]];
    const span=z=>z< -2.31?.80+(.13*(z+2.42)/.11):z< -2.19?.93+(.075*(z+2.31)/.12):1.005;
    const surface=(z,y)=>[[side*(span(z)-.047),y,z],[side*span(z),y+.035,z],
      [side*(span(z)+.003),1.03,z],[side*(span(z)-.005),1.22,z]];
    for(const [a,b] of [[-2.42,hingeZ],[hingeZ,.23],[.23,.36]]){
      const movable=a===hingeZ && side<0,batch=movable?leaf:body;
      const row=stations.filter(([z])=>z>=a&&z<=b).map(([z,y])=>surface(z,y).map(([x,h,z])=>[x-(movable?hingeX:0),h,z-(movable?hingeZ:0)]));
      skin(batch,red,row);
      run(batch,cream,row.map(points=>[points[3][0]+side*.004,1.124,points[3][2]]),.070,.027);
    }
    run(body,silver,arch.map(([z,y])=>[side*(span(z)+.005),y+.018,z]),.042,.040);
    body.beam(silver,[side*1.026,.50,-1.19],[side*1.026,.50,.28],.083,.12);
    for(const z of [-1.19,-.95])body.beam(silver,[side*1.034,.68,z],[side*1.034,1.02,z],.025,.025);
    box(body,0x42494b,side*1.001,.72,-1.15,.036,.18,.17);
    for(const y of [.71,.82])box(body,silver,side*1.036,y,-1.15,.097,.022,.145);
    // The leading crew door and the wheel arch are separate panels on a cab-over.
    run(body,0x782922,[[side*1.012,.91,-1.25],[side*1.012,1.02,-1.245],[side*1.008,1.21,-1.245]],.012,.015);
    box(body,dark,side*1.018,1.08,-1.33,.028,.045,.118);
    // A raked split windscreen and wraparound quarter glass above the wheels.
    const lowerFront=[side*.845,1.25,-2.355],upperFront=[side*.786,2.18,-2.19];
    const quarterBase=[side*.988,1.25,-2.075],quarterTop=[side*.95,2.17,-1.99];
    const pillarBase=[side*1.006,1.25,hingeZ],pillarTop=[side*.951,2.17,hingeZ+.042];
    pane(glass,0x728b96,lowerFront,upperFront,quarterTop,quarterBase);
    pane(glass,0x7894a0,quarterBase,quarterTop,pillarTop,pillarBase);
    pane(glass,0x77909a,[0,1.25,-2.421],[0,2.22,-2.255],upperFront,lowerFront);
    run(body,cream,[quarterBase,quarterTop],.064,.066);
    run(body,cream,[lowerFront,upperFront],.047,.058);
    run(body,cream,[pillarBase,pillarTop],.075);
    run(body,dark,[[0,1.248,-2.426],lowerFront,quarterBase,pillarBase],.034);
    run(body,dark,[[0,2.214,-2.26],upperFront,quarterTop,pillarTop],.031);
    run(body,cream,[[side*1.002,1.24,-1.17],[side*.959,2.17,-1.17]],.061,.024);
    const sill=[side*1.006,1.25,.216],upperRear=[side*.95,2.17,.21];
    if(side>0)pane(glass,0x75909d,pillarBase,pillarTop,upperRear,sill);
    // The driver's open pane exposes the same seat position the game boards.
    const frame=[pillarBase,pillarTop,upperRear,sill,pillarBase];
    run(side<0?leaf:body,cream,frame.map(([x,y,z])=>[x-(side<0?hingeX:0),y,z-(side<0?hingeZ:0)]),.062,.064);
    box(side<0?leaf:body,dark,side*1.02-(side<0?hingeX:0),1.09,.10-(side<0?hingeZ:0),.026,.052,.16);
    for(const y of [1.52,1.82])body.beam(dark,[side*.974,y,-1.37],[side*1.14,y,-1.395],.03,.036);
    box(body,0x373e3f,side*1.14,1.68,-1.39,.112,.25,.085);
    box(body,0xb2c2c9,side*1.14,1.68,-1.337,.087,.21,.015);
    for(const z of [-.27,-1.37]){
      body.add(cushion,0x393d3d,side*.43,.83,z,.24,.115,.26);
      body.add(cushion,0x464849,side*.43,1.13,z+.18,.235,.25,.12);
    }
    body.beam(dark,[side*.10,1.27,-2.433],[side*.62,1.41,-2.38],.020,.017);
  }
  const roofRows=cab.map(([z,w])=>{
    const rise=z>-.93?.09:0;
    return [-1,-.98,-.92,-.76,0,.76,.92,.98,1].map(f=>{
      const edge=Math.abs(f),y=edge===1?2.158:edge>.96?2.244:edge>.87?2.287:2.312;
      return [f*w*.965,y+rise,z< -2.2?-2.258:z];
    });
  });
  skin(body,cream,roofRows);
  for(const row of [roofRows[0],roofRows.at(-1)])skin(body,cream,[row.map(([x,y,z])=>[x,2.154,z]),row]);
  for(const side of [-1,1]){
    run(body,cream,cab.filter(([z])=>z>=-2.19).map(([z,w])=>[side*w*.966,2.173,z]),.044,.052);
    box(body,0x982d2a,side*.978,1.29,.283,.064,1.80,.082);
    box(body,silver,side*.976,2.23,-.72,.045,.049,1.14);
  }
  box(body,red,0,1.43,.27,1.92,1.51,.14);
  box(body,dark,0,1.15,-1.52,1.75,.14,1.37);
  const steering=new THREE.TorusGeometry(.145,.019,6,20);
  body.add(steering,dark,-.43,1.29,-.65,1,1,1,-.42);steering.dispose();
  const ix=[-1,-.88,-.55,0,.55,.88,1];
  const frontZ=f=>-2.43+.09*f*f;
  skin(body,red,[.53,.71,1.13,1.245].map(y=>ix.map(f=>[f*.89,y,frontZ(f)])));
  box(body,silver,0,.485,-2.48,1.95,.17,.20);
  box(body,dark,0,.622,-2.492,.80,.082,.08);
  box(body,0x848d8f,0,.916,-2.439,.95,.48,.038);
  box(body,dark,0,.916,-2.465,.88,.423,.020);
  for(let j=0;j<8;j++)box(body,silver,0,.734+j*.052,-2.484,.845,.020,.021);
  for(const side of [-1,1]){
    const x=side*.715;
    box(body,silver,x,.918,-2.403,.343,.422,.042);
    for(const [y,col] of [[.802,0xf3e9c7],[.918,0xc6ced0],[1.045,0xb82d23]]){
      box(body,dark,x,y,-2.432,.294,.096,.023);
      box(body,col,x,y,-2.449,.253,.070,.019);
    }
    box(body,0xffbe59,side*.80,2.28,-2.10,.075,.055,.10);
  }
  for(const x of [-.18,0,.18])box(body,0xecae57,x,2.31,-2.19,.059,.044,.082);
  body.beam(dark,[0,1.25,-2.429],[0,2.21,-2.26],.031,.035);
  const appliance=fitAppliance(root,chassis,body,box,Batch,materials);
  for(const x of [-.85,.85])box(lamps,0xff513e,x,1.06,3.075,.14,.11,.02);
  // Insert wheelbase in the crew-door and midship pump bays. This leaves round
  // wheel openings, lenses, and the boarding hinge at their true dimensions.
  for(const batch of [body,glass,lamps]){
    for(let i=2;i<batch.positions.length;i+=3)batch.positions[i]=pumperStation(batch.positions[i]);
  }
  const decals=cabMarkings();
  for(const side of [-1,1]){
    const lettering=new THREE.Mesh(markingPlane,decals);
    lettering.rotation.y=side*Math.PI/2;
    lettering.position.set(side*1.020,.88,-.42);
    if(side<0){lettering.position.sub(door.position);door.add(lettering);}else chassis.add(lettering);
  }
  return {root,chassis,door,body,leaf,glass,lamps,appliance};
}

const pumperStation=z=>z< -1.07?z-.92*Math.min(1,(-1.07-z)/.18):
  z>.36?z+.44*Math.min(1,(z-.36)/.66):z;
const markingPlane=new THREE.PlaneGeometry(.94,.32);
let cabMarkingMaterial;
function cabMarkings(){
  if(cabMarkingMaterial)return cabMarkingMaterial;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=176;
  const pen=canvas.getContext('2d');
  pen.textAlign='center';pen.fillStyle='#f5d799';
  pen.font='bold 48px Georgia';pen.fillText('PINEWATCH',256,56);
  pen.fillRect(76,70,360,3);pen.font='bold 55px Georgia';pen.fillText('ENGINE 07',256,129);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  cabMarkingMaterial=new THREE.MeshLambertMaterial({map,transparent:true,alphaTest:.09,depthWrite:false});
  return cabMarkingMaterial;
}

function fitAppliance(root,chassis,body,box,Batch,materials){
  // The inset waist holds exposed pump fittings; the rear bank rises around the hosebed.
  box(body,red,0,1.47,1.70,1.94,1.24,2.62);
  box(body,dark,0,.60,1.54,1.50,.34,2.86);
  for(const side of [-1,1]){
    const x=side*1.002;
    box(body,red,x,1.68,1.98,.062,1.36,1.98);
    box(body,silver,x,2.344,1.97,.084,.074,2);
    box(body,0x575e60,x,1.57,.69,.07,1.25,.56);
    for(const [y,z,r,c] of [[1.35,.59,.119,0xb68b4d],[1.38,.83,.083,0xc1a266],[1.64,.56,.066,0xdfd8c8],[1.83,.57,.058,0xe2decc],[1.83,.80,.058,0xd7dacd],[1.58,.83,.043,0xab4c36]]){
      body.add(cylinder,silver,x+side*.045,y,z,r*1.10,.070,r*1.10,0,0,Math.PI/2);
      body.add(cylinder,c,x+side*.095,y,z,r,.045,r,0,0,Math.PI/2);
      if(y>1.6)body.beam(dark,[x+side*.123,y,z],[x+side*.123,y+.022,z+.018],.008);
    }
    box(body,silver,x,.76,.73,.20,.075,.7);
    for(const [z,width,h,base] of [[1.30,.51,.92,1.17],[1.97,.72,.68,1.43],[2.68,.54,1.04,1.03]]){
      const y=base+h/2;
      box(body,dark,x+side*.027,y,z,.05,h+.07,width+.045);
      box(body,0x9a9e9a,x+side*.053,y,z,.027,h,width);
      for(let j=0;j<10;j++)box(body,0x737b79,x+side*.072,base+j*h/10,z,.017,.012,width);
      box(body,dark,x+side*.087,base+.12,z,.022,.061,width*.44);
    }
    box(body,cream,x+side*.046,1.12,1.68,.040,.071,1.12);
    for(const z of [1.14,2.81])box(body,0xdba751,x+side*.059,2.24,z,.031,.078,.105);
    // Raised tray with a long extension ladder and individually banded hose folds.
    for(const y of [2.39,2.52])box(body,silver,side*.66,y,1.71,.063,.058,2.55);
    for(let i=0;i<11;i++)box(body,silver,side*.66,2.457,.50+i*.232,.047,.13,.030);
    for(let i=0;i<4;i++)box(body,i%2?0xc5aa79:0xad9467,side*(.12+i*.125),2.11,1.97,.112,.11,1.89);
    for(const z of [1.27,2.53])box(body,dark,side*.31,2.174,z,.55,.025,.050);
  }
  // An exposed hose manifold, handrails and a rolled rear wheel opening give
  // the apparatus a layered side elevation below the shutter bank.
  for(const side of [-1,1]){
    const edge=side*1.045;
    for(const z of [.39,1.00])body.beam(silver,[edge,1.08,z],[edge,2.04,z],.033,.033);
    for(const z of [.49,.60,.71,.82,.93]){
      body.add(cylinder,0xd0cfc2,edge,1.07,z,.027,.060,.027,0,0,Math.PI/2);
      body.beam(0x383e40,[edge+side*.03,1.07,z],[edge+side*.03,1.15,z+.01],.014,.018);
    }
    for(const y of [.95,1.97])box(body,silver,edge,y,.70,.038,.026,.62);
    const ring=[];
    for(let i=0;i<=20;i++){
      const a=i*Math.PI/20;
      ring.push([edge,.41+.48*Math.sin(a),1.85+.48*Math.cos(a)]);
    }
    for(let i=1;i<ring.length;i++)body.beam(silver,ring[i-1],ring[i],.048,.063);
    for(const [z,depth] of [[1.18,.38],[2.67,.65]]){
      box(body,red,side*.984,.84,z,.08,.36,depth);
      box(body,cream,side*1.03,.90,z,.018,.06,depth);
      box(body,dark,side*.92,.57,z,.18,.095,depth);
    }
    for(const [z,c] of [[2.67,0xbb3935],[2.83,0xd4ab50]])box(body,c,side*1.051,.73,z,.025,.065,.106);
  }
  // Reflective lettering and red/gold chevrons cover the high rear door.
  // The panel is readable directly behind the engine at driving distance.
  const panel=document.createElement('canvas');panel.width=512;panel.height=256;
  const ink=panel.getContext('2d');
  ink.fillStyle='#9b2922';ink.fillRect(0,0,512,256);
  for(let i=-4;i<9;i++){
    ink.fillStyle=i%2?'#a32520':'#dfbe53';
    for(const side of [-1,1]){
      ink.beginPath();ink.moveTo(256,i*46);ink.lineTo(256+side*256,i*46-118);
      ink.lineTo(256+side*256,(i+1)*46-118);ink.lineTo(256,(i+1)*46);ink.fill();
    }
  }
  ink.fillStyle='#761e1c';ink.fillRect(12,12,488,96);
  ink.textAlign='center';ink.fillStyle='#fff4d0';ink.font='bold 64px Arial';
  ink.fillText('FIRE RESCUE',256,84);
  const map=new THREE.CanvasTexture(panel);map.colorSpace=THREE.SRGBColorSpace;
  const marking=new THREE.Mesh(new THREE.PlaneGeometry(1.94,1.12),new THREE.MeshLambertMaterial({map}));
  marking.position.set(0,1.81,pumperStation(3.05));chassis.add(marking);
  box(body,silver,.88,1.44,3.105,.069,1.74,.064);
  box(body,silver,.57,1.44,3.105,.069,1.74,.064);
  for(let i=0;i<6;i++)box(body,silver,.725,.69+i*.285,3.12,.32,.037,.055);
  box(body,silver,0,.58,3.09,2.15,.12,.24);
  box(body,0x292c30,0,2.36,-1.55,1.38,.10,.29);
  for(const side of [-1,1])box(body,side<0?0xa8372c:0xa79882,side*.44,2.42,-1.55,.44,.12,.25);
  box(body,0x9e2e30,0,2.51,0,.46,.28,.44);
  const swivel=new THREE.Group();swivel.position.y=monitorHeight;root.add(swivel);
  const barrel=new Batch();
  barrel.add(cylinder,red,0,-.07,0,.145,.24,.145);
  barrel.add(cylinder,0xc49a64,0,.009,-.29,.10,.56,.10,Math.PI/2);
  barrel.add(cylinder,dark,0,.009,-.585,.099,.15,.099,Math.PI/2);
  barrel.add(cylinder,0x5b6768,0,.009,-.67,.070,.025,.070,Math.PI/2);
  barrel.mesh(swivel,materials.paint,false);
  const lamps=[-1,1].map(side=>{
    const batch=new Batch();box(batch,side<0?0xff5535:0xffe1bc,side*.44,2.43,pumperStation(-1.55),.44,.12,.25);
    return batch.mesh(chassis,materials.lights,false);
  });
  const spray=nozzleSpray(root);
  function update(car,time){
    const yaw=car.monitorYaw??car.yaw,pitch=car.monitorPitch??0;
    swivel.rotation.set(pitch,car.yaw-yaw,0,'YXZ');
    for(let i=0;i<2;i++)lamps[i].visible=!!car.response && !car.wrecked && (Math.floor(time*6)%2===i);
    spray(car,time);
  }
  return update;
}
