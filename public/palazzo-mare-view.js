import * as THREE from 'three';
import {mareUpper,mareParts,mareFurniture,mareFlights,mareGuards,treadHeight} from './palazzo-mare.js';

const stone=0xd6c3a0,ivory=0xf1e5ca,walnut=0x80543d,teak=0xad805c,bronze=0x675240;
const brass=0xbd955d,green=0x466e66,blue=0x50657b,linen=0xdfcfb3;
export function furnishPalazzo({scene,box,masonry,cyl,beam,leaf,pane,sill=(p,draw)=>draw()}){
  for(const p of mareParts){
    const {x,z,w,d,bottom,h,kind}=p;
    const mid=(h+bottom)/2,height=h-bottom,across=w>d;
    if(kind==='glass'){
      pane(x,mid,z,Math.max(w,d),height,across);
      box(bronze,x,mid,z,across?.045:.091,height,across?.091:.045);
      box(brass,x,bottom+.04,z,w+.025,.08,d+.025);
    }else if(kind==='slab'){
      masonry(ivory,x,mid,z,w,height,d);
      box(0xcbbaa0,x,h-.033,z,w+.016,.045,d+.016);
    }else if(kind==='plaster'){
      box(0xc8b497,x,mid,z,w,height,d);
      for(const elevation of [bottom+.10,h-.10])box(ivory,x,elevation,z,w+.04,.17,d+.04);
    }else if(kind==='jamb' || kind==='lintel'){
      box(kind==='jamb'?walnut:stone,x,mid,z,w,height,d);
      if(kind==='lintel')box(brass,x,bottom+.04,z,w+.02,.07,d+.02);
    }else if(kind==='sill'){
      sill(p,()=>{masonry(ivory,x,mid,z,w,height,d);box(teak,x,h-.026,z,w+.06,.056,d+.06);});
    }else{
      masonry(stone,x,mid,z,w,height,d);
    }
  }
  finishUpperFloors(scene);
  hangHarborPrint(scene,box);
  // Two long, shallow flights turn around a shared landing. The rail posts are
  // placed on the noses and the timber handrails follow their exact pitch.
  for(const f of mareFlights){
    const run=(f.end-f.start)/f.count,dir=Math.sign(run);
    for(let i=0;i<f.count;i++){
      const x=f.start+(i+.5)*run,y=treadHeight(f,i);
      box(0xa58c70,x,y-.118,f.z,Math.abs(run)+.012,.22,f.width);
      box(0xdcccb4,x,y-.018,f.z,Math.abs(run)+.016,.036,f.width+.038);
      box(teak,x-dir*(Math.abs(run)/2-.025),y+.002,f.z,.045,.008,f.width+.042);
      if(i%3===0 || i===f.count-1)for(const side of [-1,1])box(bronze,x,y+.42,f.z+side*(f.width/2-.045),.046,.84,.046);
    }
    for(const side of [-1,1]){
      const z=f.z+side*(f.width/2-.045);
      beam(walnut,[f.start+run*.5,treadHeight(f,0)-.17,z],[f.end-run*.5,f.high-.17,z],.15);
      beam(walnut,[f.start+run*.5,treadHeight(f,0)+.85,z],[f.end-run*.5,f.high+.85,z],.084);
    }
  }
  for(const g of mareGuards){
    const across=g.w>g.d,span=Math.max(g.w,g.d),n=Math.ceil(span/.83);
    box(walnut,g.x,g.h,g.z,g.w+.035,.083,g.d+.035);
    box(brass,g.x,g.bottom+.31,g.z,g.w,.032,g.d);
    for(let i=0;i<=n;i++){
      const u=span*(i/n-.5);
      box(bronze,g.x+(across?u:0),g.bottom+.47,g.z+(across?0:u),.043,.94,.043);
    }
  }
  function rug(x,y,z,w,d,tint){
    box(0x997953,x,y+.012,z,w,.023,d);
    box(tint,x,y+.027,z,w-.14,.013,d-.14);
    for(const side of [-1,1])box(linen,x,y+.038,z+side*(d/2-.22),w-.32,.012,.036);
  }
  rug(13.35,.07,-443.87,4.45,3.92,0x708c86);
  rug(33.4,.07,-443.12,4.5,3.45,0xb49375);
  rug(19.65,4.1,-441.62,5.35,3.69,0xb99672);
  rug(27.05,7.9,-447.75,4.8,4.35,0xa78e79);
  function lamp(x,y,z){
    cyl(brass,x,y+.043,z,.30,.086);cyl(bronze,x,y+.29,z,.06,.52);
    cyl(0xf2d4a0,x,y+.54,z,.40,.32);cyl(brass,x,y+.714,z,.09,.036);
  }
  for(const p of mareFurniture){
    const {x,z,w,d,bottom:y,kind,reverse}=p,H=p.h-y,sg=reverse?-1:1;
    const b=(c,dx,dy,dz,width,height,depth)=>box(c,x+dx,y+dy,z+dz,width,height,depth);
    const legs=(height,width=.075)=>{
      for(const a of [-1,1])for(const s of [-1,1])b(walnut,a*(w/2-.09),height/2,s*(d/2-.09),width,height,width);
    };
    if(kind==='sofa'){
      const color=y<1?green:y<6?linen:blue;
      b(walnut,0,.17,0,w-.1,.24,d-.1);b(color,0,.37,0,w,.28,d);
      for(const a of [-1,1])b(color,a*(w/2-.08),.53,0,.16,.35,d);
      const n=Math.ceil(w/1.3),cw=(w-.34)/n;
      for(let i=0;i<n;i++)b(color,-w/2+.17+cw*(i+.5),.54,.065*sg,cw-.022,.13,d-.22);
      b(color,0,H-.18,-sg*(d/2-.075),w-.12,.36,.15);
      for(const a of [-1,1])box(a<0?0xc49772:0xdac9aa,x+a*w*.31,y+.66,z-sg*.21,.39,.35,.14,-sg*.14,0,a*.10);
    }else if(['table','desk','coffee','chair'].includes(kind)){
      const chair=kind==='chair',height=chair?.45:H;
      legs(height-.06,kind==='table'?.11:.074);
      b(chair?green:kind==='coffee'?0xc4b397:teak,0,height-.04,0,w,.08,d);
      if(chair)b(walnut,0,.69,sg*(d/2-.034),w,.46,.066);
      if(kind==='desk'){
        b(green,.10,H+.017,.02,.86,.03,.5);
        b(ivory,.08,H+.044,0,.35,.022,.27);lamp(x-w*.35,y+H,z);
      }else if(kind==='coffee'){
        b(blue,-.27,H+.029,.03,.42,.055,.29);
        b(ivory,-.25,H+.068,.01,.38,.022,.25);
        cyl(brass,x+.42,y+H+.064,z,.20,.12);
      }else if(kind==='table'){
        b(linen,0,H+.012,0,w-.26,.02,.36);
        for(const a of [-1,0,1])for(const s of [-1,1])cyl(ivory,x+a*1.1,y+H+.037,z+s*.33,.30,.027);
        cyl(green,x,y+H+.16,z,.22,.32);
        leaf(0x6c8758,x,y+H+.39,z,.40,.37,.34);
      }
    }else if(kind==='library'){
      b(walnut,-w*.45,H/2,0,.06,H,d);
      for(const s of [-1,1])b(teak,0,H/2,s*(d/2-.04),w,H,.08);
      for(let row=0;row<5;row++){
        const yy=.13+row*.46;b(teak,0,yy,0,w,.06,d);
        for(let j=0;j<14;j++){
          const hz=.25+(row*3+j*7)%5*.032;
          if((j+row)%6===0)continue;
          b([green,blue,0x9a6e50,0xba9e72][(row+j)%4],.03,yy+.03+hz/2,-d/2+.20+j*.23,w*.72,hz,.17);
        }
      }
    }else if(kind==='bed'){
      b(walnut,0,.22,0,w,.40,d);b(teak,0,.68,-d/2+.06,w+.09,1,.14);
      b(ivory,0,.49,0,w-.06,.25,d-.04);b(linen,0,.648,.26,w-.07,.092,d-.56);
      b(green,0,.715,d*.29,w-.045,.045,.56);
      for(const s of [-1,1])b(ivory,s*w*.235,.686,-d*.33,w*.41,.17,.54);
    }else{
      b(walnut,0,H/2,0,w-.08,H-.075,d-.08);
      b(kind==='island'||kind==='kitchen'?ivory:teak,0,H-.025,0,w,.07,d);
      const n=Math.max(1,Math.round(w/.85)),cw=(w-.10)/n;
      for(let i=0;i<n;i++){
        const u=-w/2+.05+cw*(i+.5);
        b(kind==='wardrobe'?linen:teak,u,H*.49,.51*d,cw-.035,H-.14,.045);
        b(brass,u+.19*cw,H*.62,.51*d+.04,Math.min(.20,cw*.23),.035,.042);
      }
      if(kind==='nightstand')lamp(x,y+H,z);
      if(kind==='console' && w>d){lamp(x-w*.31,y+H,z);b(blue,.27,H+.04,0,.48,.08,.30);}
      if(kind==='kitchen'){
        b(bronze,-.9,H+.018,0,.95,.034,.57);b(0x8d9590,-.9,H+.037,0,.77,.017,.42);
        b(brass,-.9,H+.22,-.30,.05,.44,.05);b(brass,-.9,H+.42,-.19,.05,.05,.24);
        b(0x3f4542,1.54,H+.021,0,.93,.042,.64);
        for(const s of [-1,1])for(const a of [-1,1])cyl(0x69716a,x+1.54+s*.22,y+H+.05,z+a*.15,.23,.015);
      }
    }
  }
  // Recessed plaster medallions, linen pendants and brass entry lanterns.
  for(const [x,y,z] of [[15,.07,-442.1],[33.4,.07,-443.12],[19.7,4.1,-442.1],[32.55,4.1,-447.8],[23.1,7.9,-445.55]]){
    const ceiling=(y<1?4.1:y<5?7.9:10.9)-.24;
    cyl(ivory,x,ceiling-.025,z,.68,.05);cyl(brass,x,ceiling-.16,z,.045,.28);
    cyl(0xf3dcaf,x,ceiling-.36,z,.60,.19);cyl(brass,x,ceiling-.47,z,.57,.035);
  }
  function lantern(x,y,z){
    box(bronze,x,y,z,.20,.43,.20);box(0xffdfa4,x,y,z,.23,.30,.23);
    box(brass,x,y+.23,z,.25,.055,.25);
  }
  for(const x of [13.84,16.96,26.64,29.76])lantern(x,2.10,-436.80);
  for(const z of [-442.58,-439.42])lantern(39.70,2.10,z);
  // Paved approach joins the east sidewalk to the entrance.
  masonry(0xd7cbb4,42.06,.026,-441,5.16,.052,3.42);
  for(const z of [-442.59,-439.41])box(0xb29873,42.06,.055,z,5.16,.012,.065);
}


