import * as THREE from 'three';
import {supercarLayout as spec} from './supercar-layout.js';
import {alpineGlass} from './landscape.js';

const orange=0xff7716, ember=0xf46611, carbon=0x24272a, steel=0x9ba5a4;
const clamp=THREE.MathUtils.clamp;
const sections=[
  // z, half-width, centre bonnet, fender shoulder, lowest sill
  [-2.31,.67,.40,.43,.16],[-2.18,.83,.46,.53,.15],[-1.91,.965,.53,.68,.15],
  [-1.47,1.00,.565,.785,.16],[-1.07,.955,.61,.70,.16],[-.82,.947,.66,.67,.16],
  [-.57,.94,.695,.65,.15],[-.10,.955,.685,.64,.15],[.43,.965,.70,.68,.15],
  [.88,.99,.735,.76,.15],[1.18,1.01,.74,.805,.16],[1.47,1.02,.735,.83,.17],
  [1.86,.978,.695,.79,.18],[2.12,.914,.67,.70,.20],[2.30,.817,.625,.63,.205],
];
function sectionAt(z){
  for(let i=1;i<sections.length;i++)if(z<=sections[i][0]){
    const a=sections[i-1],b=sections[i],t=clamp((z-a[0])/(b[0]-a[0]),0,1);
    return a.map((v,k)=>THREE.MathUtils.lerp(v,b[k],t));
  }
  return sections.at(-1);
}
function bonnetHeight(x,z){
  const [,w,hood,shoulder]=sectionAt(z),u=Math.abs(x)/w;
  const profile=[[0,hood],[.52,hood+.012],[.78,shoulder-.012],[.91,shoulder],[.976,shoulder-.038]];
  for(let i=1;i<profile.length;i++){
    const [v,h]=profile[i],[v0,h0]=profile[i-1];
    if(u<=v)return THREE.MathUtils.lerp(h0,h,(u-v0)/(v-v0));
  }
  return shoulder-.04;
}
function lacquer(panorama){
  const material=new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:115,specular:0xc9ae99});
  if(panorama)material.onBeforeCompile=shader=>{
    shader.uniforms.bodySky={value:panorama};
    shader.fragmentShader='uniform sampler2D bodySky;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 eye=normalize(vViewPosition);
      vec3 ray=inverseTransformDirection(reflect(-eye,normal),viewMatrix);
      vec2 suv=vec2(atan(ray.x,-ray.z)*.46+.17,clamp((asin(clamp(ray.y,-1.,1.))+.44)/.98,0.,1.));
      vec3 sky=texture2D(bodySky,suv).rgb;
      float fresnel=pow(1.-clamp(dot(normal,eye),0.,1.),3.);
      float horizon=exp(-pow((ray.y-.065)*5.6,2.));
      float clearcoat=.03+.13*fresnel+.17*horizon;
      outgoingLight=outgoingLight*vec3(1.25,1.18,1.)+sky*vec3(.75,.56,.33)*clearcoat;
      #include <opaque_fragment>`);
  };
  return material;
}
function surface(positions,indices){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function face(batch,tint,a,b,c,d){
  const g=surface([...a,...b,...c,...d],[0,1,2,0,2,3]);batch.add(g,tint,0,0,0);g.dispose();
}
function bodywork(batch){
  const positions=[],indices=[],stations=sections.map(s=>s[0]);
  for(const axle of spec.wheels)for(let i=0;i<=24;i++)stations.push(axle-.385*Math.cos(Math.PI*i/24));
  const slices=[...new Set(stations)].sort((a,b)=>a-b);
  for(const [i,z] of slices.entries()){
    const [,w,hood,shoulder,sill]=sectionAt(z);
    const dz=Math.min(...spec.wheels.map(axle=>Math.abs(z-axle)));
    const arch=dz<.385 ? spec.tire+Math.sqrt(.385**2-dz**2) : sill;
    const rail=Math.max(sill,arch);
    const half=[[0,hood],[w*.52,hood+.012],[w*.78,shoulder-.012],[w*.91,shoulder],
      [w*.976,shoulder-.038],[w,Math.max(rail+.015,shoulder-.11)],[w*.988,rail],[w*.795,rail+.002]];
    const ring=[...half.slice(1).reverse().map(([x,y])=>[-x,y]),...half];
    for(const [x,y] of ring)positions.push(x,y,z);
    const n=ring.length;
    if(i)for(let j=0;j<n-1;j++){const a=(i-1)*n+j;indices.push(a,a+n,a+n+1,a,a+n+1,a+1);}
    if(i===0 || i===slices.length-1){
      const closed=ring.slice(1,-1);
      const center=[0,(sill+hood)/2,z];
      for(let j=0;j<closed.length;j++){
        const a=closed[j],b=closed[(j+1)%closed.length];
        face(batch,orange,center,[a[0],a[1],z],[b[0],b[1],z],center);
      }
    }
  }
  const g=surface(positions,indices);batch.add(g,orange,0,0,0);g.dispose();
}
function jetGeometry(){
  // Four irregular lobes taper from the hot nozzle core to a forked plume.
  const vertices=[],index=[],colors=[];
  const rings=[[0,.57,0xe7faff],[.15,.92,0x95d6ff],[.31,1,0xffed9b],[.57,.68,0xff982e],[.79,.39,0xff4922],[1,.015,0xb62810]];
  const n=12,c=new THREE.Color();
  for(const [i,[z,r,col]] of rings.entries()){
    c.setHex(col);
    for(let j=0;j<n;j++){
      const a=2*Math.PI*j/n,rad=r*(1+.14*Math.cos(4*a+i*.64));
      vertices.push(rad*Math.cos(a),rad*Math.sin(a),z+.034*Math.sin(a*3)*z);
      colors.push(c.r,c.g,c.b);
      if(i){const p=(i-1)*n+j,q=(i-1)*n+(j+1)%n;index.push(p,q,p+n,q,q+n,p+n);}
    }
  }
  const g=surface(vertices,index);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
}

export function createSupercarView(scene,Batch,shadowMap,panorama){
  const root=new THREE.Group(),body=new THREE.Group();root.name='Vesper GT';root.add(body);scene.add(root);
  const paint=new Batch(),trim=new Batch(),glass=new Batch(),lamps=new Batch();
  const cube=new THREE.BoxGeometry(),sphere=new THREE.SphereGeometry(1,16,10),disc=new THREE.CylinderGeometry(1,1,1,32);
  const torus=new THREE.TorusGeometry(1,.1,8,32);
  const box=(batch,t,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>batch.add(cube,t,x,y,z,w,h,d,rx,ry,rz);
  const strip=(batch,t,pts,width,depth=width)=>{for(let i=1;i<pts.length;i++)batch.beam(t,pts[i-1],pts[i],width,depth);};
  bodywork(paint);
  box(trim,carbon,0,.165,0,1.52,.14,3.85);
  const sides=[-1,1];
  for(const s of sides){
    const hand=(points)=>points.map(([x,y,z])=>[s*x,y,z]);
    // The splitter wraps the nose and feeds the two recessed brake ducts.
    strip(trim,carbon,hand([[0,.176,-2.32],[.70,.176,-2.32],[.86,.177,-2.17],[.96,.20,-1.95]]),.08,.045);
    face(trim,0x171d20,...hand([[.13,.23,-2.321],[.55,.225,-2.32],[.63,.36,-2.312],[.20,.36,-2.319]]));
    face(trim,0x242a2c,...hand([[.61,.24,-2.301],[.79,.26,-2.21],[.81,.397,-2.19],[.67,.40,-2.296]]));
    for(let i=0;i<4;i++)trim.beam(0x485054,...hand([[.21+i*.078,.24,-2.326],[.26+i*.078,.335,-2.326]]),.013);
    // Three white LED blades rake back across the front fender.
    const onHood=(x,z,raise)=>[s*x,bonnetHeight(x,z)+raise,z];
    const optic=[[.42,-2.23],[.76,-2.14],[.89,-1.87],[.70,-2.00]].map(([x,z])=>onHood(x,z,.021));
    face(trim,0x142023,...optic);
    strip(lamps,0xebfaff,[[.45,-2.214],[.735,-2.127],[.866,-1.911]].map(([x,z])=>onHood(x,z,.037)),.026,.018);
    for(let k=0;k<3;k++)strip(lamps,0xcce3ed,[[.56+.060*k,-2.166+.029*k],[.62+.059*k,-2.123+.029*k]].map(([x,z])=>onHood(x,z,.042)),.024);
    const vents=[[.36,-1.59],[.51,-1.54],[.62,-1.18],[.49,-1.24]];
    face(trim,0x333737,...vents.map(([x,z])=>onHood(x,z,.016)));
    for(let k=0;k<4;k++){
      const t=.18+.18*k;
      strip(trim,0x81817a,[[.36+.125*t,-1.59+.34*t],[.505+.108*t,-1.54+.34*t]].map(([x,z])=>onHood(x,z,.026)),.012);
    }
    strip(trim,0x753e21,[[.31,-2.13],[.42,-1.68],[.54,-1.04],[.64,-.80]].map(([x,z])=>onHood(x,z,.015)),.011);
    // True arch cut-outs above the spinning wheels, with dark wheelhouse liners.
    for(const axle of spec.wheels){
      const line=[];for(let i=0;i<=22;i++){
        const a=Math.PI*i/22,z=axle-.383*Math.cos(a),w=sectionAt(z)[1];
        line.push([s*w*.987,spec.tire+.383*Math.sin(a)+.008,z]);
      }
      strip(trim,0x28272a,line,.023);
    }
    strip(trim,0x25292a,hand([[.952,.19,-1.04],[.984,.13,-.78],[.986,.13,.79],[.975,.24,1.05]]),.074,.048);
    strip(paint,ember,hand([[.96,.266,-.97],[.978,.198,-.71],[.983,.209,.67],[.978,.34,.98]]),.036);
    // A dark inset, floating orange blade and lower door crease form the side scoop.
    face(trim,0x23282a,...hand([[.971,.48,.03],[.997,.60,.88],[1,.38,.96],[.978,.25,.64]]));
    strip(paint,orange,hand([[.981,.477,.04],[1.006,.621,.79],[1.001,.647,.88]]),.036);
    strip(trim,0x45413a,hand([[.93,.636,-.69],[.952,.47,-.68],[.968,.29,-.47],[.973,.266,.38],[.97,.51,.59],[.961,.653,.50]]),.012);
    box(trim,0x333d3d,s*.966,.604,.28,.018,.023,.137);
    trim.beam(carbon,...hand([[.69,.83,-.50],[.945,.842,-.50]]),.047);
    paint.add(sphere,orange,s*.932,.869,-.485,.09,.043,.126);
    trim.add(sphere,0x797f80,s*.934,.867,-.396,.073,.030,.028);
    // Rear diffuser blades and two wraparound red lamp signatures.
    face(trim,0x24282a,...hand([[.04,.505,2.312],[.76,.51,2.311],[.79,.384,2.298],[.11,.367,2.314]]));
    for(let i=0;i<7;i++)box(trim,0x495053,s*(.12+i*.093),.435,2.319,.021,.084,.012,0,0,s*-.3);
    strip(lamps,0xe32b26,hand([[.055,.603,2.313],[.71,.600,2.312],[.86,.631,2.21],[.916,.644,2.08]]),.036,.021);
    strip(lamps,0xfc5c42,hand([[.31,.57,2.315],[.71,.57,2.315],[.835,.593,2.229]]),.016,.018);
    strip(trim,carbon,hand([[.02,.20,2.27],[.65,.20,2.29],[.85,.25,2.21]]),.11,.072);
    for(const x of [.20,.71])box(trim,0x272b2c,s*x,.215,2.10,.043,.155,.43,-.12);
  }
  // Sloping windscreen, tapered roof and fastback glass above a two-seat cabin.
  const canopy=[[-.97,.72,.675],[-.69,.74,.88],[-.30,.61,1.17],[.03,.59,1.23],[.40,.596,1.20],[.71,.66,1.06],[1.15,.71,.738]];
  for(let i=1;i<canopy.length;i++){
    const [z0,w0,h0]=canopy[i-1],[z1,w1,h1]=canopy[i],isRoof=i>=3&&i<=4;
    face(isRoof?paint:glass,isRoof?orange:0x384b50,[-w0,h0-.045,z0],[-w1,h1-.045,z1],[w1,h1-.045,z1],[w0,h0-.045,z0]);
    // Subtle transverse crown gives the painted roof its own highlight.
    if(isRoof)for(const s of sides)face(paint,orange,[0,h0,z0],[0,h1,z1],[s*w1,h1-.04,z1],[s*w0,h0-.04,z0]);
    for(const s of sides){
      const sill0=sectionAt(z0)[2]+.016,sill1=sectionAt(z1)[2]+.016;
      face(glass,0x293e44,[s*.785,sill0,z0],[s*.785,sill1,z1],[s*w1,h1-.045,z1],[s*w0,h0-.045,z0]);
      strip(paint,i<=2||i>=5?orange:0x362a24,[[s*w0,h0-.044,z0],[s*w1,h1-.044,z1]],i>=5?.076:.048);
    }
  }
  for(const s of sides){
    trim.beam(0x26292a,[s*.779,.715,.37],[s*.60,1.154,.32],.044);
    const bx=s*.365;
    trim.add(sphere,0x252a2d,bx,.56,.23,.254,.095,.31);
    trim.add(sphere,0x32383b,bx,.77,.47,.228,.26,.095,-.17);
    trim.add(sphere,0x333a3b,bx,.98,.52,.128,.101,.064);
    for(const e of sides)trim.add(sphere,0x454849,bx+e*.186,.75,.37,.070,.170,.087);
    box(trim,0xca743a,bx,.775,.383,.036,.29,.015,-.15);
  }
  box(trim,0x2c3438,0,.72,-.565,1.34,.121,.30);
  box(trim,0x434b50,0,.655,-.02,.225,.15,.67);
  trim.add(torus,0x393b3c,-.36,.802,-.325,.144,.144,.144,-.40);
  lamps.add(cube,0x6ea6af,-.34,.811,-.503,.25,.077,.014,-.36);
  box(trim,0x4c5050,0,.765,-.36,.20,.10,.030,-.27);
  box(trim,0x2b2d2e,0,.729,1.38,1.14,.044,.42);
  for(let i=0;i<6;i++)box(trim,0x6c7370,0,.755,1.18+i*.077,1.09,.027,.034,-.24);
  strip(paint,ember,[[-.79,.703,2.17],[-.58,.704,2.246],[.58,.704,2.246],[.79,.703,2.17]],.058,.046);
  for(const [x,y,z] of spec.exhaust){
    trim.add(disc,0xaeb6b7,x,y,z,.11,.11,.146,Math.PI/2);
    trim.add(disc,0x1d2225,x,y,z+.066,.082,.003,.102,Math.PI/2);
  }
  const coat=lacquer(panorama);
  const skin=paint.mesh(body,coat,false);
  const fittings=trim.mesh(body,new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:55,specular:0x797878}),false);
  for(const m of [skin,fittings])Object.assign(m.userData,{vehicle:'supercar',impactSurface:'metal'});
  glass.mesh(body,alpineGlass(panorama,{transparent:true,opacity:.47,depthWrite:false,side:THREE.DoubleSide}),false);
  lamps.mesh(body,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),false);
  const wheels=[];
  const tireProfile=[[.252,-.128],[.301,-.127],[.338,-.09],[.35,-.052],[.35,.052],[.338,.09],[.301,.127],[.252,.128]];
  const tire=new THREE.LatheGeometry(tireProfile.map(([r,x])=>new THREE.Vector2(r,x)),40).rotateZ(Math.PI/2);
  const tireMat=new THREE.MeshPhongMaterial({color:0x26292a,specular:0x505153,shininess:27,side:THREE.DoubleSide});
  const wheelMaterial=new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,specular:0xa6adac,shininess:83});
  for(const side of sides){
    const rim=new Batch(),faceX=side*.123;
    rim.add(disc,0x383e40,side*.09,0,0,.252,.05,.252,0,0,Math.PI/2);
    rim.add(disc,0x41484a,side*.105,0,0,.203,.035,.203,0,0,Math.PI/2);
    rim.add(torus,steel,faceX,0,0,.247,.247,.247,0,Math.PI/2);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      const edge=(r,t)=>[faceX,r*Math.cos(t),r*Math.sin(t)];
      for(const e of sides)rim.beam(0xbec5c4,edge(.071,a),edge(.239,a+e*.24),.035,.045);
      rim.add(disc,0xd5d8d0,side*.145,.054*Math.cos(a),.054*Math.sin(a),.012,.012,.012,0,0,Math.PI/2);
    }
    rim.add(disc,0x474f50,side*.14,0,0,.068,.034,.068,0,0,Math.PI/2);
    const rimGeometry=rim.geometry();
    for(const z of spec.wheels){
      const hub=new THREE.Group(),rotation=new THREE.Group();
      hub.position.set(side*spec.axle,spec.tire,z);root.add(hub);hub.add(rotation);
      rotation.add(new THREE.Mesh(tire,tireMat),new THREE.Mesh(rimGeometry,wheelMaterial));
      wheels.push({hub,rotation,front:z<0});
    }
  }
  const tag=document.createElement('canvas');tag.width=300;tag.height=72;
  const ctx=tag.getContext('2d');ctx.fillStyle='#222c30';ctx.fillRect(0,0,300,72);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 43px sans-serif';ctx.fillStyle='#e4dac5';ctx.fillText('VESPER GT',150,38);
  const tagMap=new THREE.CanvasTexture(tag);tagMap.colorSpace=THREE.SRGBColorSpace;
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.45,.109),new THREE.MeshBasicMaterial({map:tagMap}));
  plate.position.set(0,.445,2.325);body.add(plate);
  const under=new THREE.Mesh(new THREE.PlaneGeometry(2.45,5.05).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({map:shadowMap,color:0x282c2e,transparent:true,opacity:.34,depthWrite:false}));
  under.position.y=.016;root.add(under);
  const jet=jetGeometry(),hot=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.FrontSide,transparent:true,opacity:.91,depthWrite:false,blending:THREE.NormalBlending});
  const jets=spec.exhaust.map(([x,y,z])=>{const m=new THREE.Mesh(jet,hot);m.position.set(x,y,z+.075);m.visible=false;body.add(m);return m;});
  for(const g of [cube,sphere,disc,torus])g.dispose();
  let spin=0,time=0;
  return (car,dt=0)=>{
    root.visible=!!car;if(!car)return;
    const frame=clamp(dt,0,.1),speed=car.speed??0;
    root.position.set(car.x,car.y,car.z);root.rotation.y=-car.yaw;
    body.rotation.x=car.suspension?.pitch??0;body.rotation.z=car.suspension?.roll??0;
    body.position.y=car.suspension?.heave??0;
    time+=frame;spin=(spin-speed*frame/spec.tire)%(Math.PI*2);
    for(const w of wheels){w.rotation.rotation.x=spin;w.hub.rotation.y=w.front?-(car.steer??0)*.42:0;}
    const burst=car.driver!=null && !car.wrecked ? clamp((car.exhaust??0)/.30,0,1) : 0;
    for(const [i,flame] of jets.entries()){
      flame.visible=burst>0;
      if(flame.visible){
        const flicker=.82+.18*Math.sin(time*77+i*2.3);
        const width=.072+.035*burst;flame.scale.set(width,width*.84,(.25+.57*burst)*flicker);
        flame.rotation.z=i+time*8;
      }
    }
  };
}
