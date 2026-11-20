import {artScreen,villaWings,casaSlabs,casaWalls,casaFurniture,casaRails,casaRoofGarden,casaStair,casaTreads} from './casa-luma.js';

const teak=0xa87954,oak=0xc29b71,walnut=0x6e5040,linen=0xeae0cd,cream=0xe5ddc6;
const sage=0x7b8d7f,olive=0x505e48,bronze=0x595647,clay=0xc28b6b,stone=0xc9b895;

export function addCasaLuma({box,masonry,pane,cyl,beam,leaf,railing,seat,trough}){
  for(const p of casaSlabs){
    masonry(cream,p.x,(p.h+p.bottom)/2,p.z,p.w,p.h-p.bottom,p.d);
    if(p.level!=='ground')box(teak,p.x,p.bottom-.022,p.z,p.w-.08,.044,p.d-.08);
  }
  for(const p of casaWalls){
    const height=p.h-p.bottom,y=(p.bottom+p.h)/2;
    if(p.finish==='stone'){masonry(0xc6b79b,p.x,y,p.z,p.w,height,p.d);continue;}
    const span=p.alongX?p.w:p.d,n=Math.ceil(span/2.5),bay=span/n;
    for(let i=0;i<n;i++){
      const u=(i+.5)*bay-span/2,x=p.x+(p.alongX?u:0),z=p.z+(p.alongX?0:u);
      pane(x,y,z,bay-.045,height-.1,p.alongX?0:Math.PI/2);
      if(i%3===1){
        for(let k=0;k<4;k++){
          const shift=-bay*.34+k*.10, inset=-p.side*(.061+.012*(k%2));
          box(k%2?0xd7c8a8:0xbbae92,x+(p.alongX?shift:inset),y,z+(p.alongX?inset:shift),
            p.alongX?.12:.038,height-.18,p.alongX?.038:.12);
        }
      }
    }
    for(let i=0;i<=n;i++){
      const u=i*bay-span/2;
      box(bronze,p.x+(p.alongX?u:0),y,p.z+(p.alongX?0:u),p.alongX?.062:.13,height,p.alongX?.13:.062);
    }
    for(const v of [p.bottom+.04,p.h-.05])box(bronze,p.x,v,p.z,p.w,.075,p.d);
  }
  for(const b of villaWings.slice(1)){
    for(let s=0;s<11;s++)box(teak,b.x-2.7+s*.51,2.13,-383.96,.15,3.47,.26,0,-.34);
  }
  for(const p of casaRoofGarden){
    if(p.kind==='trough')trough(p.x,p.bottom,p.z,p.w,true);
    else seat(p.x,p.z,p.bottom,Math.PI);
  }
  for(let s=0;s<16;s++){
    const x=-19.5+s*.46;
    if(x< -15.08 || x> -12.40)box(teak,x,5.55,-400.79,.16,3.43,.44,0,-.36);
  }
  for(const p of casaRails)railing(p.x,p.bottom,p.z,Math.max(p.w,p.d),p.w>p.d);
  for(const p of casaTreads){
    box(walnut,p.x,(p.h+p.bottom)/2,p.z,p.w,p.h-p.bottom,p.d);
    box(oak,p.x-.014,p.h-.025,p.z,p.w+.028,.05,p.d+.025);
  }
  const s=casaStair;
  for(const side of [-1,1]){
    const z=s.z+side*s.width/2;
    for(const [i,p] of casaTreads.entries())if(i%3===0 || i===s.count-1)box(bronze,p.x,p.h+.44,z,.045,.88,.045);
    beam(teak,[casaTreads[0].x,casaTreads[0].h+.88,z],[casaTreads.at(-1).x,s.upper+.88,z],.071);
  }
  function rug(x,y,z,w,d,color){
    box(color,x,y+.013,z,w,.022,d);
    for(const end of [-1,1])for(let i=0;i<3;i++)box(linen,x,y+.026,z+end*(d/2-.13-i*.095),w-.07,.009,.031);
  }
  rug(-37.25,.27,-389.15,4.4,4.1,sage);
  rug(-13.75,.27,-388.40,3.6,3.5,clay);
  rug(-31.6,.27,-404.17,4.8,3.38,clay);
  rug(-34.1,3.97,-405.00,4.8,3.38,sage);
  for(const p of casaFurniture){
    const {kind,x,z,w,d,bottom}=p,h=p.h-bottom;
    const block=(color,u,y,v,width,height,depth)=>box(color,x+u,bottom+y,z+v,width,height,depth);
    const legs=(height)=>{for(const u of [-1,1])for(const v of [-1,1])block(walnut,u*(w/2-.11),height/2,v*(d/2-.11),.085,height,.085);};
    if(kind==='bed'){
      block(walnut,0,.23,0,w,.38,d);block(linen,0,.52,.02,w-.07,.23,d-.06);
      block(sage,0,.63,.47,w,.11,d*.59);block(oak,0,.60,-d/2+.055,w,1.16,.11);
      for(const u of [-.49,.49])block(cream,u,.68,-.71,.84,.17,.50);
    }else if(kind==='sofa'){
      legs(.22);block(walnut,0,.27,0,w,.18,d);
      block(sage,0,.64,-d/2+.12,w,.56,.24);
      for(const side of [-1,1])block(sage,side*(w/2-.10),.52,.06,.2,.41,d-.09);
      for(const u of [-1,0,1])block(0xa9b5a1,u*(w-.48)/3,.445,.09,(w-.48)/3-.015,.19,d-.25);
      for(const side of [-1,1])box(side<0?clay:linen,x+side*w*.32,bottom+.66,z-.17,.48,.43,.17,-.12,0,side*.15);
    }else if(kind==='wardrobe'){
      block(walnut,0,h/2,0,w,h,d);
      for(const v of [-1,0,1]){
        block(oak,w/2+.01,h/2,v*d/3,.04,h-.15,d/3-.05);
        block(bronze,w/2+.045,1.05,v*d/3+.29,.05,.28,.036);
      }
    }else if(kind==='kitchen'){
      block(teak,0,.47,0,w,.90,d);block(linen,0,.94,0,w+.09,.10,d+.04);
      for(let i=0;i<9;i++){
        const v=(i-4)*.96;
        block(i===3?bronze:oak,-w/2-.01,.49,v,.036,.74,.92);
        block(bronze,-w/2-.046,.76,v,.048,.035,.28);
      }
      block(bronze,0,1.0,-1.92,.70,.025,.80);
      for(const v of [-2.12,-1.73])cyl(0x353c3a,x,bottom+1.022,z+v,.26,.018);
      block(0x909d98,0,1.001,2.07,.58,.02,.81);
      block(bronze,.24,1.13,2.07,.045,.27,.045);block(bronze,.16,1.25,2.07,.19,.04,.045);
    }else if(kind==='island'){
      block(olive,0,.46,0,w-.17,.91,d-.20);block(cream,0,.95,0,w,.10,d);
      cyl(clay,x,bottom+1.06,z+.72,.36,.12);leaf(olive,x,bottom+1.28,z+.72,.49,.34,.42);
    }else if(kind==='chair'){
      legs(.44);block(sage,0,.465,0,w,.11,d);
      block(oak,0,.68,p.facing*(d/2-.04),w,h-.43,.085);
    }else if(kind==='books'){
      for(const v of [-1,1])block(walnut,v*(w/2-.047),h/2,0,.094,h,d);
      for(let row=0;row<5;row++){
        const y=.15+row*.49;
        block(teak,0,y,0,w,.065,d);
        for(let i=0;i<26;i++){
          if((row*3+i)%9===3 || i%11===6)continue;
          const bh=.23+(i*3%7)*.019;
          block([sage,linen,clay,olive,oak][(i+row)%5],(i-12.5)*.224,y+.032+bh/2,.035,.09+i%4*.027,bh,.25);
        }
      }
    }else{
      legs(h-.10);block(kind==='lowTable'?stone:oak,0,h-.055,0,w,.11,d);
      if(kind==='console' || kind==='nightstand')block(teak,0,h*.65,0,w-.11,h*.45,d-.05);
      if(kind==='lowTable' || kind==='desk'){
        for(let i=0;i<2;i++)block(i?linen:olive,-w*.21,h+.026+i*.049,.02,.34,.048,.26);
      }else if(kind==='dining'){
        for(const u of [-.57,.57])for(const v of [-.32,.32])cyl(linen,x+u,bottom+h+.014,z+v,.30,.025);
      }else{
        cyl(clay,x+w*.19,bottom+h+.13,z,.20,.26);
        leaf(olive,x+w*.19,bottom+h+.36,z,.32,.33,.32);
      }
    }
  }
  // Recessed bronze downlights under the gallery and garden-suite soffits.
  for(const [xs,zs,y] of [
    [[-36.6,-29.2,-21.8,-14.4],[-403.2],3.4],
    [[-36.6,-29.2,-21.8,-14.4],[-403.2,-406.8],7.11],
    [[-36.3,-13.7],[-387.1,-392.5,-397.9],3.81],
  ])for(const x of xs)for(const z of zs){
    cyl(bronze,x,y-.01,z,.23,.024);
    cyl(linen,x,y-.026,z,.15,.016);
  }
  // Three inset ceramic reliefs form a low screen behind the upstairs console.
  box(walnut,artScreen.x,(artScreen.bottom+artScreen.h)/2,artScreen.z,artScreen.w,artScreen.h-artScreen.bottom,artScreen.d);
  for(const [i,tint] of [sage,clay,olive].entries()){
    const x=-25.40+i*1.10;
    box(linen,x,5.86,-401.83,.95,1.33,.05);
    box(tint,x,5.86,-401.87,.81,1.19,.04);
    for(let k=0;k<5;k++)box(cream,x-.28+k*.14,5.79+.12*Math.cos(i+k*.6),-401.90,.056,.68,.025);
  }
  // Framed woven panels warm the stone end walls of the garden suites.
  for(const b of villaWings.slice(1)){
    box(walnut,b.x,2.17,-384.54,2.19,1.26,.07);
    box(linen,b.x,2.17,-384.59,2.04,1.10,.04);
    for(let i=0;i<7;i++)box(i%2?clay:sage,b.x-.73+i*.24,2.13+.13*Math.sin(i),-384.617,.16,.61,.021);
  }
}
