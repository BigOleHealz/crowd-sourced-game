import * as THREE from 'three';

// At a few dozen pixels tall the backpack, shoulders and separate moving
// limbs carry the silhouette. Nearby and injured residents use the full rig.
export function distantResidents(scene,Batch){
  const cube=new THREE.BoxGeometry(),round=new THREE.SphereGeometry(1,8,5);
  const material=new THREE.MeshLambertMaterial({vertexColors:true});
  const body=new Batch(),leg=new Batch(),arm=new Batch();
  body.add(round,0x8a8874,0,1.19,0,.225,.31,.14);
  body.add(round,0x575744,0,.92,0,.17,.14,.115);
  body.add(round,0x4d5147,0,1.56,-.005,.14,.175,.125);
  body.add(round,0x5d6556,0,1.68,.005,.149,.094,.135);
  body.add(cube,0x82725a,0,1.20,.124,.29,.39,.105);
  leg.add(round,0x78745f,0,-.37,0,.076,.39,.09);
  leg.add(cube,0x515046,0,-.79,-.035,.133,.133,.219);
  arm.add(round,0x8e8a73,0,-.21,0,.07,.234,.073);
  arm.add(round,0x625c4d,0,-.434,-.046,.060,.090,.062);
  function group(source,max){
    const mesh=new THREE.InstancedMesh(source.geometry(),material,max);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count=0;mesh.frustumCulled=false;mesh.name='Distant residents';scene.add(mesh);return mesh;
  }
  const upper=group(body,20),arms=group(arm,40),legs=group(leg,40);
  const root=new THREE.Object3D(),limb=new THREE.Object3D(),nearby=new Set();
  let count=0;
  function place(mesh,i,x,y,angle){
    limb.position.set(x,y,0);limb.rotation.x=angle;limb.updateMatrix();
    limb.matrixWorld.multiplyMatrices(root.matrix,limb.matrix);mesh.setMatrixAt(i,limb.matrixWorld);
  }
  cube.dispose();round.dispose();
  return {
    begin(){count=0;},
    add(state,local,zoom,time){
      const radius=(nearby.has(state.id)?44:37)*zoom;
      const far=Math.hypot(local.x-state.x,local.y-state.y,local.z-state.z)>radius;
      if(!far || state.dead || state.fall || state.lostParts || state.swimming){
        nearby.add(state.id);return false;
      }
      nearby.delete(state.id);
      const index=count++,swing=state.moving?Math.sin(time*4.8+state.x*.19)*.26:0;
      root.position.set(state.x,state.y,state.z);root.rotation.y=-state.yaw;root.updateMatrix();
      upper.setMatrixAt(index,root.matrix);
      for(let side=0;side<2;side++){
        const sign=side===0?-1:1;
        place(legs,index*2+side,.092*sign,.86,sign*swing);
        place(arms,index*2+side,.21*sign,1.39,-sign*swing-.13);
      }
      return true;
    },
    finish(){
      for(const [mesh,n] of [[upper,count],[arms,count*2],[legs,count*2]]){
        mesh.count=n;if(n)mesh.instanceMatrix.needsUpdate=true;
      }
    }
  };
}
