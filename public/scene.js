import * as THREE from 'three';
import { conifers, granite, floorMaterial, creekMaterial } from './landscape.js';
import { MAP, BREAKABLES, HELIPAD, terrainHeight, groundHeight } from './world.js';

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
    const c = color(tint);
    for (let i = 0; i < p.count; i++) {
      point.fromBufferAttribute(p, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(n, i).applyNormalMatrix(normalsMatrix);
      this.positions.push(point.x, point.y, point.z);
      this.normals.push(normal.x, normal.y, normal.z);
      this.colors.push(c.r, c.g, c.b);
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
    geometry.setIndex(this.indices);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = casts;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
}

const up = new THREE.Vector3(0,1,0);

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
  const rise = clamp((Math.max(Math.abs(x),Math.abs(z)) - MAP.bounds) / 16,0,1);
  return terrainHeight(x,z) + rise * (18 + 9*noise(x*.059,z*.059));
}

function addGround(scene,renderer) {
  const size = 164;
  const geo = new THREE.PlaneGeometry(size, size, 172, 172).rotateX(-Math.PI/2);
  const positions = geo.attributes.position;
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
  geo.computeVertexNormals();
  const mat=floorMaterial(renderer);
  const ground = new THREE.Mesh(geo,mat);
  ground.receiveShadow = true;
  scene.add(ground);
}