// Match the oak boards across all four pieces of a cut floor. The terrace
// outside the glazing retains its limestone finish.
function finishUpperFloors(scene){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d');
  c.fillStyle='#715640';c.fillRect(0,0,256,256);
  const colors=['#b89b78','#c1a381','#b79b7b','#bda080'];
  for(let row=0;row<8;row++){
    const offset=(row*71)%128;
    for(let board=-1;board<2;board++){
      const x=offset+board*128,y=row*32;
      c.fillStyle=colors[(row*3+board+5)%4];c.fillRect(x+1,y+1,127,31);
      for(let k=0;k<9;k++){
        const start=x+(row*7+k*19)%89,cy=y+3+(k*7)%25;
        c.strokeStyle='rgba(105,75,51,.16)';c.lineWidth=.65;c.beginPath();c.moveTo(start,cy);
        c.bezierCurveTo(start+7,cy-1,start+18,cy+1,start+29,cy);c.stroke();
      }
    }
  }
  const map=new THREE.CanvasTexture(canvas);
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const material=new THREE.MeshLambertMaterial({map});
  for(const floor of mareUpper){
    for(const p of mareParts){
      if(p.kind!=='slab' || p.h!==floor.bottom)continue;
      const west=Math.max(p.x-p.w/2,floor.x-floor.w/2),east=Math.min(p.x+p.w/2,floor.x+floor.w/2);
      const north=Math.max(p.z-p.d/2,floor.z-floor.d/2),south=Math.min(p.z+p.d/2,floor.z+floor.d/2);
      if(west>=east || north>=south)continue;
      const cx=(west+east)/2,cz=(north+south)/2;
      const geometry=new THREE.PlaneGeometry(east-west,south-north).rotateX(-Math.PI/2);
      const {position,uv}=geometry.attributes;
      for(let i=0;i<position.count;i++)uv.setXY(i,(cx+position.getX(i))/5,(cz+position.getZ(i))/1.9);
      const mesh=new THREE.Mesh(geometry,material);
      mesh.position.set(cx,.80+p.h+.004,cz);mesh.receiveShadow=true;scene.add(mesh);
    }
  }
}

