import * as THREE from 'three';
import { MAP, terrainHeight, groundHeight } from './world.js';

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

// A small seeded albedo tile adds grains, leaf litter and hairline stones
// between terrain vertices. Its low contrast keeps repeated tiles unobtrusive.
function detailTexture(renderer) {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256),rng=random(183);
  for(let i=0;i<256*256;i++) {
    const v=207+Math.floor(rng()*46);
    pixels.data.set([v,v,v,255],i*4);
  }
  ctx.putImageData(pixels,0,0);
  for(let i=0;i<1600;i++) {
    const u=rng()*256,v=rng()*256,len=.5+rng()*3.9;
    ctx.beginPath();ctx.moveTo(u,v);ctx.lineTo(u+len,v+(rng()-.5)*3);
    ctx.lineWidth=.4+rng();
    ctx.strokeStyle=i%3?'rgba(104,100,88,.26)':'rgba(255,253,237,.63)';
    ctx.stroke();
  }
  const tile=new THREE.CanvasTexture(canvas);
  tile.colorSpace=THREE.SRGBColorSpace;
  tile.wrapS=tile.wrapT=THREE.RepeatWrapping;
  tile.repeat.set(64,64);
  tile.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  return tile;
}

function addGround(scene,renderer) {
  const size = 164;
  const geo = new THREE.PlaneGeometry(size, size, 220, 220).rotateX(-Math.PI/2);
  const positions = geo.attributes.position;
  const colors = [];
  const dark = color(0x515e37), light = color(0xa7a96c);
  const path = color(0xbfaa83), shale = color(0x878c79);
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
    c.multiplyScalar(.88 + .19*noise(x*.93,z*.93));
    colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();
  const mat=vertexMaterial();
  mat.map=detailTexture(renderer);
  const ground = new THREE.Mesh(geo,mat);
  ground.receiveShadow = true;
  scene.add(ground);
}

// The serrated rings follow a shared height profile, with radial folds running
// from each summit into the foothills. Snow grows on the upper, gentler faces.
function mountains(scene, radius, height, seed, shades) {
  const count = 176, rows = 12;
  const vertices=[], colors=[];
  const at = (i,j) => {
    const a = TAU*(i%count)/count;
    const t=j/rows;
    const crest = .42 + .35*Math.abs(Math.sin(3*a+seed)) + .22*Math.abs(Math.sin(7*a+seed*.3))
      + .09*Math.sin(15*a+seed) + .09*noise(i*.43,seed);
    const fold = .78*Math.sin(15*a+seed)+.3*Math.sin(37*a-seed);
    const d = radius*(.67 + .38*t) + (1-t)*fold*13 + 2*Math.sin(a*9+seed);
    const y = -9 + height*t*crest + Math.sin(Math.PI*t)*(fold*6-1);
    return [Math.sin(a)*d,y,Math.cos(a)*d];
  };
  const shade = shades.map(color), snow = color(0xe5e8de);
  function face(a,b,c,k) {
    const n = new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a))
      .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a))).normalize();
    const y=(a[1]+b[1]+c[1])/3;
    const tint=shade[0].clone().lerp(shade[1],clamp(.45+.4*n.x+.18*k,0,1));
    const snowy = y/height > .49 + .11*k - n.y*.13;
    if(snowy) tint.lerp(snow,clamp(.34 + .46*n.y + .12*k,.2,.95));
    for (const v of [a,b,c]) { vertices.push(...v); colors.push(tint.r,tint.g,tint.b); }
  }
  for (let i=0;i<count;i++) for(let j=0;j<rows;j++) {
    const a=at(i,j),b=at(i+1,j),c=at(i+1,j+1),d=at(i,j+1);
    const k=noise(i*.5,j*.5);
    face(a,d,c,k); face(a,c,b,k);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const mat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
  scene.add(new THREE.Mesh(geo,mat));
}

