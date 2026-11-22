import * as THREE from 'three';

// Camera-facing strips run between the rendered nozzle and the server contact.
// Hold-to-fire refreshes one strip per operator at the existing shot cadence.
export function emberStreams(scene){
  const limit=16,geometry=new THREE.InstancedBufferGeometry();
  const ribbon=new THREE.PlaneGeometry(1,1,18,1);
  geometry.index=ribbon.index;
  geometry.setAttribute('position',ribbon.attributes.position);
  geometry.setAttribute('uv',ribbon.attributes.uv);
  const starts=new THREE.InstancedBufferAttribute(new Float32Array(limit*3),3);
  const ends=new THREE.InstancedBufferAttribute(new Float32Array(limit*3),3);
  const timing=new THREE.InstancedBufferAttribute(new Float32Array(limit*2),2);
  for(const [name,attr] of [['startAt',starts],['endAt',ends],['timing',timing]])geometry.setAttribute(name,attr.setUsage(THREE.DynamicDrawUsage));
  const mat=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{clock:{value:0}},
    vertexShader:`
      attribute vec3 startAt,endAt;
      attribute vec2 timing;
      uniform float clock;
      varying vec2 coord;
      varying float age,seed;
      void main(){
        age=clock-timing.x;seed=timing.y;coord=uv;
        vec4 a=modelViewMatrix*vec4(startAt,1.),b=modelViewMatrix*vec4(endAt,1.);
        vec4 p=mix(a,b,uv.x);vec2 d=b.xy*max(.01,-a.z)-a.xy*max(.01,-b.z);
        vec2 side=length(d)>.0001?normalize(vec2(-d.y,d.x)):vec2(1.,0.);
        float span=length(endAt-startAt);
        float radius=min(.055+sqrt(uv.x)*uv.x*.65,span*.16);
        p.xyz+=mat3(viewMatrix)*vec3(0.,min(span*.06,.58)*sin(3.14159*uv.x)*uv.x,0.);
        p.xy+=side*((uv.y*2.-1.)*radius+sin(uv.x*10.-clock*14.+seed)*uv.x*radius*.12);
        gl_Position=projectionMatrix*p;
      }`,
    fragmentShader:`
      varying vec2 coord;varying float age,seed;uniform float clock;
      void main(){
        float u=coord.x,v=coord.y*2.-1.,drift=u*18.-clock*12.+seed;
        float curl=sin(drift+3.*v)*.52+sin(1.73*drift-6.*v)*.28+sin(.57*drift+9.*v)*.20;
        float eddy=sin(drift*.64+cos(v*3.2+drift*.39))*cos(v*5.3-drift*.31);
        float shape=abs(v+u*.15*sin(drift*.72)) + u*(.28*curl+.17*eddy);
        float width=(.85+.13*sin(drift*.72))*(1.-smoothstep(.79,1.03,u));
        float alpha=(1.-smoothstep(width-.22,width,shape))*(1.-smoothstep(.14,.33,age));
        float core=(1.-smoothstep(.12,.82,shape+.32*u))*(1.-.65*u);
        vec3 color=mix(vec3(.60,.058,.009),vec3(1.,.68,.14),clamp(core+.12*eddy,0.,1.));
        color=mix(color,vec3(1.,.94,.61),smoothstep(.57,1.,core));
        gl_FragColor=vec4(color,clamp(alpha*(.73+.16*curl),0.,.96));
        #include <colorspace_fragment>
      }`
  });
  const mesh=new THREE.Mesh(geometry,mat);
  mesh.name='Ember stream';mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);
  const streams=new Map();let clock=0,dirty=false;
  return {
    pulse(shot){
      if(!streams.has(shot.shooter) && streams.size>=limit)streams.delete(streams.keys().next().value);
      streams.set(shot.shooter,{from:shot.from,to:shot.to,at:clock,seed:streams.get(shot.shooter)?.seed??shot.id%31});
      dirty=true;
    },
    update(dt){
      clock+=dt;mat.uniforms.clock.value=clock;
      for(const [id,s] of streams)if(clock-s.at>.34){streams.delete(id);dirty=true;}
      if(!dirty)return;
      let index=0;
      for(const s of streams.values()){
        starts.setXYZ(index,s.from.x,s.from.y,s.from.z);
        ends.setXYZ(index,s.to.x,s.to.y,s.to.z);
        timing.setXY(index++,s.at,s.seed);
      }
      starts.needsUpdate=ends.needsUpdate=timing.needsUpdate=true;
      geometry.instanceCount=index;mesh.visible=index>0;dirty=false;
    }
  };
}
