import {eveningAtlas,eveningReady,eveningGLSL} from './evening-sky.js';
import {skyDarkness} from './road-lighting.js';
import {waterfrontWind} from './waterfront-breeze.js';

// Keep the original shadow-receiving water plane. Moving wave slopes change the
// reflected sky without a mirror camera, a second render pass or a simulation.
export function lightBaySurface(material,panorama){
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{eveningAtlas,eveningReady});
    shader.uniforms.harborSky={value:panorama};
    shader.uniforms.harborWind=waterfrontWind;
    shader.uniforms.harborDark=skyDarkness;
    shader.vertexShader='varying vec3 bayPoint;\n'+shader.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nbayPoint=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader=`${eveningGLSL}
varying vec3 bayPoint;
      uniform vec4 harborWind;
      uniform sampler2D harborSky;
      uniform float harborDark;
    `+shader.fragmentShader.replace('#include <map_fragment>',`
      vec2 p=bayPoint.xz;
      float t=harborWind.z;
      // Fade individual capillary ripples before their wavelength falls below a pixel.
      vec2 footprint=fwidth(p);
      float detail=1.-smoothstep(.04,.45,max(footprint.x,footprint.y));
      float swell=sin(dot(p,vec2(.60,.31))-t*1.16);
      float crossWave=sin(dot(p,vec2(-.29,.92))-t*.81+.71*swell);
      float ripple=sin(dot(p,vec2(3.9,1.7))-t*2.05+1.48*crossWave);
      vec2 slope=(vec2(.050,.027)*swell+vec2(-.021,.040)*crossWave
        +vec2(.034,.016)*ripple*detail)*(.85+.32*harborWind.w);
      vec3 viewDir=normalize(cameraPosition-bayPoint);
      vec3 waveNormal=normalize(vec3(slope.x,1.,slope.y));
      vec3 reflected=reflect(-viewDir,waveNormal);
      float azimuth=atan(reflected.x,-reflected.z)/6.2831853+.5;
      float altitude=asin(clamp(reflected.y,-1.,1.));
      vec3 sky=texture2D(harborSky,vec2(azimuth,clamp(.30+.56*altitude,.28,.98)),3.1).rgb;
      vec3 trough=texture2D(map,vMapUv+vec2(.0024*t,-.0008*t)+slope*.29).rgb;
      diffuseColor.rgb*=mix(trough,vec3(.029,.135,.145),.25)*(.90+.065*swell);
    `).replace('#include <normal_fragment_maps>',`
      #include <normal_fragment_maps>
      normal=normalize(mat3(viewMatrix)*waveNormal);
    `).replace('#include <opaque_fragment>',`
      float grazing=pow(1.-clamp(dot(waveNormal,viewDir),0.,1.),3.);
      sky=eveningReflection(sky,azimuth,altitude,harborDark);
      outgoingLight=mix(outgoingLight,sky,.032+.29*grazing);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=>'biscayne-water';
}