// A glazed, brass-framed harbor print hangs over the six-place dining table.
function hangHarborPrint(scene,box){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;
  const ink=canvas.getContext('2d'),sky=ink.createLinearGradient(0,0,0,165);
  sky.addColorStop(0,'#7798a3');sky.addColorStop(.72,'#e1c1a2');sky.addColorStop(1,'#f1d5a3');
  ink.fillStyle=sky;ink.fillRect(0,0,768,256);
  ink.fillStyle='#f3dbaf';ink.beginPath();ink.arc(512,110,28,0,Math.PI*2);ink.fill();
  ink.fillStyle='#657b79';ink.beginPath();ink.moveTo(0,151);
  for(let x=0;x<=768;x+=3)ink.lineTo(x,144+6*Math.sin(x*.026)+4*Math.cos(x*.011));
  ink.lineTo(768,171);ink.lineTo(0,171);ink.fill();
  ink.fillStyle='#639093';ink.fillRect(0,156,768,100);
  for(let i=0;i<170;i++){
    ink.fillStyle=i%3?'#83a6a1':'#c3ba96';
    ink.fillRect(i*139%768,158+i*47%99,5+i*13%25,1+i%2);
  }
  for(const [x,y,scale] of [[204,172,1],[447,165,.54],[620,183,.76]]){
    ink.save();ink.translate(x,y);ink.scale(scale,scale);
    ink.fillStyle='#f3dfbb';ink.beginPath();ink.moveTo(0,-58);ink.lineTo(0,-5);ink.lineTo(-28,-5);ink.fill();
    ink.fillStyle='#bb805b';ink.beginPath();ink.moveTo(4,-48);ink.lineTo(25,-7);ink.lineTo(4,-7);ink.fill();
    ink.fillStyle='#574f48';ink.beginPath();ink.moveTo(-32,0);ink.lineTo(30,0);ink.lineTo(21,6);ink.lineTo(-23,6);ink.fill();ink.restore();
  }
  const x=35.4,y=2.03,z=-444.986;
  box(walnut,x,y,z,3.82,1.48,.08);box(brass,x,y,z+.044,3.72,1.39,.023);
  box(ivory,x,y,z+.060,3.65,1.32,.02);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const print=new THREE.Mesh(new THREE.PlaneGeometry(3.45,1.13),new THREE.MeshLambertMaterial({map}));
  print.position.set(x,.8+y,z+.074);scene.add(print);
}
