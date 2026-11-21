import * as THREE from 'three';
import {paneBatch} from './pane-damage-view.js';
import {interiorPlans} from './building-interiors.js';
import { MAP, BREAKABLES, HELIPAD, terrainHeight, onBuildingLot } from './world.js';

function atlasMaterial(renderer,name) {
  const map=new THREE.TextureLoader().load(name);
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return new THREE.MeshStandardMaterial({map,vertexColors:true,roughness:.91});
}

// Baked UVs and vertex colors keep an entire group of buildings in one draw.
function tile(shape,index) {
  const uv=shape.attributes.uv.clone();
  for(let i=0;i<uv.count;i++) {
    uv.setXY(i,(index%2+.006+.988*uv.getX(i))*.5,(1-Math.floor(index/2)+.006+.988*uv.getY(i))*.5);
  }
  shape.setAttribute('batchUv',uv);
  return shape;
}

export function buildOutpost(scene,renderer,Batch) {
  const glass=new Batch(),panes=paneBatch(glass),sheet=new THREE.BoxGeometry();
  const walls=new Batch(true), masonry=atlasMaterial(renderer,'./depot-masonry.webp');
  const [facade,iron,concrete]=[0,1,2].map(n=>tile(new THREE.BoxGeometry(),n));
  const chimney=tile(new THREE.CylinderGeometry(.11,.13,1,10),1);
  const gable=new THREE.BufferGeometry();
  gable.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.5,0,1,0,0,0,.5],3));
  gable.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,.5,1,1,0],2));
  gable.computeVertexNormals();tile(gable,2);
  for(const b of MAP.buildings) {
    const {x,z,w,d,base,eave,rise,garage}=b,top=base+eave;
    walls.add(concrete,0xa59882,x,base-1.44,z,w+.14,2.9,d+.14);
    const plan=interiorPlans.find(p=>p.b===b);
    for(const wall of plan.shell){
      const furnishing=wall.kind==='desk';
      walls.add(furnishing?iron:garage?concrete:facade,furnishing?0x82928a:0xefebe0,
        wall.x,wall.bottom+wall.h/2,wall.z,wall.w,wall.h,wall.d);
    }
    const {length,outer,inner,front}=plan.ramp;
    const tilt=Math.atan2(inner-outer,length);
    walls.add(concrete,0xbcaf93,x,(outer+inner)/2-.05,front+length/2,garage?w-.28:2.15,.10,Math.hypot(length,inner-outer),tilt);
    // Deep eaves, gutters and masonry end walls give the gable a silhouette.
    const run=d*.5+.22, angle=Math.atan2(rise,d*.5);
    for(const sign of [-1,1]) {
      walls.add(gable,0xc5bca8,x+sign*w*.5,top,z,1,rise,d,0,sign===1 ? 0 : Math.PI);
      walls.add(iron,0xb0a695,x,top+rise*.5,z+sign*d*.25,w+.4,.12,Math.hypot(run,rise),sign*angle);
      walls.add(iron,0x57574c,x,top-.06,z+sign*run,w+.42,.10,.09);
      walls.add(iron,0x78766a,x+w*.5-.19,base+eave*.48,z+sign*(d*.5+.06),.08,eave*.96,.08);
    }
    walls.add(iron,0x999c8e,x,top+rise+.035,z,w+.47,.14,.24);
    if(!garage){
      for(const pane of plan.glazing){
        const {x,z,w,sill,head}=pane,h=head-sill,mid=(head+sill)/2;
        panes.add(pane.paneId,()=>glass.add(sheet,0xc0d2c7,x,mid,z,w,h,.037));
        for(const sign of [-1,1])walls.add(iron,0x778079,x+sign*(w/2+.015),mid,z,.04,h+.08,.17);
        for(const y of [head+.035,sill-.035])walls.add(concrete,0xb8ae9c,x,y,z,w+.11,.07,.20);
      }
      walls.add(concrete,0xab9a85,x-w*.29,top+rise+.10,z-.44,.64,1.44,.70);
      walls.add(concrete,0x756d5b,x-w*.29,top+rise+.86,z-.44,.80,.13,.83);
    }
    walls.add(chimney,0x888778,x+w*.34,top+rise+.23,z+.16,1,1.34,1);
  }
  walls.mesh(scene,masonry).userData.impactSurface='solid';
  for(const shape of [facade,iron,concrete,gable,chimney,sheet]) shape.dispose();

  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.2,transparent:true,opacity:.29,depthWrite:false});
  return {stacks:buildStacks(scene,renderer,Batch),updateGlass:panes.bind(glass.mesh(scene,material,false))};
}

