import { newGait, advanceGait, newFoot, placeFoot } from './locomotion.js';
import * as THREE from 'three';
import { rangerMaterial, rangerIdentity, skinColors, hood, visorLens, visorRim, trouserSeat, capCrown, fieldGaiter, fieldJacket, fieldPack, fieldSleeve, fieldTrouser } from './ranger-surfaces.js';
import { missileLaunchers, missileView, turretView } from './mount-view.js';
import { mounts, mountPosition, gunnerFeet } from './mounts.js';
import { tracePulse } from './expedition.js';
import { createRoverView } from './rover-view.js';
import { createSupplyView } from './supply-view.js';
import { conifers, granite, floorMaterial, creekMaterial, alpineGlass, fieldPaint } from './landscape.js';
import { aircraftBody } from './aircraft-body.js';
import { cityStreets } from './brickell-scene.js';
import { surfacePicker } from './surface-hits.js';
import { buildStacks, buildOutpost, meadow } from './outpost.js';
import { CITY, MAP, BREAKABLES, HELIPAD, terrainHeight, groundHeight, buildingTopAt } from './world.js';

// Static scenery gets merged by material so a forest costs the same number of
// draw calls as a single tree. All placements use the simulation's map.
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const color = (value) => new THREE.Color(value);
const cube = new THREE.BoxGeometry(1, 1, 1);
const stone = new THREE.IcosahedronGeometry(1, 0);
const trunk = new THREE.CylinderGeometry(0.79, 1, 1, 9);
const round = new THREE.SphereGeometry(1, 10, 8);
const vertexMaterial = () => new THREE.MeshLambertMaterial({ vertexColors: true });
const direction = new THREE.Vector3();
const transform = new THREE.Object3D();
const point = new THREE.Vector3();
const normal = new THREE.Vector3();
const normalsMatrix = new THREE.Matrix3();

function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function hash(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function noise(x, z) {
  const i = Math.floor(x), j = Math.floor(z);
  let a = x - i, b = z - j;
  a *= a * (3 - 2 * a);
  b *= b * (3 - 2 * b);
  return mix(mix(hash(i, j), hash(i + 1, j), a), mix(hash(i, j + 1), hash(i + 1, j + 1), a), b);
}

class Batch {
  constructor(textured=false) { this.uv=textured ? [] : null; }
  positions = [];
  normals = [];
  colors = [];
  indices = [];

  add(geometry, tint, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
    transform.position.set(x, y, z);
    transform.rotation.set(rx, ry, rz);
    transform.scale.set(sx, sy, sz);
    transform.updateMatrix();
    const matrix = transform.matrix;
    normalsMatrix.getNormalMatrix(matrix);
    const p = geometry.attributes.position, n = geometry.attributes.normal;
    const base = this.positions.length / 3;
    const uv=geometry.getAttribute('batchUv');
    const c = color(tint);
    for (let i = 0; i < p.count; i++) {
      point.fromBufferAttribute(p, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(n, i).applyNormalMatrix(normalsMatrix);
      this.positions.push(point.x, point.y, point.z);
      this.normals.push(normal.x, normal.y, normal.z);
      this.colors.push(c.r, c.g, c.b);
      if (this.uv) this.uv.push(uv ? uv.getX(i) : .984, uv ? uv.getY(i) : .031);
    }
    const index = geometry.index;
    for (let i = 0, length = index ? index.count : p.count; i < length; i++) {
      this.indices.push(base + (index ? index.getX(i) : i));
    }
  }

  beam(tint, a, b, width, depth = width) {
    direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const length = direction.length();
    transform.quaternion.setFromUnitVectors(up, direction.normalize());
    const { x, y, z } = transform.rotation;
    this.add(cube, tint, (a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2, width, length, depth, x, y, z);
  }

  mesh(parent, material, casts = true) {
    if (!this.indices.length) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    if (this.uv) geometry.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));
    geometry.setIndex(this.indices);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = casts;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

const up = new THREE.Vector3(0,1,0);
const downArm=new THREE.Vector3(0,-1,0), reach=new THREE.Vector3(), bend=new THREE.Vector3();
const elbow=new THREE.Vector3(),segment=new THREE.Vector3(),inverseUpper=new THREE.Quaternion();
const upperLength=.275, lowerLength=.265;

// Solve the two visible arm segments in body space. An outward elbow bend keeps
// both hands on the grips as the field kit bobs, including on a turning turret.
function gripPose(arm,forearm,x,y,z,side) {
  reach.set(x,y,z).sub(arm.position);
  const distance=clamp(reach.length(),.04,upperLength+lowerLength-.0001);
  reach.normalize();
  bend.set(side*.70,-1,.62);
  bend.addScaledVector(reach,-bend.dot(reach)).normalize();
  const along=(distance*distance+upperLength*upperLength-lowerLength*lowerLength)/(2*distance);
  elbow.copy(reach).multiplyScalar(along).addScaledVector(bend,Math.sqrt(Math.max(0,upperLength*upperLength-along*along)));
  arm.quaternion.setFromUnitVectors(downArm,segment.copy(elbow).normalize());
  segment.copy(reach).multiplyScalar(distance).sub(elbow).normalize();
  inverseUpper.copy(arm.quaternion).invert();
  forearm.quaternion.setFromUnitVectors(downArm,segment.applyQuaternion(inverseUpper));
}

function trailDistance(x, z) {
  let best = Infinity;
  for (let i = 0; i < MAP.trail.length; i++) {
    const [ax, az] = MAP.trail[i], [bx, bz] = MAP.trail[(i + 1) % MAP.trail.length];
    const dx = bx - ax, dz = bz - az;
    const t = clamp(((x-ax)*dx + (z-az)*dz)/(dx*dx + dz*dz || 1), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - t*dx, z - az - t*dz));
  }
  return best;
}

function sceneryHeight(x,z) {
  const base=terrainHeight(x,z);
  const beyond=Math.hypot(Math.max(0,Math.abs(x)-MAP.bounds),Math.max(0,Math.abs(z)-MAP.bounds));
  if(!beyond) return base;
  // Continue the actual drop-off into wooded draws. Ridge crests depend on
  // world-space drainage and outcrops, so they do not trace the map perimeter.
  const basin=THREE.MathUtils.smoothstep(beyond,0,13);
  const broad=noise(x*.036+11,z*.037-7);
  const gullies=noise(x*.072+3,z*.065-15);
  const crest=Math.hypot(x+7,z-5)+14*(broad-.5);
  const foothills=THREE.MathUtils.smoothstep(crest,47,77);
  return base+basin*(3+6*gullies+foothills*(8+19*broad));
}

function addGround(scene,renderer) {
  const size = 164;
  const geo = new THREE.PlaneGeometry(size, size, 172, 172).rotateX(-Math.PI/2);
  const positions = geo.attributes.position;
  const cover = new Uint8Array(positions.count);
  const colors = [];
  const dark = color(0x4d573f), light = color(0xa2a27c);
  const path = color(0xb2a184), shale = color(0x85877b);
  const c = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const y = sceneryHeight(x,z);
    positions.setY(i, y);
    const patches = noise(x*.18,z*.18);
    c.copy(dark).lerp(light, patches*.5 + noise(x*.045,z*.045)*.42);
    c.lerp(shale, clamp((MAP.waterY + 1.95 - y)*.65,0,.9));
    const clearing = Math.min(trailDistance(x,z), Math.hypot(x,z-15)*.56);
    c.lerp(path, clamp((2.02 - clearing + .67*(patches-.5))*2.3,0,1)*.94);
    const pad=clamp((2.9-Math.hypot(x-HELIPAD.x,z-HELIPAD.z))*2.5,0,1);
    c.lerp(shale,pad*.89);
    const verge=THREE.MathUtils.smoothstep(clearing+.8*(patches-.5),1.4,3.25);
    const dry=THREE.MathUtils.smoothstep(y,MAP.waterY+.4,MAP.waterY+1.6);
    cover[i]=Math.round(255*verge*dry*(1-pad));
    // Dark organic litter gathers at the bases of trees and stones.
    let shade=1;
    if(Math.abs(x)<35 && Math.abs(z)<35) {
      for(const tree of MAP.trees) {
        const dx=x-tree.x,dz=z-tree.z;
        if(dx*dx+dz*dz<5)shade=Math.min(shade,.66+.34*clamp((dx*dx+dz*dz)/5,0,1));
      }
      for(const rock of MAP.rocks){
        const dx=x-rock.x,dz=z-rock.z,r=rock.radius+1.05;
        if(dx*dx+dz*dz<r*r)shade=Math.min(shade,.58+.42*clamp((dx*dx+dz*dz)/(r*r),0,1));
      }
    }
    c.multiplyScalar(shade*(.76+.24*noise(x*.93,z*.93)+.12*noise(x*3,z*3)));
    colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.setAttribute('forestCover',new THREE.Uint8BufferAttribute(cover,1,true));
  geo.computeVertexNormals();
  const mat=floorMaterial(renderer);
  const ground = new THREE.Mesh(geo,mat);
  ground.receiveShadow = true;
  scene.add(ground);
}

function addSky(scene) {
  const panorama=new THREE.TextureLoader().load(CITY ? './brickell-sky.webp' : './valley-horizon.webp');
  panorama.colorSpace=THREE.SRGBColorSpace;panorama.wrapS=THREE.MirroredRepeatWrapping;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(278,48,22),
    new THREE.ShaderMaterial({
      side:THREE.BackSide,depthWrite:false,
      uniforms:{panorama:{value:panorama},horizon:{value:color(0xb4b3aa)},zenith:{value:color(0x86919a)}},
      vertexShader:`varying vec3 skyDir; void main(){skyDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 skyDir; uniform vec3 horizon; uniform vec3 zenith; uniform sampler2D panorama;
        float cloudHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.53);}
        float cloudNoise(vec2 p){
          vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(cloudHash(i),cloudHash(i+vec2(1.,0.)),f.x),mix(cloudHash(i+vec2(0.,1.)),cloudHash(i+1.),f.x),f.y);
        }
        void main(){vec3 d=normalize(skyDir); float t=pow(clamp(d.y,0.,1.),.46);
        vec3 c=mix(horizon,zenith,t);float sun=max(dot(d,normalize(vec3(-.54,.65,-.64))),0.);
        vec2 p=d.xz/max(.085,d.y+.035)*vec2(2.4,4.1);
        float cloud=.55*cloudNoise(p)+.28*cloudNoise(2.*p)+.12*cloudNoise(4.*p)+.05*cloudNoise(8.*p);
        c=mix(c,vec3(.67,.67,.64),smoothstep(.54,.73,cloud)*smoothstep(.05,.20,d.y)*.6);
        c+=vec3(.18,.145,.09)*pow(sun,22.);
        float elevation=asin(clamp(d.y,-1.,1.));
        vec2 uv=vec2(atan(d.x,-d.z)*.46+.17,${CITY ? '(elevation+.16)/.69' : '(elevation+.44)/.98'});
        vec3 range=texture2D(panorama,vec2(uv.x,clamp(uv.y,0.,1.))).rgb;
        c=mix(range,c,smoothstep(.81,1.24,uv.y));
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
        }`
    }));
  if(CITY) {
    sky.frustumCulled=false;
    sky.onBeforeRender=(_r,_s,camera)=>{sky.matrixWorld.setPosition(camera.position);sky.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse,sky.matrixWorld);};
  }
  sky.renderOrder=-20; scene.add(sky);
  return panorama;
}

