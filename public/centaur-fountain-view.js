import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fountainSite} from './centaur-fountain-layout.js';

const verde=0x485747, bronze=0x826445, litBronze=0xae8754, dark=0x594938;
const sculptureYaw=.28+Math.PI/2; // Face inland toward Brickell.
const coping=0xe1cbb1, granite=0x43575a, gold=0xcaa665;

// Smooth, tapered cross sections let the limbs flatten into joints and flare
// toward shoulders, knees and hooves. The rings share normals at the seams.
function sculptedForm(stations){
  const centers=stations.map(([x,y,z])=>new THREE.Vector3(x,y,z));
  const curve=new THREE.CatmullRomCurve3(centers,false,'catmullrom',.25);
  const divisions=(stations.length-1)*3,sides=14,positions=[],indices=[];
  let across=new THREE.Vector3(1,0,0);
  for(let i=0;i<=divisions;i++){
    const t=i/divisions,p=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
    across.addScaledVector(tangent,-across.dot(tangent));
    if(across.lengthSq()<.001)across.copy(new THREE.Vector3(0,1,0).cross(tangent));
    across.normalize();
    const deep=new THREE.Vector3().crossVectors(tangent,across).normalize();
    const a=Math.min(stations.length-2,Math.floor(i/3)),f=i/3-a;
    const radius=THREE.MathUtils.lerp(stations[a][3],stations[a+1][3],f);
    const depth=THREE.MathUtils.lerp(stations[a][4],stations[a+1][4],f);
    for(let j=0;j<sides;j++){
      const angle=j*2*Math.PI/sides;
      const v=p.clone().addScaledVector(across,radius*Math.cos(angle)).addScaledVector(deep,depth*Math.sin(angle));
      positions.push(v.x,v.y,v.z);
      if(i){
        const prev=(i-1)*sides+j,next=(i-1)*sides+(j+1)%sides;
        indices.push(prev,next,prev+sides,next,next+sides,prev+sides);
      }
    }
  }
  for(const [row,sign] of [[0,-1],[divisions,1]]){
    const center=positions.length/3,p=centers[sign<0?0:centers.length-1];positions.push(p.x,p.y,p.z);
    for(let j=0;j<sides;j++){
      const a=row*sides+j,b=row*sides+(j+1)%sides;
      indices.push(center,sign<0?b:a,sign<0?a:b);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  return g;
}

function proceduralCentaur(group,Batch){
  const {x,z,base}=fountainSite,y=base+1.13,scale=1.48,yaw=sculptureYaw;
  const ball=new THREE.SphereGeometry(1,12,10),horse=new THREE.Group();
  // Build all of the bronze into one static batch. The forelegs paw the air
  // while the back hooves actually bear on the plinth.
  const metal=new Batch();
  function form(color,stations){
    const g=sculptedForm(stations);metal.add(g,color,x,y,z,scale,scale,scale,0,yaw);g.dispose();
  }
  function oval(color,at,size,tilt=0){
    horse.position.set(...at);horse.scale.set(...size);horse.rotation.set(tilt,0,0);
    horse.updateMatrix();
    const g=ball.clone().applyMatrix4(horse.matrix);
    metal.add(g,color,x,y,z,scale,scale,scale,0,yaw);g.dispose();
  }
  form(bronze,[[0,1.44,-1.05,.05,.12],[0,1.46,-.89,.32,.37],[0,1.47,-.61,.40,.43],
    [0,1.48,-.16,.35,.39],[0,1.57,.30,.36,.47],[0,1.72,.61,.34,.46],[0,1.81,.81,.22,.28],[0,1.82,.95,.04,.10]]);
  for(const s of [-1,1]){
    // Staggered hind legs, patella, hock, pastern and a dark clipped hoof.
    const off=s<0?.12:-.10;
    form(bronze,[[s*.22,1.62,-.63,.14,.21],[s*.29,1.41,-.69,.21,.27],[s*.30,1.12,-.54+off,.13,.15],
      [s*.27,.91,-.65+off,.082,.104],[s*.25,.65,-.87+off,.083,.099],[s*.25,.52,-.83+off,.068,.061],
      [s*.26,.20,-.72+off,.052,.048],[s*.26,.10,-.65+off,.060,.066]]);
    oval(dark,[s*.26,.065,-.63+off],[.083,.066,.132],.02);
    const kneeZ=s<0?.98:1.15,footZ=s<0?.87:1.03,kneeY=s<0?.86:1.31;
    form(litBronze,[[s*.20,1.84,.48,.13,.16],[s*.27,1.64,.57,.145,.17],[s*.28,1.45,.65,.098,.11],
      [s*.28,kneeY+.08,kneeZ,.078,.089],[s*.28,kneeY,kneeZ+.055,.074,.077],
      [s*.27,kneeY-.23,footZ-.075,.047,.050],[s*.26,kneeY-.32,footZ,.056,.061]]);
    oval(dark,[s*.26,kneeY-.353,footZ+.028],[.073,.071,.105],.38);
  }
  // Swept, heavy tail with lighter ridges that separate in silhouette.
  form(verde,[[0,1.64,-.91,.12,.11],[-.03,1.57,-1.15,.12,.14],
    [-.12,1.35,-1.34,.135,.13],[-.21,1.13,-1.43,.12,.11],[-.34,1.02,-1.52,.072,.073],[-.40,1.06,-1.66,.008,.014]]);
  for(let strand=0;strand<3;strand++){
    const dx=.042*strand;
    form(dark,[[.04+dx,1.58,-1.05,.029,.030],[dx-.025,1.45,-1.21,.032,.035],
      [dx-.13,1.22,-1.39,.028,.032],[dx-.26,1.06,-1.49,.017,.021],[dx-.35,1.075,-1.62,.006,.007]]);
  }
  for(const side of [-1,1]){
    // Folded skin at the flank / shoulder and the varying bronze on the crest
    // make the anatomy readable with the broad ambient lighting of the street.
    form(0x947049,[[side*.265,1.77,-.71,.044,.047],[side*.355,1.61,-.72,.057,.055],
      [side*.359,1.43,-.63,.037,.045],[side*.29,1.26,-.54,.012,.018]]);
    form(0x987851,[[side*.26,1.90,.44,.037,.041],[side*.34,1.73,.39,.06,.066],
      [side*.32,1.50,.42,.042,.045],[side*.27,1.39,.56,.016,.019]]);
  }
  // Human upper body grows out of the equine withers. A classical sash
  // crosses the anatomy and fans into the raised arm.
  form(bronze,[[0,1.67,.56,.20,.22],[0,1.94,.61,.23,.25],[0,2.13,.60,.202,.17],
    [0,2.35,.64,.25,.18],[0,2.56,.65,.335,.202],[0,2.68,.63,.30,.14],[0,2.72,.66,.12,.12]]);
  for(const s of [-1,1])oval(0x90704b,[s*.13,2.52,.786],[.137,.068,.057],-.11);
  form(verde,[[-.30,2.67,.65,.078,.070],[-.21,2.58,.77,.071,.048],[-.02,2.43,.82,.074,.044],
    [.16,2.24,.76,.078,.047],[.20,2.15,.63,.076,.046]]);
  form(bronze,[[0,2.66,.63,.124,.123],[0,2.79,.65,.104,.098],[0,2.84,.67,.103,.090]]);
  form(litBronze,[[0,2.80,.73,.052,.072],[0,2.84,.75,.091,.102],[0,2.95,.73,.129,.125],
    [0,3.07,.704,.142,.134],[0,3.16,.69,.13,.11],[0,3.21,.68,.045,.057]]);
  oval(litBronze,[0,2.995,.85],[.035,.058,.050],-.21);
  for(const s of [-1,1]){
    oval(dark,[s*.057,3.012,.831],[.029,.009,.011]);
    oval(litBronze,[s*.055,3.032,.836],[.049,.016,.021]);
    oval(litBronze,[s*.128,2.987,.70],[.029,.045,.021],-.11);
  }
  // A gilded laurel frames the face against the darker horse and plinth.
  for(const side of [-1,1]){
    for(let leaf=0;leaf<4;leaf++){
      const a=.23+leaf*.39;
      oval(gold,[side*.134*Math.sin(a),3.089+leaf*.013,.70+.132*Math.cos(a)],[.023,.043,.013],-.48);
    }
  }
  oval(0x765b41,[0,2.919,.843],[.047,.010,.010]);
  oval(litBronze,[0,2.897,.837],[.045,.018,.014]);
  oval(verde,[0,3.107,.66],[.145,.119,.142],-.27);
  for(let i=0;i<8;i++){
    const a=i*Math.PI*2/8;
    oval(dark,[.112*Math.cos(a),3.036+Math.sin(a)*.018,.66+.115*Math.sin(a)],[.043,.081,.047],-.21);
  }
  form(litBronze,[[-.25,2.63,.64,.095,.105],[-.37,2.64,.60,.13,.138],[-.49,2.60,.51,.107,.109],
    [-.61,2.55,.41,.076,.081],[-.70,2.63,.35,.079,.078],[-.83,2.76,.28,.045,.052],[-.89,2.80,.22,.038,.060]]);
  oval(bronze,[-.89,2.812,.219],[.061,.066,.068]);
  form(litBronze,[[.25,2.63,.66,.094,.11],[.36,2.67,.66,.122,.127],[.45,2.79,.74,.097,.105],
    [.52,2.91,.83,.072,.080],[.59,3.03,.79,.074,.076],[.64,3.19,.74,.047,.050],[.67,3.24,.71,.043,.054]]);
  oval(bronze,[.67,3.25,.70],[.064,.065,.063]);
  // Cast folds sweep away from the left shoulder, framing the space between
  // the torso and tail. Front and back have their own normals at the hem.
  function foldedSheet(color,rows,columns,point){
    const positions=[],indices=[];
    for(let side=0;side<2;side++){
      const start=positions.length/3;
      for(let j=0;j<=rows;j++)for(let k=0;k<=columns;k++){
        positions.push(...point(j/rows,k/columns));
        if(!j || !k)continue;
        const d=start+j*(columns+1)+k,a=d-columns-2,b=a+1,c=d-1;
        indices.push(...(side?[a,b,c,c,b,d]:[a,c,b,c,d,b]));
      }
    }
    const geom=new THREE.BufferGeometry();
    geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geom.setIndex(indices);geom.computeVertexNormals();
    metal.add(geom,color,x,y,z,scale,scale,scale,0,yaw);geom.dispose();
  }
  function mantle(t,u){
    const flare=Math.sin(t*Math.PI*.8),pleat=Math.cos(u*Math.PI*7);
    return [-.245-.28*t-.21*flare+(u-.5)*(.14+.76*t)+.055*pleat*t,
      2.64-.53*t-.22*Math.sin(t*Math.PI)+(.5-u)*(.12+.62*flare)+.045*pleat*t*t,
      .60-1.80*t+.13*flare*pleat+.16*t*Math.sin(u*Math.PI*2)];
  }
  foldedSheet(0x46645b,16,22,mantle);
  foldedSheet(0xbc914f,2,22,(t,u)=>mantle(.94+.034*t,u));
  oval(gold,[-.25,2.65,.72],[.074,.076,.030]);

  // A staggered sweep of carved hair gives the neck and face a profile.
  for(const side of [-1,1])for(let row=0;row<3;row++){
    const a=.65+.61*row,dx=side*Math.sin(a),dz=Math.cos(a);
    form(verde,[[.12*dx,3.13,.68+.12*dz,.040,.034],
      [.15*dx,3.04,.66+.15*dz,.048,.037],
      [.16*dx,2.94,.60+.10*dz,.037,.027],
      [.14*dx,2.87-.035*row,.54+.07*dz,.008,.010]]);
  }
  // Fingers are curled around the fan stem; the other hand opens into the wind.
  for(let i=0;i<4;i++){
    const k=i*.025;
    form(litBronze,[[-.88-k*.35,2.83-k,.23,.022,.020],[-.96-k*.46,2.83-k,.26,.019,.017],
      [-1.01+.017*i,2.87-k,.29+.014*i,.009,.012]]);
    oval(bronze,[.646+k*.42,3.23+k*.46,.743],[.045,.019,.023],.22);
  }
  // Each palmetto blade has a folded spine and an individually drooping tip.
  for(let i=-5;i<=5;i++){
    const angle=i*.195,reach=1.39-.15*Math.abs(i)/5,dx=Math.sin(angle),dy=Math.cos(angle);
    foldedSheet(i%2?0xd1a34c:0xf0c36a,12,4,(t,u)=>{
      const breadth=.016*(1-t)+.092*Math.pow(Math.sin(Math.PI*t),.88);
      const edge=(u-.5)*2*breadth;
      return [.67+dx*t*reach+dy*edge,3.25+dy*t*reach-dx*edge-.11*t*t,
        .70+.14*Math.sin(Math.PI*t)-.17*t*t+.032*(1-2*Math.abs(u-.5))*Math.sin(Math.PI*t)];
    });
  }
  ball.dispose();
  const patina=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.38,roughness:.48});
  patina.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 bronzePoint;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n bronzePoint=position;');
    shader.fragmentShader='varying vec3 bronzePoint;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec3 p=bronzePoint;
      float grain=sin(27.*p.z+5.*p.x+3.*sin(13.*p.y))*sin(24.*p.y+4.*sin(16.*p.x));
      float stain=sin(4.2*p.y+2.1*sin(3.4*p.x)+1.5*cos(6.*p.z))*.5+.5;
      diffuseColor.rgb*=.91+.08*grain+.08*stain;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.083,.125,.102),smoothstep(.65,.94,stain)*.28);`);
  };
  const sculpture=metal.mesh(group,patina);
  sculpture.name='The Tide Bearer · bronze and gilded palmetto';
  sculpture.userData.impactSurface='metal';

  return sculpture;
}

function centaur(group,Batch){
  const {x,z,base}=fountainSite,y=base+1.13;
  // The impact raycaster records this mesh at startup. Keep its identity as
  // the geometry changes so metal impacts always use the current silhouette.
  const statue=proceduralCentaur(group,Batch),loader=new GLTFLoader();
  let far,near,requestedNear=false,usingScan=false;
  async function load(file,name){
    const {scene}=await loader.loadAsync(new URL(file,import.meta.url).href);
    const mesh=scene.children[0];
    mesh.name=name;
    return mesh;
  }
  load('./young-centaur-far.glb','Centaur silhouette').then(mesh=>{far=mesh;})
    .catch(()=>{ /* The original bronze covers a failed download. */ });
  return local=>{
    if(!local)return;
    const distance=Math.hypot(local.x-x,(local.y??y)-y,local.z-z);
    if(!requestedNear && distance<55){
      requestedNear=true;
      load('./young-centaur.glb','Young Centaur · bronze and gilded palmetto').then(mesh=>{near=mesh;})
        .catch(()=>{ /* The distant bronze also works close up. */ });
    }
    const showNear=near && (!far || distance<(statue.geometry===near.geometry?60:55));
    const mesh=showNear?near:far;
    if(!mesh || statue.geometry===mesh.geometry)return;
    if(!usingScan){
      statue.geometry.dispose();statue.material.dispose();
      statue.position.set(x,y,z);
      statue.rotation.y=sculptureYaw;
      usingScan=true;
    }
    statue.geometry=mesh.geometry;statue.material=mesh.material;statue.name=mesh.name;
  };
}

function waterArches(group) {
  const {x,z,radiusX:rx,radiusZ:rz,base}=fountainSite, waterY=base+.50;
  // One shared ribboned stream, scaled and rotated from each nozzle to its
  // landing. Moving glints run along the actual parabolas at any frame rate.
  const pos=[],normal=[],uv=[],index=[],steps=24,sides=6;
  for(let i=0;i<=steps;i++)for(let j=0;j<sides;j++){
    const t=i/steps,a=2*Math.PI*j/sides,nx=Math.cos(a),ny=Math.sin(a),radius=.014*(1+.48*t);
    pos.push(nx*radius,4*t*(1-t)+ny*radius,t);normal.push(nx,ny,0);uv.push(t,j/sides);
    if(i){const k=i*sides+j,prev=k-sides,next=(i-1)*sides+(j+1)%sides;
      index.push(prev,next,k,k,next,next+sides);}
  }
  const tube=new THREE.BufferGeometry();
  tube.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));tube.setAttribute('normal',new THREE.Float32BufferAttribute(normal,3));
  tube.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));tube.setIndex(index);
  const time={value:0};
  const water=new THREE.MeshBasicMaterial({color:0xb2f2ed,transparent:true,opacity:.89,depthWrite:false,side:THREE.DoubleSide});
  water.onBeforeCompile=shader=>{
    shader.uniforms.jetTime=time;
    shader.vertexShader='varying float archT;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n archT=uv.x;');
    shader.fragmentShader='uniform float jetTime;varying float archT;\n'+shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n float gleam=.5+.5*cos(archT*85.-jetTime*9.0);diffuseColor.rgb*=.83+.31*gleam;diffuseColor.a*=1.-.32*archT;');
  };
  const count=24,arches=new THREE.InstancedMesh(tube,water,count),pose=new THREE.Object3D();
  arches.name='Choreographed fountain jets';group.add(arches);
  for(let i=0;i<count;i++){
    const a=2*Math.PI*(i+.5)/count,dx=Math.cos(a),dz=Math.sin(a);
    const ax=rx*.85*dx,az=rz*.87*dz,bx=rx*.55*Math.cos(a+.47),bz=rz*.53*Math.sin(a+.47);
    pose.position.set(x+ax,waterY,z+az);
    pose.rotation.y=Math.atan2(bx-ax,bz-az);
    pose.scale.set(1,1.55+.76*(.5+.5*dz*dz)+.20*(i%2),Math.hypot(bx-ax,bz-az));
    pose.updateMatrix();arches.setMatrixAt(i,pose.matrix);
  }
  arches.computeBoundingSphere();
  return (dt,local)=>{
    const near=!local || Math.hypot(local.x-x,local.z-z)<70;
    arches.visible=near;
    if(near)time.value=(time.value+Math.min(.10,dt))%4096;
  };
}

export function centaurFountain(parts,group,Batch,materials){
  const {x,z,radiusX:rx,radiusZ:rz,base}=fountainSite;
  const {masonry,metal,glow}=parts,water=new Batch();
  function lathe(batch,color,profile,y,xScale=1,zScale=1,rotation=0){
    const shape=new THREE.LatheGeometry(profile.map(([r,h])=>new THREE.Vector2(r,h)),64);
    batch.add(shape,color,x,y,z,xScale,1,zScale,0,rotation);shape.dispose();
  }
  // High pale coping, indented panels and a band of concealed aqua uplights.
  lathe(masonry,granite,[[0,0],[.98,0],[1,.065],[.99,.17],[.95,.19],[.95,.62],[.76,.62],[.76,.24],[0,.24]],base,rx,rz);
  lathe(masonry,coping,[[.934,.41],[.988,.46],[1,.51],[1,.60],[.973,.63],[.855,.63],[.838,.59],[.84,.49]],base,rx,rz);
  lathe(metal,gold,[[.955,.274],[.959,.278],[.959,.315],[.955,.32]],base,rx,rz);
  lathe(glow,0x74e6dc,[[.96,.33],[.962,.332],[.962,.353],[.96,.356]],base,rx,rz);
  const surface=new THREE.CircleGeometry(1,64).rotateX(-Math.PI/2);
  water.add(surface,0x397c7d,x,base+.50,z,rx*.86,1,rz*.86);surface.dispose();
  for(const factor of [.57,.72,.81])lathe(water,0x75b6ae,[[factor,.002],[factor+.004,.004]],base+.50,rx,rz);
  lathe(masonry,granite,[[0,0],[.77,0],[.78,.11],[.67,.19],[.63,.42],[.58,.57],[.59,.61],[0,.61]],base+.48,1.35,2.45,sculptureYaw);
  lathe(metal,gold,[[.63,.365],[.64,.375],[.64,.40],[.63,.412]],base+.48,1.35,2.45,sculptureYaw);
  lathe(metal,verde,[[0,0],[.59,0],[.61,.035],[.60,.074],[0,.074]],base+1.055,1.35,2.45,sculptureYaw);
  const disk=new THREE.CylinderGeometry(1,1,1,12);
  for(let i=0;i<24;i++){
    const a=2*Math.PI*(i+.5)/24,dx=Math.cos(a),dz=Math.sin(a);
    const bx=x+rx*.85*dx,bz=z+rz*.87*dz;
    metal.add(disk,bronze,bx,base+.496,bz,.105,.037,.105);
    glow.add(disk,i%2?0xffdc93:0x7ee6e3,bx,base+.518,bz,.072,.010,.072);
  }
  disk.dispose();
  water.mesh(group,materials.water,false);
  const updateStatue=centaur(group,Batch),updateArches=waterArches(group);
  return (dt,local)=>{updateStatue(local);updateArches(dt,local);};
}
