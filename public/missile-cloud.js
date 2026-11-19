import * as THREE from 'three';

// One translucent batch handles the brief luminous front, rolling dust and exhaust.
export function missileCloud(scene, random) {
  const limit=160, particles=[], tracks=new Map();
  const quad=new THREE.PlaneGeometry(1,1);
  const shade=new THREE.InstancedBufferAttribute(new Float32Array(limit*4),4);
  quad.setAttribute('shade',shade.setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    vertexShader:`
      attribute vec4 shade;
      varying vec4 tint;
      varying vec2 coord;
      void main() {
        tint=shade;
        coord=uv*2.-1.;
        vec4 center=modelViewMatrix*vec4(instanceMatrix[3].xyz,1.);
        center.xy+=mat2(instanceMatrix[0].xy,instanceMatrix[1].xy)*position.xy;
        gl_Position=projectionMatrix*center;
      }`,
    fragmentShader:`
      varying vec4 tint;
      varying vec2 coord;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float noise(vec2 p){
        vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
      }
      void main(){
        float detail=.55*noise(coord*3.+7.)+.30*noise(coord*7.)+.15*noise(coord*15.);
        float density=1.-smoothstep(.03,1.,length(coord)+(detail-.5)*.60);
        gl_FragColor=vec4(tint.rgb*(.70+.55*detail),density*tint.a);
        #include <colorspace_fragment>
      }`
  });
  const mesh=new THREE.InstancedMesh(quad,material,limit);
  mesh.name='Missile smoke and flash';mesh.count=0;mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
  const pose=new THREE.Object3D(), color=new THREE.Color();
  let time=0;
  function puff(point,velocity,start,end,life,tint,opacity) {
    if(particles.length===limit)particles.shift();
    particles.push({point:point.clone(),velocity,start,end,life,tint,opacity,birth:time,spin:random()-.5,angle:random()*Math.PI*2});
  }
  function impact(point,normal,surface) {
    const base=point.clone().addScaledVector(normal,.15);
    const dust=surface==='wood'?0x88755e:surface==='asphalt'?0x736f68:0x827d76;
    for(let i=0;i<12;i++){
      const motion=new THREE.Vector3(random()-.5,random()*.7,random()-.5);
      motion.addScaledVector(normal,Math.max(.12,.22-motion.dot(normal))).multiplyScalar(2+random()*3);
      const at=base.clone().addScaledVector(motion,.08);
      puff(at,motion,.38+random()*.32,1.6+random()*1.5,.55+random()*.65,i%3?dust:0x514f4a,.79);
    }
    for(let i=0;i<5;i++){
      const v=new THREE.Vector3(random()-.5,random()*.65,random()-.5).multiplyScalar(2.5);
      puff(base.clone().addScaledVector(v,.25),v,1.0,2.3,.14+random()*.13,i%2?0xff9b42:0xffc86d,1.0);
    }
    puff(base,new THREE.Vector3(),1.8,2.35,.095,0xffefd1,1);
  }
  function trail(m,point) {
    const prior=tracks.get(m.id);
    if(!prior){
      tracks.set(m.id,{point:point.clone(),time,until:.4});
      return;
    }
    prior.time=time;
    const distance=prior.point.distanceTo(point);
    if(distance<.001) return;
    if(distance>9){prior.point.copy(point);prior.until=.4;return;}
    // Sample continuous distance so the exhaust density is independent of frame rate.
    let step=prior.until;
    for(;step<=distance;step+=.52) {
      const at=prior.point.clone().lerp(point,step/distance);
      puff(at,new THREE.Vector3(.12,.34+random()*.24,.04),.13,.50+random()*.2,.27+random()*.15,0xc5c4bb,.46);
    }
    prior.until=step-distance;
    prior.point.copy(point);
  }
  function update(dt) {
    time+=dt;
    for(const [id,t] of tracks)if(time-t.time>.25)tracks.delete(id);
    let n=0;
    for(const p of particles){
      const age=time-p.birth,t=age/p.life;
      if(t>=1)continue;
      const size=THREE.MathUtils.lerp(p.start,p.end,1-(1-t)*(1-t));
      pose.position.copy(p.point).addScaledVector(p.velocity,age/(1+age));
      pose.scale.set(size,size*.92,1);pose.rotation.z=p.angle+p.spin*age;
      pose.updateMatrix();mesh.setMatrixAt(n,pose.matrix);
      color.setHex(p.tint);shade.setXYZW(n,color.r,color.g,color.b,p.opacity*(1-t*t));
      particles[n++]=p;
    }
    particles.length=n;mesh.count=n;
    if(n){shade.needsUpdate=true;mesh.instanceMatrix.needsUpdate=true;}
  }
  return {impact,trail,update,puff};
}