function addBridge(scene,renderer,rng) {
  // Project the board finish along the longest local dimension of each beam,
  // including diagonal braces, before Batch transforms it into world space.
  const uv=[];
  class BridgeBatch extends Batch {
    add(shape,tint,x,y,z,sx,sy,sz,...rotation) {
      const pos=shape.attributes.position, normal=shape.attributes.normal;
      for(let i=0;i<pos.count;i++) {
        const px=pos.getX(i)*sx,py=pos.getY(i)*sy,pz=pos.getZ(i)*sz;
        const u=sx>=sy && sx>=sz ? px : sy>=sz ? py : pz;
        const v=sx>=sy && sx>=sz ? (Math.abs(normal.getY(i))>.5 ? pz : py)
          : sy>=sz ? (Math.abs(normal.getX(i))>.5 ? pz : px) : (Math.abs(normal.getY(i))>.5 ? px : py);
        uv.push(u*.43+z*.71+x*.15,v*1.2+y*.83+z*.33);
      }
      super.add(shape,tint,x,y,z,sx,sy,sz,...rotation);
    }
  }
  const batch=new BridgeBatch();
  const { x,z,width,length,y }=MAP.bridge;
  const boards=[0xa58b60,0xb29973,0x9e815c,0xa68d68];
  for(let i=0;i<32;i++) {
    const offset=(i+.5)*length/32-length/2;
    batch.add(cube,boards[i%4],x,y-.10,z+offset,width+.12*rng(),.20,length/32-.014,0,(rng()-.5)*.007);
  }
  for(const side of [-1,1]) {
    const xx=x+side*width/2;
    batch.add(cube,0x70583d,xx-.27*side,y-.26,z,.27,.36,length+.25);
    for(let i=0;i<5;i++) {
      const zz=z+(i-2)*2.4;
      batch.add(cube,0x70583f,xx,y+.37,zz,.16,1.2,.17);
      batch.add(cube,0xb39b70,xx,y+1.0,zz,.19,.065,.20);
      if(i % 2 === 0) batch.add(cube,0x615744,xx,y-1.4,zz,.23,2.66,.25);
    }
    batch.add(cube,0xa78c63,xx,y+.90,z,.15,.12,length-.28);
    batch.add(cube,0x867153,xx,y+.39,z,.08,.08,length-.30);
    for(let i=0;i<4;i++){
      const from=z+(i-2)*2.4;
      batch.beam(0x776649,[xx,y+.22,from+.1],[xx,y+.82,from+2.31],.083);
    }
  }
  const map=new THREE.TextureLoader().load('./sawn-timber.webp');
  map.wrapS=map.wrapT=THREE.MirroredRepeatWrapping;
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const wood=new THREE.MeshLambertMaterial({map,vertexColors:true});
  const bridge=batch.mesh(scene,wood);
  bridge.userData.impactSurface='wood';
  bridge.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
}

function addTrailMarker(batch, x,z, heading, flag = false) {
  const y=terrainHeight(x,z);
  batch.add(cube,0x75634b,x,y+.79,z,.14,1.58,.15,0,heading);
  batch.add(cube,0xa38b5d,x,y+1.52,z,.50,.25,.15,0,heading);
  batch.add(cube,0xeee6bd,x+.087*Math.sin(heading),y+1.50,z+.087*Math.cos(heading),.30,.07,.015,0,heading);
  batch.add(cube,0xaf512e,x+.087*Math.sin(heading),y+1.59,z+.087*Math.cos(heading),.30,.06,.018,0,heading);
  if(flag) {
    const flagY=y+2.3;
    batch.add(cube,0x766047,x,y+1.2,z,.075,2.4,.075);
    batch.add(cube,0xcf6d40,x+.28,flagY,z,.57,.25,.025,0,.1,-.07);
  }
}

function signFace(scene,x,z,heading,text) {
  const board=document.createElement('canvas');board.width=384;board.height=104;
  const ink=board.getContext('2d');
  ink.fillStyle='#4b4531';ink.fillRect(0,0,384,104);
  for(let k=0;k<21;k++){
    const y=(k*39)%104;
    ink.fillStyle=k%3?'#514a36':'#413e30';ink.fillRect((k*109)%350,y,40+(k*71)%250,1+k%2);
  }
  ink.strokeStyle='#a59c7a';ink.lineWidth=3;ink.strokeRect(7,7,370,90);
  ink.fillStyle='#e3d9ab';ink.font='bold 42px sans-serif';ink.textAlign='center';ink.fillText(text,192,70);
  const map=new THREE.CanvasTexture(board);map.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.13,.31),new THREE.MeshLambertMaterial({map,side:THREE.DoubleSide}));
  sign.position.set(x+.091*Math.sin(heading),terrainHeight(x,z)+1.55,z+.091*Math.cos(heading));
  sign.rotation.y=heading;scene.add(sign);
}

function windsock(batch) {
  const x=HELIPAD.x+3.20,z=HELIPAD.z-2.85,y=groundHeight(x,z),mast=3.18;
  batch.add(trunk,0x727a73,x,y+mast/2,z,.042,mast,.042);
  batch.add(trunk,0x756f5b,x,y+.073,z,.20,.146,.20);
  const marks=[0xb65f37,0xd6ccb1,0xb65f37,0xd6ccb1,0xb65f37];
  const angle=.26;
  for(let k=0;k<5;k++){
    const fabric=new THREE.CylinderGeometry(.24-.026*k,.214-.026*k,.246,12,1,true);
    batch.add(fabric,marks[k],x+.13+.238*k,y+mast-.018*k*k,z,.99,1,1,0,0,Math.PI/2-angle*k*.24);
    fabric.dispose();
  }
  const rim=new THREE.TorusGeometry(.24,.011,5,16);
  batch.add(rim,0x7b7e6d,x+.007,y+mast,z,1,1,1,0,Math.PI/2);
  rim.dispose();
}

function addDetails(scene,batch, rng) {
  const granite=[0x7c8179,0x8a897c,0x898d83,0x777f78];
  addTrailMarker(batch,2.24,8.1,-.35);
  addTrailMarker(batch,MAP.lookout.x-1.65,MAP.lookout.z-.80,.2,true);
  signFace(scene,2.24,8.1,-.35,'CREEK TRAIL');
  signFace(scene,MAP.lookout.x-1.65,MAP.lookout.z-.80,.2,'LOOKOUT');
  windsock(batch);
  for(let i=0;i<4100;i++) {
    const x=(rng()-.5)*79,z=(rng()-.5)*79,y=terrainHeight(x,z);
    if(y<MAP.waterY+.22 || Math.max(Math.abs(x),Math.abs(z))>34) continue;
    const d=trailDistance(x,z);
    if(d<1.7 && rng()>.12 || Math.hypot(x-HELIPAD.x,z-HELIPAD.z)<2.45) continue;
    if(d<1.7 || rng()<.08) {
      const size=(d<1.7 ? .03:.07)*(1+2*rng());
      batch.add(stone,granite[i%4],x,y+.008,z,size*1.12,size*.36,size*.8,0,rng()*TAU);

    }
  }
}

