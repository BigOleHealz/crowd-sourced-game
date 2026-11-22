import * as THREE from 'three';
import {atGrid,raceClock,sprintGates,sprintStart} from './marina-sprint.js';

// Two separately unwrapped faces keep the route legible from either approach.
function bannerGeometry(){
  const pos=[],uv=[],indices=[];
  for(const side of [1,-1]){
    const base=pos.length/3;
    for(let i=0;i<=24;i++){
      const u=i/24,x=(u-.5)*9.36;
      const bow=.045*Math.sin(Math.PI*u),wrinkle=.022*Math.sin(6*Math.PI*u)*Math.sin(Math.PI*u);
      for(const v of [0,1]){
        pos.push(x,3.71+.77*v-bow*(1-.55*v),side*.012+wrinkle*(1-v*.76));
        uv.push(side>0?u:1-u,v);
      }
      if(i===24)continue;
      const j=base+2*i;
      indices.push(...(side>0?[j,j+2,j+1,j+1,j+2,j+3]:[j,j+1,j+2,j+1,j+3,j+2]));
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
export function createSprintGate(scene,Batch){
  const group=new THREE.Group(),frame=new Batch(),base=new THREE.BoxGeometry();
  const steel=0x939d9e,connect=0x747d80;
  for(const side of [-1,1]){
    const x=side*4.9;
    frame.add(base,0x494d4b,x,.055,0,.58,.11,.74);
    for(const a of [-1,1])for(const b of [-1,1]){
      const xx=x+a*.105,zz=b*.135;
      frame.beam(steel,[xx,.10,zz],[xx,4.62,zz],.039,.039);
    }
    for(let i=0;i<9;i++){
      const y=.14+i*.485;
      for(const z of [-.135,.135]){
        frame.beam(connect,[x-.105,y,z],[x+.105,y+.485,z],.023,.023);
        frame.beam(connect,[x+.105,y,z],[x-.105,y+.485,z],.023,.023);
      }
    }
    for(const y of [3.73,4.45])frame.beam(0x484943,[x,y,0],[side*4.66,y,0],.022,.022);
  }
  for(const z of [-.135,.135])for(const y of [4.42,4.64]){
    frame.beam(steel,[-4.99,y,z],[4.99,y,z],.04,.04);
    for(let i=0;i<20 && y>4.6;i++){
      const x=-4.9+i*.49;
      frame.beam(connect,[x,i%2?4.42:4.64,z],[x+.49,i%2?4.64:4.42,z],.030,.030);
    }
  }
  frame.mesh(group,new THREE.MeshLambertMaterial({vertexColors:true}),false);base.dispose();
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=96;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const banner=new THREE.Mesh(bannerGeometry(),new THREE.MeshLambertMaterial({map:texture}));
  group.add(banner);scene.add(group);
  let last;
  return index=>{
    if(index===last)return;
    last=index;
    const gate=sprintGates[index]??sprintStart;
    group.position.set(gate.x,.70,gate.z);
    group.rotation.y=gate.east?-Math.PI/2:0;
    const text=gate===sprintStart?'MARINA SPRINT   /   START':gate.east?'EAST QUAY   /   FINISH':(index+1)+'   /   '+gate.name.toUpperCase();
    ctx.fillStyle='#223e44';ctx.fillRect(0,0,1024,96);
    ctx.fillStyle='#e8e6d6';ctx.fillRect(0,85,1024,3);
    for(const start of [12,948])for(let row=0;row<4;row++)for(let col=0;col<4;col++)
      if((row+col)%2===0)ctx.fillRect(start+col*16,12+row*16,16,16);
    ctx.fillStyle='#fff9e3';ctx.font='bold 48px system-ui';ctx.textAlign='center';ctx.fillText(text,512,64,830);
    texture.needsUpdate=true;
  };
}

export function sprintHud(panel,race,car,local,board,touch=false){
  panel.hidden=false;
  const gate=sprintGates[race?.next]??sprintStart;
  const clock=panel.querySelector('.sprint-clock');
  clock.hidden=!race;
  const compact=document.getElementById('touch-race-tally');
  compact.hidden=!race || !touch;
  if(race){
    clock.querySelector('[data-time]').textContent=race.phase==='countdown'?'0:00.00':raceClock(race.elapsed);
    const progress=race.phase==='finished'?'Finished':race.next+' / '+sprintGates.length+' gates';
    clock.querySelector('[data-gates]').textContent=progress;
    if(touch)compact.textContent=raceClock(race.elapsed)+' · '+progress;
  }
  const best=board.find(row=>row.driver===race?.driver),personal=panel.querySelector('[data-best]');
  const time=race?.best??best?.time;
  personal.hidden=time==null;
  if(time!=null)personal.textContent='Your best '+raceClock(time)+(best?' · Rank '+(board.indexOf(best)+1):'');
  let message='Start at Mangle Café in a road vehicle.';
  if(car && atGrid(car))message=touch?'Stop under the banner and tap Marina Sprint in Gear.':'Stop under the banner and press T to start.';
  if(race?.phase==='countdown')message='Hold at the grid · '+Math.max(1,Math.ceil(-race.elapsed/1000));
  if(race?.phase==='racing'){
    const distance=Math.round(Math.hypot(local.x-gate.x,local.z-gate.z));
    const directions=['N','NE','E','SE','S','SW','W','NW'];
    const bearing=(Math.round(Math.atan2(gate.x-local.x,local.z-gate.z)/(Math.PI/4))+8)%8;
    message='Next · '+gate.name+' · '+directions[bearing]+' '+distance+' m';
  }
  if(race?.phase==='finished')message=race.message??(touch?'At the quay, tap Marina Sprint in Gear to retry.':'Press T at the quay to race again.');
  panel.querySelector('output').textContent=message;
  const list=panel.querySelector('ol'),signature=(race?.driver??'')+'/'+board.map(row=>row.driver+'-'+row.time).join(',');
  if(list.dataset.times!==signature){
    list.dataset.times=signature;
    list.replaceChildren(...board.map(row=>{
      const li=document.createElement('li');li.textContent=(row.driver===race?.driver?'You':'Driver '+row.driver)+' · '+raceClock(row.time);return li;
    }));
  }
  panel.querySelector('summary').textContent=board.length?'Session best · '+raceClock(board[0].time)+' · Driver '+board[0].driver:'Session best · No finishes yet';
}
