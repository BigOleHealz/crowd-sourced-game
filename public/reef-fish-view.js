import * as THREE from 'three';
import {fishSpecies,fishSchools,fishPose} from './reef-fish.js';

function fishGeometry(id,species) {
  const positions=[],colors=[],ink=new THREE.Color();
  const triangle=(a,b,c,color)=>{
    positions.push(...a,...b,...c);
    ink.setHex(color);
    for(let i=0;i<3;i++)colors.push(ink.r,ink.g,ink.b);
  };
  const snapper=id==='yellowtail-snapper',spade=id==='atlantic-spadefish';
  const body=spade?0xc7cfca:snapper?0x8bacb5:0x97a8a3;
  const back=spade?0x586965:snapper?0x457b86:0x486757;
  const belly=spade?0xe6e2cf:snapper?0xe9dcca:0xd6dacf;
  const fin=spade?0x666e67:snapper?0xeab747:0x66776f;
  const rings=[[-.39,.11],[-.32,.19],[-.22,.64],[-.08,.97],[.06,1],[.17,.94],[.27,.77],[.35,.52],[.43,.13]];
  const ringPoint=([z,r],angle)=>[.5*r*Math.cos(angle),.5*r*Math.sin(angle),z];
  for(let band=1;band<rings.length;band++)for(let side=0;side<16;side++){
    const a=side*Math.PI/8,b=(side+1)*Math.PI/8,height=Math.sin((a+b)/2);
    let tint=height>.66?back:height<-.48?belly:body;
    if(snapper && Math.abs(height)<.23)tint=0xf6cd42;
    if(spade && height>-.82 && [2,4,6].includes(band))tint=0x343e40;
    if(!spade && !snapper && height>.1 && height<.7 && band%2===0)tint=0x6f817c;
    const p=ringPoint(rings[band-1],a),q=ringPoint(rings[band-1],b);
    const r=ringPoint(rings[band],a),s=ringPoint(rings[band],b);
    triangle(p,q,r,tint);triangle(q,s,r,tint);
  }
  // Head, forked tail lobes, dorsal rays and paired pectorals.
  const tip=spade?.46:snapper?.47:.53;
  for(let side=0;side<16;side++)triangle(ringPoint(rings.at(-1),side*Math.PI/8),
    ringPoint(rings.at(-1),(side+1)*Math.PI/8),[0,-.02,tip],side<8?body:belly);
  for(const sign of [-1,1]){
    triangle([0,0,-.375],[0,sign*.13,-.49],[0,sign*(spade?.51:.85),-.58],fin);
    triangle([sign*.43,.03,.13],[sign*.83,-.35,-.10],[sign*.50,-.19,.08],fin);
    const eyeX=sign*.326;
    const pupil=[eyeX, .12, .31];
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
      triangle(pupil,[eyeX,.12+.065*Math.cos(a),.31+.026*Math.sin(a)],
        [eyeX,.12+.065*Math.cos(b),.31+.026*Math.sin(b)],0x152326);
    }
  }
  triangle([0,.40,.21],[0,spade?.90:.79,spade?-.10:.01],[0,.31,-.22],fin);
  triangle([0,-.31,-.21],[0,spade?-.71:-.49,-.16],[0,-.42,.025],fin);
  if(!spade && !snapper)triangle([0,.42,.20],[0,.86,.16],[0,.42,.08],back);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.scale(species.width,species.height,species.length);
  geometry.computeVertexNormals();
  return geometry;
}

export function reefFishView(scene,waterY) {
  const schoolsBySpecies=new Map(),dummy=new THREE.Object3D(),pose={};
  for(const [id,species] of Object.entries(fishSpecies)){
    const schools=fishSchools.filter(s=>s.species===id);
    const material=new THREE.MeshLambertMaterial({side:THREE.DoubleSide,vertexColors:true});
    const clock={value:0};
    material.onBeforeCompile=shader=>{
      shader.uniforms.fishSeconds=clock;
      shader.vertexShader='uniform float fishSeconds;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
        `#include <begin_vertex>
         float tail = smoothstep(0.03, 0.57, -position.z / ${species.length.toFixed(3)});
         transformed.x += ${(.11*species.length).toFixed(3)} * tail * tail
           * sin(fishSeconds*6.2 + instanceMatrix[3].x*1.7 + tail*2.3);`);
    };
    material.customProgramCacheKey=()=>id;
    const mesh=new THREE.InstancedMesh(fishGeometry(id,species),material,schools.reduce((n,s)=>n+s.count,0));
    mesh.name=species.name;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
    schoolsBySpecies.set(id,{mesh,schools,clock});
  }
  return (viewer,tick)=>{
    const seconds=tick/30;
    for(const {mesh,schools,clock} of schoolsBySpecies.values()){
      let count=0;
      if(Math.abs(viewer.y-waterY)<9){
        for(const school of schools){
          if((viewer.x-school.x)**2+(viewer.z-school.z)**2>32**2)continue;
          for(let i=0;i<school.count;i++){
            fishPose(school,i,seconds,pose);
            dummy.position.set(pose.x,waterY-pose.depth,pose.z);
            dummy.rotation.set(0,pose.yaw,pose.roll,'YXZ');
            dummy.scale.setScalar(pose.scale);dummy.updateMatrix();
            mesh.setMatrixAt(count++,dummy.matrix);
          }
        }
      }
      mesh.visible=count>0;mesh.count=count;
      if(count){clock.value=seconds;mesh.instanceMatrix.needsUpdate=true;}
    }
  };
}
