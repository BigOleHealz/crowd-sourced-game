import * as THREE from 'three';

let doorMaterial;
function lettering(){
  if(!doorMaterial){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=72;
    const ink=canvas.getContext('2d');
    ink.fillStyle='#e8e1c6';ink.fillRect(0,0,256,72);ink.fillStyle='#22545d';ink.fillRect(0,58,256,14);
    ink.textAlign='center';ink.fillStyle='#203841';ink.font='bold 37px system-ui';ink.fillText('PATROL',128,39);
    ink.font='bold 12px system-ui';ink.fillText('P I N E W A T C H',128,54);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    doorMaterial=new THREE.MeshLambertMaterial({map});
  }
  return doorMaterial;
}
const panel=new THREE.PlaneGeometry(1.19,.34);
export function markPatrolSedan(chassis,body,box){
  for(const side of [-1,1]){
    const sign=new THREE.Mesh(panel,lettering());sign.position.set(side*.866,.788,-.32);
    sign.rotation.y=side*Math.PI/2;chassis.add(sign);
    box(body,0xe3dfca,side*.827,.76,.57,.047,.26,.54);
  }
  box(body,0x303b41,0,1.56,.04,1.18,.056,.28);
  box(body,0x45b4c5,-.31,1.618,.04,.54,.083,.20);
  box(body,0xf2af54,.31,1.618,.04,.54,.083,.20);
  box(body,0xe8dfc1,0,1.623,.04,.09,.073,.2);
}
