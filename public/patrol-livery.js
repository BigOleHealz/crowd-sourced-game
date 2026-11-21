import {CITY} from './world.js';
import * as THREE from 'three';
import {patrolLampSide} from './pursuit-signals.js';

const lens=new THREE.BoxGeometry(.54,.083,.20);
const lit=[0x56ceff,0xff6e43].map(color=>new THREE.MeshBasicMaterial({color,toneMapped:false}));
let doorMaterial;
function lettering(){
  if(!doorMaterial){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=144;
    const ink=canvas.getContext('2d');
    ink.scale(2,2);ink.fillStyle='#e3e6e1';ink.fillRect(0,0,256,72);
    ink.fillStyle=CITY?'#243e54':'#344a37';ink.fillRect(0,57,256,9);ink.fillStyle='#b79756';ink.fillRect(0,66,256,3);
    ink.textAlign='center';ink.fillStyle='#203841';ink.font='bold 37px system-ui';ink.fillText(CITY?'POLICE':'SHERIFF',128,39,226);
    ink.font='bold 12px system-ui';ink.fillText(CITY?'P I N E W A T C H':'PINEWATCH COUNTY',128,54,210);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    doorMaterial=new THREE.MeshLambertMaterial({map});
  }
  return doorMaterial;
}
const panel=new THREE.PlaneGeometry(1.19,.34);
export function markPatrolSedan(chassis,door,body,box){
  for(const side of [-1,1]){
    const sign=new THREE.Mesh(panel,lettering());sign.position.set(side*.866,.788,-.32);
    sign.rotation.y=side*Math.PI/2;
    if(side<0){sign.position.sub(door.position);door.add(sign);}else chassis.add(sign);
    box(body,0xe3e6e1,side*.827,.76,.57,.047,.26,.54);
  }
  // Rubber feet hold the low-profile bar just clear of the curved roof.
  for(const side of [-1,1])box(body,0x20262c,side*.39,1.535,.04,.15,.055,.22);
  box(body,0x303b41,0,1.56,.04,1.18,.056,.28);
  box(body,0x326d94,-.31,1.618,.04,.54,.083,.20);
  box(body,0x964536,.31,1.618,.04,.54,.083,.20);
  box(body,0xe8dfc1,0,1.623,.04,.09,.073,.2);
  const lamps=lit.map((material,i)=>{
    const lamp=new THREE.Mesh(lens,material);lamp.name='Patrol beacon';
    lamp.position.set(i?.31:-.31,1.618,.04);lamp.scale.setScalar(1.025);
    lamp.visible=false;chassis.add(lamp);return lamp;
  });
  return (car,time)=>{
    const side=patrolLampSide(car,time);
    lamps[0].visible=side<0;lamps[1].visible=side>0;
  };
}