function addSky(scene) {
  const panorama=new THREE.TextureLoader().load('./alpine-range.webp');
  panorama.colorSpace=THREE.SRGBColorSpace;panorama.wrapS=THREE.MirroredRepeatWrapping;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(278,48,22),
    new THREE.ShaderMaterial({
      side:THREE.BackSide,depthWrite:false,
      uniforms:{panorama:{value:panorama},horizon:{value:color(0xe9e7d3)},zenith:{value:color(0x5288b6)}},
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
        c=mix(c,vec3(.89,.86,.79),smoothstep(.54,.73,cloud)*smoothstep(.05,.20,d.y)*.6);
        c+=vec3(.38,.25,.09)*pow(sun,22.)+vec3(.94,.82,.55)*smoothstep(.99945,.9998,sun);
        float elevation=asin(clamp(d.y,-1.,1.));
        vec2 uv=vec2(atan(d.x,-d.z)*.46+.17,(elevation+.19)/.72);
        vec3 range=texture2D(panorama,vec2(uv.x,clamp(uv.y,0.,1.))).rgb;
        c=mix(range,c,smoothstep(.81,1.24,uv.y));
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
        }`
    }));
  sky.renderOrder=-20; scene.add(sky);
}

function addBridge(batch, rng) {
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
  const grass = new THREE.BufferGeometry();
  grass.setAttribute('position',new THREE.Float32BufferAttribute([
    -.08,0,0,.08,0,0,.10,.92,.15,
    .03,0,-.06,-.03,0,.06,-.30,.69,-.09,
    -.08,0,.05,.08,0,.02,.27,.58,-.19,
  ],3));
  grass.computeVertexNormals();
  const grassColors=[0x6a7844,0x9a9e60,0xb8ac72,0x889054,0x6e824e];
  for(let i=0;i<4100;i++) {
    const x=(rng()-.5)*79,z=(rng()-.5)*79,y=terrainHeight(x,z);
    if(y<MAP.waterY+.22 || Math.max(Math.abs(x),Math.abs(z))>34) continue;
    const d=trailDistance(x,z);
    if(d<1.7 && rng()>.12 || Math.hypot(x-HELIPAD.x,z-HELIPAD.z)<2.45) continue;
    if(d<1.7 || rng()<.08) {
      const size=(d<1.7 ? .03:.07)*(1+2*rng());
      batch.add(stone,granite[i%4],x,y+.008,z,size*1.12,size*.36,size*.8,0,rng()*TAU);
    } else {
      const size=.15+.28*rng();
      const tufts=1+Math.floor(3*rng());
      for(let k=0;k<tufts;k++){
        const a=rng()*TAU,spread=.18*rng();
        batch.add(grass,grassColors[(i+k)%5],x+spread*Math.cos(a),y-.025,z+spread*Math.sin(a),size,size,size,0,a);
      }
    }
  }
}

function water(scene,rng,renderer) {
  const geometry=new THREE.PlaneGeometry(125,10).rotateX(-Math.PI/2);
  const material=creekMaterial(renderer);
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
function makeBlasters(body, material) {
  const pulse = new Batch(), bloom = new Batch();
  const handle = 0x253b40, shell = 0xd2c6a6, teal = 0x53e7d2, coral = 0xff9664;
  const ring = new THREE.TorusGeometry(1, .15, 5, 14);
  pulse.add(cube, handle, 0, -.06, -.02, .10, .20, .13, -.2);
  pulse.add(round, shell, 0, .015, -.18, .115, .105, .28);
  pulse.add(cube, handle, 0, .08, -.19, .105, .06, .40);
  pulse.add(round, teal, 0, .10, -.13, .082, .056, .10);
  pulse.add(round, teal, .099, .077, -.12, .055, .09, .17);
  pulse.add(cube, shell, .11, .159, -.12, .07, .035, .22);
  pulse.add(ring, teal, 0, .008, -.43, .078);
  pulse.add(round, handle, 0, .00, -.415, .065, .066, .045);
  bloom.add(cube, handle, 0, -.07, .0, .115, .21, .13, -.20);
  bloom.add(round, 0xa25140, 0, .035, -.17, .175, .17, .245);
  bloom.add(round, coral, 0, .16, -.14, .09, .07, .14);
  bloom.add(ring, coral, .14, .06, -.13, .113, .113, .113, 0,Math.PI/2);
  bloom.add(round, coral, .154, .06, -.13, .050, .092, .09);
  bloom.add(ring, shell, 0, .035, -.34, .153);
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3;
    const x = .137 * Math.cos(a), y = .035 + .137 * Math.sin(a);
    bloom.add(round, shell, x, y, -.36, .050, .053, .147);
    bloom.add(round, coral, x, y, -.468, .037, .038, .060);
  }
  ring.dispose();
  const tools = [pulse.mesh(body,material,false), bloom.mesh(body,material,false)];
  for (const tool of tools) tool.position.set(.43, 1.19, -.31);
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

function fieldHelicopter(scene,material,shadowMap) {
  const group = new THREE.Group();
  scene.add(group);
  const hull = new Batch(), glazing=new Batch(), rotor = new Batch(), fan = new Batch();
  const orange = 0xb15d32, ivory = 0xe0dfc8, graphite = 0x343d3e, glass = 0x284550;
  // A continuous cabin envelope gives each window its own panel and avoids
  // glass/fuselage intersections. Coordinates run from the nose to the tail.
  const sections = [
    [-1.39,.15,.94,.14],[-1.16,.49,1.00,.32],[-.60,.71,1.08,.53],
    [-.51,.73,1.08,.54],[.04,.75,1.08,.53],[.12,.75,1.08,.52],
    [.57,.73,1.06,.49],[.71,.67,1.06,.45],[1.13,.38,1.05,.30],[1.30,.18,1.05,.17],
  ];
  const profile=[[-.67,1],[.67,1],[.98,.48],[1,-.09],[.95,-.23],[.72,-.86],
    [0,-1],[-.72,-.86],[-.95,-.23],[-1,-.09],[-.98,.48]];
  const rings=sections.map(([z,w,y,h])=>profile.map(([cx,cy])=>[cx*w,y+cy*h,z]));
  function panel(a,b,c,d,tint,batch=hull) {
    const face=new THREE.BufferGeometry();
    face.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...d],3));
    face.setIndex([0,1,2,0,2,3]);face.computeVertexNormals();
    const offset=batch.colors.length;
    batch.add(face,tint,0,0,0);face.dispose();
    if(batch===glazing){
      for(const [i,p] of [a,b,c,d].entries()){
        const t=clamp((p[1]-1.02)/.54,0,1);
        const reflection=color(tint).lerp(color(0xacc1c2),t*t*.42);
        batch.colors.splice(offset+i*3,3,reflection.r,reflection.g,reflection.b);
      }
    }
  }
  for(let row=0;row+1<rings.length;row++) {
    const a=rings[row],b=rings[row+1];
    for(let j=0;j<a.length;j++) {
      const n=(j+1)%a.length,upper=j<=2||j>=9;
      const windshield=row===1 && upper;
      const cabinWindow=(row===3||row===5) && upper && j!==0;
      const stripe=j===3||j===8;
      let tint=orange;
      if(windshield||cabinWindow) tint=(j===1||j===10)?0x667e87:glass;
      else if(stripe || j===0 || (row>=7 && j!==5 && j!==6)) tint=ivory;
      else if(j===4||j===7) tint=row<2?0x445052:0x59635d;
      else if(j===5||j===6) tint=graphite;
      if(windshield||cabinWindow) {
        panel(a[j],b[j],b[n],a[n],tint,glazing);
        // Glazing runs in inset rubber channels with perimeter posts.
        if(j===2 || j===9){
          hull.beam(0x363f3c,a[j],a[n],.027);
          hull.beam(0x475553,b[j],b[n],.028);
          hull.beam(0x45504a,a[n],b[n],.024);
        }
      } else panel(a[j],b[j],b[n],a[n],tint);
    }
  }
  for(const [ring,section,front] of [[rings[0],sections[0],true],[rings.at(-1),sections.at(-1),false]]) {
    const middle=[0,section[2],section[0]];
    for(let i=0;i<ring.length;i++) {
      const a=ring[i],b=ring[(i+1)%ring.length];
      panel(middle,front?a:b,front?b:a,middle,ivory);
    }
  }
  hull.add(round,graphite,0,1.49,.46,.40,.21,.68);
  hull.add(cube,ivory,0,1.52,.50,.48,.18,.56);
  for (const side of [-1,1]) {
    // Cargo sill, exposed fittings, anti-slip boarding step and ventilation.
    hull.beam(0x9caba5,[side*.78,.49,-.52],[side*.78,.49,.49],.044);
    for(const z of [-.40,.37])hull.beam(0x606b63,[side*.56,.65,z],[side*.78,.49,z],.030);
    for(let k=0;k<12;k++)hull.add(round,0x939788,side*.708,.864,-.54+k*.095,.011,.011,.011);
    for(let k=0;k<6;k++)hull.add(cube,0x434e49,side*.375,1.61,.12+k*.075,.11,.075,.025,.1,0,side*.3);
    hull.add(round,side===1?0xad302c:0x539b73,side*.747,1.03,.46,.036,.036,.06);
    hull.add(round,0x51483f,side*.265,1.59,.91,.112,.092,.16,-.08);
    hull.add(round,0x262e2d,side*.265,1.61,1.023,.079,.067,.067);
    hull.add(cube,graphite,side*.75,.96,.23,.054,.045,.13);
    hull.add(cube,graphite,side*.65,.098,.03,.11,.105,1.86);
    hull.beam(graphite,[side*.65,.095,-.88],[side*.65,.23,-1.12],.094);
    for (const z of [-.50,.51]) hull.beam(graphite,[side*.48,.65,z],[side*.65,.125,z+.08],.085);
    hull.add(cube,0xefb966,side*.57,.75,-.94,.12,.10,.15);
  }
  const boom=new THREE.CylinderGeometry(.10,.27,2.52,12);
  hull.add(boom,0xd9d7bf,0,1.21,1.89,1,1,.89,Math.PI/2-.095);
  boom.dispose();
  for(const z of [2.51,2.66])hull.add(trunk,0x9d5839,0,1.27+(z-2.51)*.095,z,.152,.08,.141,Math.PI/2-.095);
  hull.beam(0x656b63,[.17,.76,1.03],[.17,.52,1.44],.021);
  hull.beam(0x8c9997,[0,1.55,-.34],[0,1.89,-.53],.017);
  for(const side of [-1,1]){
    hull.beam(0x3c4645,[side*.055,1.77,-.047],[side*.14,1.92,.068],.026);
    hull.add(round,0x76382c,side*.55,1.30,2.77,.031,.035,.05);
  }
  hull.add(cube,ivory,0,1.56,3.05,.11,.87,.39,.27);
  hull.add(cube,orange,0,1.92,3.12,.118,.18,.41,.27);
  hull.add(cube,ivory,0,1.26,2.77,1.14,.072,.27);
  hull.add(trunk,graphite,0,1.79,0,.082,.34,.082);
  hull.add(round,ivory,0,1.94,0,.155,.072,.155);
  const paint=new THREE.MeshPhongMaterial({vertexColors:true,specular:0x393c34,shininess:26});
  hull.mesh(group,paint,false);
  glazing.mesh(group,new THREE.MeshPhongMaterial({vertexColors:true,specular:0xb3cccd,shininess:82}),false);
  const stencil=document.createElement('canvas');stencil.width=512;stencil.height=112;
  const st=stencil.getContext('2d');st.fillStyle='#f0e9cf';st.textAlign='center';
  st.font='bold 76px sans-serif';st.fillText('FORESTRY',256,88);
  const decal=new THREE.CanvasTexture(stencil);decal.colorSpace=THREE.SRGBColorSpace;
  const lettering=new THREE.MeshBasicMaterial({map:decal,transparent:true,depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-2});
  const placard=new THREE.PlaneGeometry(.69,.105);
  for(const side of [-1,1]){
    const id=new THREE.Mesh(placard,lettering);
    id.position.set(side*.746,.942,-.15);id.rotation.y=side*Math.PI/2;
    id.rotation.x=-side*.16;group.add(id);
  }
  for (let i=0; i<3; i++) {
    const a = i*TAU/3, s = Math.sin(a), c = Math.cos(a);
    rotor.add(round,0x777f79,s*.13,0,c*.13,.063,.062,.11);
    rotor.beam(0x8e8e7c,[s*.11,-.069,c*.11],[s*.32,0,c*.32],.025);
    rotor.add(cube,graphite,s*1.32,0,c*1.32,.132,.044,2.58,0,a);
    rotor.add(cube,ivory,s*2.43,.001,c*2.43,.137,.048,.28,0,a);
  }
  for (let i=0; i<3; i++) {
    const a = i*TAU/3;
    fan.add(cube,graphite,0,Math.cos(a)*.22,Math.sin(a)*.22,.042,.43,.088,a);
  }
  const mainRotor = rotor.mesh(group,material,false);
  mainRotor.position.set(0,1.96,0);
  const tailRotor = fan.mesh(group,material,false);
  tailRotor.position.set(.14,1.61,3.02);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.5,4.2).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({map:shadowMap,color:0x27382e,transparent:true,opacity:.38,depthWrite:false}));
  scene.add(shadow);
  const tag = document.createElement('canvas');
  tag.width=320; tag.height=64;
  const ink=tag.getContext('2d');
  const labelMap=new THREE.CanvasTexture(tag);
  labelMap.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:labelMap,transparent:true,depthWrite:false}));
  label.scale.set(2.9,.58,1);
  scene.add(label);
  let labelHp, labelMax, labelRecovery;
  function healthLabel(hp,maxHp,recovery) {
    if (hp===labelHp && maxHp===labelMax && recovery===labelRecovery) return;
    labelHp=hp; labelMax=maxHp; labelRecovery=recovery;
    const condition=hp/maxHp;
    ink.clearRect(0,0,320,64);
    ink.fillStyle='rgba(21,37,36,.90)';
    ink.fillRect(0,0,320,64);
    ink.font='bold 23px sans-serif';
    ink.textAlign='left';
    ink.fillStyle='#f8f5e8';
    ink.fillText(recovery===null ? 'TRAIL HELI' : 'WRECKED',12,28);
    ink.textAlign='right';
    ink.fillText(recovery===null ? hp+' / '+maxHp : 'RESET '+recovery+'s',308,28);
    ink.fillStyle='#53615d';
    ink.fillRect(12,40,296,12);
    ink.fillStyle=condition<=.30 ? '#ff8b61' : condition<=.60 ? '#f1c46b' : '#98dfad';
    ink.fillRect(12,40,296*condition,12);
    labelMap.needsUpdate=true;
  }

  // One instanced draw for the exhaust plume. Each puff grows, drifts, and
  // shrinks out at the top; the entire plume disappears when the craft recovers.
  const puffCount=9;
  const smoke=new THREE.InstancedMesh(stone,new THREE.MeshLambertMaterial({
    color:0x676c6c,transparent:true,opacity:.68,depthWrite:false
  }),puffCount);
  smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  smoke.frustumCulled=false;
  group.add(smoke);
  const puff=new THREE.Object3D();
  let phase=0, speed=0;
  return { group, update(heli,dt) {
    const maxHp=Math.max(1,heli.maxHp??100);
    const hp=clamp(heli.hp??maxHp,0,maxHp);
    const wrecked=heli.wrecked===true;
    const smoking=hp>0 && hp/maxHp<=.30;
    const recovery=wrecked ? Math.max(0,Math.ceil(heli.recoverySeconds??0)) : null;
    healthLabel(Math.ceil(hp),maxHp,recovery);
    label.position.set(heli.x,heli.y+(wrecked ? 3.38 : 2.63),heli.z);
    group.position.set(heli.x,heli.y,heli.z);
    group.rotation.set(0,-heli.yaw,wrecked ? -.29 : 0,'YXZ');
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
    speed = wrecked ? 0 : mix(speed,heli.pilot != null ? 20 : 0,1-Math.exp(-dt*4));
    mainRotor.rotation.y += speed*dt; tailRotor.rotation.x -= speed*dt*2;
    const floor = groundHeight(heli.x,heli.z), height = Math.max(0,heli.y-floor);
    shadow.position.set(heli.x,floor+.07,heli.z);
    shadow.rotation.y = -heli.yaw;
    shadow.material.opacity = .38/(1+.20*height);
    shadow.scale.setScalar(1 + Math.min(height,10)*.06);
  }};
}

function crystalOutcrop(scene, material, prop, seed) {
  const rng = random(seed), batch = new Batch();
  const tints=[0x57988a,0x71a98e,0x487e7f,0x7fae99];
  for(let i=0;i<10;i++){
    const angle=i*2.399,dist=i?(.36+.39*rng())*prop.radius:0;
    const x=Math.cos(angle)*dist,z=Math.sin(angle)*dist;
    const h=prop.height*(i?.3+.46*rng():1),r=prop.radius*(i?.13+.10*rng():.30);
    const lean=i?.10+.31*rng():.045,twist=rng()*TAU;
    const positions=[],colors=[],cap=.74+.12*rng();
    const mineral=color(tints[i%tints.length]);
    for(let k=0;k<6;k++){
      const a=twist+k*TAU/6,b=twist+(k+1)*TAU/6;
      const at=(theta,y,scale)=>[x+Math.cos(theta)*r*scale+lean*y*Math.cos(angle),y,z+Math.sin(theta)*r*scale+lean*y*Math.sin(angle)];
      const low=at(a,.04,rng()*.05+1),next=at(b,.04,1);
      const shoulder=at(a,h*cap,.86),end=at(b,h*cap,.86),tip=at(twist,h,.035);
      positions.push(...low,...shoulder,...end,...low,...end,...next,...shoulder,...tip,...end);
      const base=mineral.clone().multiplyScalar(.75+.21*rng());
      const upper=mineral.clone().lerp(color(0xc4d6c1),.16+.14*rng());
      const bright=upper.clone().lerp(color(0xd2dfc8),.32);
      for(const c of [base,upper,upper,base,upper,base,upper,bright,upper]) colors.push(c.r,c.g,c.b);
    }
    const quartz=new THREE.BufferGeometry();
    quartz.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));quartz.computeVertexNormals();
    const start=batch.colors.length;batch.add(quartz,0xffffff,0,0,0);
    for(let j=0;j<colors.length;j++)batch.colors[start+j]=colors[j];
    quartz.dispose();
    batch.add(stone,0x596b63,x,prop.height*.065,z,r*1.55,h*.16,r*1.65,0,twist);
  }
  batch.add(stone,0x465d58,0,prop.height*.055,0,prop.radius*.86,prop.height*.13,prop.radius*.82);
  const mesh = batch.mesh(scene,material,false);
  mesh.position.set(prop.x,groundHeight(prop.x,prop.z),prop.z);
  return {prop,mesh,hp:null};
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
        new THREE.Vector3(size,size*(1+rng()),size),i%3?0x8cf3cd:0xf4e7a7,.28+rng()*.29);
    }
  }
  function shot(s) {
    const a=new THREE.Vector3(s.from.x,s.from.y,s.from.z), b=new THREE.Vector3(s.to.x,s.to.y,s.to.z);
    along.subVectors(b,a);
    const bloom=s.weapon===2, pieces=bloom?12:7;
    for(let i=1;i<=pieces;i++) {
      const t=i/pieces, pos=a.clone().addScaledVector(along,t);
      const radius=bloom ? .18+.23*t : .035;
      if(bloom) {pos.x+=Math.cos(t*TAU*2)*radius; pos.y+=Math.sin(t*TAU*2)*radius;}
      particle(pos,new THREE.Vector3(),new THREE.Vector3(radius*.55,radius*.55,radius*.55),
        bloom?0xffbd83:0x96ffe1,.15+.09*t);
    }
    // The thin straight pulse reads from a distance; bloom draws a spiral of motes.
    if(!bloom) {
      const delta=b.clone().sub(a), length=delta.length();
      if(length>.01) {
        particle(a.clone().lerp(b,.5),new THREE.Vector3(),new THREE.Vector3(.033,length/2,.033),0xb6ffdf,.13);
        particles.at(-1).rotation=new THREE.Quaternion().setFromUnitVectors(up,delta.normalize());
      }
    }
    if(s.hit) burst(b.x,b.y,b.z,false);
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
  return {shot,burst,update};
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
  sprite.scale.set(.135, .032, 1);
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

// Pattern-cut jacket, trousers and gaiters have a continuous hem profile.
function cloth(profile){
  return new THREE.LatheGeometry(profile.map(([y,r])=>new THREE.Vector2(r,y)),12);
}
const jacket=cloth([[-.29,.19],[-.255,.22],[-.12,.212],[.10,.246],[.185,.247],[.235,.18],[.25,.104]]);
const trouser=cloth([[-.25,.085],[-.21,.097],[-.10,.108],[.02,.12],[.18,.12],[.225,.098]]);
const gaiter=cloth([[-.235,.078],[-.20,.091],[-.14,.094],[.025,.093],[.14,.104],[.22,.086]]);
const pack=cloth([[-.244,.105],[-.21,.161],[.12,.176],[.204,.158],[.237,.114]]);

// Parts are assembled in model space about real joints. Forward is local -Z.
function hiker(scene,id,tint,material,shadowMap,name) {
  const root=new THREE.Group(), body=new THREE.Group();
  root.add(body); scene.add(root);
  const coat=tint ?? jacketColor(id), dark=0x263e41, warm=0xc99772;
  const torso=new Batch();
  torso.add(jacket,coat,0,1.30,.005,1,1,.75);
  torso.add(trunk,0x505549,0,1.075,.008,.208,.039,.145);
  torso.add(trunk,0x5e6351,0,1.53,.008,.12,.079,.096);
  torso.add(cube,0x555d4f,.002,1.316,-.17,.013,.36,.009);
  torso.add(cube,0xb3aa80,.101,1.36,-.151,.088,.035,.016);
  torso.add(round,0x4b473a,-.139,1.677,.002,.021,.041,.027);
  torso.add(round,warm,.132,1.674,.002,.019,.035,.025);
  torso.add(round,dark,0,.99,0,.22,.13,.155);
  torso.add(trunk,warm,0,1.56,0,.082,.15,.083);
  torso.add(round,warm,0,1.68,-.011,.134,.17,.132);
  torso.add(round,warm,0,1.665,-.137,.042,.049,.038);
  torso.add(round,0x504b3a,0,1.73,.040,.133,.121,.116);
  torso.add(round,0x586350,0,1.795,-.005,.145,.093,.14);
  torso.add(round,0x4a5b4c,0,1.762,-.106,.143,.020,.107);
  torso.add(pack,0x4e5541,0,1.315,.189,1,1,.73);
  torso.add(cube,0x756a4e,0,1.32,.273,.267,.27,.064);
  torso.add(cube,0x82795a,0,1.50,.236,.30,.08,.12);
  torso.add(cube,0x475046,0,1.20,.296,.20,.085,.055);
  for (const side of [-1,1]) {
    torso.add(cube,0x575747,side*.113,1.31,-.147,.038,.36,.04,0,0,-side*.08);
    torso.add(cube,0x555746,side*.098,1.32,.312,.020,.34,.014);
    torso.add(cube,0xabaa89,side*.098,1.29,.323,.030,.031,.013);
    torso.beam(0x454b3e,[side*.105,1.51,.29],[side*.151,1.55,-.094],.038);
    torso.add(trunk,0x6f7169,side*.149,1.235,.218,.034,.15,.033);
  }
  torso.mesh(body,material);
  const limbs=[];
  for(const side of [-1,1]) {
    const leg=new THREE.Group(); leg.position.set(side*.122,.975,0); body.add(leg);
    const thigh=new Batch(); thigh.add(trouser,0x475549,0,-.192,0,1,1,.99);
    thigh.add(cube,0x586051,side*.099,-.17,.016,.033,.139,.103); thigh.mesh(leg,material);
    const knee=new THREE.Group(); knee.position.y=-.405; leg.add(knee);
    const shin=new Batch(); shin.add(gaiter,0x38443a,0,-.188,.004,.97,1,1.05);
    shin.add(trunk,0x645743,0,-.370,.004,.096,.095,.103);
    shin.add(round,0x61543f,0,-.446,-.039,.108,.091,.16);
    shin.add(round,0x373d36,0,-.505,-.041,.114,.032,.163); shin.mesh(knee,material);
    const arm=new THREE.Group(); arm.position.set(side*.245,1.445,0); body.add(arm);
    const sleeve=new Batch(); sleeve.add(round,coat,side*.025,-.15,.013,.092,.20,.098);
    sleeve.add(round,coat,side*.035,-.35,-.016,.077,.145,.082,-.32);
    sleeve.add(trunk,0x5b6150,side*.035,-.443,-.043,.065,.051,.069,-.27);
    sleeve.add(cube,0xafaa7d,side*.109,-.116,.018,.012,.060,.058,0,0,side*.1);
    sleeve.add(round,warm,side*.035,-.49,-.058,.058,.092,.068,-.25); sleeve.mesh(arm,material);
    limbs.push({side,leg,knee,arm});
  }
  // The mountain sun and static geometry share one cached shadow map.
  // Characters use a soft contact patch that follows their animated pose.
  root.traverse(node=>{if(node.isMesh) node.castShadow=false;});
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,18).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({color:0x27382e,map:shadowMap,transparent:true,opacity:.4,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  scene.add(shadow);
  return {root,body,limbs,tools:makeBlasters(body,material),shadow,label:characterLabel(root,name),cycle:0,weight:0};
}

function pose(avatar,state,dt) {
  const active=!state.dead && !!state.moving && state.grounded !== false;
  avatar.weight=mix(avatar.weight,active ? 1:0,1-Math.exp(-dt*12));
  avatar.cycle+=dt*(state.sprint?13:9);
  const swing=Math.sin(avatar.cycle)*avatar.weight;
  const airborne=state.grounded===false;
  avatar.root.position.set(state.x,state.y,state.z);
  const yaw=-(Number.isFinite(state.yaw)?state.yaw:0);
  const delta=Math.atan2(Math.sin(yaw-avatar.root.rotation.y),Math.cos(yaw-avatar.root.rotation.y));
  avatar.root.rotation.y+=delta*(1-Math.exp(-dt*19));
  avatar.body.position.y=Math.abs(Math.cos(avatar.cycle))*.038*avatar.weight;
  avatar.body.rotation.x=active ? -.075*avatar.weight : 0;
  const bloom = state.weapon === 2;
  // Defeated hikers slump to the ground until the authoritative respawn.
  avatar.body.rotation.z = mix(avatar.body.rotation.z, state.dead ? 1.45 : 0, 1 - Math.exp(-dt * 12));
  avatar.tools[0].visible = !state.dead && !bloom;
  avatar.tools[1].visible = !state.dead && bloom;
  avatar.label.update(state);
  for(const {leg,arm,knee,side} of avatar.limbs) {
    leg.rotation.x=airborne ? .20*side : -side*swing*(state.sprint?.80:.59);
    knee.rotation.x=airborne ? -.65 : -Math.max(0,-side*swing)*.77;
    arm.rotation.x=side===1 ? .77 : bloom ? .62 : airborne ? -.42 : side*swing*.62;
    arm.rotation.z=side*(side===1 ? .26 : airborne?.20:.065);
  }
  const y=groundHeight(state.x,state.z),height=clamp(state.y-y,0,1.75);
  avatar.shadow.position.set(state.x,y+.026,state.z);
  avatar.shadow.scale.set(.37+height*.05,1,.30+height*.04);
  avatar.shadow.material.opacity=.4-height*.12;
}

function cameraDistance(target,vector,wanted,hp) {
  let distance=wanted;
  for(let d=.45;d<wanted;d+=.20) {
    const x=target.x+vector.x*d,y=target.y+vector.y*d,z=target.z+vector.z*d;
    if(groundHeight(x,z)>y-.15) {distance=Math.max(.45,d-.18);break;}
  }
  // Sweep the boom against trunk/rock cylinders without testing every mesh.
  const test=(prop, radius) => {
    const h=vector.x*vector.x+vector.z*vector.z;
    if(h<.002) return;
    const along=((prop.x-target.x)*vector.x+(prop.z-target.z)*vector.z)/h;
    const d=clamp(along,0,distance);
    const dx=target.x+d*vector.x-prop.x,dz=target.z+d*vector.z-prop.z;
    const span=radius*radius-dx*dx-dz*dz;
    if(span<=0) return;
    const near=clamp(d-Math.sqrt(span/h),.45,distance);
    const y=target.y+near*vector.y,bottom=terrainHeight(prop.x,prop.z);
    if(y>bottom-.15 && y<bottom+prop.height+.15) distance=near;
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
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(60,1,.09,400);
  scene.fog=new THREE.FogExp2(0xafc1ca,.0024);
  scene.add(new THREE.HemisphereLight(0xcde3ef,0x9f9276,1.49));
  const sun=new THREE.DirectionalLight(0xffe3b6,2.34);
  sun.position.set(-36,32,-21); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:130});
  sun.shadow.normalBias=.045; sun.shadow.bias=-.0004; scene.add(sun);
  addSky(scene); addGround(scene,renderer);
  const rng=random(4863), material=vertexMaterial();
  const forest=new Batch();
  conifers(scene,forest,MAP.trees,sceneryHeight,renderer);
  forest.mesh(scene,material);
  granite(scene,MAP.rocks,terrainHeight,renderer);
  const features=new Batch();addBridge(features,rng);addDetails(scene,features,rng);landingMarks(features);features.mesh(scene,material);
  const glints=water(scene,rng,renderer);
  const shadowMap=contactShadowMap();
  const helicopter=fieldHelicopter(scene,material,shadowMap);
  const crystals=BREAKABLES.map((prop,i)=>crystalOutcrop(scene,material,prop,6104+i*39));
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
  function removeAvatar(a) {
    a.label.dispose();
    a.root.traverse(node=>{if(node.isMesh) node.geometry.dispose();});
    a.shadow.geometry.dispose();a.shadow.material.dispose();
    scene.remove(a.root,a.shadow);
  }
  function render(local,remotes,view,dt,world) {
    if(!local) return;
    dt=clamp(dt||.016,0,.10);clock+=dt;
    resize();
    const heli=world?.heli ?? parked;
    const piloting=heli.pilot != null && local.id===heli.pilot;
    helicopter.update(heli,dt);
    for(const crystal of crystals) {
      const {prop,mesh}=crystal;
      const hp=world?.hp?.[prop.id] ?? prop.hp;
      if(hp!==crystal.hp) {
        if(hp===0 && crystal.hp>0) effects.burst(prop.x,mesh.position.y+prop.height*.48,prop.z,true);
        mesh.visible=hp>0;
        mesh.scale.y=.78+.22*hp/prop.hp;
        crystal.hp=hp;
      }
    }
    if(world?.shots) {
      // Ignore recent history on first join. Consume each subsequent event once.
      for(const shot of world.shots) if(lastShot!==null && shot.id>lastShot) effects.shot(shot);
      lastShot=world.shots.at(-1)?.id ?? lastShot ?? 0;
    }
    effects.update(dt);
    const live=new Set();
    for(const state of [local,...remotes,...(world?.npcs ?? [])]) {
      live.add(state.id);
      let a=avatars.get(state.id);
      if(!a) {
        const rival = typeof state.id === 'string';
        a=hiker(scene,state.id,rival ? 0x98586d : state.color,material,shadowMap,state.name || 'Hiker ' + state.id);
        avatars.set(state.id,a);
      }
      a.label.sprite.visible = state.id !== local.id && Math.hypot(local.x-state.x,local.z-state.z)<32;
      a.root.visible=a.shadow.visible=state.id!==heli.pilot;
      if(a.root.visible) pose(a,state,dt);
    }
    for(const [key,a] of avatars) if(!live.has(key)){removeAvatar(a);avatars.delete(key);}
    if(piloting) desired.set(heli.x,heli.y+1.12,heli.z);
    else desired.set(local.x,local.y+1.43,local.z);
    if(!ready || desired.distanceToSquared(target)>36) {target.copy(desired);ready=true;}
    else target.lerp(desired,1-Math.exp(-dt*24));
    const pitch=clamp(view.pitch??-.12,-1.2,.8),yaw=view.yaw||0;
    boom.set(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
    const wanted=clamp(view.distance||4.4,1.35,7.5) + (piloting ? 4.2 : 0);
    const distance=cameraDistance(target,boom,wanted,world?.hp);
    camera.position.copy(target).addScaledVector(boom,distance);
    camera.lookAt(target);
    avatars.get(local.id).root.visible=!piloting && distance>.86;
    if(glints) glints.position.x=Math.sin(clock*.33)*.09;
    renderer.render(scene,camera);
  }
  return {render,resize,dispose(){scene.traverse(node=>{
    if(node.isMesh){node.geometry.dispose();node.material.map?.dispose();node.material.dispose();}
  });shadowMap.dispose();renderer.dispose();}};
}
