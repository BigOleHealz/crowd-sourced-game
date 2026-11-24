import {equipmentFinish,equipmentPlate} from './equipment-finish.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {tankPivot,tankBarrel,tankScale} from './tank-layout.js';
import {splitTankTracks,advanceTankTracks,splitTankDetail} from './tank-model-rig.js';

const cube=new THREE.BoxGeometry(),disc=new THREE.CylinderGeometry(1,1,1,18);
function plate(batch,tint,rings){
  const verts=rings.flat(2),idx=[];
  for(let i=0;i<4;i++){const j=(i+1)%4;idx.push(i,i+4,j,j,i+4,j+4);}
  idx.push(0,1,2,0,2,3,4,6,5,4,7,6);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();
  batch.add(g,tint,0,0,0);g.dispose();
}

export function tankView(scene,Batch,shadowMap){
  const root=new THREE.Group(),turret=new THREE.Group(),barrel=new THREE.Group();
  root.name='Brickell tank';turret.name='Tank turret';scene.add(root);root.add(turret);turret.add(barrel);
  turret.position.y=tankPivot;
  const art=new Batch(),top=new Batch(true),gun=new Batch(true),mat=new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:24});
  const olive=0x61705b,dark=0x39483c,sand=0x899077,trim=0x4c5650;
  plate(art,olive,[[[-.82,.48,-1.80],[.82,.48,-1.80],[.82,.48,1.85],[-.82,.48,1.85]],
    [[-.98,1.11,-1.38],[.98,1.11,-1.38],[1.01,1.17,1.77],[-1.01,1.17,1.77]]]);
  plate(top,olive,[[[-.68,-.36,-.99],[.68,-.36,-.99],[.85,-.36,.89],[-.85,-.36,.89]],
    [[-.52,.17,-.55],[.52,.17,-.55],[.64,.26,.71],[-.64,.26,.71]]]);
  art.add(disc,dark,0,1.19,0,.82,.18,.80);
  top.add(disc,sand,.22,.27,.15,.32,.10,.30);
  top.add(cube,trim,-.38,.24,-.31,.22,.115,.12);
  top.add(cube,0x6c9d9c,-.38,.24,-.378,.175,.078,.023);
  top.add(cube,dark,0,-.02,.94,1.18,.31,.24);
  top.beam(trim,[.53,.22,.61],[.55,.78,.65],.018);
  gun.add(cube,dark,0,0,-.60,.47,.35,.54);
  gun.add(disc,sand,0,0,-1.41,.091,1.38,.091,Math.PI/2);
  gun.add(disc,dark,0,0,-(tankBarrel/tankScale-.11),.128,.23,.128,Math.PI/2);
  gun.add(disc,0x212923,0,0,-(tankBarrel/tankScale+.005),.086,.01,.086,Math.PI/2);
  // The outer canvas cover bunches against the cast mantlet and moves with it.
  const curved=new THREE.SphereGeometry(1,18,10);
  gun.add(curved,0x556049,0,.010,-.69,.252,.202,.294);
  for(const [i,z] of [-.83,-.91,-1.00].entries()){
    const r=.157-i*.018;
    gun.add(disc,i%2?0x706e58:0x666750,0,.007,-Math.abs(z),r,.083,r*.92,Math.PI/2);
  }
  gun.add(disc,0x777d66,0,0,-1.68,.106,.24,.106,Math.PI/2);
  for(const z of [-1.55,-1.79])gun.add(disc,0x535a4b,0,0,z,.113,.021,.113,Math.PI/2);
  for(const side of [-1,1]){
    top.add(cube,0x64705d,side*.56,.011,-.50,.145,.221,.384,0,side*.12,side*.14);
    top.add(disc,0x53604e,side*.617,.092,-.445,.046,.022,.046,0,0,Math.PI/2);
  }
  equipmentPlate(top,7,1,.659,.030,-.49,.161,.054);
  top.add(cube,0x404c47,-.38,.268,-.327,.258,.075,.125);
  top.add(cube,0x788b80,-.38,.255,-.395,.175,.029,.015);
  curved.dispose();
  const rubber=0x2c322f;
  for(const side of [-1,1]){
    art.add(cube,dark,side*.978,.60,0,.37,.45,3.52);
    for(let i=0;i<6;i++){
      const z=-1.46+i*.585;
      art.add(disc,rubber,side*1.021,.42,z,.34,.25,.34,0,0,Math.PI/2);
      art.add(disc,olive,side*1.156,.42,z,.255,.035,.255,0,0,Math.PI/2);
      art.add(disc,trim,side*1.18,.42,z,.12,.032,.12,0,0,Math.PI/2);
    }
    for(let j=0;j<4;j++)art.add(cube,j%2?olive:sand,side*1.003,.892,-1.36+j*.88,.41,.18,.83);
    art.add(cube,0xd6dfbf,side*.84,1.035,-1.49,.16,.1,.10);
    art.add(cube,0xa44836,side*.84,.93,1.83,.13,.071,.08);
    for(let j=0;j<8;j++)art.add(cube,dark,side*.38,1.18,1.06+j*.079,.50,.025,.038);
  }
  const oldHull=art.mesh(root,mat,false),oldTurret=top.mesh(turret,equipmentFinish(),false),oldBarrel=gun.mesh(barrel,equipmentFinish(),false);
  oldHull.scale.setScalar(tankScale);oldTurret.scale.setScalar(tankScale);oldBarrel.scale.setScalar(tankScale);
  // The downloaded GLB has ten material meshes but no moving-part hierarchy.
  // Its vertices are in centimetres and its nose faces +Z.
  const model=new THREE.Group(),modelTurret=new THREE.Group(),modelBarrel=new THREE.Group();
  model.scale.setScalar(.005*tankScale);model.rotation.y=Math.PI;model.position.z=-.45*tankScale;root.add(model);
  modelTurret.position.set(0,155,-100);model.add(modelTurret);
  modelBarrel.position.set(0,43,168);modelTurret.add(modelBarrel);
  let belts=[];
  new GLTFLoader().load(new URL('./simple-tank.glb',import.meta.url).href,({scene:loaded})=>{
    const pieces=[];loaded.traverse(object=>{if(object.isMesh)pieces.push(object);});
    const names=new Set(pieces.map(piece=>piece.material.name));
    if(!['Hull_477','Turret_229','Cannon_13','Wheels_334'].every(name=>names.has(name)))
      throw new Error('Simple Tank is missing a required mesh');
    for(const piece of pieces){
      const name=piece.material.name;
      piece.parent.remove(piece);
      piece.castShadow=false;
      if(name==='Tracks_420'){
        belts=splitTankTracks(piece);
        for(const belt of belts)model.add(belt.mesh);
      }else if(name==='Applique_176'||name==='Glass_13'){
        const {fixed,moving}=splitTankDetail(piece);
        if(fixed)model.add(fixed);
        if(moving){moving.position.set(0,-155,100);modelTurret.add(moving);}
      }else if(name==='Cannon_13'){
        piece.position.set(0,-198,-68);modelBarrel.add(piece);
      }else if(name==='Turret_229'||name==='Gear_980'||name==='Gear_24'){
        piece.position.set(0,-155,100);modelTurret.add(piece);
      }else model.add(piece);
    }
    oldHull.visible=oldTurret.visible=oldBarrel.visible=false;
  },undefined,error=>console.warn('Simple Tank unavailable; using the original shell.',error));
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.15,5.3),new THREE.MeshBasicMaterial({map:shadowMap,color:0x1e2a26,opacity:.48,transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;root.add(shadow);
  shadow.scale.setScalar(tankScale);
  const localAim=new THREE.Vector3(),inverseHull=new THREE.Quaternion();
  return (tank,dt)=>{
    root.visible=!!tank;if(!tank)return;
    const ride=tank.suspension;
    root.position.set(tank.x,tank.y+(ride?.heave??0),tank.z);
    root.rotation.set(ride?.pitch??0,-tank.yaw,ride?.roll??0,'YXZ');
    const forward=Math.cos(tank.turretPitch);
    localAim.set(Math.sin(tank.turretYaw)*forward,Math.sin(tank.turretPitch),-Math.cos(tank.turretYaw)*forward);
    localAim.applyQuaternion(inverseHull.copy(root.quaternion).invert());
    turret.rotation.y=Math.atan2(-localAim.x,-localAim.z);turret.rotation.z=tank.wrecked?.20:0;
    barrel.rotation.x=tank.wrecked?-.22:Math.asin(THREE.MathUtils.clamp(localAim.y,-1,1));
    modelTurret.rotation.y=turret.rotation.y;
    modelTurret.rotation.z=-turret.rotation.z;
    modelBarrel.rotation.x=-barrel.rotation.x;
    if(belts.length)advanceTankTracks(belts,tank.speed,tank.turnRate,dt);
  };
}
