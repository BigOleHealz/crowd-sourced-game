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
    ink.scale(2,2);ink.clearRect(0,0,256,72);
    ink.fillStyle='#bd934a';ink.fillRect(18,55,220,2);
    ink.textAlign='center';ink.fillStyle='#203841';ink.font='italic 900 37px system-ui';ink.fillText(CITY?'POLICE':'SHERIFF',128,39,226);
    ink.font='bold 12px system-ui';ink.fillText(CITY?'G O Y  T H E F T  A U T O':'GOY THEFT AUTO COUNTY',128,54,210);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    doorMaterial=new THREE.MeshLambertMaterial({map,transparent:true,alphaTest:.08,depthWrite:false});
  }
  return doorMaterial;
}
const panel=new THREE.PlaneGeometry(1.19,.34);
export function markPatrolSedan(chassis,door,body,box){
  const graphite=0x303539,steel=0x5a6163;
  const spot=new THREE.SphereGeometry(1,12,7);
  // Uprights follow the nose into the bumper. The crossbars bow around the grille.
  for(const side of [-1,1]){
    body.beam(graphite,[side*.39,.32,-2.12],[side*.39,.57,-2.22],.073,.10);
    body.beam(graphite,[side*.39,.57,-2.22],[side*.39,.88,-2.16],.073,.10);
    body.beam(steel,[side*.37,.57,-2.19],[side*.57,.57,-2.04],.043,.055);
    for(const y of [.43,.70])body.beam(graphite,[0,y,-2.22],[side*.39,y,-2.205],.042,.050);
    body.beam(graphite,[side*.85,1.01,-.88],[side*.92,1.15,-.76],.031,.035);
    body.add(spot,graphite,side*.92,1.17,-.78,.076,.072,.077);
    body.add(spot,0xb8c7ca,side*.92,1.17,-.84,.062,.057,.025);
    // A dark rear quarter and low champagne/blue pinstripes make a real four-door livery.
    for(const [y,c] of [[.69,0x344e65],[.665,0xc5a469]]){
      const x=side*.853;
      box(body,c,x,y,.78,.016,.018,.95);
      body.beam(c,[x,y,1.24],[side*.82,y+.055,1.63],.015,.014);
    }

    const sign=new THREE.Mesh(panel,lettering());sign.position.set(side*.866,.788,-.32);
    sign.rotation.y=side*Math.PI/2;
    if(side<0){sign.position.sub(door.position);door.add(sign);}else chassis.add(sign);

  }
  body.beam(graphite,[.50,.94,1.75],[.50,1.37,1.78],.012,.012);
  box(body,graphite,.50,.945,1.75,.073,.030,.067);
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
