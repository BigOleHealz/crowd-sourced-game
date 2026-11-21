import * as THREE from 'three';

let finish;
export function equipmentFinish(){
  if(finish)return finish;
  const loader=new THREE.TextureLoader();
  const plates=loader.load('./equipment-plates.webp'),grain=loader.load('./equipment-finish.webp');
  plates.colorSpace=THREE.SRGBColorSpace;
  grain.wrapS=grain.wrapT=THREE.MirroredRepeatWrapping;
  plates.anisotropy=grain.anisotropy=4;
  finish=new THREE.MeshPhongMaterial({vertexColors:true,map:plates,specular:0x51564f,shininess:31});
  finish.name='Rubbed field finish';
  finish.onBeforeCompile=shader=>{
    shader.uniforms.alloyGrain={value:grain};
    shader.vertexShader='varying vec3 fieldPoint,fieldNormal;\n'+shader.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\nfieldPoint=position;fieldNormal=normal;');
    shader.fragmentShader='uniform sampler2D alloyGrain;varying vec3 fieldPoint,fieldNormal;\n'+shader.fragmentShader
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec3 N=abs(normalize(fieldNormal));
        vec2 surface=N.x>N.y && N.x>N.z ? fieldPoint.zy : N.y>N.z ? fieldPoint.xz : fieldPoint.xy;
        float grain=texture2D(alloyGrain,surface*4.5).r;
        diffuseColor.rgb*=.68+.69*grain;
        // A broad, soft edge catches the sky on the rounded, handled shells.
        float bevel=1.-max(N.x,max(N.y,N.z));
        diffuseColor.rgb+=vec3(.034,.033,.030)*smoothstep(.025,.24,bevel)*(.35+grain);
      `);
  };
  finish.addEventListener('dispose',()=>{grain.dispose();plates.dispose();finish=undefined;});
  return finish;
}

// The held prop has more screen area in the sight camera. Cool metal catches
// a narrow sky highlight, while warm furniture and dark grips stay diffuse.
// Both finishes reuse the mounted equipment's existing two texture samplers.
let handheld;
export function carriedFinish(){
  if(handheld)return handheld;
  const base=equipmentFinish();
  handheld=base.clone();
  handheld.name='Carried equipment finish';
  handheld.onBeforeCompile=shader=>{
    base.onBeforeCompile(shader);
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_phong_fragment>',`
      #include <lights_phong_fragment>
      float alloy=smoothstep(.010,.048,vColor.b-vColor.r);
      float timber=smoothstep(.032,.10,vColor.r-vColor.g)*smoothstep(.017,.046,vColor.g-vColor.b);
      float streak=texture2D(alloyGrain,vec2(fieldPoint.z*1.3,fieldPoint.y*19.+fieldPoint.x*7.)).r;
      material.diffuseColor*=mix(1.,.77+.48*streak,timber);
      material.specularColor=mix(vec3(.033),vec3(.30,.34,.37),alloy);
      material.specularShininess=mix(14.,55.,alloy);
    `);
  };
  handheld.addEventListener('dispose',()=>{handheld=undefined;});
  return handheld;
}

// The mesh, paint, and make-believe inventory plate stay in a single batch.
export function equipmentPlate(batch,row,side,x,y,z,width,height){
  const geo=new THREE.PlaneGeometry(1,1),uv=geo.getAttribute('uv');
  for(let i=0;i<uv.count;i++){
    uv.setXY(i,(4+230*uv.getX(i))/512,1-(row*64+3+58*(1-uv.getY(i)))/512);
  }
  geo.setAttribute('batchUv',uv);
  batch.add(geo,0xffffff,x,y,z,width,height,1,0,side*Math.PI/2);
  geo.dispose();
}
