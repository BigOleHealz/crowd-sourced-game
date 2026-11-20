import * as THREE from 'three';
import {cabinPieces,mainSole,upperSole} from './solana-interior.js';

function chartMaterial(){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=512;
  const g=canvas.getContext('2d');
  g.fillStyle='#9abec1';g.fillRect(0,0,384,512);
  const coast=[[160,0],[127,55],[146,100],[116,136],[92,210],[116,251],[74,340],[90,399],[48,512]];
  g.beginPath();g.moveTo(0,0);
  for(const [x,y] of coast)g.lineTo(x,y);
  g.lineTo(0,512);g.closePath();g.fillStyle='#e4d6ac';g.fill();
  g.strokeStyle='#738989';g.lineWidth=1;
  for(let i=0;i<512;i+=32){
    g.beginPath();g.moveTo(i,0);g.lineTo(i,512);g.moveTo(0,i);g.lineTo(384,i);g.stroke();
  }
  g.strokeStyle='#e8f3ed';g.lineWidth=3;
  for(const offset of [22,43,86]){
    g.beginPath();coast.forEach(([x,y],i)=>i?g.lineTo(x+offset,y):g.moveTo(x+offset,y));g.stroke();
  }
  g.strokeStyle='#536d70';g.beginPath();g.arc(295,86,33,0,2*Math.PI);g.stroke();
  g.beginPath();g.moveTo(295,37);g.lineTo(295,135);g.moveTo(246,86);g.lineTo(344,86);g.stroke();
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map,roughness:.88});
}

export function fitSolanaInterior(root,Batch,fittings,metal,glass,wood){
  const cube=new THREE.BoxGeometry(),pillow=new THREE.SphereGeometry(1,12,8);
  const cylinder=new THREE.CylinderGeometry(.5,.5,1,18), light=new Batch();
  const boards=[],uv=[];
  for(const p of cabinPieces){
    const batch=p.finish==='glass'?glass:p.finish==='light'?light:fittings;
    if(p.finish==='pillow'){
      batch.add(pillow,p.tint,p.x,p.y,p.z,p.w*.5,p.h*.5,p.d*.5,.15,0,-.25);
    }else batch.add(cube,p.tint,p.x,p.y,p.z,p.w,p.h,p.d);
    if(p.finish==='deck' && p.y<upperSole){
      const y=upperSole+.004;
      for(const [dx,dz] of [[-1,-1],[-1,1],[1,-1],[1,-1],[-1,1],[1,1]]){
        const x=p.x+dx*p.w/2,z=p.z+dz*p.d/2;
        boards.push(x,y,z);uv.push(x/2.8,z/5.8);
      }
    }
  }
  const floor=new THREE.BufferGeometry();
  floor.setAttribute('position',new THREE.Float32BufferAttribute(boards,3));
  floor.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));floor.computeVertexNormals();
  root.add(new THREE.Mesh(floor,wood));
  // Chart table in the upper lounge, and a shaded reading lamp above its cabinet.
  const chart=new THREE.Mesh(new THREE.PlaneGeometry(.55,1.04),chartMaterial());
  chart.rotation.x=-Math.PI/2;chart.position.set(-1.72,upperSole+.854,-5.64);root.add(chart);
  const brass=0xbb9c65;
  metal.add(cylinder,brass,-2.78,upperSole+.90,-9.25,.32,.045,.32);
  metal.add(cylinder,brass,-2.78,upperSole+1.13,-9.25,.047,.46,.047);
  const shade=new THREE.CylinderGeometry(.16,.235,.25,24);
  light.add(shade,0xf3dfb5,-2.78,upperSole+1.43,-9.25);

  // A tray and two porcelain cups on the salon table.
  fittings.add(cube,0x565d54,-2.08,mainSole+.872,-3.67,.53,.035,.84);
  for(const z of [-3.9,-3.47]){
    fittings.add(cylinder,0xe7dfc8,-2.08,mainSole+.9,z,.24,.015,.24);
    fittings.add(cylinder,0xf6edde,-2.08,mainSole+.97,z,.133,.13,.133);
    fittings.add(cylinder,0x4e3b2b,-2.08,mainSole+1.036,z,.109,.004,.109);
  }
  const faucet=[[-3.69,mainSole+1.05,-9.84],[-3.69,mainSole+1.39,-9.84],[-3.40,mainSole+1.39,-9.84],[-3.40,mainSole+1.32,-9.84]];
  for(let i=1;i<faucet.length;i++)metal.beam(0xaabcb9,faucet[i-1],faucet[i],.042);
  fittings.add(cube,0x28383a,-3.36,mainSole+1.054,-8.25,.81,.024,.83);
  for(const z of [-8.46,-8.08])fittings.add(cylinder,0x546163,-3.36,mainSole+1.069,z,.29,.008,.29);
  light.mesh(root,new THREE.MeshBasicMaterial({vertexColors:true}),false);
  for(const shape of [cube,pillow,cylinder,shade])shape.dispose();
}
