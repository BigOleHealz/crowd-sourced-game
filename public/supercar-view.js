import {damagedFittings} from './road-fittings.js';
import {crushedScale,roadWreckFinish} from './vehicle-wreck-view.js';
import {paneBatch} from './pane-damage-view.js';
import {tireContactPatch} from './tire-contact-patch.js';
import {isFlat,flatWheelDrop} from './road-wheel-layout.js';
import * as THREE from 'three';
import {supercarLayout as spec} from './supercar-layout.js';
import {alpineGlass} from './landscape.js';

const orange=0xf26413, ember=0xc44b10, carbon=0x24272a, steel=0x9ba5a4;
const clamp=THREE.MathUtils.clamp;
import {sectionAt,sections,canopy,glassQuads} from './vehicle-glass-layout.js';
function fenderHeight(z,shoulder){
  const dz=Math.min(...spec.wheels.map(axle=>Math.abs(z-axle)));
  return dz>=spec.archRadius?shoulder:Math.max(shoulder,spec.tire+Math.sqrt(spec.archRadius**2-dz**2)+.055);
}
function bonnetHeight(x,z){
  const [,w,hood,baseShoulder]=sectionAt(z),u=Math.abs(x)/w,shoulder=fenderHeight(z,baseShoulder);
  const profile=[[0,hood],[.52,hood+.012],[.78,shoulder-.012],[.91,shoulder],[.976,shoulder-.038]];
  for(let i=1;i<profile.length;i++){
    const [v,h]=profile[i],[v0,h0]=profile[i-1];
    if(u<=v)return THREE.MathUtils.lerp(h0,h,(u-v0)/(v-v0));
  }
  return shoulder-.04;
}
function lacquer(panorama){
  const material=new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:86,specular:0xb5aba2});
  if(panorama)material.onBeforeCompile=shader=>{
    shader.uniforms.bodySky={value:panorama};
    shader.fragmentShader='uniform sampler2D bodySky;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 eye=normalize(vViewPosition);
      vec3 ray=inverseTransformDirection(reflect(-eye,normal),viewMatrix);
      vec2 suv=vec2(atan(ray.x,-ray.z)*.46+.17,clamp((asin(clamp(ray.y,-1.,1.))+.44)/.98,0.,1.));
      vec3 sky=texture2D(bodySky,suv).rgb;
      float fresnel=pow(1.-clamp(dot(normal,eye),0.,1.),3.);
      float horizon=exp(-pow((ray.y-.065)*5.6,2.));
      float clearcoat=.050+.24*fresnel+.13*horizon;
      vec3 reflected=mix(vec3(.055,.063,.067),sky,smoothstep(-.36,.08,ray.y));
      outgoingLight=mix(outgoingLight,reflected,clearcoat)+vec3(.12,.105,.09)*horizon*fresnel;
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
  for(const axle of spec.wheels)for(let i=0;i<=24;i++)stations.push(axle-spec.archRadius*Math.cos(Math.PI*i/24));
  // Sample the taper between major body stations so the nose and rear
  // quarters carry a continuous shoulder highlight in the chase camera.
  for(let i=1;i<sections.length;i++)stations.push((sections[i-1][0]+sections[i][0])/2);
  const slices=[...new Set(stations)].sort((a,b)=>a-b);
  for(const [i,z] of slices.entries()){
    const [,w,hood,shoulder,sill]=sectionAt(z);
    const dz=Math.min(...spec.wheels.map(axle=>Math.abs(z-axle)));
    const arch=dz<spec.archRadius ? spec.tire+Math.sqrt(spec.archRadius**2-dz**2) : sill;
    const rail=Math.max(sill,arch);
    const crown=fenderHeight(z,shoulder);
    const belt=Math.max(rail+.015,crown-.11);
    const half=[[0,hood],[w*.30,hood+.008],[w*.52,hood+.012],
      [w*.68,hood+.012+(crown-hood-.024)*.615],[w*.78,crown-.012],[w*.88,crown+.004],
      [w*.94,crown-.009],[w*.976,crown-.038],[w,belt],
      [w*.997,belt*.70+rail*.30],[w*.975,belt*.25+rail*.75],[w*.961,rail],[w*.795,rail+.002]];
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

// A grounded hub follows its chassis-local suspension axis until the tire
// touches the sampled road height. The root already carries any airborne tilt.
export function placeGTWheel(position,x,z,hubY,body,axis){
  position.set(x,0,z).applyQuaternion(body.quaternion);
  const travel=(hubY-body.position.y-position.y)/axis.y;
  position.addScaledVector(axis,travel);
  position.y=hubY;
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
    // Recessed projector barrels and perimeter seals give the lights depth.
    strip(trim,0x384247,[...optic,optic[0]],.023,.018);
    for(const [x,z] of [[.68,-2.09],[.77,-2.01]]){
      const [px,py,pz]=onHood(x,z,.028);
      trim.add(sphere,0x59666d,px,py,pz,.046,.020,.061);
      lamps.add(sphere,0xb7cad2,px,py+.008,pz-.01,.027,.012,.032);
    }
    strip(lamps,0xe3eced,[[.45,-2.214],[.735,-2.127],[.866,-1.911]].map(([x,z])=>onHood(x,z,.037)),.026,.018);
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
        const a=Math.PI*i/22,z=axle-spec.archRadius*Math.cos(a),w=sectionAt(z)[1];
        line.push([s*w*.987,spec.tire+spec.archRadius*Math.sin(a)+.008,z]);
      }
      strip(trim,0x28272a,line,.023);
    }
    strip(trim,0x25292a,hand([[.952,.19,-1.04],[.984,.13,-.78],[.986,.13,.79],[.975,.24,1.05]]),.074,.048);
    strip(paint,ember,hand([[.96,.266,-.97],[.978,.198,-.71],[.983,.209,.67],[.978,.34,.98]]),.036);
    // A dark inset, floating orange blade and lower door crease form the side scoop.
    face(trim,0x23282a,...hand([[.971,.48,.03],[.997,.60,.88],[1,.38,.96],[.978,.25,.64]]));
    strip(paint,orange,hand([[.981,.477,.04],[1.006,.621,.79],[1.001,.647,.88]]),.036);
    strip(trim,0x655043,hand([[.93,.636,-.69],[.952,.47,-.68],[.968,.29,-.47],[.973,.266,.38],[.97,.51,.59],[.961,.653,.50]]),.007);
    box(trim,0x333d3d,s*.966,.604,.28,.018,.023,.137);
    trim.beam(carbon,...hand([[.69,.83,-.50],[.945,.842,-.50]]),.047);
    paint.add(sphere,orange,s*.932,.869,-.485,.09,.043,.126);
    trim.add(sphere,0x797f80,s*.934,.867,-.396,.073,.030,.028);
    // Sculpt the intake as a recessed opening under the rear quarter shoulder.
    face(paint,ember,...hand([[.957,.39,.38],[.997,.57,.86],[.991,.46,.91],[.959,.32,.55]]));
    for(let n=0;n<3;n++)trim.beam(0x414749,...hand([[.985,.38+n*.038,.65],[.996,.396+n*.046,.85]]),.011);
    // Rear diffuser blades and two wraparound red lamp signatures.
    face(trim,0x24282a,...hand([[.04,.505,2.312],[.76,.51,2.311],[.79,.384,2.298],[.11,.367,2.314]]));
    for(let i=0;i<7;i++)box(trim,0x495053,s*(.12+i*.093),.435,2.319,.021,.084,.012,0,0,s*-.3);
    strip(lamps,0xe32b26,hand([[.055,.603,2.313],[.71,.600,2.312],[.86,.631,2.21],[.916,.644,2.08]]),.036,.021);
    strip(lamps,0xfc5c42,hand([[.31,.57,2.315],[.71,.57,2.315],[.835,.593,2.229]]),.016,.018);
    strip(trim,carbon,hand([[.02,.20,2.27],[.65,.20,2.29],[.85,.25,2.21]]),.11,.072);
    for(const x of [.20,.71])box(trim,0x272b2c,s*x,.215,2.10,.043,.155,.43,-.12);
  }
  // Sloping windscreen, tapered roof and fastback glass above a two-seat cabin.
  const carPanes=paneBatch(glass);
  for(const {id,corners} of glassQuads.supercar)carPanes.add(id,()=>face(glass,id==='front'||id==='rear'?0x384b50:0x293e44,...corners));
  for(let i=1;i<canopy.length;i++){
    const [z0,w0,h0]=canopy[i-1],[z1,w1,h1]=canopy[i],isRoof=i>=3&&i<=4;
    if(isRoof)face(paint,orange,[-w0,h0-.045,z0],[-w1,h1-.045,z1],[w1,h1-.045,z1],[w0,h0-.045,z0]);
    // Subtle transverse crown gives the painted roof its own highlight.
    if(isRoof)for(const s of sides)face(paint,orange,[0,h0,z0],[0,h1,z1],[s*w1,h1-.04,z1],[s*w0,h0-.04,z0]);
    for(const s of sides){
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
  // The cowl follows the bottom of the windshield, with a recessed binnacle
  // and short defroster slots instead of a flat rectangular shelf.
  trim.add(sphere,0x252a2c,0,.703,-.59,.679,.085,.26);
  trim.add(sphere,0x202528,-.355,.775,-.52,.192,.082,.13);
  for(const s of sides){
    strip(trim,0x202427,[[s*.53,.727,-.83],[s*.28,.743,-.79],[s*.13,.743,-.77]],.014,.008);
    strip(trim,0x252b2d,[[s*.61,.754,-.78],[s*.48,.805,-.685],[s*.21,.845,-.643]],.012,.009);
  }
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
  const updatePanes=carPanes.bind(glass.mesh(body,alpineGlass(panorama,{transparent:true,opacity:.54,depthWrite:false,side:THREE.DoubleSide}),false));
  const lenses=lamps.mesh(body,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),false);
  const wheels=[];
  const tireProfile=[[.252,-.128],[.301,-.127],[.338,-.09],[.35,-.052],[.35,.052],[.338,.09],[.301,.127],[.252,.128]];
  const tire=new THREE.LatheGeometry(tireProfile.map(([r,x])=>new THREE.Vector2(r,x)),40).rotateZ(Math.PI/2);
  const tireMat=new THREE.MeshPhongMaterial({color:0x26292a,specular:0x505153,shininess:27,side:THREE.DoubleSide});
  const wheelMaterial=new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,specular:0x7d8789,shininess:69});
  const caliperMaterial=new THREE.MeshPhongMaterial({color:0x914037,shininess:45});
  const caliperShape=new THREE.BoxGeometry(.061,.16,.077);
  for(const side of sides){
    const rim=new Batch(),faceX=side*.123;
    rim.add(disc,0x383e40,side*.09,0,0,.252,.05,.252,0,0,Math.PI/2);
    rim.add(disc,0x6b7476,side*.105,0,0,.203,.035,.203,0,0,Math.PI/2);
    rim.add(torus,steel,faceX,0,0,.247,.247,.247,0,Math.PI/2);
    for(let j=0;j<15;j++){
      const a=j*Math.PI*2/15;
      rim.add(disc,0x333a3c,side*.125,.179*Math.cos(a),.179*Math.sin(a),.009,.006,.009,0,0,Math.PI/2);
    }
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      const edge=(r,t)=>[faceX,r*Math.cos(t),r*Math.sin(t)];
      for(const e of sides)rim.beam(0x849194,edge(.071,a),edge(.239,a+e*.24),.035,.045);
      rim.add(disc,0xd5d8d0,side*.145,.054*Math.cos(a),.054*Math.sin(a),.012,.012,.012,0,0,Math.PI/2);
    }
    rim.add(disc,0x474f50,side*.14,0,0,.068,.034,.068,0,0,Math.PI/2);
    const rimGeometry=rim.geometry();
    for(const z of spec.wheels){
      const hub=new THREE.Group(),rotation=new THREE.Group();
      hub.position.set(side*spec.axle,spec.tire,z);root.add(hub);hub.add(rotation);
      const caliper=new THREE.Mesh(caliperShape,caliperMaterial);
      caliper.position.set(side*.112,.022,.165);hub.add(caliper);
      const rubber=tireMat.clone(),patch=tireContactPatch(rubber,spec.tire);
      rotation.add(new THREE.Mesh(tire,rubber),new THREE.Mesh(rimGeometry,wheelMaterial));
      wheels.push({hub,rotation,patch,x:side*spec.axle,z,front:z<0});
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
  const suspensionAxis=new THREE.Vector3();
  const fittingsDamage=damagedFittings([skin,fittings,lenses],-2.32,2.32,1.02,.46);
  const wreckFinish=roadWreckFinish(body);
  return (car,dt=0)=>{
    root.visible=!!car;if(!car)return;
    updatePanes(car.brokenGlass);
    root.scale.y=crushedScale(car);root.visible=root.scale.y>0;
    const frame=clamp(dt,0,.1),speed=car.speed??0;
    root.position.set(car.x,car.y,car.z);root.rotation.y=-car.yaw;
    const pose=car.suspension;
    root.rotation.set(car.bridgeFlight ? pose?.pitch??0 : 0,-car.yaw,0,'YXZ');
    const sag=wreckFinish(car);fittingsDamage(car);
    body.rotation.set((car.bridgeFlight?0:pose?.pitch??0)-.085*sag,0,(pose?.roll??0)-.10*sag);
    under.visible=!car.bridgeFlight;
    body.position.y=(car.suspension?.heave??0)-.12*sag;
    time+=frame;spin=(spin-speed*frame/spec.tire)%(Math.PI*2);
    suspensionAxis.set(0,1,0).applyQuaternion(body.quaternion);
    for(const [i,w] of wheels.entries()){
      const flat=isFlat(car,i);
      const hubY=spec.tire+(pose?.wheels[i]??(flat?-flatWheelDrop:0));
      placeGTWheel(w.hub.position,w.x,w.z,hubY,body,suspensionAxis);
      w.patch.value.set(flat?flatWheelDrop:0,Math.cos(spin),Math.sin(spin));
      w.rotation.rotation.x=spin;w.hub.rotation.y=w.front?-(car.steer??0)*.42:0;
    }
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
