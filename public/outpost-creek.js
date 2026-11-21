import * as THREE from 'three';
import {MAP,terrainHeight} from './world.js';
import {skyDarkness} from './road-lighting.js';

const width=125,extra=-MAP.northBound-MAP.bounds,length=125+extra,center=-extra/2;
export function depthSurvey(cols,rows){
  const data=new Uint8Array(cols*rows);
  for(let z=0;z<rows;z++)for(let x=0;x<cols;x++){
    const height=terrainHeight(((x+.5)/cols-.5)*width,center+(.5-(z+.5)/rows)*length);
    data[z*cols+x]=Math.round(255*Math.max(0,Math.min(1,(MAP.waterY-height)/3.5)));
  }
  return data;
}
export function riverbedTexture(renderer){
  const bed=new THREE.TextureLoader().load('./outpost-riverbed.webp');
  bed.colorSpace=THREE.SRGBColorSpace;bed.wrapS=bed.wrapT=THREE.MirroredRepeatWrapping;
  bed.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  return bed;
}
export function addOutpostCreek(scene,panorama,bed){
  const cols=176,rows=248,depth=new THREE.DataTexture(depthSurvey(cols,rows),cols,rows,THREE.RedFormat);
  depth.minFilter=depth.magFilter=THREE.LinearFilter;depth.needsUpdate=true;
  const time={value:0},material=new THREE.MeshStandardMaterial({map:bed,roughness:.24,metalness:0});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{riverDepth:{value:depth},riverSky:{value:panorama},riverTime:time,riverDark:skyDarkness});
    shader.vertexShader='varying vec3 riverPoint;\n'+shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nriverPoint=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`uniform sampler2D riverDepth,riverSky;uniform float riverTime,riverDark;varying vec3 riverPoint;
    `+shader.fragmentShader.replace('#include <map_fragment>',`
      vec2 p=riverPoint.xz;
      float depth=3.5*texture2D(riverDepth,vMapUv).r;
      float creek=1.-smoothstep(3.,7.,abs(p.y-.7*sin(p.x*.15)));
      float riffle=creek*(1.-smoothstep(.25,1.20,depth));
      vec2 flow=vec2(p.x,p.y-.7*sin(p.x*.15)*creek);
      float t=riverTime;
      float sweep=sin(flow.x*1.2-flow.y*.48-t*(1.2+.60*creek));
      float crossing=sin(flow.x*.53+flow.y*1.93-t*.69+.76*sweep);
      float detail=1.-smoothstep(.04,.35,max(fwidth(p.x),fwidth(p.y)));
      float corrugation=sin(flow.x*5.0+flow.y*1.7-t*3.4+2.2*crossing)*detail;
      vec2 slope=vec2(.041*sweep+.019*corrugation,.044*crossing+.013*corrugation)*(1.+.58*riffle);
      // Small wave trains trail each bridge pile, widening and fading downstream.
      vec2 pile=vec2(flow.x, p.y)-vec2(${MAP.bridge.x.toFixed(2)},${MAP.bridge.z.toFixed(2)});
      float down=pile.x+${(MAP.bridge.width*.5).toFixed(2)};
      if(down>${MAP.bridge.width.toFixed(2)})down-=${MAP.bridge.width.toFixed(2)};
      float band=abs(abs(pile.y)-(.10+.18*max(0.,down)));
      float wake=exp(-band*5.8)*smoothstep(0.,.17,down)*(1.-smoothstep(.25,3.3,down));
      float rings=sin(17.*down+7.*abs(pile.y)-5.*t);
      slope+=vec2(.055,.047*sign(pile.y))*wake*rings*detail;
      vec3 N=normalize(vec3(slope.x,1.,slope.y)),V=normalize(cameraPosition-riverPoint);
      vec2 bedPoint=p-(V.xz/max(.7,V.y))*.24*min(depth,1.3)+slope*min(depth,.9)*.47;
      vec3 stones=texture2D(map,bedPoint*.77).rgb;
      float transmission=exp(-.89*depth);
      float lace=pow(max(0.,.55*crossing+.45*corrugation),5.)*detail;
      diffuseColor.rgb*=mix(vec3(.020,.080,.073),stones*vec3(1.17,1.24,1.14)*(1.+.34*lace),transmission);
      diffuseColor.rgb+=vec3(.07,.10,.097)*wake*max(0.,rings)*detail;
    `).replace('#include <normal_fragment_maps>',`
      #include <normal_fragment_maps>
      normal=normalize(mat3(viewMatrix)*N);
    `).replace('#include <opaque_fragment>',`
      vec3 reflected=reflect(-V,N);
      vec2 skyUV=vec2(atan(reflected.x,-reflected.z)/6.2831853+.5,clamp(.42+.49*asin(clamp(reflected.y,-1.,1.)),.34,.99));
      vec3 sky=texture2D(riverSky,skyUV,2.5).rgb*mix(vec3(1.),vec3(.067,.091,.15),riverDark);
      float fresnel=.039+.30*pow(1.-clamp(dot(N,V),0.,1.),3.);
      outgoingLight=mix(outgoingLight,sky,fresnel);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=>'outpost-creek';
  material.addEventListener('dispose',()=>depth.dispose());
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(width,length).rotateX(-Math.PI/2),material);
  surface.name='Outpost river';surface.position.set(0,MAP.waterY,center);surface.receiveShadow=true;scene.add(surface);
  return seconds=>{time.value=seconds;};
}
