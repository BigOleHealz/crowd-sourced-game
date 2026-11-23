import {breezeMaterial} from './waterfront-breeze.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import { MAP, groundHeight } from './world.js';
import {treeFallAngle} from './tree-fall.js';

// Build three palm crowns once, then instance them along the avenues.
function palmGeometry(variant, distant=false) {
  const positions=[], colors=[], indices=[], uv=[];
  let seed=725+37*variant;
  const rand=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
  function vertex(x,y,z,color,u=0,v=0){
    uv.push(u,v);
    positions.push(x,y,z);colors.push(color.r,color.g,color.b);return positions.length/3-1;
  }
  function stem(t) {return [.53*t*t-.15*t,5.34*t,.34*Math.sin(t*1.8)*t];}
  const segments=distant ? 6 : 12, tiers=distant ? 5 : 18, bark=new THREE.Color(0xe2dfcf);
  for(let i=0;i<=tiers;i++){
    const t=i/tiers, [x,y,z]=stem(t),radius=.174+.112*Math.exp(-18*t)-.055*t+.007*Math.sin(11*t);
    for(let j=0;j<=segments;j++){
      const a=j*2*Math.PI/segments, w=radius*(1+.035*Math.cos(3*a+t));
      vertex(x+Math.cos(a)*w,y,z+Math.sin(a)*w,bark,j/segments,t*5.2);
      if(i && j){
        const k=i*(segments+1)+j, prev=k-segments-1;
        indices.push(prev-1,k-1,k,prev-1,k,prev);
      }
    }
  }
  const barkCount=indices.length;
  const [cx,cy,cz]=stem(1);
  const fronds=distant ? 14 : 23, sections=distant ? 8 : 23;
  for(let f=0;f<fronds;f++){
    const angle=f*2.39996+variant*.5+rand()*.19, sn=Math.sin(angle), cs=Math.cos(angle);
    const high=f%4, length=2.95+.64*rand()-.38*high;
    const rise=.56+.48*high+.38*rand(), droop=1.50-.49*high+.36*rand(), curve=(rand()-.5)*.75;
    const leaf=new THREE.Color().setHSL(.197+.085*rand(),.44+.12*rand(),.17+.088*rand()+(high===2?.025:0));
    function rachis(t){
      const bend=curve*t*t, reach=length*t;
      return [cx+cs*reach-sn*bend,cy+.12+rise*Math.sin(Math.PI*t*.81)-droop*t*t,cz+sn*reach+cs*bend];
    }
    function ribbon(point,tangent,width,c) {
      return [vertex(point[0]-sn*width,point[1],point[2]+cs*width,c),
        vertex(point[0]+sn*width,point[1]+tangent,point[2]-cs*width,c)];
    }
    let last;
    for(let n=0;n<=sections;n++) {
      const t=n/sections, p=rachis(t);
      const edge=ribbon(p,.012*(1-t),.032*(1-t)+.004,new THREE.Color(0x929352));
      if(last)indices.push(last[0],edge[0],last[1],last[1],edge[0],edge[1]);
      last=edge;
      if(n<2 || n===sections)continue;
      for(const side of [-1,1]){
        const spread=(.18+.52*Math.sin(Math.PI*t)**.70)*(.90+.20*rand());
        const forward=.14+.37*t, sag=spread*(.42+.27*rand());
        const width=(distant ? .105 : .040)+.014*Math.sin(Math.PI*t), shade=leaf.clone().multiplyScalar(.87+.20*rand());
        const mid=[p[0]+cs*forward*.48-sn*side*spread*.54,p[1]-.10*sag,p[2]+sn*forward*.48+cs*side*spread*.54];
        const root=vertex(...p,shade), leading=vertex(mid[0]-cs*width,mid[1],mid[2]-sn*width,shade);
        const fold=vertex(mid[0],mid[1]+.023,mid[2],shade.clone().multiplyScalar(1.17));
        const trailing=vertex(mid[0]+cs*width,mid[1]-.025,mid[2]+sn*width,shade);
        const end=vertex(p[0]+cs*forward-sn*side*spread,p[1]-sag,p[2]+sn*forward+cs*side*spread,shade);
        indices.push(root,leading,fold,root,fold,trailing,leading,end,fold,fold,end,trailing);
      }
    }
  }
  const g=new THREE.BufferGeometry();
  const flex=Array.from({length:positions.length/3},(_,i)=>i<(tiers+1)*(segments+1)?0:
    Math.min(1,Math.hypot(positions[i*3]-cx,positions[i*3+2]-cz)/3.3)**1.6);
  g.setAttribute('windFlex',new THREE.Float32BufferAttribute(flex,1));
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.addGroup(0,barkCount,0);g.addGroup(barkCount,indices.length-barkCount,1);
  g.setIndex(indices);g.computeVertexNormals();return g;
}

