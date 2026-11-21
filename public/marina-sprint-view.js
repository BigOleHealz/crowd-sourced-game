import * as THREE from 'three';
import {atGrid,raceClock,sprintGates,sprintStart} from './marina-sprint.js';

export function createSprintGate(scene){
  const group=new THREE.Group(),teal=new THREE.MeshBasicMaterial({color:0x64ffe0});
  const post=new THREE.BoxGeometry(.14,4,.14);
  for(const side of [-1,1]){
    const pole=new THREE.Mesh(post,teal);
    pole.position.set(side*4.9,2,0);group.add(pole);
  }
  const canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=64;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const banner=new THREE.Mesh(new THREE.PlaneGeometry(9.9,1.05),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  banner.position.y=4;group.add(banner);scene.add(group);
  let last;
  return index=>{
    if(index===last)return;
    last=index;
    const gate=sprintGates[index]??sprintStart;
    group.position.set(gate.x,.70,gate.z);
    group.rotation.y=gate.east?-Math.PI/2:0;
    const text=gate===sprintStart?'MARINA SPRINT   /   START':gate.east?'EAST QUAY   /   FINISH':(index+1)+'   /   '+gate.name.toUpperCase();
    ctx.fillStyle='#102c32';ctx.fillRect(0,0,512,64);
    ctx.fillStyle='#89ffe3';ctx.fillRect(0,60,512,4);
    ctx.font='bold 25px system-ui';ctx.textAlign='center';ctx.fillText(text,256,41);
    texture.needsUpdate=true;
  };
}

export function sprintHud(panel,race,car,local,board){
  panel.hidden=false;
  const gate=sprintGates[race?.next]??sprintStart;
  let message='Start at Mangle Café in a road vehicle.';
  if(car && atGrid(car))message='Stop under the banner and press T to start.';
  if(race?.phase==='countdown')message='Hold at the grid · '+Math.max(1,Math.ceil(-race.elapsed/1000));
  if(race?.phase==='racing'){
    const distance=Math.round(Math.hypot(local.x-gate.x,local.z-gate.z));
    const directions=['N','NE','E','SE','S','SW','W','NW'];
    const bearing=(Math.round(Math.atan2(gate.x-local.x,local.z-gate.z)/(Math.PI/4))+8)%8;
    message=raceClock(race.elapsed)+' · '+(race.next+1)+'/'+sprintGates.length+' '+gate.name+' · '+directions[bearing]+' '+distance+' m';
  }
  if(race?.phase==='finished')message='Driver '+race.driver+' · Finish '+raceClock(race.elapsed)+' · '+(race.message??'Press T at the quay to race again.');
  panel.querySelector('output').textContent=message;
  const list=panel.querySelector('ol'),signature=board.map(row=>row.driver+'-'+row.time).join(',');
  if(list.dataset.times!==signature){
    list.dataset.times=signature;
    list.replaceChildren(...board.map(row=>{
      const li=document.createElement('li');li.textContent='Driver '+row.driver+' · '+raceClock(row.time);return li;
    }));
  }
  panel.querySelector('summary').textContent=board.length?'Session best · '+raceClock(board[0].time)+' · Driver '+board[0].driver:'Session best · No finishes yet';
}