function water(scene,rng,renderer) {
  const geometry=new THREE.PlaneGeometry(125,125).rotateX(-Math.PI/2);
  const material=creekMaterial(renderer);
  material.map.repeat.set(28,28);
  const surface=new THREE.Mesh(geometry,material);
  surface.position.y=MAP.waterY; surface.receiveShadow=true; scene.add(surface);
  const ripples=new Batch();
  for(let i=0;i<420;i++) {
    const x=(rng()-.5)*108,z=(rng()-.5)*4.5;
    if(terrainHeight(x,z)>MAP.waterY-.07) continue;
    ripples.add(cube, i%4 ? 0x739294:0xa2b5ac,x,MAP.waterY+.012,z,.09+rng()*.35,.005,.007+rng()*.014,0,(rng()-.5)*.18);
  }
  return ripples.mesh(scene,new THREE.MeshBasicMaterial({vertexColors:true}),false);
}

function contactShadowMap() {
  const stamp=document.createElement('canvas');
  stamp.width=stamp.height=32;
  const ctx=stamp.getContext('2d');
  const gradient=ctx.createRadialGradient(16,16,2,16,16,16);
  gradient.addColorStop(0,'rgba(255,255,255,1)');
  gradient.addColorStop(.55,'rgba(255,255,255,.65)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
  return new THREE.CanvasTexture(stamp);
}

// Field equipment uses the same vertex-colored batches as the hikers.
// Each loadout costs a single draw call while equipped.
function makeFirearms(body, material) {
  const carbine = new Batch(), sidearm = new Batch();
  const alloy=0x4f5452, charcoal=0x343a39, stock=0x686655, accent=0x858578;
  const tube=new THREE.CylinderGeometry(1,1,1,14);
  // Bevelled side profiles give the two field props distinct silhouettes.
  function profile(batch,tint,outline,width) {
    const shape=new THREE.Shape(outline.map(([z,y])=>new THREE.Vector2(z,y)));
    const geo=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:1,bevelThickness:.003,bevelSize:.004});
    geo.rotateY(-Math.PI/2);batch.add(geo,tint,width/2,0,0);geo.dispose();
  }
  profile(carbine,stock,[[.235,.104],[.072,.102],[.045,.061],[.092,.034],[.149,.039],[.199,-.008],[.232,-.014]],.056);
  carbine.add(cube,charcoal,0,.041,.236,.065,.119,.013);
  profile(carbine,alloy,[[.072,.1],[-.167,.1],[-.192,.068],[-.143,.023],[-.063,.016],[-.02,.036],[.067,.047]],.061);
  profile(carbine,charcoal,[[.026,.048],[-.020,.035],[.012,-.091],[.052,-.077]],.043);
  profile(carbine,stock,[[-.075,.042],[-.139,.040],[-.143,-.010],[-.17,-.077],[-.124,-.097],[-.095,-.044]],.047);
    profile(carbine,stock,[[-.151,.098],[-.341,.093],[-.36,.074],[-.337,.029],[-.168,.025]],.056);
    for(const side of [-1,1]) for(let n=0;n<5;n++)
      carbine.add(cube,charcoal,side*.032,.064,-.184-.033*n,.004,.016,.019);
    carbine.add(tube,charcoal,0,.063,-.399,.018,.123,.018,Math.PI/2);
    carbine.add(tube,alloy,0,.063,-.462,.023,.054,.023,Math.PI/2);
  carbine.add(cube,charcoal,0,.109,-.092,.047,.017,.157);
  carbine.add(tube,alloy,0,.137,-.075,.026,.067,.026,Math.PI/2);
  carbine.add(tube,0x597478,0,.137,-.111,.019,.005,.019,Math.PI/2);
  for(const side of [-1,1]) {
    carbine.add(cube,charcoal,side*.033,.072,-.073,.004,.019,.086);
    carbine.add(cube,accent,side*.036,.073,-.071,.004,.010,.046);
  }
  profile(sidearm,charcoal,[[.088,.085],[-.169,.085],[-.18,.047],[-.10,.025],[.044,.027],[.091,.050]],.043);
  profile(sidearm,alloy,[[.084,.106],[-.184,.106],[-.184,.064],[.080,.064]],.047);
  profile(sidearm,stock,[[.079,.045],[.019,.043],[.036,-.095],[.095,-.089]],.045);
  sidearm.add(tube,charcoal,0,.085,-.188,.014,.02,.014,Math.PI/2);
  sidearm.beam(charcoal,[.0,.019,-.063],[.0,-.014,-.050],.010);
  sidearm.beam(charcoal,[.0,-.014,-.050],[.0,-.013,.021],.010);
  tube.dispose();
  const tools = [carbine.mesh(body,material,false), sidearm.mesh(body,material,false)];
  for (const tool of tools) tool.position.set(.109,1.33,-.19);
  return tools;
}

function landingMarks(batch) {
  const {x, z} = HELIPAD;
  const h = (dx,dz) => groundHeight(x + dx,z + dz) + .035;
  // Fit both edges to the ground so the paint stays flush across the slope.
  function stripe(ax,az,bx,bz,width) {
    const dx=bx-ax,dz=bz-az,k=width/(2*Math.hypot(dx,dz));
    const ox=-dz*k,oz=dx*k;
    const corners=[[ax+ox,az+oz],[bx+ox,bz+oz],[bx-ox,bz-oz],[ax-ox,az-oz]];
    const positions=corners.flatMap(([u,v])=>[x+u,h(u,v),z+v]);
    const patch=new THREE.BufferGeometry();
    patch.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    patch.setIndex([0,1,2,0,2,3]);patch.computeVertexNormals();
    batch.add(patch,0xe8ddaa,0,0,0);
    patch.dispose();
  }
  const ringRadius = 2.35;
  for (let i = 0; i < 20; i++) {
    const a = i * TAU / 20, b = (i + .84) * TAU / 20;
    stripe(Math.sin(a)*ringRadius,Math.cos(a)*ringRadius,Math.sin(b)*ringRadius,Math.cos(b)*ringRadius,.073);
  }
  stripe(-.46,-.8,-.46,.8,.14);
  stripe(.46,-.8,.46,.8,.14);
  stripe(-.46,0,.46,0,.14);
}

function objectHealthLabel(scene,title) {
  const tag = document.createElement('canvas');
  tag.width=320; tag.height=64;
  const ink=tag.getContext('2d');
  const labelMap=new THREE.CanvasTexture(tag);
  labelMap.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:labelMap,transparent:true,depthWrite:false}));
  const labelPosition=new THREE.Vector3();
  label.onBeforeRender=(_renderer,_scene,camera)=>{
    label.getWorldPosition(labelPosition);
    const width=Math.min(1.9,labelPosition.distanceTo(camera.position)*.14);
    label.scale.set(width,width*.2,1);
    label.updateMatrixWorld();
  };
  scene.add(label);
  let labelHp, labelMax, labelRecovery, labelUnpiloted;
  function update(hp,maxHp,recovery,unpiloted=false) {
    if (hp===labelHp && maxHp===labelMax && recovery===labelRecovery && unpiloted===labelUnpiloted) return;
    labelHp=hp; labelMax=maxHp; labelRecovery=recovery; labelUnpiloted=unpiloted;
    const condition=hp/maxHp;
    ink.clearRect(0,0,320,64);
    ink.fillStyle='rgba(21,37,36,.90)';
    ink.fillRect(0,0,320,64);
    ink.font='bold 23px sans-serif';
    ink.textAlign='left';
    ink.fillStyle='#f8f5e8';
    ink.fillText(recovery!==null ? 'WRECKED' : unpiloted ? 'UNPILOTED' : title,12,28);
    ink.textAlign='right';
    ink.fillText(recovery===null ? hp+' / '+maxHp : 'RESET '+recovery+'s',308,28);
    ink.fillStyle='#53615d';
    ink.fillRect(12,40,296,12);
    ink.fillStyle=condition<=.30 ? '#ff8b61' : condition<=.60 ? '#f1c46b' : '#98dfad';
    ink.fillRect(12,40,296*condition,12);
    labelMap.needsUpdate=true;
  }

  return {sprite:label,update};
}

