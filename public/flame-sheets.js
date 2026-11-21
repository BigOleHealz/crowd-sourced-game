import * as THREE from 'three';

// The burning sites share one camera-facing batch. The silhouette bends and
// breaks toward the tip, while the hottest part remains at the source.
export function flameSheets(scene){
  const capacity=36,geometry=new THREE.PlaneGeometry(1,1);
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,uniforms:{time:{value:0}},
    vertexShader:`
      uniform float time;
      varying vec2 cell;
      varying float phase;
      void main(){
        vec3 center=instanceMatrix[3].xyz;
        vec4 eye=modelViewMatrix*vec4(center,1.);
        eye.x+=position.x*instanceMatrix[0].x;
        eye.y+=(position.y+.5)*instanceMatrix[1].y;
        cell=uv;
        phase=time+dot(center.xz,vec2(.79,1.28));
        gl_Position=projectionMatrix*eye;
      }`,
    fragmentShader:`
      varying vec2 cell;
      varying float phase;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
      }
      void main(){
        float y=cell.y,x=cell.x*2.-1.;
        float curl=noise(vec2(phase*1.73,y*3.-phase*2.1))-.5;
        float grain=noise(vec2(x*3.1+phase*.32,y*6.-phase*4.5));
        float taper=.80*pow(max(.001,1.-y),.75);
        float edge=taper-abs(x-curl*(.15+y*.70))+grain*.26-.16;
        float alpha=smoothstep(-.035,.12,edge)*smoothstep(0.,.075,y)*(1.-smoothstep(.90,1.,y));
        if(alpha<.025)discard;
        float heat=clamp(edge*1.55+(1.-y)*.42+.15*grain,0.,1.);
        vec3 fire=mix(vec3(.59,.074,.010),vec3(1.,.38,.038),smoothstep(.08,.74,heat));
        fire=mix(fire,vec3(1.,.81,.30),smoothstep(.68,1.,heat));
        gl_FragColor=vec4(fire,alpha*.91);
        #include <colorspace_fragment>
      }`});
  const mesh=new THREE.InstancedMesh(geometry,material,capacity),pose=new THREE.Object3D();
  mesh.name='District flame fronts';mesh.visible=false;mesh.count=0;mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.renderOrder=1;scene.add(mesh);
  let write=0;
  return {
    tick(dt){material.uniforms.time.value=(material.uniforms.time.value+dt)%720;},
    begin(){write=0;},
    add(x,y,z,width,height){
      if(write>=capacity)return;
      pose.position.set(x,y,z);pose.scale.set(width,height,1);pose.updateMatrix();
      mesh.setMatrixAt(write++,pose.matrix);
    },
    finish(){mesh.count=write;mesh.visible=write>0;if(write)mesh.instanceMatrix.needsUpdate=true;},
  };
}
