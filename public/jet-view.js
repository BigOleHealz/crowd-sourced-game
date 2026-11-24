import {missileLaunchers} from './mount-view.js';
import {wingOutline,tailOutline,strakeOutline} from './jet-layout.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Cross-sections along the fuselage and engine pods, in the model's -Z nose frame.
function loft(rings){
  const pos=[],idx=[],sides=24;
  for(const [z,y,w,h] of rings){
    for(let k=0;k<sides;k++){
      const angle=k*Math.PI*2/sides;
      pos.push(w*Math.cos(angle),y+h*Math.sin(angle),z);
    }
  }
  for(let i=0;i<rings.length-1;i++)for(let k=0;k<sides;k++){
    const a=i*sides+k,b=i*sides+(k+1)%sides;
    idx.push(a,b,a+sides,b,b+sides,a+sides);
  }
  const shape=new THREE.BufferGeometry();
  shape.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));shape.setIndex(idx);shape.computeVertexNormals();
  return shape;
}
function plate(points,thickness,vertical=false){
  const path=new THREE.Shape(points.map(([u,v])=>new THREE.Vector2(u,-v)));
  const shape=new THREE.ExtrudeGeometry(path,{depth:thickness,bevelEnabled:false});
  shape.rotateX(-Math.PI/2);
  if(vertical)shape.rotateZ(Math.PI/2);
  return shape;
}
export function jetView(scene,Batch){
  const group=new THREE.Group(),body=new Batch(),gear=new Batch(),glass=new Batch();
  const box=new THREE.BoxGeometry(), round=new THREE.SphereGeometry(1,20,12);
  const steel=0x657581,belly=0x839098,edge=0x485964,graphite=0x283039;
  const fuselage=loft([[-3.25,.96,.009,.012],[-2.77,.99,.20,.19],[-2.25,1,.35,.31],[-1.36,1.01,.49,.44],
    [-.25,1,.64,.49],[.60,.99,.71,.47],[1.55,.96,.60,.34],[2.50,.92,.31,.16],[2.78,.92,.03,.04]]);
  body.add(fuselage,steel,0,0,0);
  const canopy=loft([[-2.16,1.18,.04,.04],[-1.89,1.31,.26,.22],[-1.42,1.36,.34,.37],
    [-.98,1.37,.34,.43],[-.67,1.37,.28,.34],[-.47,1.35,.12,.12]]);
  glass.add(canopy,0xffffff,0,0,0);
  body.add(round,0x222c31,0,1.47,-1.02,.15,.18,.14);
  const pod=loft([[-1.42,.85,.21,.20],[-1.21,.84,.33,.27],[-.54,.88,.36,.33],[.64,.91,.38,.36],
    [1.68,.94,.35,.32],[2.38,.96,.29,.27],[2.67,.96,.24,.24]]);
  const nozzle=new THREE.CylinderGeometry(1,1,1,24);
  for(const side of [-1,1]){
    const wing=(color,pts,y,h)=>body.add(plate(pts.map(([x,z])=>[side*x,z]),h),color,0,y,0);
    wing(belly,wingOutline,.88,.095);
    wing(edge,[[1.37,.70],[2.77,.84],[2.75,1.10],[1.40,.94]],.981,.013);
    wing(steel,tailOutline,1,.068);
    wing(0x85929a,strakeOutline,1.07,.07);
    // Thin access panels, flap seams and subdued wing markings break up the skin.
    wing(0x677982,[[.78,-.86],[.89,-.75],[1.69,.15],[1.48,.08]],.979,.006);
    wing(0x657580,[[1.57,.20],[1.74,.27],[1.95,.45],[1.64,.42]],.979,.006);
    wing(0xb9c0bb,[[2.33,.52],[2.46,.57],[2.48,.65],[2.35,.60]],.979,.009);
    body.add(pod,steel,side*.44,0,0);
    body.add(round,0x1c262b,side*.45,.84,-1.41,.22,.185,.032);
    const fin=plate([[0,1.25],[.20,1.26],[1.19,2.03],[1.13,2.43],[.07,2.24]],.064,true);
    body.add(fin,steel,.52*side,1.08,0,1,1,1,0,0,-side*.33);
    const finTip=plate([[.96,1.87],[1.19,2.03],[1.15,2.34],[.98,2.24]],.070,true);
    body.add(finTip,edge,.52*side,1.08,0,1,1,1,0,0,-side*.33);
    for(let k=0;k<3;k++)body.add(nozzle,[edge,0x494a4a,0x343639][k],side*.44,.96,2.39+k*.108,.30-k*.018,.12,.30-k*.018,Math.PI/2);
    body.add(round,0x171b1e,side*.44,.96,2.676,.228,.228,.026);
    for(let k=0;k<12;k++){
      const a=k*Math.PI/6;
      body.add(box,0x746b62,side*.44+.256*Math.cos(a),.96+.256*Math.sin(a),2.58,.026,.048,.16,0,0,a);
    }
    body.beam(graphite,[side*.09,1.56,-1.82],[side*.275,1.36,-1.95],.025);
    gear.beam(belly,[side*.52,.74,.55],[side*.72,.25,.71],.082);
    gear.add(round,0x23282b,side*.72,.20,.71,.092,.20,.20);
  }
  gear.beam(belly,[0,.68,-1.65],[0,.23,-1.57],.075);
  gear.add(round,0x23282b,0,.18,-1.58,.085,.18,.18);
  missileLaunchers(body,'jet');
  // Charcoal inset and a pale inspection stripe make the nose port read against its cowl.
  const cannonPort=new THREE.Vector3(-.232,1.03,-2.68);
  body.add(round,0x343d40,cannonPort.x,cannonPort.y,cannonPort.z,.057,.047,.137);
  cannonPort.z-=.137;
  for(const side of [-1,1])body.add(box,0xa6aaa1,side*.865,.966,.075,.033,.012,.195,0,side*.20);
  const hull=body.mesh(group,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55,metalness:.30}));
  hull.userData.impactSurface='metal';
  const oldGlass=glass.mesh(group,new THREE.MeshPhysicalMaterial({color:0x38515b,metalness:.38,roughness:.16,clearcoat:1,transparent:true,opacity:.88}),false);
  const wheels=gear.mesh(group,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8}));
  if(typeof window!=='undefined')new GLTFLoader().load(new URL('./f35a.glb',import.meta.url).href,({scene:model})=>{
    // Sketchfab's airframe faces +Z; Pinewatch aircraft face -Z.
    model.rotation.y=Math.PI;
    model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model);
    const size=bounds.getSize(new THREE.Vector3());
    if(!Number.isFinite(size.z) || size.z<=0)return;
    const scale=6.03/size.z;
    model.scale.setScalar(scale);
    model.position.set(-scale*(bounds.min.x+bounds.max.x)/2,
      .12-scale*bounds.min.y,
      -scale*(bounds.min.z+bounds.max.z)/2);
    model.name='F-35A airframe';
    model.traverse(part=>{
      if(part.name.startsWith('WEAPON'))part.visible=false;
      if(!part.isMesh)return;
      if(part.name==='Object_6'){
        // This export bakes its deployed wheels into the fuselage. Their
        // vertices occupy the low local Z slice; use the game's moving gear.
        const shape=part.geometry.clone(),positions=shape.getAttribute('position'),indices=shape.getIndex(),kept=[];
        for(let i=0;i<indices.count;i+=3){
          const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);
          if(positions.getZ(a)<=-.9 && positions.getZ(b)<=-.9 && positions.getZ(c)<=-.9)kept.push(a,b,c);
        }
        shape.setIndex(kept);
        part.geometry=shape;
      }
      part.castShadow=true;part.receiveShadow=true;part.userData.impactSurface='metal';
    });
    group.add(model);
    hull.visible=false;
    oldGlass.visible=false;
    exhaust.clear();
    const fire=new THREE.Mesh(plume,flameMaterial);
    exhaust.add(fire);
    exhaust.position.x=0;
    exhaust.position.z=2.85;
  },undefined,error=>console.warn('F-35A model unavailable; using procedural jet.',error));
  const flameMaterial=new THREE.ShaderMaterial({
    uniforms:{power:{value:0},clock:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`varying float axial;
      void main(){ axial=uv.y; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader:`varying float axial; uniform float power,clock;
      void main(){
        float fall=1.-axial;
        float bands=.74+.26*cos(axial*36.-clock*15.);
        vec3 tint=mix(vec3(.26,.39,1.),vec3(1.,.57,.21),fall*fall);
        gl_FragColor=vec4(tint,(.28+.62*bands)*pow(fall,.68)*power);
      }`
  });
  const plume=new THREE.ConeGeometry(.217,1,24,8,true);
  plume.translate(0,.5,0);plume.rotateX(Math.PI/2);
  const exhaust=new THREE.Group();
  for(const side of [-1,1]){
    const fire=new THREE.Mesh(plume,flameMaterial);fire.position.x=side*.44;exhaust.add(fire);
  }
  exhaust.position.set(0,.96,2.68);group.add(exhaust);scene.add(group);
  let glow=0,gearDown=1,time=0,flashTime=0,cannonFlash;
  function flashCannon(){
    if(!cannonFlash){
      cannonFlash=new THREE.Mesh(new THREE.SphereGeometry(1,8,5),new THREE.MeshBasicMaterial({color:0xffd395}));
      cannonFlash.name='Jet cannon flash';
      cannonFlash.scale.set(.055,.047,.12);
      cannonFlash.position.copy(cannonPort);
      cannonFlash.position.z-=.08;
      group.add(cannonFlash);
    }
    flashTime=.065;
    cannonFlash.visible=true;
  }
  function update(j,dt){
    group.visible=!!j;if(!j)return;
    time+=dt;
    flashTime=Math.max(0,flashTime-dt);
    if(cannonFlash)cannonFlash.visible=flashTime>0 && !j.wrecked && j.pilot!=null;
    group.position.set(j.x,j.y,j.z);group.rotation.set(j.pitch,-j.yaw,j.wrecked?1.12:j.roll,'YXZ');
    gearDown+=((j.grounded || j.speed<13 ? 1:0)-gearDown)*(1-Math.exp(-4*dt));
    wheels.visible=gearDown>.03;wheels.position.y=(1-gearDown)*.74;
    glow+=((j.burner && !j.wrecked?1:0)-glow)*(1-Math.exp(-9*dt));
    exhaust.visible=glow>.01;exhaust.scale.z=.18+1.58*glow*(1+.048*Math.sin(time*34));
    flameMaterial.uniforms.power.value=glow;flameMaterial.uniforms.clock.value=time;
  }
  function cannonMuzzle(out,forward){
    if(forward){
      group.updateWorldMatrix(true,false);
      forward.set(0,0,-1).transformDirection(group.matrixWorld);
    }
    return group.localToWorld(out.copy(cannonPort));
  }
  return {update,cannonMuzzle,flashCannon};
}
