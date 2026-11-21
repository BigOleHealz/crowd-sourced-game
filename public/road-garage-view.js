import * as THREE from 'three';
import {roadGarages,garageAt} from './road-garages.js';
import {groundHeight} from './world.js';

export function createRoadGarages(scene,Batch){
  const depot=new Batch(),cube=new THREE.BoxGeometry(),signGeometry=new THREE.PlaneGeometry(4.7,.83);
  const nodes=roadGarages.map(g=>{
    const floor=groundHeight(g.x,g.z);
    const box=(color,x,y,z,w,h,d)=>depot.add(cube,color,g.x+x,floor+y,g.z+z,w,h,d);
    for(const side of [-1,1]){
      box(0xd8bf60,side*2.67,.032,0,.09,.045,5.65);
      for(const end of [-1,1]){
        box(0x49656a,side*2.96,1.85,end*3.12,.14,3.7,.14);
        box(0xf8c85b,side*2.96,.69,end*3.12,.16,.38,.16);
      }
    }
    box(0x345056,0,3.79,0,6.21,.22,6.53);
    box(0xe3b947,0,3.67,0,6.23,.09,6.55);
    // The two-sided fascia reads from both entrances. A progress strip runs
    // below it, visible to occupants and people waiting for the bay to clear.
    const c=document.createElement('canvas');c.width=512;c.height=96;
    const ctx=c.getContext('2d');ctx.fillStyle='#183539';ctx.fillRect(0,0,c.width,c.height);
    ctx.textAlign='center';ctx.fillStyle='#f4ca68';ctx.font='bold 40px sans-serif';ctx.fillText('AUTO REPAIR',256,44);
    ctx.fillStyle='#e2ece8';ctx.font='22px sans-serif';ctx.fillText(g.name.toUpperCase(),256,77);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
    const signage=new THREE.MeshBasicMaterial({map:t});
    const bars=[];
    for(const end of [-1,1]){
      const panel=new THREE.Mesh(signGeometry,signage);panel.position.set(g.x,floor+3.74,g.z+end*3.3);
      panel.rotation.y=end<0?Math.PI:0;scene.add(panel);
      const bar=new THREE.Mesh(cube,new THREE.MeshBasicMaterial({color:0x70f3c5}));
      bar.position.set(g.x,floor+3.27,g.z+end*3.31);bar.scale.set(.01,.065,.035);bar.visible=false;scene.add(bar);bars.push(bar);
    }
    return {g,bars};
  });
  depot.mesh(scene,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.76}));
  return cars=>{
    for(const {g,bars} of nodes){
      const car=cars.find(c=>c?.repairPercent!=null && garageAt(c)===g);
      for(const bar of bars){
        bar.visible=!!car;
        if(car){bar.scale.x=4.65*car.repairPercent/100;bar.position.x=g.x-2.325+bar.scale.x/2;}
      }
    }
  };
}
