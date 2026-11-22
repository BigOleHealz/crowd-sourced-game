import {estateCollection} from './estate-collection.js';
import {dressPalmaArchitecture} from './palma-architecture.js';
import {paneBatch} from './pane-damage-view.js';
import {frontageGlassMaterial} from './frontage-glass-material.js';
import * as THREE from 'three';
import {centaurFountain} from './centaur-fountain-view.js';
import {finishes as C,resortLevels} from './grand-resort-layout.js';
import {resortGround,shorePads,falls,pool} from './palma-site.js';

// A folded leaf with a raised midrib. Reuse the section at canopy, chandelier and crown scale.
function leaf(root,tip,width,normal){
  const a=new THREE.Vector3(...root),b=new THREE.Vector3(...tip),v=b.clone().sub(a);
  const front=new THREE.Vector3(...normal).normalize(),side=v.clone().cross(front).normalize();
  const vertices=[];
  function at(t,s,d){return a.clone().addScaledVector(v,t).addScaledVector(side,s*width).addScaledVector(front,d*width);}
  const left=at(.58,-.50,0),right=at(.58,.50,0),ridge=at(.58,0,.26);
  for(const tri of [[a,left,ridge],[a,ridge,right],[left,b,ridge],[ridge,b,right]])
    for(const p of tri)vertices.push(p.x,p.y,p.z);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();return g;
}
function sign(parent,words,x,y,z,width,angle=0){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#193c39';ctx.fillRect(0,0,1024,128);
  ctx.strokeStyle='#c6a56e';ctx.lineWidth=3;ctx.strokeRect(7,7,1010,114);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f7e5b6';ctx.font='50px Georgia';
  ctx.fillText(words,512,66,950);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/8),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));
  m.position.set(x,y,z);m.rotation.y=angle;parent.add(m);
}
function buildStageInstruments(body,trim,cube,drum,bulb){
  const x=-86.30,y=2.36,z=42.05,gold=0xc49b55;
  const put=(batch,color,u,h,v,w,k,d,rx=0,ry=0,rz=0)=>batch.add(cube,color,x+u,y+h,z+v,w,k,d,rx,ry,rz);
  // Curved concert grand with a raised lid, keyboard and brass pedals.
  const shape=new THREE.Shape();
  shape.moveTo(0,0);shape.lineTo(1.10,0);shape.lineTo(1.10,.56);
  shape.bezierCurveTo(1.1,1.20,.48,.83,.42,1.56);
  shape.bezierCurveTo(.35,1.95,0,1.85,0,1.48);shape.closePath();
  const shell=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.032,bevelThickness:.02}).rotateX(-Math.PI/2);
  body.add(shell,0x202024,x-.90,y+.97,z+.78);
  const lid=shell.clone().scale(1,.19,1).rotateZ(.29);
  body.add(lid,0x251d24,x-.9,y+1.20,z+.78);
  trim.beam(gold,[x+.06,y+1.14,z+.18],[x+.06,y+1.49,z+.18],.024);
  for(const [u,v] of [[-.82,.65],[.11,.65],[-.66,-.71]])body.add(drum,0x26252b,x+u,y+.58,z+v,.084,.90,.084);
  for(let i=0;i<30;i++){
    put(body,0xf3ecd7,-.88+i*.035,1.001,.89,.031,.048,.22);
    if(![2,6].includes(i%7))put(body,0x222023,-.863+i*.035,1.034,.847,.019,.029,.133);
  }
  put(body,0x5d3445,-.39,.59,1.42,.83,.13,.36);
  for(const u of [-.69,-.12])body.add(drum,0x342528,x+u,y+.35,z+1.42,.08,.52,.08);
  body.add(drum,0x28272b,x+1.33,y+.18,z-.42,.40,.08,.40);
  trim.beam(gold,[x+1.33,y+.2,z-.42],[x+1.33,y+1.69,z-.42],.028);
  body.add(bulb,0xc4bdba,x+1.31,y+1.70,z-.42,.11,.08,.075,0,0,.2);
  body.add(bulb,0x9d552d,x+.18,y+.68,45.83,.67,.92,.33);
  body.add(bulb,0xaf6538,x+.18,y+1.02,45.83,.48,.52,.31);
  trim.beam(0x3a281f,[x+.18,y+.67,45.98],[x+.1,y+1.97,45.90],.075);
  for(const z of [45.97,46.00,46.03])trim.beam(gold,[x+.20,y+.53,z],[x+.10,y+1.91,z-.04],.009);
  shell.dispose();lid.dispose();
}
export function resortExterior(scene,Batch,panorama){
  const group=new THREE.Group();group.name='Palma de Sal';scene.add(group);
  const cube=new THREE.BoxGeometry(),disc=new THREE.CylinderGeometry(.5,.5,1,20),ball=new THREE.SphereGeometry(.5,12,9);
  const stone=new Batch(),metal=new Batch(),glow=new Batch(),glazing=new Batch();
  const stoneMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.69,side:THREE.DoubleSide});
  const metalMat=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.43,roughness:.33,side:THREE.DoubleSide});
  const litMat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide});
  const windowMat=frontageGlassMaterial(panorama),panes=paneBatch(glazing);
  // Clear sight into Fan Hall, blue-green reflective suite windows above the limestone podium.
  windowMat.fragmentShader=windowMat.fragmentShader.replace('reflection*vec3(.91,.98,.96),.105+.49*edge*edge','mix(reflection,vec3(.025,.17,.19),.20),mix(.13,.62,step(26.6,wp.y))+.33*edge*edge');
  windowMat.fragmentShader=windowMat.fragmentShader.replace('float edge=1.-abs(dot(v,n));',`float edge=1.-abs(dot(v,n));
    float bay=floor((wp.x+wp.z)*.249),storey=floor((wp.y-26.8)/3.8);
    float occupied=step(.49,fract(sin(bay*23.17+storey*3.19)*658.21));
    float distanceFade=smoothstep(9.,25.,distance(cameraPosition,wp));
    reflection+=skyDarkness*distanceFade*occupied*vec3(.88,.48,.18)*smoothstep(25.,27.,wp.y);`);
  const waterMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.17,metalness:.20});
  const box=(b,c,x,y,z,w,h,d)=>b.add(cube,c,x,y,z,w,h,d);
  const blade=(batch,color,a,b,w,n)=>{const g=leaf(a,b,w,n);batch.add(g,color,0,0,0);g.dispose();};
  // Project the grain in metres so separate slabs and irregular piers share the same scale.
  const shellMat=stoneMat.clone();
  const limestoneMap=new THREE.TextureLoader().load('./avenue-limestone.webp');
  limestoneMap.wrapS=limestoneMap.wrapT=THREE.RepeatWrapping;
  limestoneMap.colorSpace=THREE.SRGBColorSpace;limestoneMap.anisotropy=4;
  shellMat.onBeforeCompile=shader=>{
    shader.uniforms.shellGrain={value:limestoneMap};
    shader.vertexShader='varying vec3 vStone,vStoneNormal;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=position;vStoneNormal=normal;');
    shader.fragmentShader='uniform sampler2D shellGrain;varying vec3 vStone,vStoneNormal;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 an=abs(vStoneNormal);
      vec2 faceUV=an.y>max(an.x,an.z)?vStone.xz:(an.x>an.z?vStone.zy:vStone.xy);
      vec3 shell=texture2D(shellGrain,faceUV/3.6).rgb;
      diffuseColor.rgb*=mix(vec3(.81),shell*1.25,.52);
      vec2 slab=vStone.xz+vec2(vStone.y*.7,vStone.y*.35);
      float vein=sin(slab.x*1.72+slab.y*.91+1.3*sin(slab.y*1.7+.8*sin(slab.x))+.22*sin(slab.x*8.));
      float seam=smoothstep(.014,.039,min(abs(fract(slab.x/2.4)-.5),abs(fract(slab.y/1.2)-.5)));
      diffuseColor.rgb*=.90+.08*seam+.035*sin(slab.x*3.4+slab.y*1.4)-.095*smoothstep(.88,.995,vein);`);
  };
  const sheets=new THREE.Group();sheets.name='Twin stage waterfalls';group.add(sheets);
  const fallMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{time:{value:0}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec2 v;uniform float time;void main(){float streak=sin(v.x*147.+sin(v.y*7.+time*3.)*.35);float pulse=sin(v.y*62.+time*6.+v.x*24.);float light=.5+.5*streak;gl_FragColor=vec4(mix(vec3(.27,.64,.63),vec3(.89,.98,.92),light*.55+pulse*.10),.64+.24*light);}'});
  for(const z of falls){
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(1.78,8),fallMat);plane.rotation.y=Math.PI/2;plane.position.set(-87.92,6.04,z);sheets.add(plane);
    box(stone,C.dark,-88.10,6.04,z,.18,8.25,2.14);
    box(glow,C.light,-87.82,10.05,z,.14,.09,2.05);
  }
  function quayPad(x0,z0,x1,z1){
    box(stone,C.stone,(x0+x1)/2,.34,(z0+z1)/2,x1-x0,.90,z1-z0);
  }
  for(const r of shorePads){
    if(r.west===-76){
      quayPad(r.west,r.north,r.east,97.25);
      quayPad(r.west,97.25,-64,r.south);
      quayPad(-49.35,97.25,r.east,r.south);
    }else quayPad(r.west,r.north,r.east,r.south);
  }
  // Sloping, edge-matched road ribbon; the same centreline feeds navigation and tyre grip.
  function ribbon(points,width,height,color){
    const pos=[],indices=[];
    points.forEach(([x,z],i)=>{
      const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
      const dx=next[0]-prev[0],dz=next[1]-prev[1],len=Math.hypot(dx,dz)||1;
      for(const side of [-1,1])pos.push(x+side*width*.5*dz/len,height(x,z),z-side*width*.5*dx/len);
      if(i){const k=i*2;indices.push(k-2,k,k-1,k-1,k,k+1);}
    });
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();
    stone.add(g,color,0,0,0);g.dispose();
  }
  const berth=[-64,-58.24,-50.85,-49.35].map(x=>[x,98.125]);
  ribbon(berth,1.75,(x,z)=>resortGround(x,z)+.006,C.stone);
  for(const x of [-58,-54,-51]){
    metal.add(disc,C.bronze,x,.48,98.82,.19,.32,.19);
    metal.add(disc,C.dark,x,.65,98.82,.26,.055,.26);
  }
  const planter=dressPalmaArchitecture({stone,metal,glow,box,disc,ball,blade});
  ribbon([[-89.77,49.5],[-89.77,51.2],[-89.77,63.2],[-89.77,64.8]],2.36,(_,z)=>1.81-Math.min(1,Math.max(0,(z-51.2)/12)),C.stone);
  box(stone,C.cream,-67.52,1.20,44,3.04,1.20,8.6);
  // A cast-glass palmetto unfurls sideways over the audience. Each rib has a curved
  // keel, a translucent-looking pearl face and a fine illuminated leading edge.
  for(let j=0;j<17;j++){
    const u=j/16,reach=4.2+4.5*Math.sin(Math.PI*(u*.62+.20));
    const angle=(-30+116*u)*Math.PI/180;
    let previous=null;
    for(let k=0;k<=12;k++){
      const t=k/12,span=Math.pow(Math.sin(t*Math.PI),.80)*(.26+.17*Math.sin(u*Math.PI));
      const x=-83.45+1.75*t+.50*Math.sin(t*Math.PI+u*.4);
      const z=39.85+t*reach*Math.cos(angle);
      const y=10.6+3.35*Math.sin(t*Math.PI*.81)+t*(3.25+reach*Math.sin(angle));
      const rib=[x+.19*Math.sin(Math.PI*t),y,z],left=[x,y+span,z-span*.46],right=[x,y-span,z+span*.46];
      if(previous){
        const geo=new THREE.BufferGeometry(),verts=[...previous.left,...left,...rib,...previous.left,...rib,...previous.rib,...previous.rib,...rib,...right,...previous.rib,...right,...previous.right];
        geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();
        (j%4===0?glow:metal).add(geo,j%4===0?0xffedc4:j%2?0xf6d39e:0xe5b575,0,0,0);geo.dispose();
        glow.beam(0xffdf93,previous.rib,rib,.037);
      }
      if(k===12 && j%5===0)metal.beam(C.bronze,rib,[x,26.55,z],.018);
      previous={left,right,rib};
    }
  }
  metal.add(ball,C.bronze,-83.45,10.60,39.85,.70,.67,.70);
  // The solid jade shell keeps the musicians legible against daylight on the water.
  box(stone,0x173f3b,-88.28,6.0,44,.26,8.5,7.63);
  for(let i=0;i<25;i++){
    const t=i/24,z=40.23+7.54*t,head=7.4+2.2*Math.sin(t*Math.PI);
    blade(metal,i%2?0xb38b52:0x9e7046,[-88.04,2.42,44],[-88.02,head,z],.59,[1,0,0]);
    if(i%3===0)glow.beam(0xf8dba0,[-87.94,2.7,44+(z-44)*.03],[-87.94,head-.12,z],.023);
  }
  for(const z of [38.15,40.42,47.68,49.95]){
    box(metal,C.bronze,-87.93,6,z,.16,8.5,.12);
    box(glow,0xf2cf92,-87.82,6,z,.04,8.4,.035);
  }
  buildStageInstruments(stone,metal,cube,disc,ball);
  for(const z of [40.34,47.97]){
    box(metal,C.bronze,-86.35,2.18,z,3.79,.19,.045);
  }
  box(glow,C.light,-84.44,2.24,44,.035,.055,7.17);
  // Terrazzo field and two brass-bordered audience carpets meet a continuous centre aisle.
  for(const z of [42.28,46.12]){
    box(metal,C.bronze,-79.77,1.812,z,5.32,.018,3.51);
    box(stone,0x72483f,-79.77,1.827,z,5.22,.014,3.40);
    for(let j=0;j<7;j++)box(stone,0x93604f,-82.15+j*.79,1.836,z,.023,.004,3.34);
  }
  for(const z of [40.19,47.90])box(metal,C.bronze,-74.65,1.812,z,8,.014,.042);
  for(const z of [37.6,50.42]){
    for(let j=0;j<8;j++){
      const x=-87.8+j*1.94;
      box(stone,0xe0c395,x,6.53,z,.24,.52,.32);
      box(glow,0xffe9b2,x,6.45,z,.26,.10,.34);
    }
  }
  for(const z of [37.7,50.4])for(const x of [-86.6,-76.8]){
    stone.add(disc,0x72583d,x,2.08,z,.55,.55,.55);
    for(let j=0;j<9;j++){
      const a=j*Math.PI*2/9;
      blade(stone,j%2?0x346e4a:0x568155,[x,2.26,z],[x+.47*Math.cos(a),2.88+.26*(j%3),z+.47*Math.sin(a)],.24,[0,1,0]);
    }
  }
  // Facade fins carry the same off-centre crease up to two unequal crown blades.
  for(const x of [-88.48,-74.02])for(let z=32.2;z<62;z+=1.5){
    const t=(z-32)/30,peak=t<.5?109-15*t:101.5+(t-.5)*9.4;
    if(x===-74.02 && z<46 && z>38.5)continue;
    metal.beam(C.bronze,[x,26.8,z],[x,87.6,z],.12,.22);
    if(z>39 && z<54)continue;
    blade(metal,0xb88b50,[x,87.5,z],[x+(x< -80?-.42:.42),peak,z],1.05,[x< -80?-1:1,0,0]);
    glow.beam(0xf1bf76,[x,peak-.16,z],[x,peak,z+.16],.062);
  }
  for(const z of [32,62])for(let i=0;i<=10;i++){
    const t=i/10,x=-88.5+t*14.5,peak=t<.5?109-15*t:101.5+(t-.5)*9.4;
    if(z===32 && x>-76.7)continue;
    blade(metal,C.bronze,[x,88,z],[x,peak,z+(z<40?-.34:.34)],1.15,[0,0,1]);
    if(i<10){const u=(i+1)/10,next=u<.5?109-15*u:101.5+(u-.5)*9.4;glow.beam(C.light,[x,peak,z],[x+1.45,next,z],.11);}
  }
  for(const z of [68,71.5,75.7])box(metal,C.bronze,-27.92,2.87,z,.13,4.1,.13);
  sign(group,'P A L M A   D E   S A L',-68.86,5.6,44,6.7,Math.PI/2);
  sign(group,'S A L T   A R C A D E',-54,5.75,95.1,8.8);
  sign(group,'S U P P E R   C L U B',-18.5,4.52,77.36,6);
  sign(group,'F A N   H A L L     /     G U E S T   L I F T S',-82.25,4.3,54.05,5.35,Math.PI);
  sign(group,'C O N C I E R G E   /   G U E S T   K E Y S',-83.1,2.54,50.68,3.16,Math.PI);
  const tickFountain=centaurFountain({masonry:stone,metal,glow},group,Batch,{water:waterMat});
  function renderPart(p,batch){
    const {x,z,w,d,h,base,color,kind}=p,mid=base+h/2;
    if(kind==='glass'){
      panes.add(p.paneId,()=>box(glazing,C.glass,x,mid,z,w,h,d));return;
    }
    if(kind==='balustrade'){
      const along=w>d;
      box(stone,0xcab390,x,base+.21,z,w,.42,d);
      box(metal,C.bronze,x,base+1.05,z,w,.085,d);
      box(metal,C.bronze,x,base+.70,z,w,.045,d*.62);
      const length=along?w:d,n=Math.ceil(length/.92);
      for(let j=0;j<=n;j++){const u=length*(j/n-.5);box(metal,C.bronze,x+(along?u:0),base+.69,z+(along?0:u),.06,.68,.06);}
      return;
    }
    if(kind==='jamb'||kind==='stoneBand'){
      box(stone,color,x,mid,z,w,h,d);
      if(kind==='stoneBand' && h>.40 && Math.max(w,d)>1.1){
        box(metal,C.bronze,x,base+h-.09,z,w+.015,.045,d+.015);
      }
      return;
    }
    if(kind==='cocktail'||kind==='banquet'||kind==='console'){
      box(batch,0xa77a49,x,base+.13,z,w*.64,.19,d*.66);
      box(batch,0x566057,x,base+h*.50,z,w*.46,h*.77,d*.60);
      batch.add(disc,color,x,base+h-.055,z,w,.11,d);
      batch.add(disc,0xccb183,x,base+h+.065,z,.32,.045,.32);
      for(const u of [-.09,.08])batch.add(ball,0xb47351,x+u,base+h+.16,z,.12,.13,.12);
      if(kind==='banquet')for(const sign of [-1,1])for(const u of [-1,0,1]){
        const xx=x+u*w*.29,zz=z+sign*(d*.56+.19);
        box(batch,C.oak,xx,base+.23,zz,.34,.45,.34);
        batch.add(ball,0xb47459,xx,base+.49,zz,.51,.22,.53);
        batch.add(ball,0xb47459,xx,base+.70,zz+sign*.21,.51,.48,.14);
      }
      return;
    }
    if(kind==='chaise'||kind==='daybed'){
      box(batch,C.oak,x,base+.20,z,w,.34,d);
      box(batch,C.cream,x,base+.43,z,w*.96,.22,d*.94);
      batch.add(cube,C.cream,x,base+.64,z-d*.32,w*.95,.22,d*.35,-.38);
      batch.add(ball,0x49817c,x,base+.56,z+d*.23,w*.68,.14,.31);
      if(kind==='daybed'){
        for(const sign of [-1,1])for(const end of [-1,1])box(batch,C.bronze,x+sign*(w/2-.08),base+h/2,z+end*(d/2-.08),.085,h,.085);
        box(batch,0xe0ca9d,x,base+h,z,w+.18,.14,d+.18);
        box(batch,0xc99066,x,base+h-.25,z-d*.48,w,.42,.10);
      }
      return;
    }
    if(kind==='chair'){
      batch.add(disc,C.bronze,x,base+.14,z,w*.50,.26,d*.5);
      batch.add(ball,color,x,base+.39,z,w,.24,d);
      batch.add(ball,color,x+w*.39,base+.57,z,.17,.53,d);
      for(const side of [-1,1])batch.add(ball,color,x+.04,base+.50,z+side*d*.42,w*.77,.17,.11);
      return;
    }
    if(kind==='sofa'){
      box(batch,C.bronze,x,base+.13,z,w*.89,.19,d*.83);
      box(batch,color,x,base+.36,z,w,.34,d);
      box(batch,color,x,base+.63,z+d*.39,w,.56,.17);
      return;
    }
    if(kind==='slot'){
      box(batch,C.dark,x,mid,z,w,h,d);
      box(batch,0x243b4c,x,base+h*.69,z+d*.51,w*.79,h*.33,.055);
      for(let j=-1;j<=1;j++)box(batch,[0xeab77b,0x99d3c3,0xd2998b][j+1],x+j*w*.24,base+h*.70,z+d*.56,w*.16,.19,.03);
      box(batch,C.bronze,x,base+.82,z+d*.55,w,.09,.26);return;
    }
    if(['poker','table','dining'].includes(kind)){
      batch.add(disc,C.bronze,x,base+.38,z,.42,.74,.42);
      batch.add(disc,color,x,base+h-.065,z,w,.14,d);
      for(const sign of [-1,1])box(batch,C.green,x+sign*w*.31,base+.34,z+d*.75,.42,.37,.42);return;
    }
    box(batch,color,x,mid,z,w,h,d);
    if(kind==='bed'){
      box(batch,C.oak,x,base+.63,z-d*.48,w+.19,1.2,.13);box(batch,C.green,x,base+h+.015,z+d*.19,w,.036,.72);
      for(const s of [-1,1])box(batch,C.cream,x+s*w*.23,base+h+.07,z-d*.27,w*.39,.15,.45);
    }
    if(kind==='wardrobe'){
      const long=w>d,count=Math.ceil((long?w:d)/.19);
      for(let j=0;j<count;j++){
        const off=(j/count-.5)*(long?w:d);
        box(batch,0x805437,x+(long?off:0),mid,z+(long?0:off),long?.039:w+.015,h-.09,long?d+.015:.039);
      }
    }
    if(kind==='basin'||kind==='bath')box(batch,C.water,x,base+h+.008,z,w*.83,.025,d*.79);
  }
  function rug(x,y,z,w,d){
    box(stone,0xae784f,x,y+.014,z,w,.02,d);
    box(stone,0x22645d,x,y+.029,z,w-.12,.013,d-.12);
    for(const s of [-1,1])box(stone,0xd0a778,x+s*(w/2-.21),y+.038,z,.035,.006,d-.38);
  }
  function pendant(x,y,z,r){
    for(let j=0;j<9;j++){
      const a=j*2.4,xx=x+Math.cos(a)*r*(.55+.45*(j%2)),zz=z+Math.sin(a)*r,drop=.30+.24*(j%3);
      metal.beam(C.bronze,[xx,y,zz],[xx,y-drop,zz],.027);
      glow.add(ball,0xffdfaa,xx,y-drop-.12,zz,.24,.32,.24);
    }
  }
  for(const [n,y] of [[21,87.6],[22,92],[23,96.4]]){
    rug(-80.8,y,52.46,5.8,1.44);
    const z=51.9;
    for(const x of n===23?[-84.52,-75.82]:[-80.41,-77.99]){
      box(metal,C.bronze,x,y+1.64,z,.19,3.28,.15);
      box(glow,0xffdb97,x,y+1.61,z+.10,.045,2.8,.035);
    }
    sign(group,['S A L O N','O W N E R ’ S   S U I T E','S K Y   T E R R A C E'][n-21],-79.4,y+3.26,52.01,3.72);
    planter(-75.55,y,52.65,.45);
    planter(-86.75,y,50.05,.57);
    if(n<23){
      rug(-85.15,y,46.8,5.0,5.7);
      pendant(-84.7,y+3.98,46.1,1.0);
      // Reeded walnut panels and a framed fan relief face the living area.
      for(let i=0;i<24;i++)box(stone,i%3?0x956b4b:0x694b38,-85.9+i*.14,y+1.83,51.52,.112,3.66,.19);
      for(let j=0;j<15;j++){
        const a=(j-7)*.123;
        blade(metal,0xc79c5d,[-84.3,y+1.08,51.39],[-84.3+1.38*Math.sin(a),y+1.42+1.07*Math.cos(a),51.36],.25,[0,0,-1]);
      }
    }
  }
  rug(-83.5,87.6,38,5.8,3.9);pendant(-83.5,91.67,38,1.15);
  rug(-85.9,92,44.2,4.7,4.4);
  for(const x of [-87.78,-84.18]){
    metal.add(disc,C.bronze,x,93.0,42.65,.09,.70,.09);
    glow.add(disc,0xffdeb0,x,93.36,42.65,.46,.30,.46);
  }
  for(const z of [34,37.5,41]){
    box(stone,C.oak,-74.21,99.99,z,.33,.24,2.78);
  }
  // Teak slats on the terrace read at foot level and continue around the pool coping.
  for(let j=0;j<30;j++)box(stone,j%3?0x9c7251:0xa87b57,-73.83+j*.302,96.414,42.38,.289,.023,5.73);
  planter(-76.1,96.4,46.5,.78);
  const house=estateCollection(group,Batch,null,'palma');
  for(const [n,level] of resortLevels.entries()){
    if(n<21)continue;
    const y=level.y-.8;
    house.picture('palma',-81.8,y+1.76,51.53,2.00,1.21,-1,n===22?house.shell:house.harbor);
    house.picture('palma',-85.65,y+1.68,51.88,2.40,1.50,1,house.botanical);
    if(n===22)house.picture('palma',-86.1,y+2.03,39.04,2.18,1.35,-1,house.shell);
    if(n===21){
      house.objets('palma',{kind:'bar',x:-85.2,z:33.1,w:5.5,d:.95,bottom:y,h:y+1.06},'orchid');
      house.brassMobile('palma',-83.5,y+4.09,38,2.55);
    }
    for(const [x,z] of [[-82.4,49.8],[-76.4,50.0]]){
      house.furnish({kind:'planter',x,z,w:.83,d:.83,bottom:y,h:y+.64},'palma');
    }
  }
  // A carved back bar and a deep headboard give the two private rooms an interior elevation.
  for(const y of [87.6,96.4]){
    const z=y<90?32.44:33.55;
    box(stone,0x294e49,-85.0,y+1.89,z,5.57,3.46,.30);
    for(const height of [1.47,2.14,2.82]){
      box(metal,C.bronze,-85,y+height,z+.20,5.31,.069,.55);
      box(glow,0xffce8e,-85,y+height-.048,z+.34,5.14,.033,.038);
      for(let i=0;i<15;i++){
        if((i+Math.round(height*8))%4===0)continue;
        const x=-87.21+i*.31,h=.22+.05*(i%4),tint=[0x527c69,0xb97349,0xc6ad75,0x3d5962][i%4];
        metal.add(disc,tint,x,y+height+h/2+.05,z+.29,.12,h,.12);
        metal.add(disc,C.bronze,x,y+height+h+.087,z+.29,.051,.09,.051);
      }
    }
    for(const x of [-87.5,-85.83,-84.17,-82.5])box(metal,C.bronze,x,y+1.95,z+.12,.064,3.46,.41);
  }
  box(stone,0x665346,-86.02,93.18,42.13,4.28,2.34,.20);
  for(let j=0;j<17;j++){
    const h=1.40+.48*Math.sin(j/16*Math.PI);
    box(stone,j%2?0x526c61:0x658174,-87.94+j*.24,92+h/2,42.27,.232,h,.15);
  }
  box(metal,C.bronze,-86.02,94.32,42.16,4.34,.085,.24);
  for(const z of [40.2,46.4])planter(-87.47,87.60,z,.69);
  // Handrails leave the stepped swimming entry open and define it from the terrace.
  for(const x of [pool.x-1.36,pool.x+1.36]){
    metal.beam(C.bronze,[x,96.4,39.42],[x,97.12,39.38],.053);
    metal.beam(C.bronze,[x,97.12,39.38],[x,96.82,38.06],.053);
    metal.beam(C.bronze,[x,96.82,38.06],[x,96.12,38.03],.053);
  }
  const accents=[0xffc484,0xffe8be].map(tint=>{
    const lamp=new THREE.PointLight(tint,38,13,2);group.add(lamp);return lamp;
  });
  const interiorMeshes=[];
  for(const level of resortLevels){
    const furniture=new Batch();
    for(const p of level.parts){
      if(level.n>=21){
        const kind=({banquet:'dining',cocktail:'coffee'})[p.kind]??p.kind;
        if(['sofa','bed','coffee','dining'].includes(kind)){
          house.furnish({...p,kind,bottom:p.base-.8,h:p.base-.8+p.h},'palma');
          if(kind!=='dining')continue;
          for(const side of [-1,1])for(const u of [-1,0,1])
            house.furnish({kind:'chair',x:p.x+u*p.w*.30,z:p.z+side*(p.d/2+.26),w:.61,d:.60,h:p.base-.8+.93,bottom:p.base-.8,reverse:side<0},'palma');
          continue;
        }
      }
      const permanent=['slab','glass','rail','balustrade','stoneBand','jamb','poolBed'].includes(p.kind);
      renderPart(p,permanent?stone:furniture);
    }
    const mesh=furniture.mesh(group,stoneMat);if(mesh){mesh.name=level.name;interiorMeshes.push({mesh,y:level.y});}
  }
  const penthouseFurniture=house.finish();
  // The water surface sits over a stepped physical basin on L24.
  const waterTime={value:0};
  const poolMat=new THREE.ShaderMaterial({
    transparent:true,side:THREE.DoubleSide,depthWrite:false,uniforms:{clock:waterTime,sky:{value:panorama}},
    vertexShader:'varying vec3 wp;void main(){vec4 p=modelMatrix*vec4(position,1.);wp=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:`varying vec3 wp;uniform float clock;uniform sampler2D sky;
      void main(){vec2 p=wp.xz;float t=clock*.70;
        vec2 w=vec2(sin(p.x*3.7+t)+.5*sin(p.y*5.1-t),cos(p.y*3.2-t)+.42*cos(p.x*5.3+t));
        vec3 v=normalize(cameraPosition-wp),r=reflect(-v,normalize(vec3(w.x*.075,1.,w.y*.075)));
        vec3 env=texture2D(sky,vec2(.5+atan(r.x,r.z)*.159,clamp(.45+.38*r.y,.05,.95))).rgb;
        float f=pow(1.-abs(v.y),3.);
        vec2 cells=abs(sin(p*3.8+w*.29+t*.2));
        float c=pow(1.-min(cells.x,cells.y),9.);
        vec3 col=mix(vec3(.016,.25,.245)+c*.10,env,.23+f*.54);
        gl_FragColor=vec4(col,.40+.43*f);
        #include <colorspace_fragment>
      }`
  });
  const poolSheet=new THREE.Mesh(new THREE.PlaneGeometry(pool.w,pool.d).rotateX(-Math.PI/2),poolMat);
  poolSheet.position.set(pool.x,96.30,pool.z);group.add(poolSheet);
  stone.mesh(group,shellMat);metal.mesh(group,metalMat);glow.mesh(group,litMat,false);
  const updateGlass=panes.bind(glazing.mesh(group,windowMat,false));

  cube.dispose();disc.dispose();ball.dispose();
  let lastGlassEvent=-1,hadBrokenPanes=false;
  return (dt,local,doors)=>{
    const seq=doors?.glassSeq??0,damaged=!!doors?.brokenPanes;
    if(seq!==lastGlassEvent || damaged!==hadBrokenPanes){
      updateGlass(doors?.brokenPanes);lastGlassEvent=seq;hadBrokenPanes=damaged;
    }
    waterTime.value=(waterTime.value+dt)%8192;
    tickFountain(dt,local);fallMat.uniforms.time.value=(fallMat.uniforms.time.value+dt)%1200;
    const distance=Math.hypot(local.x+69,local.z-58);
    const topFloor=local.y>86 && local.y<101;
    const nearHall=local.x<-61 && local.x>-91 && local.z>31 && local.z<55 && local.y<10;
    for(const lamp of accents)lamp.visible=distance<48 && (topFloor||nearHall);
    if(topFloor){
      const floor=local.y>94.8?96.4:local.y>91.2?92:87.6;
      accents[0].position.set(-84.3,floor+2.9,45.2);accents[1].position.set(-78.6,floor+2.45,50.7);
    }else if(nearHall){
      accents[0].position.set(-82.8,6.30,44.2);accents[1].position.set(-68,5.65,44);
    }
    penthouseFurniture.visible=distance<130 && local.y>76;
    sheets.visible=distance<95;
    for(const {mesh,y} of interiorMeshes)mesh.visible=distance<86 && (y<22 || Math.abs(local.y-y)<7.8);
  };
}
