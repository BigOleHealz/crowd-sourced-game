import * as THREE from 'three';

// Three nearby incidents, each with two marks. Noise breaks the marks around
// the printed siding so the blackening and ember glow remain attached to it.
export function burnScars(scene){
  const geometry=new THREE.PlaneGeometry(),material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`varying vec2 vUv;varying vec3 tint;
      void main(){vUv=uv;tint=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;varying vec3 tint;
      float hash(vec2 p){return fract(sin(dot(p,vec2(23.9,67.1)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
      void main(){vec2 uv=vUv*2.-1.;float grain=noise(vUv*21.)*.3+noise(vUv*8.)*.7;
        float edge=length(vec2(uv.x*(.94+.20*uv.y),uv.y))+.31*grain;
        float alpha=(1.-smoothstep(.77,1.14,edge))*(.53+.35*grain);
        vec3 color=mix(vec3(.027,.018,.013),vec3(.15,.064,.024),grain);
        float ember=smoothstep(.87,.98,grain)*tint.r*(1.-abs(uv.y));
        gl_FragColor=vec4(color+ember*vec3(.9,.17,.013),alpha);
        #include <colorspace_fragment>
      }`});
  const mesh=new THREE.InstancedMesh(geometry,material,6),pose=new THREE.Object3D(),color=new THREE.Color();
  mesh.visible=false;mesh.frustumCulled=false;mesh.renderOrder=0;mesh.name='Scorched siding';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
  let count=0;
  return {
    begin(){count=0;},
    add(site,f,alongX){
      const side=Math.sign(alongX?f.z-site.z:f.x-site.x)||1;
      for(const offset of [-1,1]){
        const edge=alongX?site.w/2:site.d/2;
        const across=THREE.MathUtils.clamp((alongX?f.x-site.x:f.z-site.z)+offset*f.level*.32,-edge+.9,edge-.9);
        const x=alongX?site.x+across:site.x+side*(site.w/2+.12);
        const z=alongX?site.z+side*(site.d/2+.12):site.z+across;
        const h=1.40+f.level*.83;
        pose.position.set(x,Math.max(1+h/2,f.y+.25+offset*.20),z);
        pose.rotation.set(0,alongX?0:Math.PI/2,0);pose.scale.set(1.4+f.level*.83,h,1);
        pose.updateMatrix();mesh.setMatrixAt(count,pose.matrix);mesh.setColorAt(count++,color.setRGB(f.level/3,0,0));
      }
    },
    finish(){mesh.count=count;mesh.visible=!!count;if(count){mesh.instanceColor.needsUpdate=true;mesh.instanceMatrix.needsUpdate=true;}}
  };
}