function addSky(scene) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(278,48,22),
    new THREE.ShaderMaterial({
      side:THREE.BackSide,depthWrite:false,
      uniforms:{horizon:{value:color(0xe3dfbf)},zenith:{value:color(0x5996ba)}},
      vertexShader:`varying vec3 skyDir; void main(){skyDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 skyDir; uniform vec3 horizon; uniform vec3 zenith;
        void main(){vec3 d=normalize(skyDir); float t=pow(clamp(d.y,0.,1.),.55);
        vec3 c=mix(horizon,zenith,t);float sun=max(dot(d,normalize(vec3(-.54,.65,-.64))),0.);
        c+=vec3(.38,.25,.09)*pow(sun,22.)+vec3(.94,.82,.55)*smoothstep(.99945,.9998,sun);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
        }`
    }));
  sky.renderOrder=-20; scene.add(sky);
  mountains(scene, 234, 108, 9, [0x899fa6,0xc0ccc6]);
  mountains(scene, 144, 57, 2, [0x637c7e,0x9aa796]);
}

function needleGeometry(seed) {
  const rng=random(seed), positions=[],indices=[];
  const n=20;
  // Each crown tier has a ragged lower skirt and drooping bough tips.
  for(let j=0;j<4;j++) for(let i=0;i<n;i++) {
    const a=TAU*i/n;
    const edge=i%2 ? 1 : .61+rng()*.11;
    const radius=[.49,edge,.56,.03][j] * (.88+rng()*.17);
    positions.push(Math.cos(a)*radius,[.05,.19,.46,1][j]+(j===1 ? (i%2 ? -.19:.01) : .025*rng()),Math.sin(a)*radius);
  }
  for(let j=0;j<3;j++) for(let i=0;i<n;i++) {
    const a=j*n+i,b=j*n+(i+1)%n,c=b+n,d=a+n;
    indices.push(a,d,b,b,d,c);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geo.setIndex(indices);
  geo.computeVertexNormals(); return geo;
}

function addForest(batch, rng) {
  const tiers=Array.from({length:5},(_,i)=>needleGeometry(91+i*79));
  const palette=[0x2c5144,0x3d614d,0x466e56,0x597660];
  function spruce(x,z,height,radius) {
    const y=sceneryHeight(x,z)-.08, twist=rng()*TAU;
    batch.add(trunk,0x63513b,x,y+height*.37,z,radius,height*.74,radius,0,twist);
    const tint=palette[Math.floor(rng()*palette.length)];
    const spread=height*(.18+rng()*.044);
    for(let k=0;k<5;k++) {
      const t=k/5;
      const w=spread*(1-.83*t);
      const tierColor=color(tint).multiplyScalar(.84+.25*t+.09*rng());
      batch.add(tiers[k],tierColor,x,y+height*(.16+.15*k),z,w,height*(.35-.026*k),w,0,twist+k*.82);
    }
  }
  for(const tree of MAP.trees) spruce(tree.x,tree.z,tree.height,tree.radius);
  for(let i=0;i<260;i++) {
    const a=rng()*TAU,d=MAP.bounds*1.52+rng()*24;
    const x=Math.sin(a)*d,z=Math.cos(a)*d;
    if(sceneryHeight(x,z)<MAP.waterY+.4) continue;
    spruce(x,z,5+rng()*9,.18+rng()*.24);
  }
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

function addDetails(batch, rng) {
  const granite=[0x7c8179,0x8a897c,0x898d83,0x777f78];
  for(const r of MAP.rocks) {
    const y=terrainHeight(r.x,r.z);
    batch.add(stone,granite[Math.floor(rng()*4)],r.x,y+r.height*.37,r.z,
      r.radius*1.12,r.height*.72,r.radius*1.13,.19,rng()*TAU,.14);
  }
  addTrailMarker(batch,2.24,8.1,-.35);
  addTrailMarker(batch,MAP.lookout.x-1.65,MAP.lookout.z-.80,.2,true);
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
    if(d<1.7 && rng()>.12) continue;
    if(d<1.7 || rng()<.08) {
      const size=(d<1.7 ? .03:.07)*(1+2*rng());
      batch.add(stone,granite[i%4],x,y+.008,z,size*1.12,size*.36,size*.8,0,rng()*TAU);
    } else {
      const size=.15+.28*rng();
      batch.add(grass,grassColors[i%5],x,y-.025,z,size*.85,size,size*.85,0,rng()*TAU);
    }
  }
}

function water(scene, rng) {
  const geometry=new THREE.PlaneGeometry(125,6).rotateX(-Math.PI/2);
  const material=new THREE.MeshPhongMaterial({color:0x45888a,specular:0xb3cbc0,shininess:38,transparent:true,opacity:.9});
  const surface=new THREE.Mesh(geometry,material);
  surface.position.y=MAP.waterY; surface.receiveShadow=true; scene.add(surface);
  const ripples=new Batch();
  for(let i=0;i<420;i++) {
    const x=(rng()-.5)*108,z=(rng()-.5)*4.5;
    if(terrainHeight(x,z)>MAP.waterY-.07) continue;
    ripples.add(cube, i%4 ? 0x72aaad:0xb6cac1,x,MAP.waterY+.012,z,.12+rng()*.54,.005,.012+rng()*.024,0,(rng()-.5)*.18);
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

// Parts are assembled in model space about real joints. Forward is local -Z.
function hiker(scene,id,tint,material,shadowMap,name) {
  const root=new THREE.Group(), body=new THREE.Group();
  root.add(body); scene.add(root);
  const coat=tint ?? jacketColor(id), dark=0x263e41, warm=0xc99772;
  const torso=new Batch();
  torso.add(round,coat,0,1.25,0,.27,.37,.18);
  torso.add(round,dark,0,.99,0,.22,.13,.155);
  torso.add(trunk,warm,0,1.56,0,.082,.15,.083);
  torso.add(round,warm,0,1.68,-.011,.134,.17,.132);
  torso.add(round,warm,0,1.665,-.137,.042,.049,.038);
  torso.add(round,0x504b3a,0,1.73,.040,.133,.121,.116);
  torso.add(round,0x586350,0,1.795,-.005,.145,.093,.14);
  torso.add(round,0x4a5b4c,0,1.762,-.106,.143,.020,.107);
  torso.add(round,0x655e40,0,1.30,.155,.192,.255,.12);
  torso.add(cube,0x8b784e,0,1.32,.213,.29,.33,.095);
  torso.add(cube,0xa89b69,0,1.47,.224,.31,.09,.11);
  torso.add(cube,0x5d5942,0,1.24,.27,.20,.095,.04);
  for (const side of [-1,1]) {
    torso.add(cube,0x575747,side*.113,1.31,-.147,.038,.36,.04,0,0,-side*.08);
    torso.add(cube,0x555746,side*.12,1.31,.268,.032,.32,.02);
  }
  torso.mesh(body,material);
  const limbs=[];
  for(const side of [-1,1]) {
    const leg=new THREE.Group(); leg.position.set(side*.122,.975,0); body.add(leg);
    const thigh=new Batch(); thigh.add(round,dark,0,-.205,0,.116,.254,.125); thigh.mesh(leg,material);
    const knee=new THREE.Group(); knee.position.y=-.405; leg.add(knee);
    const shin=new Batch(); shin.add(round,0x364b49,0,-.205,.006,.09,.245,.102);
    shin.add(round,0x61543f,0,-.446,-.039,.108,.091,.16);
    shin.add(round,0x373d36,0,-.505,-.041,.114,.032,.163); shin.mesh(knee,material);
    const arm=new THREE.Group(); arm.position.set(side*.245,1.445,0); body.add(arm);
    const sleeve=new Batch(); sleeve.add(round,coat,side*.025,-.15,.013,.092,.20,.098);
    sleeve.add(round,coat,side*.035,-.35,-.016,.077,.135,.082,-.32);
    sleeve.add(round,warm,side*.035,-.49,-.058,.058,.092,.068,-.25); sleeve.mesh(arm,material);
    limbs.push({side,leg,knee,arm});
  }
  // The mountain sun and static geometry share one cached shadow map.
  // Characters use a soft contact patch that follows their animated pose.
  root.traverse(node=>{if(node.isMesh) node.castShadow=false;});
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,18).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({color:0x27382e,map:shadowMap,transparent:true,opacity:.4,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  scene.add(shadow);
  return {root,body,limbs,shadow,label:name ? characterLabel(root,name) : null,cycle:0,weight:0};
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
  avatar.label?.update(state);
  avatar.body.rotation.z=mix(avatar.body.rotation.z,state.dead ? 1.45 : 0,1-Math.exp(-dt*12));
  avatar.body.rotation.x=active ? -.075*avatar.weight : 0;
  for(const {leg,arm,knee,side} of avatar.limbs) {
    leg.rotation.x=airborne ? .20*side : -side*swing*(state.sprint?.80:.59);
    knee.rotation.x=airborne ? -.65 : -Math.max(0,-side*swing)*.77;
    arm.rotation.x=airborne ? -.42 : side*swing*.62;
    arm.rotation.z=side*(airborne?.20:.065);
  }
  const y=groundHeight(state.x,state.z),height=clamp(state.y-y,0,1.75);
  avatar.shadow.position.set(state.x,y+.026,state.z);
  avatar.shadow.scale.set(.37+height*.05,1,.30+height*.04);
  avatar.shadow.material.opacity=.4-height*.12;
}

function cameraDistance(target,vector,wanted) {
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
  scene.fog=new THREE.FogExp2(0xc2ccbd,.0042);
  scene.add(new THREE.HemisphereLight(0xf1f6ff,0xb5ae7b,1.62));
  const sun=new THREE.DirectionalLight(0xffe4b7,2.15);
  sun.position.set(-31,46,-24); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-45,right:45,top:45,bottom:-45,near:1,far:130});
  sun.shadow.normalBias=.045; sun.shadow.bias=-.0004; scene.add(sun);
  addSky(scene); addGround(scene,renderer);
  const rng=random(4863), material=vertexMaterial();
  const forest=new Batch(); addForest(forest,rng);forest.mesh(scene,material);
  const features=new Batch();addBridge(features,rng);addDetails(features,rng);features.mesh(scene,material);
  const glints=water(scene,rng);
  const shadowMap=contactShadowMap();
  const avatars=new Map(), target=new THREE.Vector3(), boom=new THREE.Vector3();
  const desired=new THREE.Vector3();
  let clock=0,lastWidth=0,lastHeight=0,ready=false;
  function resize(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
    if(w===lastWidth && h===lastHeight) return;
    lastWidth=w;lastHeight=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  function removeAvatar(a) {
    a.label?.dispose();
    a.root.traverse(node=>{if(node.isMesh) node.geometry.dispose();});
    a.shadow.geometry.dispose();a.shadow.material.dispose();
    scene.remove(a.root,a.shadow);
  }
  function render(local,remotes,view,dt) {
    if(!local) return;
    dt=clamp(dt||.016,0,.10);clock+=dt;
    resize();
    const live=new Set();
    for(const state of [local,...remotes]) {
      live.add(state.id);
      let a=avatars.get(state.id);
      if(!a) {a=hiker(scene,state.id,state.color,material,shadowMap,state.name);avatars.set(state.id,a);}
      pose(a,state,dt);
    }
    for(const [key,a] of avatars) if(!live.has(key)){removeAvatar(a);avatars.delete(key);}
    desired.set(local.x,local.y+1.43,local.z);
    if(!ready || desired.distanceToSquared(target)>36) {target.copy(desired);ready=true;}
    else target.lerp(desired,1-Math.exp(-dt*24));
    const pitch=clamp(view.pitch??-.12,-1.2,.8),yaw=view.yaw||0;
    boom.set(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
    const distance=cameraDistance(target,boom,clamp(view.distance||4.4,1.35,7.5));
    camera.position.copy(target).addScaledVector(boom,distance);
    camera.lookAt(target);
    avatars.get(local.id).root.visible=distance>.86;
    if(glints) glints.position.x=Math.sin(clock*.33)*.09;
    renderer.render(scene,camera);
  }
  return {render,resize,dispose(){scene.traverse(node=>{
    if(node.isMesh){node.geometry.dispose();node.material.map?.dispose();node.material.dispose();}
  });shadowMap.dispose();renderer.dispose();}};
}
