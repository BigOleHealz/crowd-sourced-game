import * as THREE from 'three';
import {marketStores} from './market-goods.js';

// Banknotes and the live checkout stock share a single instanced draw call.
export function marketStockView(scene){
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial({roughness:.82}),
    pose=new THREE.Object3D(),color=new THREE.Color(),colors={tape:0x607a78,chart:0xe9d6a8,wrap:0xe4d8ca,snack:0xe4aa6b};
  let mesh,revision=-1;
  return state=>{
    if(state.revision===revision)return;
    revision=state.revision;
    const required=48+state.drops.length*5;
    if(!mesh || mesh.instanceMatrix.count<required){
      if(mesh){scene.remove(mesh);mesh.dispose();}
      mesh=new THREE.InstancedMesh(geometry,material,Math.max(80,required*2));
      mesh.frustumCulled=false;scene.add(mesh);
    }
    let index=0;
    function box(x,y,z,w,h,d,tint){
      pose.position.set(x,y,z);pose.scale.set(w,h,d);pose.updateMatrix();
      mesh.setMatrixAt(index,pose.matrix);mesh.setColorAt(index++,color.setHex(tint));
    }
    for(const store of marketStores){
      const stock=state.shops[store.id];if(!stock)continue;
      Object.entries(stock.stock).forEach(([sku,n],slot)=>{
        for(let i=0;i<n;i++){
          const x=store.x+(i%2-.5)*.21,z=store.z+store.side*(slot?-.7:.67);
          box(x,store.y+1.075+Math.floor(i/2)*.095,z,.195,.09,.34,colors[sku]);
        }
      });
    }
    for(const d of state.drops){
      if(d.sidearm){
        box(d.x,d.y+.057,d.z,.084,.085,.34,0x434f53);
        box(d.x+.082,d.y+.053,d.z+.092,.18,.07,.09,0x323e3d);
        box(d.x,d.y+.095,d.z-.12,.045,.019,.035,0xcbcfaa);
      }else if(d.items)box(d.x,d.y+.115,d.z,.40,.23,.32,0x82715a);
      if(d.cash){
        const y=d.y+(d.items && !d.sidearm ? .27 : .07),x=d.x+(d.sidearm ? .31 : 0);
        box(x,y,d.z,.32,.105,.17,0x679876);
        box(x,y+.002,d.z,.055,.11,.176,0xf1e9c5);
      }
    }
    mesh.count=index;mesh.visible=index>0;mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
  };
}
