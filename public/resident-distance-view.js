import * as THREE from 'three';
import {civilianLooks,civilianScanLooks} from './civilian-style.js';

// The same wardrobe drives both distances. A single instanced draw holds
// the far crowd, including exposed limbs, shoes, hats and bags.
export function distantResidents(scene){
  const mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),
    new THREE.MeshLambertMaterial(),Object.keys(civilianLooks).length*22);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count=0;mesh.frustumCulled=false;mesh.name='Distant residents';scene.add(mesh);
  const body=new THREE.Object3D(),part=new THREE.Object3D(),joint=new THREE.Object3D();
  const tint=new THREE.Color(),worldMatrix=new THREE.Matrix4();
  const nearby=new Set();
  let count=0;
  function ellipsoid(parent,c,x,y,z,w,h,d,tilt=0){
    part.position.set(x,y,z);part.scale.set(w,h,d);part.rotation.set(tilt,0,0);
    part.updateMatrix();worldMatrix.multiplyMatrices(parent,part.matrix);
    mesh.setMatrixAt(count,worldMatrix);mesh.setColorAt(count++,tint.setHex(c));
  }
  function pivot(x,y,angle){
    joint.position.set(x,y,0);joint.rotation.x=angle;joint.updateMatrix();
    joint.matrixWorld.multiplyMatrices(body.matrix,joint.matrix);
    return joint.matrixWorld;
  }
  return {
    begin(){count=0;},
    add(state,local,zoom,time){
      const p=civilianScanLooks[state.id]??civilianLooks[state.id];
      if(!p)return false;
      const radius=(nearby.has(state.id)?44:37)*zoom;
      const far=Math.hypot(local.x-state.x,local.y-state.y,local.z-state.z)>radius;
      if(!far || state.dead || state.fall || state.lostParts || state.swimming){
        nearby.add(state.id);return false;
      }
      nearby.delete(state.id);
      const fleeing=state.reaction==='gunfire';
      const swing=state.moving?Math.sin(time*(fleeing?9.4:4.8)+p.face*2.4)*(fleeing?.50:.26):0;
      body.position.set(state.x,state.y,state.z);body.rotation.set(fleeing?-.11:0,-state.yaw,0,'YXZ');
      body.scale.set(p.width,p.height,1);body.updateMatrix();
      const root=body.matrix;
      ellipsoid(root,p.top,0,1.26,0,.202,.263,.136);
      ellipsoid(root,p.pants,0,p.bottom==='skirt'?.905:.98,0,.185,p.bottom==='skirt'?.212:.12,.14);
      ellipsoid(root,p.skin,0,1.628,0,.101,.144,.101);
      const full=p.cut==='coils'||p.cut==='bob';
      ellipsoid(root,p.hair,0,1.708,.029,full?.13:.108,full?.104:.078,.103);
      if(p.cut==='bun'||p.cut==='pony')ellipsoid(root,p.hair,0,1.68,.121,.051,p.cut==='pony'?.092:.051,.051);
      if(p.extra==='cap'||p.extra==='straw'){
        const sun=p.extra==='straw',color=sun?0xc5a575:0x475868;
        ellipsoid(root,color,0,1.769,.004,.113,.057,.106);
        ellipsoid(root,color,0,1.746,-.038,sun?.17:.111,.012,.146);
      }
      if(p.extra==='satchel'||p.extra==='tote')ellipsoid(root,0xb09470,-.187,1.037,.031,.068,.136,.092);
      for(const side of [-1,1]){
        const leg=pivot(side*.106,.97,side*swing),bare=p.bottom==='shorts'||p.bottom==='skirt';
        ellipsoid(leg,p.bottom==='skirt'?p.skin:p.pants,0,-.187,0,.093,.227,.09);
        ellipsoid(leg,p.boots?p.shoe:bare?p.skin:p.pants,0,-.60,0,.066,.226,.072);
        ellipsoid(leg,p.shoe??0xc1b6a3,0,-.884,-.039,.066,.048,.126);
        const shield=fleeing && side===(p.face%2?-1:1);
        const arm=pivot(side*.203,1.437,shield?1.93+.16*swing:-side*swing*p.swing+(fleeing?.38:0));
        const sleeveless=p.shirt==='tank'||p.shirt==='dress',jacket=p.shirt==='jacket';
        ellipsoid(arm,sleeveless?p.skin:(p.sleeve??p.top),0,-.074,0,.074,.111,.074);
        ellipsoid(arm,jacket?(p.sleeve??p.top):p.skin,0,-.267,0,.055,.124,.056);
        ellipsoid(arm,jacket?(p.sleeve??p.top):p.skin,0,-.423,-.027,.044,.113,.043,.16);
        ellipsoid(arm,p.skin,0,-.528,-.044,.036,.046,.030);
      }
      return true;
    },
    finish(){
      mesh.count=count;
      if(count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}
    }
  };
}