function fieldHelicopter(scene,material,shadowMap,panorama) {
  const group = new THREE.Group();
  scene.add(group);
  const hull = new Batch(), glazing=new Batch(), rotor = new Batch(), fan = new Batch();
  const olive=0x59614f, graphite=0x343b36, alloy=0x939489;
  aircraftBody(hull,glazing);
  const wheel=new THREE.TorusGeometry(1,.36,8,20);
  hull.add(round,graphite,0,1.03,-1.87,.50,.13,.22);
  hull.add(cube,0x414840,0,1.07,-1.72,.95,.16,.24,-.30);
  for(const side of [-1,1]) {
    hull.add(cube,0x303833,side*.765,.973,-.83,.025,.069,.172);
    hull.add(cube,alloy,side*.785,.983,-.83,.029,.024,.116);
    hull.add(cube,0x303833,side*.763,.928,.80,.036,.073,.185);
    hull.add(cube,alloy,side*.787,.938,.80,.031,.024,.118);
    for(let k=0;k<9;k++) hull.add(round,0x8f9281,side*.757,.894,-.56+k*.122,.009,.010,.010);
  }
  // An upswept boom, fin and low stabilator form the distinctive tail silhouette.
  const fairing=new THREE.CylinderGeometry(.13,.31,3.05,10);
  hull.add(fairing,olive,0,1.54,3.40,1,1,.94,Math.PI/2-.13);
  const fin=new THREE.Shape();
  fin.moveTo(4.25,1.58);fin.lineTo(4.92,1.70);fin.lineTo(5.39,2.99);
  fin.lineTo(4.99,2.97);fin.lineTo(4.66,2.35);fin.closePath();
  const pylon=new THREE.ExtrudeGeometry(fin,{depth:.15,bevelEnabled:false});
  pylon.rotateY(-Math.PI/2);hull.add(pylon,olive,.075,0,0);
  const aerofoil=(outline,thickness)=>{
    const shape=new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(x,-z)));
    const geo=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});
    return geo.rotateX(-Math.PI/2);
  };
  const stabilator=aerofoil([[-1.34,4.72],[1.34,4.72],[1.34,4.29],[.33,4.00],[-.33,4.00],[-1.34,4.29]],.055);
  hull.add(stabilator,olive,0,1.66,0);stabilator.dispose();
  for(const side of [-1,1]){
    hull.add(round,graphite,side*.35,.94,-1.28,.23,.16,.26);
    hull.add(round,0x42473e,side*.35,1.18,-.84,.22,.30,.08,-.12);
    // Paired turbine nacelles above the cabin with recessed mouths and rear exhausts.
    hull.add(round,olive,side*.45,1.70,.46,.316,.262,1.14);
    hull.add(trunk,graphite,side*.46,1.76,-.54,.228,.30,.20,Math.PI/2);
    hull.add(round,0x222923,side*.46,1.76,-.69,.182,.154,.038);
    for(let j=-2;j<=2;j++) hull.add(cube,0x737869,side*.46+.058*j,1.76,-.726,.014,.20,.014);
    hull.add(trunk,0x59564b,side*.48,1.73,1.14,.18,.49,.17,Math.PI/2-.17,side*.18);
    hull.add(round,0x252924,side*.51,1.77,1.36,.145,.14,.04);
    hull.add(round,graphite,side*.54,1.76,1.30,.235,.19,.33);
    hull.add(round,0x1c2220,side*.59,1.78,1.57,.16,.125,.07);
    hull.add(cube,0x555c50,side*.72,1.51,1.10,.11,.29,.55);
    for(let l=0;l<8;l++) hull.add(cube,graphite,side*.778,1.51,.90+.052*l,.018,.17,.022,-.15);
    hull.beam(0x292e2b,[side*.60,1.38,-1.84],[side*.35,1.26,-1.99],.017);
    hull.add(round,0xadb2a7,side*.29,.66,-2.30,.084,.055,.042);
    hull.beam(0x7a8073,[side*.39,1.64,-.90],[side*.39,1.77,-1.0],.024);
    hull.beam(graphite,[side*.78,.53,-.52],[side*.78,.53,.94],.039);
    for(const z of [-.48,.80]){
      hull.beam(alloy,[side*.67,.64,z],[side*.84,.42,z],.033);
      hull.add(cube,graphite,side*.797,1.02,z,.035,.042,.14);
    }
    hull.beam(olive,[side*.57,.77,-.72],[side*.98,.30,-.69],.094);
    hull.beam(graphite,[side*.68,.65,-.28],[side*.98,.27,-.69],.059);
    hull.add(wheel,0x272a26,side*.99,.258,-.69,.19,.19,.23,0,Math.PI/2);
    hull.add(trunk,alloy,side*.99,.258,-.69,.121,.17,.121,0,0,Math.PI/2);
    hull.add(round,side<0?0x9e4038:0x558a70,side*.83,1.24,.69,.045,.036,.049);
    hull.beam(graphite,[side*.31,1.35,-1.74],[side*.48,1.46,-1.57],.014);
  }
  hull.beam(graphite,[0,1.52,3.35],[0,.24,3.44],.090);
  hull.beam(olive,[0,1.45,2.85],[0,.28,3.44],.068);
  hull.add(wheel,0x272a26,0,.193,3.44,.142,.142,.15,0,Math.PI/2);
  hull.add(trunk,alloy,0,.193,3.44,.084,.13,.084,0,0,Math.PI/2);
  wheel.dispose();fairing.dispose();pylon.dispose();
  hull.add(round,olive,0,1.79,-.06,.36,.28,.51);
  hull.add(trunk,alloy,0,2.04,-.08,.085,.42,.085);
  hull.add(round,graphite,0,2.22,-.08,.205,.078,.205);
  const airframe=new THREE.Group();
  airframe.scale.setScalar(1.23);group.add(airframe);
  const launchers=new Batch();missileLaunchers(launchers,'heli');
  const paint=fieldPaint();
  Object.assign(hull.mesh(airframe,paint,false).userData,{impactSurface:'metal',vehicle:'heli',target:'heli'});
  launchers.mesh(group,paint,false);
  Object.assign(glazing.mesh(airframe,alpineGlass(panorama,{transparent:true,opacity:.83,depthWrite:false}),false).userData,{impactSurface:'solid',vehicle:'heli'});
  const stencil=document.createElement('canvas');stencil.width=512;stencil.height=112;
  const st=stencil.getContext('2d');st.fillStyle='#a7ad98';st.textAlign='center';
  st.font='bold 76px sans-serif';st.fillText('PINEWATCH',256,88);
  const decal=new THREE.CanvasTexture(stencil);decal.colorSpace=THREE.SRGBColorSpace;
  const lettering=new THREE.MeshBasicMaterial({map:decal,transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-2});
  const placard=new THREE.PlaneGeometry(.69,.105);
  for(const side of [-1,1]){
    const id=new THREE.Mesh(placard,lettering);
    id.position.set(side*.773,.928,.12);id.rotation.y=side*Math.PI/2;
    airframe.add(id);
  }
  const blade=aerofoil([[-.06,.28],[.08,.28],[.13,.62],[.135,3.98],[-.035,4.40],[-.21,4.39],[-.11,3.92],[-.11,.62]],.026);
  for(let i=0;i<4;i++){
    const a=i*TAU/4, sn=Math.sin(a),cs=Math.cos(a);
    rotor.add(blade,graphite,0,0,0,1,1,1,0,a);
    rotor.beam(alloy,[sn*.07,-.055,cs*.07],[sn*.46,.016,cs*.46],.055);
    rotor.add(round,olive,sn*.28,.017,cs*.28,.085,.052,.105);
    fan.add(cube,graphite,0,Math.cos(a)*.365,Math.sin(a)*.365,.042,.69,.093,a);
    fan.add(cube,0xb3ad92,0,Math.cos(a)*.665,Math.sin(a)*.665,.043,.076,.093,a);
  }
  blade.dispose();
  const mainRotor=rotor.mesh(airframe,material,false);
  mainRotor.position.set(0,2.24,-.08);
  const tailHub=new THREE.Group();
  tailHub.position.set(.17,2.72,5.09);tailHub.rotation.z=.29;airframe.add(tailHub);
  const tailRotor=fan.mesh(tailHub,material,false);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.0,7.8).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({map:shadowMap,color:0x27382e,transparent:true,opacity:.38,depthWrite:false}));
  scene.add(shadow);
  const healthLabel=objectHealthLabel(scene,'BLACK HAWK');
  // One instanced draw for the exhaust plume. Each puff grows, drifts, and
  // shrinks out at the top; the entire plume disappears when the craft recovers.
  const puffCount=9;
  const smoke=new THREE.InstancedMesh(stone,new THREE.MeshLambertMaterial({
    color:0x676c6c,transparent:true,opacity:.68,depthWrite:false
  }),puffCount);
  smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  smoke.frustumCulled=false;
  airframe.add(smoke);
  const puff=new THREE.Object3D();
  let phase=0, speed=0;
  return { group, update(heli,dt,crewView) {
    const maxHp=Math.max(1,heli.maxHp??500);
    const hp=clamp(heli.hp??maxHp,0,maxHp);
    const wrecked=heli.wrecked===true;
    const smoking=hp>0 && hp/maxHp<=.30;
    const recovery=wrecked ? Math.max(0,Math.ceil(heli.recoverySeconds??0)) : null;
    const drift = heli.abandonedFor ?? 0;
    healthLabel.sprite.visible=!crewView;
    healthLabel.update(Math.ceil(hp),maxHp,recovery,heli.abandonedFor != null);
    healthLabel.sprite.position.set(heli.x,heli.y+(wrecked ? 4.52 : 3.71),heli.z);
    group.position.set(heli.x,heli.y,heli.z);
    group.rotation.set((heli.pitch || 0)-Math.min(.43,drift*.14),-heli.yaw,wrecked ? -.29 : (heli.roll || 0)-Math.min(.48,drift*.15),'YXZ');
    paint.color.setHex(wrecked ? 0x535253 : smoking ? 0xb3a29b : 0xffffff);
    smoke.visible=smoking;
    if(smoking) {
      phase=(phase+dt*.72)%1;
      for(let i=0;i<puffCount;i++){
        const age=(phase+i/puffCount)%1;
        const radius=.045+.38*Math.sin(Math.PI*age);
        puff.position.set(.22+.75*age+.07*Math.sin(i*2.2),1.58+2.05*age,.48+.65*age);
        puff.scale.set(radius,radius*.79,radius*.90);
        puff.rotation.set(age,2.4*i+age,age*.7);
        puff.updateMatrix(); smoke.setMatrixAt(i,puff.matrix);
      }
      smoke.instanceMatrix.needsUpdate=true;
    } else {
      phase=0;
    }
    mainRotor.rotation.z=wrecked ? -.18 : 0;
    speed = wrecked ? 0 : mix(speed,heli.pilot != null ? 20 : heli.abandonedFor != null ? Math.max(5,18-3*drift) : 0,1-Math.exp(-dt*4));
    mainRotor.rotation.y += speed*dt; tailRotor.rotation.x -= speed*dt*2;
    const floor = groundHeight(heli.x,heli.z), height = Math.max(0,heli.y-floor);
    shadow.position.set(heli.x,floor+.07,heli.z);
    shadow.rotation.y = -heli.yaw;
    shadow.material.opacity = .38/(1+.20*height);
    shadow.scale.setScalar(1 + Math.min(height,10)*.06);
  }};
}

