import * as THREE from 'three';
import {monitorHeight} from './water-monitor.js';

// Cab, wheels and opening driver's door come from the shared traffic rig.
export function fireAppliance(root,chassis,body,box,Batch,materials){
  const red=0xa42e29,white=0xe8dece,silver=0xabb2b1,dark=0x343e40;
  box(body,red,0,1.63,1.62,2.08,1.72,2.82);
  for(const side of [-1,1]){
    const x=side*1.047;
    box(body,white,x,1.08,1.58,.034,.105,2.86);
    for(const z of [.88,1.81,2.62]){
      box(body,dark,x,1.76,z,.039,1.17,.76);
      box(body,silver,x+side*.024,1.76,z,.022,1.08,.70);
      for(let j=0;j<8;j++)box(body,0x798481,x+side*.04,1.27+j*.126,z,.016,.019,.70);
      box(body,0x353c36,x+side*.05,1.35,z,.026,.07,.24);
    }
    box(body,0x434b4d,x,.83,1.56,.14,.115,2.90);
    box(body,white,side*1.026,1.00,-.57,.024,.10,.89);
    for(const z of [.47,2.85])box(body,0xddad4b,x+side*.022,2.32,z,.034,.12,.16);
    // Twin ladder rails and rungs strapped down the appliance roof.
    box(body,silver,side*.34,2.58,1.65,.085,.10,2.84);
  }
  for(let i=0;i<10;i++)box(body,0xa5aaa5,0,2.575,.34+i*.29,.73,.065,.055);
  for(const side of [-1,1])for(let j=0;j<4;j++)
    box(body,j%2?0xe8c95b:0xab312d,side*(.19+j*.19),1.15,3.055,.18,.53,.06,0,0,side*.47);
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
  marking.position.set(0,1.86,3.05);chassis.add(marking);
  // Folded supply hose sits between the ladder cradles.
  for(const x of [-.71,.71])for(let k=0;k<3;k++)
    box(body,k%2?0xb1a67e:0xcac09b,x,2.50+k*.045,1.60,.32,.046,2.30-.08*k);
  for(const x of [-.70,.70])for(const z of [.82,2.43])box(body,dark,x,2.62,z,.34,.035,.084);
  box(body,silver,.88,1.44,3.105,.069,1.74,.064);
  box(body,silver,.57,1.44,3.105,.069,1.74,.064);
  for(let i=0;i<6;i++)box(body,silver,.725,.69+i*.285,3.12,.32,.037,.055);
  box(body,silver,0,.58,3.09,2.15,.12,.24);
  box(body,0x292c30,0,2.36,-.42,1.38,.10,.29);
  box(body,0x9e2e30,0,2.51,0,.46,.28,.44);
  const swivel=new THREE.Group();swivel.position.y=monitorHeight;root.add(swivel);
  const barrel=new Batch();
  box(barrel,0xe2b365,0,0,-.26,.22,.19,.68);
  box(barrel,0x334146,0,0,-.64,.19,.16,.22);
  barrel.mesh(swivel,materials.paint,false);
  const lamps=[-1,1].map(side=>{
    const batch=new Batch();box(batch,side<0?0xff5535:0xffe1bc,side*.44,2.46,-.42,.44,.12,.25);
    return batch.mesh(chassis,materials.lights,false);
  });
  const sprayMat=new THREE.MeshBasicMaterial({color:0xc9edff,transparent:true,opacity:.72,depthWrite:false});
  const spray=new THREE.Mesh(new THREE.CylinderGeometry(.112,.061,1,8),sprayMat);root.add(spray);
  const splash=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.10,0),sprayMat,12);root.add(splash);
  splash.frustumCulled=false;
  const dir=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),end=new THREE.Vector3(),matrix=new THREE.Object3D();
  function update(car,time){
    const yaw=car.monitorYaw??car.yaw,pitch=car.monitorPitch??0;
    swivel.rotation.set(pitch,car.yaw-yaw,0,'YXZ');
    for(let i=0;i<2;i++)lamps[i].visible=!!car.response && !car.wrecked && (Math.floor(time*6)%2===i);
    spray.visible=splash.visible=!!car.water && !car.wrecked;
    if(!spray.visible)return;
    const dx=car.water.x-car.x,dz=car.water.z-car.z,c=Math.cos(car.yaw),s=Math.sin(car.yaw);
    end.set(c*dx+s*dz,car.water.y-car.y,-s*dx+c*dz);
    dir.copy(end);dir.y-=monitorHeight;const length=dir.length();
    if(length<.01){spray.visible=splash.visible=false;return;}
    dir.multiplyScalar(1/length);
    spray.position.set(end.x/2,(end.y+monitorHeight)/2,end.z/2);
    spray.scale.set(1,length,1);spray.quaternion.setFromUnitVectors(up,dir);
    for(let i=0;i<12;i++){
      const t=(time*2.6+i*.173)%1,a=i*2.4;
      matrix.position.set(end.x+Math.cos(a)*t*.61,end.y+.55*t-.40*t*t,end.z+Math.sin(a)*t*.61);
      matrix.scale.setScalar(.24+.64*(1-t));matrix.updateMatrix();splash.setMatrixAt(i,matrix.matrix);
    }
    splash.instanceMatrix.needsUpdate=true;
  }
  return update;
}