export function addPalms(scene,renderer) {
  const map=new THREE.TextureLoader().load('./palm-bark.webp');
  map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
  const material=[new THREE.MeshLambertMaterial({map,vertexColors:true}),
    breezeMaterial('palm',{vertexColors:true,side:THREE.DoubleSide})];
  const transform=new THREE.Object3D();
  function palmInstances(geometry,materials,capacity){
    const mesh=new THREE.InstancedMesh(geometry,materials,capacity);
    mesh.count=0;mesh.visible=false;
    mesh.userData.impactSurface='palm';
    mesh.castShadow=mesh.receiveShadow=true;
    scene.add(mesh);return mesh;
  }
  const variants = Array.from({length:3}, (_, v) => {
    const trees = MAP.trees.filter((_,i)=>i%3===v).map(({x,z,height,treeId,marinaPalm},i)=>{
      transform.position.set(x,groundHeight(x,z),z);
      transform.rotation.y=i*2.39996+v;
      transform.scale.setScalar(height/6.9);
      transform.updateMatrix();
      return {id:treeId,height,position:transform.position.clone(),quaternion:transform.quaternion.clone(),matrix:transform.matrix.clone(),near:null,marinaPalm};
    });
    const meshes=[false,true].map(distant=>palmInstances(palmGeometry(v,distant),material,trees.length));
    return {trees,meshes};
  });
  const lastEye=new THREE.Vector3();
  const fallAxis=new THREE.Vector3();
  let lastFalls='';
  let lastFov=0;
  const marinaTrees=variants.flatMap(group=>group.trees.filter(tree=>tree.marinaPalm));
  function installMarinaPalm({scene:model}){
    const near=model.getObjectByName('Near'),far=model.getObjectByName('Far');
    const leaves=breezeMaterial('palm',{map:near.material.map,vertexColors:true,side:THREE.DoubleSide,alphaTest:.30});
    const meshes=[near,far].map(({geometry})=>{
      const points=geometry.getAttribute('position'),flex=new Float32Array(points.count);
      for(let i=0;i<points.count;i++){
        // Only the fronds reach beyond the compact cluster of nuts and leaf bases.
        const reach=Math.hypot(points.getX(i)-.81,points.getZ(i));
        flex[i]=THREE.MathUtils.smoothstep(reach,.33,2.75);
        if(points.getY(i)<3.17)flex[i]=0;
      }
      geometry.setAttribute('windFlex',new THREE.BufferAttribute(flex,1));
      return palmInstances(geometry,leaves,marinaTrees.length);
    });
    for(const group of variants)group.trees=group.trees.filter(tree=>!tree.marinaPalm);
    variants.push({trees:marinaTrees,meshes});
    for(const group of variants)for(const tree of group.trees)tree.near=null;
    lastFov=0;
    near.material.dispose();
  }
  let requestMarina=marinaTrees.length>0;
  return (camera,doors,tick=0)=>{
    const falls=doors?.fallenTrees??{};
    const revision=Object.keys(falls).join(',');
    const fallsChanged=revision!==lastFalls;
    const animating=Object.values(falls).some(f=>tick-f.tick<21);
    if(camera.fov===lastFov && camera.position.distanceToSquared(lastEye)<4 && !fallsChanged && !animating)return;
    lastEye.copy(camera.position);
    lastFov=camera.fov;
    lastFalls=revision;
    // Keep close fronds detailed through scopes, with a band to avoid flicker.
    const radius=36*Math.tan(THREE.MathUtils.degToRad(55/2))/Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
    if(requestMarina && marinaTrees.some(t=>t.position.distanceToSquared(lastEye)<125**2)){
      requestMarina=false;
      // Keep the original trees available while downloading and as an offline fallback.
      new GLTFLoader().load('./marina-palm.glb',installMarinaPalm,undefined,()=>{});
    }
    for(const {trees,meshes} of variants){
      let changed=false;
      for(const tree of trees){
        const limit=radius+(tree.near ? 4 : 0);
        const near=tree.position.distanceToSquared(lastEye)<limit*limit;
        if(near!==tree.near){tree.near=near;changed=true;}
      }
      if(!changed && !fallsChanged && !animating)continue;
      for(const mesh of meshes)mesh.count=0;
      for(const tree of trees){
        const mesh=meshes[tree.near?0:1];
        const fall=falls[tree.id];
        if(fall){
          transform.position.copy(tree.position);
          fallAxis.set(fall.z,0,-fall.x);
          transform.quaternion.setFromAxisAngle(fallAxis,treeFallAngle(fall,tick)).multiply(tree.quaternion);
          transform.scale.setScalar(tree.height/6.9);
          transform.updateMatrix();
          mesh.setMatrixAt(mesh.count++,transform.matrix);
        }else mesh.setMatrixAt(mesh.count++,tree.matrix);
      }
      for(const mesh of meshes){
        mesh.visible=mesh.count>0;
        mesh.instanceMatrix.needsUpdate=true;
        mesh.computeBoundingSphere();
      }
    }
    if(fallsChanged || animating)renderer.shadowMap.needsUpdate=true;
  };
}
