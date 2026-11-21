import * as THREE from 'three';
import {hydrants,repairTicks,sprayTicks} from './hydrants.js';

export function streetHydrants(scene,Batch){
  const base=new Batch(),barrel=new Batch(),cylinder=new THREE.CylinderGeometry(1,1,1,12);
  const dome=new THREE.SphereGeometry(1,12,8),nut=new THREE.CylinderGeometry(1,1,1,6);
  base.add(cylinder,0x474643,0,.05,0,.24,.10,.24);
  barrel.add(cylinder,0xaa3026,0,.36,0,.13,.57,.13);
  for(const y of [.12,.48,.59])barrel.add(cylinder,0x8b2822,0,y,0,.16,.05,.16);
  barrel.add(dome,0xc04c37,0,.61,0,.16,.125,.16);
  barrel.add(nut,0xbb9060,0,.742,0,.047,.04,.047);
  for(const side of [-1,1]){
    barrel.add(cylinder,0xb3382b,side*.145,.40,0,.086,.18,.086,0,0,Math.PI/2);
    barrel.add(nut,0x996e43,side*.23,.40,0,.082,.045,.082,0,0,Math.PI/2);
  }
  const iron=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.70,metalness:.26});
  const baseGeo=base.geometry(),bodyGeo=barrel.geometry();
  // One draw per active spray. Particles rise from the broken flange,
  // fan out as they lose pressure and fall back under gravity.
  const drops=110,pos=new Float32Array(drops*3);
  for(let i=0;i<drops;i++){
    pos[i*3]=((i*.618034)%1)*Math.PI*2;
    pos[i*3+1]=(i*.754878)%1;
    pos[i*3+2]=(i*.56984)%1;
  }
  const sprayGeo=new THREE.BufferGeometry();
  sprayGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  sprayGeo.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,2.4,0),3.3);
  const views=hydrants.map(p=>{
    const foot=new THREE.Mesh(baseGeo,iron),body=new THREE.Mesh(bodyGeo,iron);
    foot.position.set(p.x,p.y,p.z);body.position.copy(foot.position);scene.add(foot,body);
    const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{age:{value:0},pressure:{value:1}},
      vertexShader:`uniform float age,pressure; varying float alpha;
        void main(){
          float phase=fract(age*(.82+.12*position.z)+position.y);
          float t=phase*1.5;
          float radius=(.075+t*t*(.30+.50*position.z))*pressure;
          float y=(7.7+.95*position.z)*t-5.45*t*t;
          vec3 drop=vec3(cos(position.x)*radius,.13+max(0.,y)*pressure,sin(position.x)*radius);
          vec4 mv=modelViewMatrix*vec4(drop,1.);
          gl_Position=projectionMatrix*mv;
          gl_PointSize=clamp((120.+145.*phase)/max(1.,-mv.z),1.,17.);
          alpha=(.85-.57*phase)*pressure;
        }`,
      fragmentShader:`varying float alpha;void main(){float r=length(gl_PointCoord-.5);
        gl_FragColor=vec4(.72,.91,.98,alpha*(1.-smoothstep(.12,.5,r)));}`});
    const spray=new THREE.Points(sprayGeo,mat);spray.position.copy(foot.position);
    spray.visible=false;scene.add(spray);
    return {p,body,spray};
  });
  return (state,dt)=>{
    for(const {p,body,spray} of views){
      const remaining=state?.[p.id],age=(repairTicks-remaining)/30;
      body.position.x=p.x+(remaining!=null ? .45 : 0);
      body.position.y=p.y+(remaining!=null ? .16 : 0);
      body.rotation.z=remaining!=null?-1.38:0;
      const active=remaining!=null && age<sprayTicks/30;
      if(active){
        const uniforms=spray.material.uniforms;
        uniforms.age.value=spray.visible?THREE.MathUtils.damp(uniforms.age.value+dt,age,7,dt):age;
        uniforms.pressure.value=Math.min(1,.30+age*5,(sprayTicks/30-age)*1.5);
      }
      spray.visible=active;
    }
  };
}