// The pool bounds effect draw calls during sustained multiplayer use. Each
// instance represents a short pulse trail, a bloom ring, or a fading shard.
function fieldEffects(scene) {
  const capacity=180, particles=[];
  const geometry=new THREE.IcosahedronGeometry(1,0);
  const material=new THREE.MeshBasicMaterial({color:0xffffff});
  const cloud=new THREE.InstancedMesh(geometry,material,capacity);
  cloud.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cloud.frustumCulled=false;
  cloud.count=0; scene.add(cloud);
  const dummy=new THREE.Object3D(), shade=new THREE.Color(), along=new THREE.Vector3();
  const rng=random(84927);
  function particle(pos,vel,scale,tint,life) {
    if(particles.length>=capacity) particles.shift();
    particles.push({pos,vel,scale,tint,life,remaining:life});
  }
  function burst(x,y,z,large) {
    for(let i=0;i<(large?18:7);i++) {
      const a=rng()*TAU, s=.6+rng()*(large?3.6:1.7), size=(large?.045:.026)+rng()*.075;
      particle(new THREE.Vector3(x,y,z),new THREE.Vector3(Math.cos(a)*s,.6+rng()*2.7,Math.sin(a)*s),
        new THREE.Vector3(size,size*(1+rng()),size),i%3?0x958d78:0xb5ac95,.28+rng()*.29);
    }
  }
  function crash(heli) {
    for(let i=0;i<26;i++) {
      const a=rng()*TAU, speed=1+rng()*4.8, size=.08+rng()*.15;
      particle(new THREE.Vector3(heli.x,heli.y+.45,heli.z),
        new THREE.Vector3(Math.cos(a)*speed,1+rng()*3,Math.sin(a)*speed),
        new THREE.Vector3(size,size,size),i%4 ? 0x8b7b65 : 0xffb066,.5+rng()*.6);
    }
  }
  const pickSurface=surfacePicker(scene);
  function chips(contact) {
    const {point,normal,surface}=contact;
    const metal=surface==='metal', wood=surface==='wood';
    for(let i=0;i<(metal?5:4);i++){
      const v=new THREE.Vector3(rng()-.5,rng()*.8,rng()-.5);
      v.addScaledVector(normal,Math.max(.25,-v.dot(normal)+.22)).multiplyScalar(metal?2.8:1.45);
      const size=metal?.016:wood?.023:.045;
      const scale=new THREE.Vector3(size,(metal?4:wood?2.9:.70)*size,size);
      particle(point.clone().addScaledVector(normal,.014),v,scale,
        metal?(i%2?0xffce79:0xffefd2):wood?(i%2?0xb48954:0x866441):(i%2?0xa59c8d:0x8b8377),
        (metal?.095:wood?.21:.19)+rng()*.10);
      if(metal || wood) particles.at(-1).rotation=new THREE.Quaternion().setFromUnitVectors(up,v.clone().normalize());
    }
  }
  function shot(s,sourceVehicle) {
    if(s.weapon==='muzzle'){
      particle(new THREE.Vector3(s.from.x,s.from.y,s.from.z),new THREE.Vector3(),new THREE.Vector3(.068,.054,.068),0xffd395,.065);
      return;
    }
    if(s.weapon==='missile') {crash(s.to);return;}
    const a=new THREE.Vector3(s.from.x,s.from.y,s.from.z), b=new THREE.Vector3(s.to.x,s.to.y,s.to.z);
    const contact=pickSurface(s,a,b,sourceVehicle);
    if(contact) b.copy(contact.point);
    along.subVectors(b,a);
    const length=along.length();
    if(length>.01) {
      const tracerLength=Math.min(length,s.weapon==='turret' ? 2.85 : 1.4);
      const direction=along.normalize();
      particle(b.clone().addScaledVector(direction,-tracerLength*.5),new THREE.Vector3(),
        new THREE.Vector3(.022,tracerLength*.5,.022),s.weapon===2 ? 0xedb97c : 0xffe5b3,.135);
      particles.at(-1).rotation=new THREE.Quaternion().setFromUnitVectors(up,direction);
      if(!s.traveling)particle(a,new THREE.Vector3(),new THREE.Vector3(.068,.054,.068),0xffd395,.065);
    }
    if(contact) chips(contact);
    else if(s.hit) burst(b.x,b.y,b.z,false);
  }
  function update(dt) {
    let write=0;
    for(const p of particles) {
      p.remaining-=dt;
      if(p.remaining<=0) continue;
      p.pos.addScaledVector(p.vel,dt);
      if(p.vel.lengthSq()) p.vel.y-=dt*5.8;
      dummy.position.copy(p.pos);dummy.scale.copy(p.scale).multiplyScalar(Math.min(1,p.remaining/.13));
      if(p.rotation) dummy.quaternion.copy(p.rotation); else dummy.quaternion.identity();
      dummy.updateMatrix();cloud.setMatrixAt(write,dummy.matrix);
      cloud.setColorAt(write,shade.setHex(p.tint));
      particles[write++]=p;
    }
    particles.length=write;cloud.count=write;
    if(write) {cloud.instanceMatrix.needsUpdate=true;cloud.instanceColor.needsUpdate=true;}
  }
  return {shot,burst,crash,update};
}

const coats=[0xc96937,0x427382,0xb9544a,0x80739c,0xb38649,0x5c825e];
function jacketColor(id) {
  const str=String(id);
  let h=0; for(const char of str) h=(h*31+char.charCodeAt(0))>>>0;
  return coats[h%coats.length];
}

// Text and the HP strip share one texture per hiker. Redraw only when the
// displayed value changes; depth testing hides labels behind the landscape.
function characterLabel(root, name) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 60;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, depthWrite: false, sizeAttenuation: false,
  }));
  sprite.scale.set(.102, .024, 1);
  root.add(sprite);
  let previous;
  return {
    sprite,
    update(state) {
      const hp = state.hp ?? 100, max = state.maxHp || 100;
      const status = state.dead ? 'DOWN' : state.protected ? 'SHIELD' : String(hp);
      const key = status + '/' + hp + '/' + max;
      sprite.position.y = state.dead ? .95 : 2.26;
      if (key === previous) return;
      previous = key;
      ctx.clearRect(0, 0, 256, 60);
      ctx.fillStyle = '#16221eeb'; ctx.fillRect(0, 0, 256, 60);
      ctx.fillStyle = '#fff9df'; ctx.font = 'bold 23px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(name, 8, 29, 143);
      ctx.fillStyle = state.protected ? '#a4e6f1' : '#ffe4a2';
      ctx.textAlign = 'right'; ctx.fillText(status, 248, 29);
      ctx.fillStyle = '#52605a'; ctx.fillRect(8, 39, 240, 13);
      ctx.fillStyle = state.protected ? '#75d9e5' : hp <= 30 ? '#ff8a65' : '#9de3a0';
      ctx.fillRect(8, 39, 240 * Math.max(0, Math.min(1, hp / max)), 13);
      texture.needsUpdate = true;
    },
    dispose() { texture.dispose(); sprite.material.dispose(); },
  };
}

