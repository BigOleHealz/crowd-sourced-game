import * as THREE from 'three';

const breeze={value:new THREE.Vector4()};
export function updateWaterfrontBreeze(seconds){
  const gust=.66+.23*Math.sin(seconds*.62)+.11*Math.sin(seconds*1.31+.8);
  const bearing=.34+.16*Math.sin(seconds*.26);
  breeze.value.set(gust*Math.cos(bearing),gust*Math.sin(bearing),seconds, gust);
}

// All displacement is applied after instancing, so rotated palms share the same
// onshore wind. A geometry weight keeps bark, leaf bases and flag hoists pinned.
export function breezeMaterial(kind,options){
  const material=new THREE.MeshLambertMaterial(options);
  const motion={
    palm:`float pulse=.78+.22*sin(breeze.z*1.55+instanceMatrix[3].x*.18+instanceMatrix[3].z*.08+position.x*.7);
      mvPosition.xz+=breeze.xy*(windFlex*pulse*.37);
      mvPosition.y-=windFlex*pulse*breeze.w*.065;`,
    shrub:`float pulse=.7+.3*sin(breeze.z*1.7+position.z*.49+position.x*.28);
      mvPosition.xz+=breeze.xy*(windFlex*pulse*.065);`,
    flag:`float wave=sin(breeze.z*4.9-position.x*4.4+position.z*.7);
      mvPosition.z+=windFlex*(breeze.y*.56+wave*(.10+.14*breeze.w));
      mvPosition.y+=windFlex*(wave*.055-(1.-breeze.w)*.24);`,
  }[kind];
  material.onBeforeCompile=shader=>{
    shader.uniforms.breeze=breeze;
    const projection=THREE.ShaderChunk.project_vertex.replace('mvPosition = modelViewMatrix',motion+'\nmvPosition = modelViewMatrix');
    shader.vertexShader='uniform vec4 breeze; attribute float windFlex;\n'+shader.vertexShader.replace('#include <project_vertex>',projection);
  };
  material.customProgramCacheKey=()=>kind;
  return material;
}

export function addClubBurgees(scene,main,floor){
  const points=[],colors=[],index=[],weights=[],pole=new THREE.CylinderGeometry(.045,.061,5.2,10);
  // A narrow swallowtail, with the club's white diagonal stripe woven across both faces.
  for(const [x,z] of [[42,-384.4],[61,-374.7]]){
    main.add(pole,0xb9ac91,x,floor+2.6,z);
    const tint=new THREE.Color();
    for(let i=0;i<16;i++){
      const u=i/16,v=(i+1)/16;
      for(let j=0;j<6;j++){
        const k=points.length/3;
        for(const [a,b] of [[u,j/6],[u,(j+1)/6],[v,j/6],[v,(j+1)/6]]){
          const reach=a*(1.45-.36*(1-Math.abs(b*2-1)));
          points.push(x+reach,floor+4.51+b*(.62-.16*a)-.13*a,z+.065*Math.sin(a*6)*a);
          weights.push(a*a*(3-2*a));
        }
        tint.set(Math.abs((i+.5)/16-(j+.5)/6*.46-.2)<.065?0xf0e5cb:i>11?0xbc7148:0x22606b);
        for(let n=0;n<4;n++)colors.push(tint.r,tint.g,tint.b);
        index.push(k,k+2,k+1,k+1,k+2,k+3);
      }
    }
  }
  pole.dispose();
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setIndex(index);geo.computeVertexNormals();
  geo.setAttribute('windFlex',new THREE.Float32BufferAttribute(weights,1));
  const mesh=new THREE.Mesh(geo,breezeMaterial('flag',{vertexColors:true,side:THREE.DoubleSide}));mesh.name='Yacht club burgees';scene.add(mesh);
}
