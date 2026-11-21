import * as THREE from 'three';
import {mareUpper,mareParts,mareFurniture,mareFlights,mareGuards,treadHeight} from './palazzo-mare.js';

const stone=0xd6c3a0,ivory=0xf1e5ca,walnut=0x80543d,teak=0xad805c,bronze=0x675240;
const brass=0xbd955d,green=0x466e66,blue=0x50657b,linen=0xdfcfb3;
export function furnishPalazzo({collection,scene,box,masonry,cyl,beam,leaf,pane,sill=(p,draw)=>draw()}){
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
  collection.picture('mare',35.4,2.03,-444.985,2.95,1.93,1,collection.harbor);
  collection.brassMobile('mare',33.4,3.86,-443.12,3.3);
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
  collection.carpet('mare',13.35,.07,-443.87,4.45,3.92,0x587d76,0xd5b88e);
  collection.carpet('mare',33.4,.07,-443.12,4.5,3.45,0xaa8470,0xe2ca9b);
  collection.carpet('mare',19.65,4.1,-441.62,5.35,3.69,0xb39275,0xe1c99c);
  collection.carpet('mare',27.05,7.9,-447.75,4.8,4.35,0x9c887b,0xe7d0ac);
  function lamp(x,y,z){
    cyl(brass,x,y+.043,z,.30,.086);cyl(bronze,x,y+.29,z,.06,.52);
    cyl(0xf2d4a0,x,y+.54,z,.40,.32);cyl(brass,x,y+.714,z,.09,.036);
  }
  for(const p of mareFurniture){
    if(collection.furnish(p,'mare'))continue;
    const {x,z,w,d,bottom:y,kind}=p,H=p.h-y;
    const b=(c,dx,dy,dz,width,height,depth)=>box(c,x+dx,y+dy,z+dz,width,height,depth);
    const legs=(height,width=.075)=>{
      for(const a of [-1,1])for(const s of [-1,1])b(walnut,a*(w/2-.09),height/2,s*(d/2-.09),width,height,width);
    };
    if(kind==='desk'){
      legs(H-.06);
      b(teak,0,H-.04,0,w,.08,d);
      b(green,.10,H+.017,.02,.86,.03,.5);
      b(ivory,.08,H+.044,0,.35,.022,.27);lamp(x-w*.35,y+H,z);
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
    }else{
      b(walnut,0,H/2,0,w-.08,H-.075,d-.08);
      b(kind==='kitchen'?ivory:teak,0,H-.025,0,w,.07,d);
      const n=Math.max(1,Math.round(w/.85)),cw=(w-.10)/n;
      for(let i=0;i<n;i++){
        const u=-w/2+.05+cw*(i+.5);
        b(kind==='wardrobe'?linen:teak,u,H*.49,.51*d,cw-.035,H-.14,.045);
        b(brass,u+.19*cw,H*.62,.51*d+.04,Math.min(.20,cw*.23),.035,.042);
      }
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
  for(const [x,y,z] of [[15,.07,-442.1],[19.7,4.1,-442.1],[32.55,4.1,-447.8],[23.1,7.9,-445.55]]){
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