export function buildStacks(scene,renderer,Batch) {
  const equipment=atlasMaterial(renderer,'./depot-equipment.webp');
  const box=tile(new THREE.BoxGeometry(),0),bundle=tile(new THREE.BoxGeometry(),1);
  const board=tile(new THREE.BoxGeometry(),2);
  const stacks=BREAKABLES.map((prop,i)=>{
    const stack=new Batch(true),w=prop.radius*1.52,d=prop.radius*1.20,h=prop.height;
    for(const foot of [-.36,0,.36]) stack.add(board,0x676252,foot*w,.07,0,w*.12,.14,d*.99);
    stack.add(box,0xe2dbbd,0,h*.22,0,w,h*.42,d,0,.035);
    for(const side of [-1,1]) stack.add(box,side===1 ? 0xbaad89 : 0xceccad,side*w*.237,h*.62,0,w*.46,h*.36,d*.91,0,side*.026);
    stack.add(bundle,0xded6b4,-.08*w,h*.893,0,w*.80,h*.215,d*.85,0,.07);
    const mesh=stack.mesh(scene,equipment);
    Object.assign(mesh.userData,{impactSurface:'gear',target:prop.id});
    mesh.position.set(prop.x,terrainHeight(prop.x,prop.z),prop.z);
    mesh.rotation.y=[-.26,.34,.2,-.35,.57,.1][i];
    return {prop,mesh,hp:null};
  });
  box.dispose();bundle.dispose();board.dispose();
  return stacks;
}

export function meadow(scene,renderer,rng,trailDistance) {
  const map=new THREE.TextureLoader().load('./meadow-plants.webp');
  map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const geometry=new THREE.PlaneGeometry(1,1).translate(0,.5,0);
  // Darker roots anchor intersecting cards to the ground under diffuse light.
  geometry.setAttribute('color',new THREE.Float32BufferAttribute([1,1,.98,1,1,.98,.31,.34,.25,.31,.34,.25],3));
  const material=new THREE.MeshLambertMaterial({map,vertexColors:true,alphaTest:.48,side:THREE.DoubleSide,shadowSide:THREE.FrontSide});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute float plantTile;\n'+shader.vertexShader
      .replace('#include <uv_vertex>','#include <uv_vertex>\n vMapUv.x=(plantTile+.006+vMapUv.x*.988)/3.;');
  };
  const matrix=new THREE.Object3D(),tint=new THREE.Color(),tiles=[];
  const plants=new THREE.InstancedMesh(geometry,material,15000);
  let count=0;
  for(let i=0;i<7500;i++) {
    const x=(rng()-.5)*70;
    const z=i<5000 ? (rng()-.5)*70 : -35+rng()*(MAP.northBound+MAP.bounds);
    const y=terrainHeight(x,z);
    const path=trailDistance(x,z);
    if(y<MAP.waterY+.27 || onBuildingLot(x,z,.18) || path<1.28 || Math.hypot(x-HELIPAD.x,z-HELIPAD.z)<2.75) continue;
    const verge=Math.min(1,(path-1.25)*.65),size=(.28+rng()*.48)*(.68+.32*verge);
    const coverage=Math.sin(x*.30+z*.19)+.65*Math.sin(x*.78-z*.36);
    if(coverage<-.68 && rng()<.75) continue;
    const roll=rng(),variant=roll<.14 ? 0 : roll<.79 ? 1 : 2,heading=rng()*Math.PI;
    const shade=.60+.25*rng();
    tint.setRGB(shade,shade*.98,shade*.85);
    for(const turn of [0,Math.PI/2]) {
      matrix.position.set(x,y-.045,z);matrix.rotation.y=heading+turn;
      matrix.scale.set(size*(1.1+.29*rng()),size*(.71+.32*rng()),1);matrix.updateMatrix();
      plants.setMatrixAt(count,matrix.matrix);plants.setColorAt(count,tint);tiles.push(variant);count++;
    }
  }
  plants.count=count;
  geometry.setAttribute('plantTile',new THREE.InstancedBufferAttribute(new Float32Array(tiles),1));
  plants.receiveShadow=true;plants.computeBoundingSphere();scene.add(plants);
}