// A sky-to-ground reflection band gives the shield depth even in open shade.
const visorMaterials=[0xa47745,0x677d80,0x647b6a,0x89775c].map(color=>{
  const lens=new THREE.MeshPhongMaterial({color,specular:0xdce2d9,shininess:90});
  lens.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 reflected=inverseTransformDirection(reflect(-normalize(vViewPosition),normal),viewMatrix);
      float sky=smoothstep(-.18,.54,reflected.y);
      outgoingLight=outgoingLight*(.30+.7*sky)+mix(vec3(.012,.020,.018),vec3(.14,.19,.20),sky);
      #include <opaque_fragment>
    `);
  };
  return lens;
});

// Parts are assembled in model space about real joints. Forward is local -Z.
function hiker(scene,id,tint,material,uniform,shadowMap,name) {
  const root=new THREE.Group(), body=new THREE.Group();
  root.add(body); scene.add(root);
  const spine=new THREE.Group(), upper=new THREE.Group();
  spine.position.y=1.01;upper.position.y=-1.01;spine.add(upper);body.add(spine);
  const identity=rangerIdentity(id), warm=skinColors[identity];
  const coat=color(tint ?? jacketColor(id)).lerp(color(0xbab49c),.82);
  const torso=new Batch(true);
  torso.add(fieldJacket,coat,0,1.30,.005);
  torso.add(trunk,0x505549,0,1.048,.008,.185,.037,.130);
  torso.add(trouserSeat,0x97a291,0,.995,.004);
  const faceY=1.681, fabric=[0x52564e,0x696653,0x4e5551,0x636056][identity];
  torso.add(hood,fabric,0,faceY,-.008);
  torso.add(visorRim,0x282e2b,0,faceY,-.008);
  const lens=new THREE.Mesh(visorLens.clone(),visorMaterials[identity]);
  lens.position.set(0,faceY,-.008);upper.add(lens);
  for(const side of [-1,1]) {
    torso.beam(0x454742,[side*.12,1.717,-.036],[side*.110,1.718,.066],.022);
    for(let n=0;n<3;n++){
      const y=1.628-.014*n;
      torso.beam(0x70716a,[side*.027,y+.014,-.140+n*.008],[side*.086,y+.025,-.097+n*.004],.005);
    }
  }
  torso.add(capCrown,0x949381,0,1.757,.008,1.10,1.40,1.11);
  torso.add(round,0x575b50,0,1.759,.008,.132,.015,.137);
  torso.add(fieldJacket,0x6d705b,0,1.317,-.005,1.035,.67,1.08);
  for(const side of [-1,1]) {
    torso.add(round,0x535648,side*.104,1.728,.028,.025,.041,.065);
    torso.beam(0x585849,[side*.105,1.731,-.021],[side*.067,1.589,-.046],.012);
    torso.add(cube,0x797864,side*.070,1.265,-.17,.104,.126,.046);
    torso.add(cube,0x686b59,side*.070,1.318,-.194,.107,.031,.017);
  }

  torso.add(fieldPack,0xecdfc5,0,1.315,.183,1.02,1.05,1.15);
  // A strapped groundsheet and two side pockets break up the rectangular pack.
  torso.add(fieldSleeve,0xb6ab90,-.20,1.51,.221,.76,.89,.76,0,0,Math.PI/2);
  for(const side of [-1,1]) {
    torso.add(round,0x504d40,side*.121,1.51,.221,.015,.071,.074);
    torso.add(fieldPack,0xb7ad90,side*.17,1.248,.167,.34,.42,.77);
    torso.add(cube,0x78735b,side*.114,1.22,.283,.026,.21,.012,.04);
    torso.add(cube,0x999683,side*.114,1.24,.29,.035,.021,.012);
  }
  for (const side of [-1,1]) {
    torso.beam(0x6a6853,[side*.136,1.497,-.110],[side*.127,1.405,-.150],.031,.014);
    torso.beam(0x6a6853,[side*.127,1.405,-.150],[side*.120,1.193,-.121],.031,.014);
    torso.add(cube,0x96907b,side*.12,1.216,-.134,.037,.021,.009);
    torso.beam(0x585844,[side*.120,1.193,-.121],[side*.171,1.12,-.049],.022,.014);
    torso.beam(0x585844,[side*.171,1.12,-.049],[side*.152,1.17,.166],.022,.014);
    torso.beam(0x454b3e,[side*.105,1.51,.29],[side*.151,1.55,-.094],.038);
    torso.add(trunk,0x6f7169,side*.149,1.235,.218,.034,.15,.033);
  }
  torso.mesh(upper,uniform);
  const limbs=[];
  for(const side of [-1,1]) {
    const leg=new THREE.Group(); leg.position.set(side*.108,.975,0); body.add(leg);
    const thigh=new Batch(true); thigh.add(fieldTrouser,0x97a291,0,-.192,0,1,1,.99);
    thigh.add(cube,0x586051,side*.099,-.17,.016,.033,.139,.103); thigh.mesh(leg,uniform);
    const knee=new THREE.Group(); knee.position.y=-.405; leg.add(knee);
    const shin=new Batch(true); shin.add(fieldGaiter,0x88917b,0,-.188,.004,.97,1,1.05);
    shin.mesh(knee,uniform);
    const ankle=new THREE.Group();ankle.position.y=-.395;knee.add(ankle);
    const boot=new Batch(true);
    boot.add(trunk,0x645743,0,.025,.004,.096,.095,.103);
    boot.add(round,0x584d3d,0,-.038,-.024,.097,.092,.119);
    boot.add(round,0x5f5344,0,-.067,-.090,.103,.053,.127);
    boot.add(round,0x373d36,0,-.112,-.065,.11,.022,.166);
    for(let j=0;j<3;j++) boot.beam(0x95856c,[-.058,-.013-j*.008,-.115-j*.018],[.058,-.007-j*.008,-.113-j*.018],.008);
    boot.mesh(ankle,uniform);
    const arm=new THREE.Group(); arm.position.set(side*.222,1.447,0); upper.add(arm);
    const sleeve=new Batch(true);
    sleeve.add(fieldSleeve,coat,0,-.014,0,1,.64,1);
    sleeve.add(cube,0xac9b75,side*.084,-.1,.006,.010,.052,.046);
    sleeve.mesh(arm,uniform);
    const forearm=new THREE.Group();forearm.position.y=-upperLength;arm.add(forearm);
    const cuff=new Batch(true);
    cuff.add(fieldSleeve,coat,0,-.008,0,.76,.49,.78);
    cuff.add(trunk,0x53564b,0,-.215,0,.058,.034,.059);
    cuff.add(round,0x5a594e,0,-.252,0,.041,.055,.043);
    cuff.add(round,warm,-side*.029,-.258,-.018,.021,.034,.022);
    cuff.mesh(forearm,uniform);
    limbs.push({side,leg,knee,ankle,arm,forearm,foot:newFoot()});
  }
  // The mountain sun and static geometry share one cached shadow map.
  // Characters use a soft contact patch that follows their animated pose.
  root.traverse(node=>{if(node.isMesh) node.castShadow=false;});
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,18).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({color:0x27382e,map:shadowMap,transparent:true,opacity:.4,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  scene.add(shadow);
  return {root,body,spine,limbs,material,gait:null,tools:makeFirearms(upper,material),shadow,label:characterLabel(root,name),cycle:0};
}

function makeParachute(root, material) {
  const canopy = new Batch();
  for (let cell = -4; cell <= 4; cell++) {
    const x = cell * .38, arch = 4.05 - .04 * cell * cell;
    canopy.add(round, Math.abs(cell) === 2 ? 0xffeac1 : 0xd36a36, x,arch,0,.25,.24,.82,0,0,-cell*.13);
    if (cell % 2 === 0) for (const z of [-.50,.50])
      canopy.beam(0x544e43,[Math.sign(cell)*.18,1.45,0],[x,arch-.09,z],.019);
  }
  return canopy.mesh(root,material,false);
}

function pose(avatar,state,dt,seated=null,station=null) {
  const onFoot=!seated && !station && !state.dead && state.grounded!==false && !state.parachute;
  let gait=avatar.gait;
  if(onFoot) {
    if(!gait || Math.hypot(state.x-gait.x,state.z-gait.z)>1.8) {
      gait=avatar.gait=newGait(state,avatar.initialized ? avatar.root.rotation.y : -state.yaw);
      for(const limb of avatar.limbs) limb.foot.planted=false;
    }
    advanceGait(gait,state,Math.max(.001,dt));
  } else gait=avatar.gait=null;
  avatar.initialized=true;
  const weight=gait?.weight ?? 0, run=gait?.run ?? 0;
  const swing=gait ? Math.sin(gait.phase*TAU) : 0;
  const roll=gait ? .046*swing*weight : 0;
  const breathe=Math.sin(avatar.cycle+=dt*2.0);
  const airborne=state.grounded===false;
  const swimming=!!state.swimming && !state.dead;
  const open = state.parachute === 'open' && !state.dead;
  if (open && !avatar.canopy) avatar.canopy = makeParachute(avatar.root,avatar.material);
  if (avatar.canopy) avatar.canopy.visible = open;
  avatar.root.position.set(state.x,state.y,state.z);
  avatar.root.scale.setScalar(seated ? .85 : 1);
  if (seated) {
    const c=Math.cos(seated.yaw), s=Math.sin(seated.yaw);
    avatar.root.position.set(seated.x-.322*c+.085*s,seated.y+.025,seated.z-.322*s-.085*c);
  }
  if(station) {
    const feet=gunnerFeet(station,'rover');
    avatar.root.position.set(feet.x,feet.y,feet.z);
  }
  const yaw=station ? -station.turretYaw : -(Number.isFinite(state.yaw)?state.yaw:0);
  const delta=Math.atan2(Math.sin(yaw-avatar.root.rotation.y),Math.cos(yaw-avatar.root.rotation.y));
  avatar.root.rotation.y = station ? yaw : seated ? -seated.yaw : gait ? gait.yaw : avatar.root.rotation.y+delta*(1-Math.exp(-dt*19));
  avatar.body.position.set(gait?.pelvisX ?? 0,gait?.pelvisY ?? 0,0);
  avatar.spine.rotation.set(gait ? -.09*weight-.14*run+.007*breathe : 0,
    gait ? gait.twist+swing*(.08+.10*run)*weight : 0,gait ? gait.bank-roll : 0,'YXZ');
  const stroke=avatar.cycle*(state.moving?2.7:1.45);
  avatar.body.rotation.x=swimming ? (state.moving ? -1.06 : -.48) : 0;
  if(swimming) {
    avatar.body.position.y=.72-1.34*Math.cos(avatar.body.rotation.x)+.07+.03*Math.sin(stroke);
    avatar.body.position.z=-Math.sin(avatar.body.rotation.x)*1.12;
    avatar.spine.rotation.x=.17;
  }
  const bloom = state.weapon === 2;
  // Defeated hikers slump to the ground until the authoritative respawn.
  avatar.body.rotation.z = mix(avatar.body.rotation.z, state.dead ? 1.45 : 0, 1 - Math.exp(-dt * 12));
  avatar.tools[0].visible = !swimming && !state.dead && !seated && !station && !bloom;
  avatar.tools[1].visible = !swimming && !state.dead && !seated && !station && bloom;
  avatar.label.update(state);
  for(const {leg,arm,forearm,knee,ankle,foot,side} of avatar.limbs) {
    if(gait) {
      placeFoot(gait,foot,side);
      const c=Math.cos(gait.yaw),s=Math.sin(gait.yaw);
      const wx=state.x+c*foot.sideOffset+s*foot.forwardOffset;
      const wz=state.z-s*foot.sideOffset+c*foot.forwardOffset;
      const slope=clamp(groundHeight(wx,wz)-groundHeight(state.x,state.z),-.15,.15);
      const down=leg.position.y+gait.pelvisY-.134-foot.lift-slope;
      const lateral=foot.sideOffset-leg.position.x-gait.pelvisX;
      const vertical=Math.hypot(down,lateral);
      const distance=clamp(Math.hypot(vertical,foot.forwardOffset),.20,.7999);
      const hipBend=Math.acos(clamp((.405**2+distance**2-.395**2)/(.81*distance),-1,1));
      leg.rotation.set(Math.atan2(-foot.forwardOffset,vertical)+hipBend,0,Math.atan2(lateral,down),'ZXY');
      knee.rotation.x=-Math.acos(clamp((distance**2-.405**2-.395**2)/(2*.405*.395),-1,1));
      ankle.rotation.x=foot.pitch-leg.rotation.x-knee.rotation.x;
      ankle.rotation.z=-leg.rotation.z;
    } else {
      leg.rotation.set(station ? .08 : seated ? 1.36 : airborne ? .20*side : .14,0,0,'ZXY');
      knee.rotation.x=station ? -.15 : seated ? -1.3 : airborne ? -.65 : -.23;
      ankle.rotation.set(0,0,0);
    }
    arm.rotation.x=station ? .64-.34*station.turretPitch : seated ? 1.04 : side===1 ? .77 : bloom ? .62 : airborne ? -.42 : side*swing*.62;
    arm.rotation.z=side*(station ? -.08 : seated ? -.12 : open ? 2.45 : state.parachute ? 1.1 : side===1 ? .26 : airborne?.20:.065);
    forearm.rotation.set(0,0,0);
    if(swimming) {
      const wave=stroke+(side===1?Math.PI:0);
      leg.rotation.x=-.16+.25*Math.sin(wave);
      knee.rotation.x=-.21-.19*Math.sin(wave+.9);
      arm.rotation.set(.45+1.07*Math.cos(wave),side*.23,side*(.76+.48*Math.sin(wave)));
      forearm.rotation.x=.5+.36*Math.sin(wave);
    } else if(station) {
      const p=station.turretPitch;
      gripPose(arm,forearm,side*.177,2.04-.062*Math.cos(p)-.19*Math.sin(p)-.80,
        -.062*Math.sin(p)+.19*Math.cos(p)-.44,side);
    } else if(!seated && !state.parachute && !state.dead) {
      const weapon=avatar.tools[bloom ? 1 : 0];
      const kit=weapon.position;
      kit.y=1.325+.005*breathe-.085*run;
      kit.z=-.19+.045*run;
      weapon.rotation.x=-.32*run;
      const gripZ=side===1 ? -.014 : bloom ? .007 : -.226, gripY=side===1 ? -.04 : .018;
      const sine=Math.sin(weapon.rotation.x), cosine=Math.cos(weapon.rotation.x);
      gripPose(arm,forearm,kit.x+(side===1 ? .018 : -.034),kit.y+gripY*cosine-gripZ*sine,
        kit.z+gripY*sine+gripZ*cosine,side);
    } else if(seated) {
      forearm.rotation.x=.42;
    }
  }
  const y=groundHeight(state.x,state.z),height=clamp(state.y-y,0,1.75);
  avatar.shadow.position.set(state.x,y+.026,state.z);
  avatar.shadow.scale.set(.37+height*.05,1,.30+height*.04);
  avatar.shadow.material.opacity=.4-height*.12;
}

function cameraDistance(target,vector,wanted,hp,margin=0) {
  let distance=wanted;
  for(let d=.45;d<wanted;d+=.20) {
    const x=target.x+vector.x*d,y=target.y+vector.y*d,z=target.z+vector.z*d;
    if(Math.max(groundHeight(x,z),buildingTopAt(x,z,.14))>y-.15) {distance=Math.max(.45,d-.18);break;}
  }
  // Sweep the boom against trunk/rock cylinders without testing every mesh.
  const test=(prop, radius) => {
    const h=vector.x*vector.x+vector.z*vector.z;
    if(h<.002) return;
    const along=((prop.x-target.x)*vector.x+(prop.z-target.z)*vector.z)/h;
    const d=clamp(along,0,distance);
    const dx=target.x+d*vector.x-prop.x,dz=target.z+d*vector.z-prop.z;
    const span=radius*radius-dx*dx-dz*dz;
    if(span<=0 && (!margin || dx*dx+dz*dz >= (radius+margin)**2)) return;
    const near=clamp(d-Math.sqrt(Math.max(0,span)/h),.45,distance);
    const y=target.y+near*vector.y,bottom=terrainHeight(prop.x,prop.z);
    if(y<=bottom-.15 || y>=bottom+prop.height+.15) return;
    // Start shortening before the rover camera grazes the side of a tree or rock.
    const gap=Math.hypot(dx,dz)-radius;
    distance=gap>0 ? mix(near,distance,THREE.MathUtils.smoothstep(gap,0,margin)) : near;
  };
  for(const tree of MAP.trees) test(tree,tree.radius+.2);
  for(const rock of MAP.rocks) test(rock,rock.radius+.16);
  for(const prop of BREAKABLES) if (hp?.[prop.id] !== 0) test(prop,prop.radius+.12);
  return distance;
}

export function createScene(canvas) {
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(55,1,.09,400);
  scene.fog=new THREE.FogExp2(CITY ? 0xc0d3d9 : 0xa5a9a4,CITY ? .005 : .0125);
  scene.add(new THREE.HemisphereLight(0xd6dce1,0xaaa087,1.74));
  const sun=new THREE.DirectionalLight(0xffe3b5,1.93);
  sun.position.set(-36,32,-21); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:130});
  sun.shadow.normalBias=.045; sun.shadow.bias=-.0004; scene.add(sun);
  const panorama=addSky(scene);
  const rng=random(4863), material=vertexMaterial(), uniform=rangerMaterial(renderer);
  const features=new Batch();
  let glints, stacks;
  if(CITY) {
    cityStreets(scene,renderer,Batch);
    stacks=buildStacks(scene,renderer,Batch);
  } else {
    addGround(scene,renderer);
    const forest=new Batch();
    conifers(scene,forest,MAP.trees,sceneryHeight,renderer,MAP.bounds);
    forest.mesh(scene,material).userData.impactSurface='wood';
    granite(scene,MAP.rocks,terrainHeight,renderer);
    addBridge(scene,renderer,rng);
    addDetails(scene,features,rng);
    glints=water(scene,rng,renderer);
    stacks=buildOutpost(scene,renderer,Batch);
    meadow(scene,renderer,rng,trailDistance);
  }
  landingMarks(features);features.mesh(scene,material);
  const updateSupplyView=createSupplyView(scene);
  const shadowMap=contactShadowMap();
  const roverLabel=objectHealthLabel(scene,CITY ? 'CREW PICKUP' : 'FIELD JEEP');
  const roverTurret=turretView(scene,'rover',Batch,material), heliTurret=turretView(scene,'heli',Batch,material);
  const updateMissiles=missileView(scene);
  const rounds=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,4),new THREE.MeshBasicMaterial(),192);
  rounds.count=0;rounds.frustumCulled=false;scene.add(rounds);
  const roundMesh=new THREE.Object3D(),path=new THREE.Vector3(),roundColor=new THREE.Color();
  const updateRover=createRoverView(scene,Batch,material,shadowMap,panorama);
  const helicopter=fieldHelicopter(scene,material,shadowMap,panorama);

  const effects=fieldEffects(scene);
  let lastShot=null;
  const parked={...HELIPAD,y:groundHeight(HELIPAD.x,HELIPAD.z),yaw:0,pilot:null,grounded:true};
  const avatars=new Map(), target=new THREE.Vector3(), boom=new THREE.Vector3();
  const desired=new THREE.Vector3();
  let clock=0,lastWidth=0,lastHeight=0,ready=false;
  function resize(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
    if(w===lastWidth && h===lastHeight) return;
    lastWidth=w;lastHeight=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  let roverBoom = null, bailoutOrbit = 0;
  function removeAvatar(a) {
    a.label.dispose();
    a.root.traverse(node=>{if(node.isMesh) node.geometry.dispose();});
    a.shadow.geometry.dispose();a.shadow.material.dispose();
    scene.remove(a.root,a.shadow);
  }
  const cursorRay = new THREE.Raycaster();
  const cursorNdc = new THREE.Vector2();
  let displayedWorld, displayedPlayers;
  function aimAt(pointer, feet, id, range, station=null) {
    if (!ready || !displayedWorld || !pointer) return null;
    const rect = canvas.getBoundingClientRect();
    cursorNdc.set(2 * (pointer.x - rect.left) / rect.width - 1, 1 - 2 * (pointer.y - rect.top) / rect.height);
    cursorRay.setFromCamera(cursorNdc, camera);
    const {origin, direction} = cursorRay.ray;
    const actors = [...displayedPlayers, ...displayedWorld.npcs]
      .filter(p => !p.dead && p.id !== id && p.id !== displayedWorld.heli.pilot && p.id !== displayedWorld.heli.gunner && p.id !== displayedWorld.rover.driver)
      .map(state => ({id: state.id, state}));
    const muzzle=station ? mountPosition(displayedWorld[station],mounts[station].turret) : {x:feet.x,y:feet.y+1.3,z:feet.z};
    const muzzleY=muzzle.y;
    const cameraOffset = Math.hypot(origin.x-muzzle.x, origin.y-muzzleY, origin.z-muzzle.z);
    let {to} = tracePulse(displayedWorld, actors, origin, direction, range + cameraOffset, false, station);
    // An obstruction between the chase camera and the turret cannot be an aim point
    // for the barrel. Keep its forward sightline while the camera passes that cover.
    const edgeOrbit=Math.abs(cursorNdc.x)>1-2*Math.min(48/rect.width,.07);
    if(station && (edgeOrbit || Math.hypot(to.x-origin.x,to.y-origin.y,to.z-origin.z)<cameraOffset+1)) {
      const depth=range+cameraOffset;
      to={x:origin.x+direction.x*depth,y:origin.y+direction.y*depth,z:origin.z+direction.z*depth};
    }
    const dx = to.x - muzzle.x, dz = to.z - muzzle.z;
    return {yaw: Math.atan2(dx, -dz), pitch: Math.atan2(to.y-muzzleY, Math.hypot(dx,dz))};
  }
  function render(local,remotes,view,dt,world) {
    if(!local) return;
    dt=clamp(dt||.016,0,.10);clock+=dt;
    resize();
    const heli=world?.heli ?? parked;
    if (heli.wrecked && displayedWorld?.heli.abandonedFor != null) effects.crash(heli);
    displayedWorld = world;
    displayedPlayers = remotes;
    updateSupplyView(world);
    const piloting=heli.pilot != null && local.id===heli.pilot;
    helicopter.update(heli,dt,piloting || local.id===heli.gunner);
    const rover=world.rover, driving=rover.driver===local.id;
    updateRover(rover,dt);roverTurret(rover);heliTurret(heli);
    roverLabel.sprite.position.set(rover.x,rover.y+2.33,rover.z);
    roverLabel.sprite.visible=!driving && local.id!==rover.gunner;
    roverLabel.update(rover.hp,rover.maxHp,rover.wrecked ? Math.ceil(rover.recoverySeconds) : null);
    for(const stack of stacks) {
      const {prop,mesh}=stack;
      const hp=world?.hp?.[prop.id] ?? prop.hp;
      if(hp!==stack.hp) {
        if(hp===0 && stack.hp>0) effects.burst(prop.x,mesh.position.y+prop.height*.48,prop.z,true);
        mesh.visible=hp>0;
        mesh.scale.y=.78+.22*hp/prop.hp;
        stack.hp=hp;
      }
    }
    if(world?.shots) {
      // Ignore recent history on first join. Consume each subsequent event once.
      for(const shot of world.shots) if(lastShot!==null && shot.id>lastShot) effects.shot(shot,shot.source);
      lastShot=world.shots.at(-1)?.id ?? lastShot ?? 0;
    }
    updateMissiles(world.missiles ?? [],dt);
    rounds.count=Math.min(world.bullets?.length??0,rounds.instanceMatrix.count);
    for(let i=0;i<rounds.count;i++){
      const r=world.bullets[i];
      roundMesh.position.set(r.x,r.y,r.z);
      path.set(r.vx,r.vy,r.vz).normalize();
      roundMesh.position.addScaledVector(path,-.24);
      roundMesh.quaternion.setFromUnitVectors(up,path);
      roundMesh.scale.set(.022,r.weapon==='turret'?.58:.36,.022);
      roundMesh.updateMatrix();rounds.setMatrixAt(i,roundMesh.matrix);
      rounds.setColorAt(i,roundColor.setHex(r.weapon===2?0xedb97c:0xffe5b3));
    }
    if(rounds.count){rounds.instanceMatrix.needsUpdate=true;rounds.instanceColor.needsUpdate=true;}
    effects.update(dt);
    const live=new Set();
    for(const state of [local,...remotes,...(world?.npcs ?? [])]) {
      live.add(state.id);
      let a=avatars.get(state.id);
      if(!a) {
        const rival = typeof state.id === 'string';
        a=hiker(scene,state.id,rival ? (state.id==='rival-fern' ? 0xae6974 : 0x868854) : state.color,material,uniform,shadowMap,state.name || 'Hiker ' + state.id);
        avatars.set(state.id,a);
      }
      a.label.sprite.visible = state.id !== local.id && Math.hypot(local.x-state.x,local.z-state.z)<32;
      const seated=state.id===rover.driver;
      const station=state.id===rover.gunner ? rover : null;
      a.root.visible=state.id!==heli.pilot && state.id!==heli.gunner;
      a.shadow.visible=a.root.visible && !seated && !station;
      if(seated || station) a.label.sprite.visible=false;
      if(a.root.visible) pose(a,state,dt,seated ? rover : null,station);
    }
    for(const [key,a] of avatars) if(!live.has(key)){removeAvatar(a);avatars.delete(key);}
    const localStation=local.id===heli.gunner ? 'heli' : local.id===rover.gunner ? 'rover' : null;
    if(localStation) {
      const pivot=mountPosition(world[localStation],mounts[localStation].turret);
      desired.set(pivot.x,pivot.y,pivot.z);
    }
    else if(driving) desired.set(rover.x,rover.y+1.03,rover.z);
    else if(piloting) desired.set(heli.x,heli.y+1.58,heli.z);
    else {
      const shoulder=local.parachute ? 0 : .66;
      const x=local.x+shoulder*Math.cos(view.yaw),z=local.z+shoulder*Math.sin(view.yaw);
      const clear=buildingTopAt(x,z,.15)<local.y+1.3;
      desired.set(clear ? x : local.x,local.y+(local.swimming ? 1.00 : local.parachute==='open' ? 2.1 : 1.46),clear ? z : local.z);
    }
    // Give the jumper and the drifting aircraft room in the same shot.
    const watchCrash = local.parachute && (heli.abandonedFor != null || heli.wrecked);
    const separation = watchCrash ? Math.hypot(heli.x-local.x,heli.y-local.y,heli.z-local.z) : 0;
    if (watchCrash) desired.lerp(helicopter.group.position, Math.min(.40,5/Math.max(1,separation)));
    if(!ready || desired.distanceToSquared(target)>36) {target.copy(desired);ready=true;}
    else target.lerp(desired,1-Math.exp(-dt*24));
    // A slight shoulder view separates the canopy from the aircraft ahead.
    bailoutOrbit = mix(bailoutOrbit,watchCrash ? .31 : 0,1-Math.exp(-dt*6));
    const pitch=clamp(view.pitch??-.12,-1.2,.8),yaw=(view.yaw||0)+bailoutOrbit;
    boom.set(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
    const onFoot=!localStation && !piloting && !driving && !local.parachute;
    const wanted=clamp((view.distance||4.4)*(onFoot ? .53 : 1),1.35,7.5) + (piloting ? 6.0 : driving ? 1.7 : Math.min(6,separation*.5));
    const clearance=cameraDistance(target,boom,wanted,world?.hp,driving ? 1.1 : 0);
    // Pull in at obstructions, then ease back out as the orbit clears them.
    roverBoom = driving ? Math.min(clearance, mix(roverBoom ?? clearance,clearance,1-Math.exp(-8*dt))) : null;
    const distance=roverBoom ?? clearance;
    camera.position.copy(target).addScaledVector(boom,distance);
    if(local.swimming || groundHeight(camera.position.x,camera.position.z)<MAP.waterY) camera.position.y=Math.max(camera.position.y,MAP.waterY+.27);
    camera.lookAt(target);
    avatars.get(local.id).root.visible=!piloting && local.id!==heli.gunner && distance>.86;
    if(glints) glints.position.x=Math.sin(clock*.33)*.09;
    renderer.render(scene,camera);
  }
  return {render,resize,aimAt,dispose(){scene.traverse(node=>{
    if(node.isMesh){node.geometry.dispose();node.material.map?.dispose();node.material.dispose();}
  });shadowMap.dispose();renderer.dispose();}};
}
