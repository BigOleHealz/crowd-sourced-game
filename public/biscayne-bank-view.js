import * as THREE from 'three';

const green=0x194d48,teal=0x32766a,bronze=0xad8755,ivory=0xe6d9b7;
const stone=0xcfc2a5,oak=0x825935,ink=0x34413e;

// Brickell branch fixtures share one architectural mesh, one printed sign
// atlas, and separate small batches for the two reversible encounter props.
export function bankFrontage(scene,Batch){
  const group=new THREE.Group();group.name='Biscayne Mutual Bank';scene.add(group);
  const batch=new Batch(),cube=new THREE.BoxGeometry(),cylinder=new THREE.CylinderGeometry(1,1,1,16);
  const box=(c,x,y,z,w,h,d)=>batch.add(cube,c,x,y,z,w,h,d);
  const post=(c,x,y,z,r,h)=>batch.add(cylinder,c,x,y,z,r,h,r);
  // Ribbed limestone piers and a deep brass-edged fascia frame the door.
  for(const sign of [-1,1]){
    const x=-20+sign*2.48;
    box(stone,x,2.04,-39.15,.34,2.47,.32);
    for(let i=-1;i<=1;i++)box(0xbbaa8c,x+i*.077,2.08,-39.316,.024,2.28,.014);
    box(green,x,.96,-39.19,.39,.32,.38);
    box(ivory,x,3.26,-39.20,.45,.18,.41);
    box(bronze,x,2.43,-39.36,.12,.42,.11);
    box(0xffe7b7,x,2.43,-39.425,.078,.30,.026);
  }
  box(bronze,-20,3.91,-39.28,5.52,1.04,.45);
  box(green,-20,3.91,-39.51,5.38,.93,.04);
  box(green,-20,3.33,-39.56,5.53,.14,1.08);
  box(bronze,-20,3.335,-40.10,5.53,.09,.034);
  for(const x of [-21.75,-20,-18.25]){
    box(0x374b46,x,3.25,-39.71,.29,.028,.18);
    box(0xffe7b6,x,3.228,-39.71,.23,.015,.13);
  }
  // Double-faced projecting sign can be read along the sidewalk.
  box(bronze,-22.87,4.82,-39.55,.093,.093,1.03);
  box(bronze,-22.87,4.02,-39.99,.15,1.55,.68);
  // Honed stone panel joints follow the frontage out to both building corners.
  for(const side of [-1,1]){
    const center=-20+side*4.47;
    box(stone,center,2.48,-39.06,3.33,3.34,.08);
    box(0xb2a78d,center,.94,-39.12,3.33,.24,.13);
    box(0xab987b,center,4.13,-39.11,3.34,.062,.11);
    for(let row=0;row<4;row++){
      const y=1.13+row*.73;
      box(0xb5a88b,center,y,-39.109,3.32,.013,.014);
      for(const dx of row%2?[-.96,.59]:[-.57,1.02])box(0xb5a88b,center+dx,y+.36,-39.109,.011,.72,.014);
    }
  }
  // Full-width front desk and two framed service bays. The opening over the
  // desk keeps the teller's face and the offered envelope in clear view.
  box(oak,-20,1.29,-34.87,4.60,.88,.54);
  box(0x453d34,-20,.89,-34.89,4.48,.13,.53);
  box(ivory,-20,1.803,-34.88,4.68,.074,.63);
  box(green,-20,1.68,-35.15,4.58,.15,.035);
  for(let i=0;i<36;i++)box(i%3===0?0xb18d61:0x9c7754,-22.21+i*.126,1.27,-35.16,.029,.60,.024);
  for(const x of [-22.24,-20.94,-17.78])box(bronze,x,2.56,-34.89,.046,1.43,.055);
  box(green,-20,3.22,-34.89,4.54,.16,.096);
  box(0xf5dda5,-20,3.13,-34.88,4.48,.018,.04);
  for(const x of [-21.66,-18.66]){
    box(ink,x,1.99,-34.64,.056,.31,.085);
    box(ink,x,2.14,-34.64,.43,.28,.052);
    box(0x97b9b2,x,2.14,-34.608,.39,.238,.006);
    box(0x454c4a,x,1.854,-34.46,.40,.025,.15);
  }
  box(bronze,-20.68,1.90,-35.12,.40,.10,.065);
  // Suspended warm-white task lights articulate the service area without
  // adding shadow-casting lights to the shared scene.
  for(const x of [-21.51,-18.60]){
    post(bronze,x,3.57,-35.85,.012,.37);
    post(bronze,x,3.36,-35.85,.18,.066);
    post(0xffe8b8,x,3.315,-35.85,.155,.035);
  }
  // Fitted oak back wall, lit seal, and a deposit-slip rack at the writing desk.
  box(0x8f7355,-20,2.28,-32.91,5.02,2.87,.15);
  box(green,-20,2.38,-33.01,3.45,1.74,.085);
  for(const x of [-22.13,-17.87]){
    for(let j=0;j<5;j++)box(oak,x+(j-2)*.10,2.29,-33.016,.032,2.76,.05);
    box(bronze,x,2.60,-33.05,.091,.64,.08);
    box(0xffe4ac,x,2.60,-33.10,.055,.51,.022);
  }
  box(oak,-22.42,1.74,-35.02,.265,1.82,1.61);
  for(let row=0;row<3;row++){
    box(bronze,-22.25,1.37+row*.38,-35.02,.11,.075,1.51);
    for(let n=0;n<4;n++)box([teal,ivory,0xb78b6d,0x88a29d][n],-22.26,1.50+row*.38,-35.58+n*.37,.032,.23,.235);
  }
  // Short queue rail on the west side leaves the center aisle open.
  for(const z of [-36.84,-35.61]){
    post(ink,-20.91,.85,z,.115,.045);
    post(bronze,-20.91,1.17,z,.025,.65);
    post(ink,-20.91,1.52,z,.053,.11);
  }
  box(0x405452,-20.91,1.51,-36.23,.018,.059,1.22);
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
      bool counter=bankPos.z>-35.19 && bankPos.z<-34.52 && bankPos.y>.97 && bankPos.y<1.62;
      bool back=bankPos.z>-33.06 && bankPos.z<-32.79;
      if(counter || back)diffuseColor.rgb*=.69+.82*texture2D(bankWood,uv*vec2(.66,.36)).rgb;
      else if(bankPos.z<-39.01 || (bankPos.y>1.76 && bankPos.y<1.85))
        diffuseColor.rgb*=.77+.53*texture2D(bankStone,uv*.82).rgb;`);
  };
  batch.mesh(group,finish,false);
  const partitions=new Batch();
  for(const [x,w] of [[-22.02,.45],[-18.04,.50]]){
    partitions.add(cube,0xbeddd5,x,2.45,-34.88,w,1.20,.018);
  }
  partitions.mesh(group,new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.19,depthWrite:false}),false);

  // Print every sign on one atlas and combine their geometry in one draw call.
  const atlas=document.createElement('canvas');atlas.width=1024;atlas.height=512;
  const ctx=atlas.getContext('2d'),paper='#f5e7bd',gold='#d1ae73',dark='#214b45';
  const lettering=(str,x,y,size,family='Georgia',color=paper)=>{
    ctx.fillStyle=color;ctx.font=size+'px '+family;ctx.textAlign='center';ctx.fillText(str,x,y);
  };
  function seal(x,y,r){
    ctx.save();ctx.translate(x,y);ctx.lineWidth=r*.065;ctx.strokeStyle=gold;
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-r*.64,-r*.20);ctx.lineTo(0,-r*.56);ctx.lineTo(r*.64,-r*.20);ctx.closePath();ctx.stroke();
    for(const offset of [-.40,0,.40])ctx.fillRect(offset*r-r*.05,-r*.11,r*.10,r*.49);
    ctx.fillRect(-r*.6,r*.44,r*1.2,r*.09);ctx.restore();
  }
  ctx.fillStyle=dark;ctx.fillRect(0,0,1024,512);
  ctx.fillStyle=gold;seal(109,103,68);
  lettering('BISCAYNE MUTUAL',595,88,72);
  lettering('B A N K',594,163,65,'sans-serif');
  ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.strokeRect(7,8,1009,190);
  ctx.fillStyle=gold;seal(131,314,58);
  lettering('BISCAYNE MUTUAL',518,302,44);
  lettering('MEMBER SERVICES',518,345,25,'sans-serif');
  for(const [i,ch] of [...'BANK'].entries())lettering(ch,953,259+i*71,66,'sans-serif');
  lettering('02    SERVICES',150,466,30,'sans-serif');
  lettering('01    TELLER',578,466,43,'sans-serif');
  ctx.fillStyle='#a48b62';ctx.fillRect(10,373,260,47);
  lettering('ELENA CRUZ',140,407,30,'sans-serif','#242e2a');
  const signs=new Batch(true);
  function sign(x,y,z,w,h,side,px,py,pw,ph){
    const plane=new THREE.PlaneGeometry();
    const uv=plane.attributes.uv.clone();
    for(let i=0;i<uv.count;i++)uv.setXY(i,(px+.5+(pw-1)*uv.getX(i))/1024,1-(py+.5+(ph-1)*(1-uv.getY(i)))/512);
    plane.setAttribute('batchUv',uv);signs.add(plane,0xffffff,x,y,z,w,h,1,0,side);
    plane.dispose();
  }
  sign(-20,3.91,-39.54,5.28,.89,Math.PI,0,0,1024,203);
  sign(-20,2.65,-33.057,3.02,.64,Math.PI,25,232,820,139);
  sign(-21.64,3.22,-34.944,.92,.13,Math.PI,17,426,265,63);
  sign(-19.31,3.22,-34.944,1.46,.13,Math.PI,297,426,559,63);
  sign(-20.68,1.90,-35.158,.393,.085,Math.PI,10,373,260,47);
  for(const side of [-1,1])sign(-22.87+side*.080,4.02,-39.99,.64,1.49,side*Math.PI/2,903,200,99,301);
  const map=new THREE.CanvasTexture(atlas);map.colorSpace=THREE.SRGBColorSpace;
  signs.mesh(group,new THREE.MeshBasicMaterial({map}),false);

  const parcel=new Batch();
  parcel.add(cube,0xd4ad70,0,0,0,.34,.09,.21);
  parcel.add(cube,ivory,0,.049,0,.34,.012,.208);
  parcel.add(cube,teal,0,.052,0,.057,.018,.212);
  const envelope=parcel.mesh(group,new THREE.MeshLambertMaterial({vertexColors:true}),false);
  envelope.name='Cash envelope';envelope.position.set(-20.46,1.89,-34.98);
  const lenses=new Batch();
  for(const [x,y,z] of [[-21.98,3.05,-39.36],[-17.91,3.02,-33.15]]){
    lenses.add(cylinder,0xffffff,x,y,z,.090,.14,.090);
    lenses.add(cylinder,0xffffff,x,y+.072,z,.063,.025,.063);
  }
  const signal=new THREE.MeshBasicMaterial({color:0xa33930});
  lenses.mesh(group,signal,false);cube.dispose();cylinder.dispose();
  return (doors,bank,tick=0)=>{
    group.visible=!doors?.collapsedTowers?.includes(3);
    const active=bank?.phase==='alarm'||bank?.phase==='handoff';
    signal.color.setHex(active?(Math.floor(tick/13)%2?0xff4937:0xef8e69):0x803b31);
    envelope.visible=bank?.phase==='handoff';
    if(envelope.visible)envelope.position.z=-34.75-.31*Math.min(1,Math.max(0,(tick-bank.since)/15));
  };
}
