import {bankSite,bankFront} from './bank-site.js';
import * as THREE from 'three';

const green=0x194d48,teal=0x32766a,bronze=0xad8755,ivory=0xe6d9b7;
const stone=0xcfc2a5,oak=0x825935,ink=0x34413e;

// Brickell branch fixtures share one architectural mesh, one printed sign
// atlas, and separate small batches for the two reversible encounter props.
export function bankFrontage(scene,Batch){
  const group=new THREE.Group();group.name='Biscayne Mutual Bank';group.position.set(bankSite.x,0,bankFront);scene.add(group);
  const batch=new Batch(),cube=new THREE.BoxGeometry(),cylinder=new THREE.CylinderGeometry(1,1,1,16);
  const box=(c,x,y,z,w,h,d)=>batch.add(cube,c,x,y,z,w,h,d);
  const post=(c,x,y,z,r,h)=>batch.add(cylinder,c,x,y,z,r,h,r);
  const half=bankSite.w/2,depth=bankSite.d;
  // Single-storey banking hall, with solid side wings and a recessed central lobby.
  box(0xc6b89e,0,.81,depth/2,bankSite.w+.26,.035,depth+.24);
  box(0xe3d8bf,0,3.93,depth/2,bankSite.w,.32,depth);
  box(stone,0,4.44,depth/2,bankSite.w,.72,depth);
  box(0x8a8170,0,4.85,depth/2,bankSite.w+.38,.11,depth+.40);
  box(stone,0,2.54,depth-.12,bankSite.w,3.46,.24);
  const wing=(bankSite.w-5.32)/2;
  for(const side of [-1,1])box(stone,side*(half-wing/2),2.50,.12,wing,3.40,.24);
  for(const side of [-1,1]){
    box(stone,side*(half-.13),2.52,depth/2,.26,3.42,depth);
    box(0xb1a084,side*(half-.05),1.04,depth/2,.29,.45,depth);
    box(ivory,side*half,4.49,depth/2,.25,.25,depth+.19);
    // Bronze-grilled clerestories sit between the pilasters on each flank.
    for(const v of [depth*.28,depth*.72]){
      const face=side*(half+.025);
      box(bronze,face,2.88,v,.08,1.69,2.42);
      box(0x394d4b,face+side*.048,2.88,v,.038,1.48,2.24);
      for(const offset of [-.74,0,.74]){
        box(0x78918b,face+side*.072,2.88,v+offset,.017,1.36,.65);
        box(0xbba477,face+side*.092,2.88,v+offset,.023,.055,.66);
      }
      box(ivory,face+side*.061,2.01,v,.28,.13,2.58);
    }
    for(const v of [.53,depth*.5,depth-.52]){
      box(ivory,side*half,2.67,v,.26,3.24,.49);
      box(bronze,side*(half+.15),3.89,v,.045,.19,.52);
    }
  }
  // The bronze brackets run into a stone pier above the roofline.
  box(stone,-3.73,5.48,.22,.55,1.75,.60);
  box(ivory,-3.73,6.38,.22,.66,.10,.70);
  // Ribbed limestone piers and a deep brass-edged fascia frame the door.
  for(const sign of [-1,1]){
    const x=sign*2.48;
    box(stone,x,2.04,-0.15,.34,2.47,.32);
    for(let i=-1;i<=1;i++)box(0xbbaa8c,x+i*.077,2.08,-0.316,.024,2.28,.014);
    box(green,x,.96,-0.19,.39,.32,.38);
    box(ivory,x,3.26,-0.2,.45,.18,.41);
    box(bronze,x,2.43,-0.36,.12,.42,.11);
    box(0xffe7b7,x,2.43,-0.425,.078,.30,.026);
  }
  // A continuous limestone cornice and a stepped, bronze-edged parapet give
  // the entrance a silhouette above the flat roof.
  box(0xb7a689,0,4.54,-0.19,12.64,.28,.40);
  box(ivory,0,4.72,-0.28,12.82,.14,.54);
  box(bronze,0,4.81,-0.32,12.83,.039,.55);
  box(stone,0,4.98,-0.18,6.30,.43,.39);
  box(ivory,0,5.19,-0.2,5.69,.105,.42);
  for(const side of [-1,1]){
    const x=side*5.96;
    box(stone,x,2.75,-0.19,.55,3.48,.29);
    box(ivory,x,4.47,-0.22,.70,.22,.42);
    box(0x7f8172,x,.99,-0.22,.71,.42,.39);
    for(const dx of [-.14,0,.14])box(0xb2a389,x+dx,2.72,-0.35,.035,2.91,.028);
  }
  box(bronze,0,3.95,-0.31,11.43,1.10,.50);
  box(green,0,3.95,-0.575,11.29,1.00,.05);
  box(green,0,3.32,-0.59,6.03,.14,1.11);
  box(bronze,0,3.33,-1.16,6.04,.08,.044);
  for(const x of [-1.98,0,1.98]){
    box(0x374b46,x,3.24,-0.78,.32,.028,.19);
    box(0xffe7b6,x,3.22,-0.78,.25,.016,.14);
  }
  // A cantilever carries lettering across the line of travel on both sides.
  // Its bottom is above vehicle and pedestrian clearance.
  const bladeX=-3.73,bladeZ=-1.95,bladeY=5.86;
  for(const y of [5.23,6.51]){
    box(bronze,bladeX,y,-0.53,.23,.12,1.22);
    box(0x6f7667,bladeX,y,-0.16,.48,.30,.21);
  }
  box(bronze,bladeX,bladeY,bladeZ,.23,1.64,3.58);
  box(green,bladeX,bladeY,bladeZ,.254,1.52,3.47);
  box(ivory,bladeX,6.69,bladeZ,.31,.075,3.65);
  box(bronze,bladeX,5.02,bladeZ,.30,.075,3.64);
  // The ATM is shallow enough to sit in the existing solid wall. Its recess,
  // privacy cheeks and illuminated screen read without a freestanding obstacle.
  const atmX=3.9;
  box(bronze,atmX,1.96,-0.126,1.65,2.29,.14);
  box(green,atmX,1.97,-0.208,1.54,2.18,.06);
  box(0x273633,atmX,1.87,-0.258,1.16,1.66,.065);
  box(0x74827d,atmX,1.79,-0.298,.97,1.31,.046);
  for(const side of [-1,1])box(0x465553,atmX+side*.50,1.88,-0.333,.07,1.20,.12);
  box(0x203231,atmX,2.07,-0.331,.64,.42,.045);
  box(0x9ccdc3,atmX,2.07,-0.359,.54,.31,.018);
  box(0x354540,atmX,1.47,-0.35,.60,.10,.069);
  box(0xc1bfaa,atmX,1.60,-0.369,.55,.052,.085);
  for(const x of [-.11,0,.11])for(const y of [1.75,1.80])box(0x465451,atmX+x,y,-0.334,.059,.030,.038);
  box(bronze,atmX,2.89,-0.31,1.73,.085,.40);
  // Honed stone panel joints follow the frontage out to both building corners.
  for(const side of [-1,1]){
    const center=side*4.47;
    box(stone,center,2.48,-0.06,3.33,3.34,.08);
    box(0xb2a78d,center,.94,-0.12,3.33,.24,.13);
    box(0xab987b,center,4.13,-0.11,3.34,.062,.11);
    for(let row=0;row<4;row++){
      const y=1.13+row*.73;
      box(0xb5a88b,center,y,-0.109,3.32,.013,.014);
      for(const dx of row%2?[-.96,.59]:[-.57,1.02])box(0xb5a88b,center+dx,y+.36,-0.109,.011,.72,.014);
    }
  }
  // Full-width front desk and two framed service bays. The opening over the
  // desk keeps the teller's face and the offered envelope in clear view.
  box(oak,0,1.29,4.13,4.60,.88,.54);
  box(0x453d34,0,.89,4.11,4.48,.13,.53);
  box(ivory,0,1.803,4.12,4.68,.074,.63);
  box(green,0,1.68,3.85,4.58,.15,.035);
  for(let i=0;i<36;i++)box(i%3===0?0xb18d61:0x9c7754,-2.21+i*.126,1.27,3.84,.029,.60,.024);
  for(const x of [-2.24,-0.94,2.22])box(bronze,x,2.56,4.11,.046,1.43,.055);
  box(green,0,3.22,4.11,4.54,.16,.096);
  box(0xf5dda5,0,3.13,4.12,4.48,.018,.04);
  for(const x of [-1.66,1.34]){
    box(ink,x,1.99,4.36,.056,.31,.085);
    box(ink,x,2.14,4.36,.43,.28,.052);
    box(0x97b9b2,x,2.14,4.392,.39,.238,.006);
    box(0x454c4a,x,1.854,4.54,.40,.025,.15);
  }
  box(bronze,-0.68,1.90,3.88,.40,.10,.065);
  // Suspended warm-white task lights articulate the service area without
  // adding shadow-casting lights to the shared scene.
  for(const x of [-1.51,1.4]){
    post(bronze,x,3.57,3.15,.012,.37);
    post(bronze,x,3.36,3.15,.18,.066);
    post(0xffe8b8,x,3.315,3.15,.155,.035);
  }
  // Fitted oak back wall, lit seal, and a deposit-slip rack at the writing desk.
  box(0x8f7355,0,2.28,6.09,5.02,2.87,.15);
  box(green,0,2.38,5.99,3.45,1.74,.085);
  for(const x of [-2.13,2.13]){
    for(let j=0;j<5;j++)box(oak,x+(j-2)*.10,2.29,5.984,.032,2.76,.05);
    box(bronze,x,2.60,5.95,.091,.64,.08);
    box(0xffe4ac,x,2.60,5.9,.055,.51,.022);
  }
  box(oak,-2.42,1.74,3.98,.265,1.82,1.61);
  for(let row=0;row<3;row++){
    box(bronze,-2.25,1.37+row*.38,3.98,.11,.075,1.51);
    for(let n=0;n<4;n++)box([teal,ivory,0xb78b6d,0x88a29d][n],-2.26,1.50+row*.38,3.42+n*.37,.032,.23,.235);
  }
  // Short queue rail on the west side leaves the center aisle open.
  for(const z of [2.16,3.39]){
    post(ink,-0.91,.85,z,.115,.045);
    post(bronze,-0.91,1.17,z,.025,.65);
    post(ink,-0.91,1.52,z,.053,.11);
  }
  box(0x405452,-0.91,1.51,2.77,.018,.059,1.22);
  const finish=new THREE.MeshLambertMaterial({vertexColors:true});
  const loader=new THREE.TextureLoader(),woodGrain=loader.load('./storefront-oak.webp'),limestone=loader.load('./avenue-limestone.webp');
  for(const texture of [woodGrain,limestone]){
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;
  }
  finish.onBeforeCompile=shader=>{
    shader.uniforms.bankWood={value:woodGrain};shader.uniforms.bankStone={value:limestone};
    shader.vertexShader='varying vec3 bankPos,bankNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nbankPos=position;bankNormal=normal;');
    shader.fragmentShader='uniform sampler2D bankWood,bankStone;varying vec3 bankPos,bankNormal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 n=abs(normalize(bankNormal));vec2 uv=n.y>.6?bankPos.xz:n.x>.6?bankPos.zy:bankPos.xy;
      bool counter=bankPos.z>3.81 && bankPos.z<4.48 && bankPos.y>.97 && bankPos.y<1.62;
      bool back=bankPos.z>5.94 && bankPos.z<6.21;
      if(counter || back)diffuseColor.rgb*=.69+.82*texture2D(bankWood,uv*vec2(.66,.36)).rgb;
      else if(bankPos.z<-0.01 || (bankPos.y>1.76 && bankPos.y<1.85))
        diffuseColor.rgb*=.77+.53*texture2D(bankStone,uv*.82).rgb;`);
  };
  batch.mesh(group,finish,false);
  const partitions=new Batch();
  for(const [x,w] of [[-2.02,.45],[1.96,.50]]){
    partitions.add(cube,0xbeddd5,x,2.45,4.12,w,1.20,.018);
  }
  partitions.mesh(group,new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.19,depthWrite:false}),false);

  // Print every sign on one atlas and combine their geometry in one draw call.
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=1024;
  const ctx=atlas.getContext('2d'),paper='#f5e7bd',gold='#d1ae73',dark='#214b45';
  const lettering=(str,x,y,size,family='Georgia',color=paper,weight='normal')=>{
    ctx.fillStyle=color;ctx.font=weight+' '+size+'px '+family;ctx.textAlign='center';ctx.fillText(str,x,y);
  };
  function seal(x,y,r){
    ctx.save();ctx.translate(x,y);ctx.lineWidth=r*.065;ctx.strokeStyle=gold;
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-r*.64,-r*.20);ctx.lineTo(0,-r*.56);ctx.lineTo(r*.64,-r*.20);ctx.closePath();ctx.stroke();
    for(const offset of [-.40,0,.40])ctx.fillRect(offset*r-r*.05,-r*.11,r*.10,r*.49);
    ctx.fillRect(-r*.6,r*.44,r*1.2,r*.09);ctx.restore();
  }
  ctx.fillStyle=dark;ctx.fillRect(0,0,atlas.width,atlas.height);
  // Matching artwork across the fascia and the blade. Faces have their own
  // correctly oriented UVs so drivers on both approaches read left to right.
  ctx.fillStyle=gold;seal(60,51,38);
  lettering('BISCAYNE MUTUAL',410,70,64,'Georgia',paper);
  ctx.fillStyle=gold;ctx.fillRect(720,16,2,70);
  lettering('BANK',871,77,80,'Arial','#fff8dc','bold');
  ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.strokeRect(6,4,1012,94);
  ctx.fillStyle='#153a37';ctx.fillRect(0,520,1024,370);
  ctx.strokeStyle='#cbb38a';ctx.lineWidth=6;ctx.strokeRect(12,532,1000,346);
  lettering('BANK',512,802,274,'Arial','#fff8dc','bold');
  ctx.fillStyle='#16443e';ctx.fillRect(0,903,440,115);
  lettering('ATM',220,994,90,'Arial','#fff5d3','bold');
  ctx.fillStyle=gold;seal(131,314,58);
  lettering('BISCAYNE MUTUAL',518,302,44);
  lettering('MEMBER SERVICES',518,345,25,'sans-serif');
  lettering('02    SERVICES',150,466,30,'sans-serif');
  lettering('01    TELLER',578,466,43,'sans-serif');
  ctx.fillStyle='#a48b62';ctx.fillRect(10,373,260,47);
  lettering('ELENA CRUZ',140,407,30,'sans-serif','#242e2a');
  const signs=new Batch(true);
  function sign(x,y,z,w,h,side,px,py,pw,ph){
    const plane=new THREE.PlaneGeometry();
    const uv=plane.attributes.uv.clone();
    for(let i=0;i<uv.count;i++)uv.setXY(i,(px+.5+(pw-1)*uv.getX(i))/atlas.width,1-(py+.5+(ph-1)*(1-uv.getY(i)))/atlas.height);
    plane.setAttribute('batchUv',uv);signs.add(plane,0xffffff,x,y,z,w,h,1,0,side);
    plane.dispose();
  }
  sign(0,3.95,-0.606,11.17,.96,Math.PI,0,0,1024,102);
  sign(0,2.65,5.943,3.02,.64,Math.PI,25,232,820,139);
  sign(-1.64,3.22,4.056,.92,.13,Math.PI,17,426,265,63);
  sign(0.69,3.22,4.056,1.46,.13,Math.PI,297,426,559,63);
  sign(-0.68,1.90,3.842,.393,.085,Math.PI,10,373,260,47);
  for(const side of [-1,1])sign(bladeX+side*.130,bladeY,bladeZ,3.43,1.49,side*Math.PI/2,0,520,1024,370);
  sign(atmX,2.71,-.37,1.40,.28,Math.PI,0,903,440,115);
  const map=new THREE.CanvasTexture(atlas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  signs.mesh(group,new THREE.MeshBasicMaterial({map}),false);

  const parcel=new Batch();
  parcel.add(cube,0xd4ad70,0,0,0,.34,.09,.21);
  parcel.add(cube,ivory,0,.049,0,.34,.012,.208);
  parcel.add(cube,teal,0,.052,0,.057,.018,.212);
  const envelope=parcel.mesh(group,new THREE.MeshLambertMaterial({vertexColors:true}),false);
  envelope.name='Cash envelope';envelope.position.set(-0.46,1.89,4.02);
  const lenses=new Batch();
  for(const [x,y,z] of [[-1.98,3.05,-0.36],[2.09,3.02,5.85]]){
    lenses.add(cylinder,0xffffff,x,y,z,.090,.14,.090);
    lenses.add(cylinder,0xffffff,x,y+.072,z,.063,.025,.063);
  }
  const signal=new THREE.MeshBasicMaterial({color:0xa33930});
  lenses.mesh(group,signal,false);cube.dispose();cylinder.dispose();
  return (doors,bank,tick=0)=>{
    group.visible=!doors?.collapsedTowers?.includes(bankSite.towerId);
    const active=bank?.phase==='alarm'||bank?.phase==='handoff';
    signal.color.setHex(active?(Math.floor(tick/13)%2?0xff4937:0xef8e69):0x803b31);
    envelope.visible=bank?.phase==='handoff';
    if(envelope.visible)envelope.position.z=4.25-.31*Math.min(1,Math.max(0,(tick-bank.since)/15));
  };
}
