import * as THREE from 'three';
import {hotel,hotelPanels} from './maravela-hotel.js';

// Both marquees, the reception joinery and the bell cart share one static
// architectural mesh. Only the two pairs of glazed leaves move.
export function maravelaHotelView(scene,Batch,doorWidth,floor){
  const batch=new Batch(),cube=new THREE.BoxGeometry(),column=new THREE.CylinderGeometry(1,1,1,18);
  const orb=new THREE.SphereGeometry(1,16,10),rim=new THREE.TorusGeometry(1,.075,8,32);
  const emerald=0x24473e,walnut=0x72513b,flute=0x987455,brass=0xbd975e;
  const champagne=0xe0c69b,cream=0xd4c5a9,ebony=0x363c37,ivory=0xe9ddc1;
  const box=(c,x,y,z,w,h,d)=>batch.add(cube,c,x,floor+y,z,w,h,d);
  const cylinder=(c,x,y,z,r,h)=>batch.add(column,c,x,floor+y,z,r,h,r);
  const ball=(c,x,y,z,w,h,d)=>batch.add(orb,c,x,floor+y,z,w,h,d);
  // A small shared sign atlas supplies crisp brass lettering and original
  // coastal illustrations without loading fonts or separate sign files.
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
  const ctx=canvas.getContext('2d');
  function panel(row,ground,draw){
    const y=row*128;ctx.save();ctx.translate(0,y);ctx.fillStyle=ground;ctx.fillRect(0,0,1024,128);draw();ctx.restore();
  }
  function label(words,size,y,color,font='Georgia'){
    ctx.fillStyle=color;ctx.font=size+'px '+font;ctx.textAlign='center';ctx.fillText(words,512,y);
  }
  panel(0,'#233d34',()=>{
    ctx.strokeStyle='#aa905f';ctx.lineWidth=2;ctx.strokeRect(9,7,1006,114);
    label('H O T E L',23,36,'#ead9aa','Arial');label('M A R A V E L A',71,105,'#efddb6');
    for(const x of [88,936]){ctx.strokeStyle='#b29c6e';ctx.beginPath();ctx.moveTo(x-31,65);ctx.lineTo(x,43);ctx.lineTo(x+31,65);ctx.lineTo(x,87);ctx.closePath();ctx.stroke();}
  });
  panel(1,'#28453d',()=>{label('M A R A V E L A',45,62,'#e7d1a4');label('R E C E P T I O N',26,104,'#d4b47b','Arial');});
  for(const [row,title] of [[2,'W A T E R F R O N T   E X I T'],[3,'C I T Y   E X I T']])
    panel(row,'#33483b',()=>label(title,50,83,'#ead8b1','Arial'));
  panel(4,'#ddcba9',()=>{
    ctx.fillStyle='#c39b6a';ctx.beginPath();ctx.arc(746,42,30,0,Math.PI*2);ctx.fill();
    for(const [y,c] of [[68,'#91ada5'],[85,'#598b85'],[101,'#365e60']]){
      ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(0,128);for(let x=0;x<=1024;x+=4)ctx.lineTo(x,y+Math.cos(x/104+y)*8+Math.sin(x/63)*4);ctx.lineTo(1024,128);ctx.fill();
    }
    ctx.strokeStyle='#485c47';ctx.lineWidth=4;
    for(const [x,y,h] of [[139,95,59],[213,82,47],[889,101,70]]){
      ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+10,y-h*.6,x-4,y-h);ctx.stroke();
      for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(x-4,y-h);ctx.quadraticCurveTo(x+i*9,y-h-14+Math.abs(i)*2,x+i*16,y-h+Math.abs(i)*3);ctx.stroke();}
    }
  });
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const signMat=new THREE.MeshBasicMaterial({map:tex});
  function sign(row,x,y,z,w,h,yaw){
    const plane=new THREE.PlaneGeometry(w,h),uv=plane.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,1-(row+1)/8+uv.getY(i)/8);
    const mesh=new THREE.Mesh(plane,signMat);mesh.position.set(x,floor+y,z);mesh.rotation.y=yaw;scene.add(mesh);
  }
  const glass=new THREE.MeshBasicMaterial({color:0x9bc5bc,transparent:true,opacity:.19,depthWrite:false,side:THREE.DoubleSide});
  const framing=new THREE.MeshBasicMaterial({vertexColors:true}),moving=[];
  for(const front of hotel.fronts){
    const {z,side}=front,x=hotel.x,face=z+side*.97;
    // The projecting brass-edged canopy and lit bronze sconces mark each entrance.
    box(emerald,x,2.85,z+side*.44,4.63,.48,1.06);
    box(brass,x,3.12,z+side*.44,4.72,.065,1.11);
    box(brass,x,2.585,z+side*.44,4.72,.056,1.11);
    sign(0,x,2.85,face+side*.008,4.55,.46,side>0?0:Math.PI);
    for(const u of [-1.98,1.98]){
      box(ebony,x+u,1.82,z+side*.23,.22,.72,.18);
      cylinder(champagne,x+u,1.82,z+side*.34,.082,.57);
      for(const dy of [-.29,.29])cylinder(brass,x+u,1.82+dy,z+side*.34,.101,.05);
    }
    for(let i=-5;i<=5;i++)box(walnut,x+i*.405,2.55,z+side*.43,.027,.028,.97);
    for(const u of [-1.19,1.19])cylinder(ivory,x+u,2.52,z+side*.46,.061,.018);
    // Two glazed sliders share the authoritative trigger and width.
    const pair=hotelPanels(front,0,doorWidth).map((p,i)=>{
      const group=new THREE.Group();group.position.set(p.x,floor,p.z);
      const pane=new THREE.Mesh(cube,glass);pane.position.y=1.105;pane.scale.set(p.w,2.21,.015);
      group.add(pane);
      const rails=new Batch(),edge=(x,y,w,h,d)=>rails.add(cube,0x967a52,x,y,0,w,h,d);
      for(const s of [-1,1])edge(s*(p.w/2-.014),1.105,.028,2.21,.032);
      for(const y of [.063,1.01,2.19])edge(0,y,p.w,.034,.033);
      edge((i===0?1:-1)*p.w*.32,1.16,.026,.18,.048);
      rails.mesh(group,framing,false);
      scene.add(group);return group;
    });
    moving.push({front,pair,old:-1});
    sign(side<0?2:3,x,2.32,z-side*.22,1.40,.175,side<0?0:Math.PI);
  }
  // Burgundy carpet keeps the center aisle legible from either entrance.
  box(0x815b46,hotel.x,.007,hotel.z,1.42,.012,7.88);
  for(const sign of [-1,1]){
    box(0xbda071,hotel.x+sign*.63,.016,hotel.z,.022,.006,7.88);
    box(0xa18259,hotel.x+sign*.59,.016,hotel.z,.009,.006,7.88);
  }
  const {desk,cart}=hotel;
  box(ebony,desk.x,.10,desk.z,.73,.17,1.74);
  box(walnut,desk.x,.52,desk.z,.76,.76,1.78);
  for(let j=-9;j<=9;j++)box(flute,desk.x-.393,.55,desk.z+j*.089,.033,.67,.029);
  box(cream,desk.x,.95,desk.z,desk.w,.12,desk.d);
  box(brass,desk.x-.403,.879,desk.z,.034,.031,1.82);
  // Computer, leather writing pad and polished handbell face the guest.
  cylinder(ebony,desk.x+.04,1.06,desk.z-.49,.082,.092);
  box(ebony,desk.x+.05,1.20,desk.z-.49,.052,.25,.34);
  box(0x655542,desk.x-.18,1.015,desk.z+.04,.29,.012,.46);
  cylinder(brass,desk.x-.14,1.035,desk.z+.58,.064,.034);
  ball(champagne,desk.x-.14,1.084,desk.z+.58,.058,.052,.058);
  cylinder(brass,desk.x-.14,1.148,desk.z+.58,.014,.027);
  const wallX=hotel.x+2.55;
  box(emerald,wallX,1.51,hotel.z,.074,2.75,2.65);
  for(let i=-7;i<=7;i++)box(walnut,wallX-.05,1.43,hotel.z+i*.17,.054,2.48,.037);
  box(brass,wallX-.099,1.87,hotel.z,.044,.55,1.92);
  sign(1,wallX-.126,1.87,hotel.z,1.86,.49,-Math.PI/2);
  box(brass,hotel.x-2.53,1.80,hotel.z,.08,.91,2.19);
  sign(4,hotel.x-2.48,1.8,hotel.z,2.10,.82,Math.PI/2);
  // A porter trolley on four rubber casters carries two leather suitcases.
  for(const dx of [-.19,.19])for(const dz of [-.31,.31])ball(ebony,cart.x+dx,.09,cart.z+dz,.063,.071,.043);
  box(brass,cart.x,.20,cart.z,.57,.065,.82);box(0x7e5847,cart.x,.244,cart.z,.52,.035,.77);
  for(const z of [cart.z-.34,cart.z+.34]){
    for(const dx of [-.23,.23])cylinder(brass,cart.x+dx,.86,z,.025,1.22);
    batch.add(rim,brass,cart.x,floor+1.46,z,.231,.149,.22);
  }
  box(brass,cart.x,1.59,cart.z,.038,.038,.71);
  for(const [z,c,h,w] of [[cart.z-.16,0x845b40,.49,.36],[cart.z+.18,0x4f6558,.62,.39]]){
    box(c,cart.x,.27+h/2,z,w,h,.28);
    for(const d of [-.087,.087])box(0xb39464,cart.x,.27+h/2,z+d,w+.012,h+.012,.023);
    box(ebony,cart.x,.29+h,z,.15,.033,.051);
  }
  const surfaces=new THREE.MeshBasicMaterial({vertexColors:true});
  surfaces.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 hotelPoint,hotelNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nhotelPoint=position;hotelNormal=normal;');
    shader.fragmentShader='varying vec3 hotelPoint,hotelNormal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      vec3 n=normalize(hotelNormal);
      float daylight=clamp(abs(hotelPoint.z+53.)/4.,0.,1.);
      float vertical=clamp(n.y,-.75,1.);
      float facing=dot(n,normalize(vec3(-.5,.4,-.7)));
      float shade=.82+.13*vertical+.10*facing+.07*daylight;
      float grain=sin(hotelPoint.y*115.+sin(hotelPoint.z*23.))*cos(hotelPoint.x*70.);
      diffuseColor.rgb*=shade*(1.+.024*grain);
    `);
  };
  const staticMesh=batch.mesh(scene,surfaces,false);staticMesh.userData.impactSurface='solid';
  // Cube geometry is shared by the live sliding leaves.
  for(const g of [column,orb,rim])g.dispose();
  return doors=>{
    for(const f of moving){
      const value=doors?.hotel?.[f.front.id]??0;if(value===f.old)continue;
      f.old=value;const panels=hotelPanels(f.front,value,doorWidth);
      f.pair.forEach((group,i)=>{group.position.x=panels[i].x;});
    }
  };
}
