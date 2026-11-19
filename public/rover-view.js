import * as THREE from 'three';
import { groundHeight } from './world.js';

// The chassis, cab panels and doors share a single static mesh; each wheel
// gets one rotating mesh and each load unit gets one toggled mesh.
export function createRoverView(scene, Batch, material, shadowMap) {
  const root = new THREE.Group(), chassis = new Batch();
  scene.add(root);
  const cube = new THREE.BoxGeometry(1,1,1);
  const disc = new THREE.CylinderGeometry(1,1,1,14);
  const brass = 0xe9b64e, paint = 0x347d78, trim = 0xe7d8ae, rubber = 0x243135;
  const box = (t,x,y,z,w,h,l) => chassis.add(cube,t,x,y,z,w,h,l);
  box(rubber,0,.43,0,1.32,.22,2.62);
  box(paint,0,.68,0,1.52,.40,2.42);
  box(brass,0,.83,-.91,1.43,.22,.67);
  box(0x344440,0,.62,-1.24,.80,.23,.035);
  for(let n=-2;n<=2;n++) box(trim,n*.115,.60,-1.265,.038,.155,.035);
  box(trim,0,.44,-1.33,1.56,.10,.16);
  box(trim,0,.44,1.34,1.56,.10,.16);
  box(0x304841,0,.87,.81,1.40,.12,.98);
  box(paint,0,1.04,1.27,1.51,.32,.11);
  box(brass,0,.91,1.335,1.37,.045,.025);
  // Two-tone enclosed cab with a forward sloping windshield and a cream visor.
  chassis.add(cube,0x53858d,0,1.22,-.53,1.18,.54,.054,-.19);
  box(0x32545f,0,1.24,.30,1.19,.52,.055);
  box(trim,0,1.56,-.12,1.60,.10,1.13);
  box(paint,0,1.48,-.64,1.50,.065,.12);
  for (const side of [-1,1]) {
    box(paint,side*.718,1.025,.80,.096,.35,1.04);
    box(trim,side*.72,1.21,.80,.12,.05,1.04);
    box(brass,side*.719,.83,-.12,.06,.18,.70);
    box(0x436771,side*.672,1.24,-.12,.046,.45,.74);
    chassis.beam(paint,[side*.668,1,-.61],[side*.661,1.52,-.48],.085);
    box(paint,side*.668,1.25,.30,.09,.53,.10);
    box(trim,side*.73,1.01,.11,.036,.055,.15);
    box(rubber,side*.79,.47,-.1,.18,.105,.72);
    box(0xffe8a2,side*.55,.702,-1.23,.245,.17,.096);
    box(0xe56b47,side*.61,.748,1.25,.16,.13,.084);
    box(0x24383c,side*.80,1.30,-.45,.12,.12,.14);
    for(const z of [-.83,.84]) box(paint,side*.69,.79,z,.26,.13,.71);
  }
  chassis.mesh(root,material,false);
  const wheels=[];
  for(const side of [-1,1]) for(const z of [-.83,.84]) {
    const w=new Batch();
    w.add(disc,rubber,0,0,0,.36,.25,.36,0,0,Math.PI/2);
    w.add(disc,0xb1b9a6,side*.134,0,0,.192,.038,.192,0,0,Math.PI/2);
    w.add(cube,brass,side*.157,0,0,.03,.072,.29);
    w.add(cube,brass,side*.158,0,0,.03,.29,.072);
    const wheel=w.mesh(root,material,false);
    wheel.position.set(side*.74,.36,z);
    wheels.push(wheel);
  }
  const cargo=[];
  for(const [cx,cy,cz] of [[-.32,.94,.75],[.32,.94,.79],[0,1.28,.77]]) {
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
