import * as THREE from 'three';
import {salonTables,salonSeats,salonLowTables,salonBanquettes,salonBar,salonBarSeats,salonChandeliers} from './waterfront-salon-layout.js';

const tau=2*Math.PI,champagne=0xc7a069,bronze=0x74503c,onyx=0x2d2632,port=0x653142;
const green=0x336c61,walnut=0x533537,cream=0xf0ddba,opal=0xffefc8,honey=0xffc16e,ice=0x92e0da;

// One small illustrated atlas supplies floor textiles, table markings and the upstairs bar sign.
function salonAtlas(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
  const g=canvas.getContext('2d');
  const sections={carpet:[0,0,768,512],felt:[0,532,768,228],bar:[0,790,768,200],promenade:[784,0,240,1024]};
  g.fillStyle='#4a2339';g.fillRect(0,0,768,512);
  g.save();g.beginPath();g.rect(4,4,760,504);g.clip();
  for(let row=-1;row<9;row++)for(let col=-1;col<11;col++){
    const cx=col*91+(row%2)*45.5,cy=row*62;
    g.strokeStyle=row%2?'#783d4a':'#633744';g.lineWidth=2;
    for(let i=-3;i<=3;i++){
      g.beginPath();g.moveTo(cx,cy+29);
      g.quadraticCurveTo(cx+i*4,cy+2,cx+i*12,cy-18+Math.abs(i)*3);g.stroke();
    }
    g.beginPath();g.ellipse(cx,cy+33,39,49,0,Math.PI*1.13,Math.PI*1.87);g.stroke();
  }
  g.restore();for(const [margin,line,color] of [[4,7,'#bc956e'],[15,3,'#8c7770'],[24,2,'#b79570']]){
    g.strokeStyle=color;g.lineWidth=line;g.strokeRect(margin,margin,768-margin*2,512-margin*2);
  }
  g.fillStyle='#ebd3a2';g.strokeStyle='#dcbf88';g.lineWidth=2;
  g.beginPath();g.moveTo(42,592);g.bezierCurveTo(174,765,594,765,726,592);g.stroke();
  for(let i=-2;i<=2;i++){
    g.save();g.translate(384+i*113,692-13*i*i);g.rotate(-i*.22);g.strokeRect(-15,-21,30,42);g.restore();
  }
  g.textAlign='center';g.font='bold 31px Georgia, serif';g.fillText('A U R O R A',384,603);
  g.font='17px sans-serif';g.fillText('SALON PRIVÉ',384,629);
  g.fillStyle='#173c40';g.fillRect(0,790,768,200);
  for(const m of [7,16]){g.strokeStyle='#cfaf7c';g.lineWidth=2;g.strokeRect(m,790+m,768-m*2,200-m*2);}
  g.fillStyle='#ffe6b4';g.font='48px Georgia, serif';g.fillText('CHAMPAGNE',384,892);
  g.font='19px sans-serif';g.fillText('A U R O R A     •     S A L O N',384,943);
  // Bookmatched green marble and brass fan inlays lead in from the terrace.
  g.save();g.beginPath();g.rect(784,0,240,1024);g.clip();g.translate(784,0);
  g.fillStyle='#37514d';g.fillRect(0,0,240,1024);
  for(let i=0;i<24;i++){
    const y=i*53-92;
    g.strokeStyle=i%3?'#4a625a':'#68766a';g.lineWidth=i%4===0?1.7:.8;g.beginPath();
    g.moveTo(0,y);g.bezierCurveTo(40,y+4,72,y+49,120,y+55);g.bezierCurveTo(168,y+49,200,y+4,240,y);g.stroke();
  }
  for(const [a,w,c] of [[4,6,'#b79965'],[13,2,'#d2b88a'],[22,3,'#232f36']]){
    g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(a,0);g.lineTo(a,1024);g.moveTo(240-a,0);g.lineTo(240-a,1024);g.stroke();
  }
  for(let row=-1;row<6;row++){
    g.save();g.translate(120,128+row*256);
    g.strokeStyle='#bda278';g.lineWidth=2.5;
    for(const side of [1,-1]){
      g.scale(1,side);
      for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(0,0);g.lineTo(i*22,-59+Math.abs(i)*6);g.lineTo(i*13,-74+Math.abs(i)*7);g.stroke();}
    }
    g.fillStyle='#cfaf76';g.rotate(Math.PI/4);g.fillRect(-3,-3,6,6);g.restore();
  }
  g.restore();
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const planes={};
  for(const [id,[x,y,w,h]] of Object.entries(sections)){
    const plane=new THREE.PlaneGeometry();if(id!=='bar')plane.rotateX(-Math.PI/2);
    const u=plane.attributes.uv.clone();
    for(let i=0;i<u.count;i++)u.setXY(i,(x+1+u.getX(i)*(w-2))/1024,1-(y+1+(1-u.getY(i))*(h-2))/1024);
    plane.setAttribute('batchUv',u);planes[id]=plane;
  }
  return {map,planes};
}
function tableTop(){
  const path=new THREE.Shape();
  path.moveTo(-1.56,.76);path.quadraticCurveTo(-1.83,.76,-1.82,.45);
  path.bezierCurveTo(-1.8,-.42,-.90,-.90,0,-.90);
  path.bezierCurveTo(.90,-.90,1.8,-.42,1.82,.45);
  path.quadraticCurveTo(1.83,.76,1.56,.76);path.lineTo(.53,.76);
  path.quadraticCurveTo(0,.44,-.53,.76);path.closePath();
  return new THREE.ExtrudeGeometry(path,{depth:1,bevelEnabled:false,curveSegments:12}).rotateX(-Math.PI/2);
}
export function addWaterfrontSalon(scene,Batch){
  const stone=new Batch(),metal=new Batch(),light=new Batch(),prints=new Batch(true);
  const cube=new THREE.BoxGeometry(),cyl=new THREE.CylinderGeometry(.5,.5,1,20);
  const gem=new THREE.OctahedronGeometry(.5),top=tableTop(),ring=new THREE.TorusGeometry(1,.018,5,48).rotateX(-Math.PI/2);
  const smallCyl=new THREE.CylinderGeometry(.5,.5,1,8);
  const halfSphere=new THREE.SphereGeometry(.5,12,7,0,tau,0,Math.PI*.5);
  const {map,planes}=salonAtlas();
  const box=(batch,c,x,y,z,w,h,d,yaw=0)=>batch.add(cube,c,x,y,z,w,h,d,0,yaw,0);
  const round=(batch,c,x,y,z,w,h,d=w)=>batch.add(w<=.18?smallCyl:cyl,c,x,y,z,w,h,d);
  const hoop=(batch,c,x,y,z,r,depth=r)=>batch.add(ring,c,x,y,z,r,1,depth);
  for(let i=0;i<3;i++)prints.add(planes.promenade,0xffffff,-80.4,.812,35.81+i*9.97,2.55,1,9.97);
  prints.add(planes.promenade,0xffffff,-75.57,.813,46.5,1.84,1,6.88,0,Math.PI/2);
  prints.add(planes.promenade,0xffffff,-75.57,.813,58.75,1.84,1,6.88,0,Math.PI/2);
  for(const {x,z,y,n} of salonTables){
    prints.add(planes.carpet,0xffffff,x,y+.016,z+.12,5.12,1,4.13);
    for(const dx of [-.82,.82]){
      round(metal,bronze,x+dx,y+.075,z,.66,.13);
      round(stone,walnut,x+dx,y+.43,z,.37,.71);
      round(metal,champagne,x+dx,y+.22,z,.41,.055);
    }
    stone.add(top,walnut,x,y+.73,z,1,.13,1);
    metal.add(top,champagne,x,y+.855,z,1.013,.047,1.015);
    stone.add(top,onyx,x,y+.901,z,1.014,.094,1.018);
    stone.add(top,n%2?green:0x703447,x,y+.993,z,.934,.011,.88);
    prints.add(planes.felt,0xffffff,x,y+1.006,z+.13,2.52,1,.68);
    box(stone,onyx,x,y+1.02,z-.485,.59,.042,.19);
    for(let i=0;i<6;i++){
      const px=x-.245+i*.097,c=[0x9f3544,0xf0dbc0,0x299388,0x41405c,0xd7a35d,0x9f3544][i];
      for(let k=0;k<3+(i%2);k++)round(k%2?metal:stone,k%2?cream:c,px,y+1.046+k*.012,z-.49,.073,.013);
    }
    for(let i=0;i<3;i++){
      const px=x-.46+i*.31;box(stone,cream,px,y+1.014,z-.16,.096,.008,.147,i*.09);
      box(stone,i===1?0xa72e3f:onyx,px,y+1.020,z-.16,.02,.007,.028,i*.09);
    }
    // A small reading lamp lights the dealer side without a real-time point light.
    round(metal,champagne,x+1.28,y+1.025,z-.39,.19,.04);
    round(metal,champagne,x+1.28,y+1.18,z-.39,.036,.28);
    light.add(halfSphere,opal,x+1.28,y+1.29,z-.39,.37,.26,.28);
    hoop(metal,champagne,x+1.28,y+1.289,z-.39,.19,.145);
    for(const side of [-1,1])round(metal,champagne,x+side*1.62,y+.996,z+.08,.10,.015);
  }
  for(const {x,z,y,yaw,n} of salonSeats){
    const fabric=n%2?0x375952:port;
    round(metal,bronze,x,y+.063,z,.45,.1);round(metal,champagne,x,y+.30,z,.092,.46);
    hoop(metal,champagne,x,y+.22,z,.225);
    round(stone,fabric,x,y+.57,z,.57,.17,.52);
    const bx=x+Math.sin(yaw)*.24,bz=z+Math.cos(yaw)*.24;
    box(metal,champagne,bx,y+.80,bz,.52,.49,.092,yaw);
    box(stone,fabric,bx,y+.86,bz,.50,.40,.13,yaw);
  }
  for(const b of salonBanquettes){
    const {x,z,w,y,facing}=b,fabric=y>2?port:0x255752,back=z-facing*.39;
    box(metal,champagne,x,y+.13,z,w-.18,.11,.74);
    box(stone,walnut,x,y+.31,z,w,.34,.97);
    const n=Math.ceil(w/.6),pitch=(w-.14)/n;
    for(let i=0;i<n;i++){
      const px=x-w*.5+.07+(i+.5)*pitch;
      box(stone,fabric,px,y+.55,z+.07*facing,pitch-.012,.19,.76);
      box(stone,fabric,px,y+.85,back,pitch-.025,.75,.25);
    }
    for(const sign of [-1,1]){
      box(stone,fabric,x+sign*(w/2-.09),y+.64,z,.18,.50,.92);
      box(metal,champagne,x+sign*(w/2-.09),y+.908,z,.09,.025,.80);
    }
  }
  for(const {x,z,y} of salonLowTables){
    round(metal,bronze,x,y+.08,z,.64,.10,.43);round(metal,champagne,x,y+.28,z,.16,.4);
    round(stone,onyx,x,y+.51,z,1.32,.10,.65);hoop(metal,champagne,x,y+.557,z,.62,.287);
    round(metal,champagne,x-.22,y+.607,z,.17,.094);round(light,opal,x-.22,y+.67,z,.13,.05);
  }
  const {x:bx,z:bz,y:by,w:bw}=salonBar;
  box(stone,walnut,bx,by+.55,bz,bw-.19,.98,.94);
  for(let i=0;i<25;i++)round(metal,i%2?bronze:champagne,bx-bw/2+.18+i*(bw-.36)/24,by+.51,bz+.458,.045,.73);
  box(stone,onyx,bx,by+1.035,bz,bw,.11,1.08);box(light,honey,bx,by+.981,bz+.52,bw-.15,.022,.018);
  box(metal,bronze,bx,by+.23,bz+.65,bw-.36,.048,.052);
  prints.add(planes.bar,0xffffff,bx,by+.56,bz+.491,1.93,.51,1);
  for(let i=0;i<9;i++){
    const px=bx-bw/2+.32+i*.185,c=[0x418f75,0xb97d48,0x777787][i%3];
    round(stone,c,px,by+1.26,bz-.25,.108,.31);
    round(stone,c,px,by+1.46,bz-.25,.052,.12);round(metal,champagne,px,by+1.526,bz-.25,.055,.032);
  }
  for(let i=0;i<6;i++){
    const px=bx+.22+i*.18,pz=bz+.21-(i%2)*.23;
    round(metal,champagne,px,by+1.106,pz,.094,.012);
    round(metal,champagne,px,by+1.17,pz,.016,.12);
    stone.add(gem,0xe7be83,px,by+1.276,pz,.11,.16,.11);
  }
  for(const {x,z,y} of salonBarSeats){
    round(metal,bronze,x,y+.04,z,.47,.075);round(metal,champagne,x,y+.39,z,.082,.67);
    hoop(metal,champagne,x,y+.28,z,.19);
    round(stone,port,x,y+.75,z,.54,.12);
  }

  // Fan-shaped canopies collect a cascade of opaline prisms, with the lowest
  // ornament well above the public route. All fixtures share two static meshes.
  for(const {x,z,r,top:y,drop} of salonChandeliers){
    round(stone,onyx,x,y-.025,z,r*2.16,.065);
    round(metal,champagne,x,y-.075,z,r*2.07,.072);
    round(stone,0x324850,x,y-.124,z,r*1.97,.052);
    hoop(light,honey,x,y-.161,z,r*.89);
    for(let i=0;i<16;i++){
      const a=tau*i/16,c=Math.cos(a),s=Math.sin(a);
      metal.beam(champagne,[x+c*r*.20,y-.16,z+s*r*.20],[x+c*r*.92,y-.16,z+s*r*.92],.029);
    }
    for(let j=0;j<3;j++){
      const count=20-j*5,radius=r*(.78-j*.25),base=y-drop*(.24+j*.22);
      hoop(metal,champagne,x,base,z,radius);
      for(let i=0;i<count;i++){
        const a=(i+j*.38)*tau/count,px=x+Math.cos(a)*radius,pz=z+Math.sin(a)*radius;
        const strand=drop*(.27+.045*Math.cos(3*a));
        round(metal,champagne,px,(y-.14+base)/2,pz,.011,y-.14-base);
        stone.add(gem,i%3===0?0x8fbfb7:0xe3c491,px,base-strand*.28,pz,r*.12,strand*.80,r*.12);
        light.add(gem,i%3===0?ice:opal,px,base-strand*.46,pz,r*.048,strand*.93,r*.048);
      }
    }
    light.add(halfSphere,opal,x,y-drop*.82,z,r*.22,drop*.25,r*.22);
  }
  const group=new THREE.Group();group.name='Aurora Salon interior';scene.add(group);
  // A baked diffuse contribution represents the nearby practical lights after dusk.
  // It follows each vertex tint, preserving both dark walnut and bright upholstery.
  const furnishings=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.77});
  furnishings.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.26;');
  };
  stone.mesh(group,furnishings,false);
  metal.mesh(group,new THREE.MeshStandardMaterial({vertexColors:true,metalness:.38,roughness:.35}),false);
  light.mesh(group,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}),false);
  prints.mesh(group,new THREE.MeshLambertMaterial({vertexColors:true,map,alphaTest:.16,polygonOffset:true,polygonOffsetFactor:-1}),false);
  for(const shape of [cube,cyl,gem,top,ring,smallCyl,halfSphere,...Object.values(planes)])shape.dispose();
}
