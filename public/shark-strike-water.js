import * as THREE from 'three';

// A horizontal film sits on the waves. It marks the individual lunges while the
// existing suspended pigment and air bubbles follow the swimmer down the column.
export function strikeWaterFilm(scene,waterline,capacity,foamOnly=false,name=foamOnly?'Feeding shark foam':'Shark surface strike rings'){
  const geo=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);
  const state=new THREE.InstancedBufferAttribute(new Float32Array(capacity*3),3);
  state.setUsage(THREE.DynamicDrawUsage);geo.setAttribute('strikeState',state);
  const mat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`
      attribute vec3 strikeState;
      varying vec2 point;varying vec3 strike;
      void main(){
        point=uv*2.-1.;strike=strikeState;
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);
      }`,
    fragmentShader:`
      varying vec2 point;varying vec3 strike;
      float hash(vec2 p){return fract(sin(dot(p,vec2(37.13,21.79)))*32137.42);}
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      void main(){
        float t=strike.x,seed=strike.y,fade=strike.z;
        vec2 q=point; q.x+=.18*sin(q.y*6.+seed)*(.25+q.y*.22);
        float n=noise(4.5*q+seed)+.36*noise(12.5*q-seed);
        float r=length(q)+.18*(n-.65);
        float core=1.-smoothstep(.15,.7,r);
        float edge=.56+.16*n+.05*sin(q.y*10.+seed);
        float stain=(1.-smoothstep(edge-.14,edge,r))*(.35+.65*core);
        float crest=.37+.53*(1.-exp(-2.7*t));
        float froth=(1.-smoothstep(.018,.13,abs(r-crest)))*smoothstep(.36,.81,n)
                   *(1.-smoothstep(.18,1.08,t));
        float alpha=fade*(${foamOnly ? '1.15*froth' : '.65*stain+.90*froth'});
        if(alpha<.006)discard;
        vec3 blood=mix(vec3(.102,.006,.010),vec3(.34,.035,.045),1.-core);
        gl_FragColor=vec4(${foamOnly ? 'vec3(.86,.94,.90)' : 'mix(blood,vec3(.68,.75,.65),froth)'},alpha);
        #include <colorspace_fragment>
      }`,
  });
  const film=new THREE.InstancedMesh(geo,mat,capacity);
  film.name=name;
  film.frustumCulled=false;film.renderOrder=foamOnly?6:5;
  film.instanceMatrix.setUsage(THREE.DynamicDrawUsage);film.count=0;scene.add(film);
  const pose=new THREE.Object3D();
  return {
    mark(i,x,z,phase,t,fade,scale,yaw,surfaceY=waterline){
      const spread=.36+1.1*Math.sqrt(t);
      pose.position.set(x+.068*t,surfaceY+.024,z+.033*t);
      pose.rotation.y=-yaw;
      pose.scale.set(scale*spread*1.45,1,scale*spread*1.90);
      pose.updateMatrix();film.setMatrixAt(i,pose.matrix);
      state.setXYZ(i,t,phase,fade);
    },
    finish(count){
      film.count=count;film.visible=count>0;
      if(count){film.instanceMatrix.needsUpdate=true;state.needsUpdate=true;}
    },
  };
}
