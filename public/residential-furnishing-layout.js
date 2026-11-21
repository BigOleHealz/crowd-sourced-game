import {hasApartmentBalconies} from './tower-glass.js';

const profiles={
  blue:{timber:0xcab497,stone:0xf6ead8,cloth:0xf1e4cc,accent:0x547e83,trim:0xb09b72,rug:0x8faaa2,art:'harbor'},
  sand:{timber:0xa37955,stone:0xf8e8d1,cloth:0xe6cca8,accent:0xa07343,trim:0x907349,rug:0xbc9979,art:'abstract'},
  coral:{timber:0xae8869,stone:0xf2ddc9,cloth:0xf1d6c4,accent:0xad654f,trim:0xbb935a,rug:0xd4a693,art:'abstract'},
  sage:{timber:0xb7a278,stone:0xe5dbc3,cloth:0xd6d5b4,accent:0x62785c,trim:0x978559,rug:0x9daa88,art:'harbor'},
  city:{timber:0x8e6a55,stone:0xece4d4,cloth:0xdacaba,accent:0x3e6561,trim:0xb0915d,rug:0x909886,art:'abstract'},
  deco:{timber:0x6e5143,stone:0xebe4d9,cloth:0xd8cab5,accent:0x73595b,trim:0xc19d5e,rug:0xa18b81,art:'abstract'},
  lodge:{timber:0xa77c59,stone:0xcdc4ae,cloth:0xe1cfaf,accent:0x7f563d,trim:0x8a7151,rug:0x9c8771,art:'harbor'},
  cabin:{timber:0x995f47,stone:0xd7cbb5,cloth:0xdfcba9,accent:0x586b55,trim:0x8d764c,rug:0x8c9b79,art:'abstract'},
};
const island=['blue','sand','coral','sage'];

export function residentialProfile(plan){
  if(plan.home?.startsWith('harbor-'))return profiles[island[Number(plan.home.slice(7))]];
  const b=plan.b;
  if(plan.type==='outpost' && !b.garage)return profiles[plan.id===0?'lodge':'cabin'];
  if(b.housing && hasApartmentBalconies(b.facade) && plan.name!=='Hotel Maravela')return profiles[b.facade===0?'city':'deco'];
}

const fixture=(kind,x,y,z,w,h,d,yaw,solid)=>({kind,x,y,z,w,h,d,yaw,solid});
function furnishingCollision(item){
  const across=Math.abs(Math.sin(item.yaw))>.5;
  return {kind:item.kind,x:item.x,z:item.z,w:across?item.d:item.w,d:across?item.w:item.d,bottom:item.y,h:item.h};
}

function layout(profile,furnishings){
  return {profile,furnishings,collisions:furnishings.filter(item=>item.solid).map(furnishingCollision)};
}

function furnishRoom(level,r,role){
  const {p,y,height}=level,side=Math.sign(r.x-p.x),yaw=-side*Math.PI/2,rim=r.w/2;
  const objects=[];
  const at=(kind,u,v,w,h,d,solid=true,turn=0,dy=0)=>{
    objects.push(fixture(kind,r.x+side*u,y+dy,r.z+v,w,h,d,yaw+turn,solid));
  };
  // Wrap balcony slabs run 4 cm above the nominal room floor.
  const finishRise=p.b.facade===0?.045:0;
  const rug=(u,v,w,d)=>at('rug',u,v,w,.018,d,false,0,finishRise);
  const art=(u,v,w,h)=>{
    const toMiddle=Math.sign(p.z-r.z)||1,center=1.67-h/2;
    if(p.b.housing){
      if(level.rooms.length>2)at('art',u-.54,toMiddle*(r.d/2-.102),w,h,.055,false,(toMiddle>0?Math.PI:0)-yaw,center);
      else at('art',-rim+.098,1.62,w,h,.055,false,Math.PI,center);
    }else at('art',u,v+toMiddle*1.02,w,h,.055,false,0,center);
  };
  const ceiling=height-.152;
  const lamp=(u,v,width,drop)=>at('pendant',u,v,width,drop,width,false,0,ceiling-drop);

  at('floor',0,0,r.d-.13,.008,r.w-.12,false,0,finishRise);
  if(role==='lounge'){
    const length=Math.min(2.55,r.d*.54),u=rim-.56;
    at('sofa',u,.14,length,.91,.92);
    at('coffee',u-.98,.14,length*.55,.47,.43);
    at('plant',rim-.44,-r.d*.36,.48,1.32,.48);
    rug(u-.49,.14,length+.38,1.89);
    art(rim-.091,.14,length*.67,.70);
    lamp(u-.42,.14,.62,.30);
    if(level.rooms.length===2){
      at('dining',rim-.55,r.d*.35,.82,.76,.71);
      at('chair',rim-1.28,r.d*.35,.51,.85,.50,true,Math.PI);
    }
  }else if(role==='dining'){
    const u=rim-1.00,length=Math.min(1.85,r.d*.31);
    at('dining',u,.14,length,.80,.94);
    for(const end of [-1,1]){
      at('chair',u,.14+end*(length/2+.31),.54,.88,.51,true,end*Math.PI/2);
    }
    at('credenza',rim-.35,-r.d*.38,Math.min(1.38,r.d*.22),.87,.39);
    rug(u,.14,length+1.16,1.37);
    art(rim-.084,.14,1.44,.64);
    lamp(u,.14,.80,.36);
  }else if(role==='bedroom'){
    const depth=Math.min(2.16,r.w-1.54),width=Math.min(1.72,r.d*.42),u=rim-.14-depth/2;
    at('bed',u,-.05,width,1.20,depth);
    for(const end of [-1,1]){
      at('nightstand',rim-.36,-.05+end*(width/2+.31),.47,.67,.44);
    }
    rug(u-.14,-.05,width+.67,depth+.31);
    art(rim-.09,-.05,width*.76,.53);
    lamp(u-.29,-.05,.46,.26);
  }else{
    const u=rim-.42;
    at('desk',u,.14,Math.min(1.8,r.d*.36),.79,.61);
    at('chair',u-.67,.14,.55,.92,.57,true,Math.PI);
    at('books',rim-.33,-r.d*.33,Math.min(1.21,r.d*.19),1.94,.36);
    at('plant',rim-.45,r.d*.35,.49,1.32,.49);
    rug(u-.33,.14,2.05,1.55);
    art(rim-.09,.14,1.35,.61);
    lamp(u-.34,.14,.54,.27);
  }
  return objects;
}

export function furnishResidentialLevel(level){
  const {rooms,p}=level,profile=residentialProfile(p);
  if(!profile)return;
  const roles=rooms.length===2?['lounge','bedroom']:['lounge','dining','bedroom','study'];
  return layout(profile,rooms.flatMap((room,i)=>furnishRoom(level,room,roles[i])));
}

// The lodge and cabin have one shallow open room. Keep the central entrance bay
// free and turn each long piece along an exterior wall.
export function furnishRuralHome(plan){
  const {b}=plan,profile=residentialProfile(plan);
  if(plan.type!=='outpost' || !profile)return;
  const {x,z,base:y,w,d}=b,wide=plan.id===0;
  const objects=[];
  const put=(kind,u,v,width,height,span,yaw,solid=true,dy=0)=>{
    objects.push(fixture(kind,x+u,y+dy,z+v,width,height,span,yaw,solid));
  };
  const wall=w/2;
  put('floor',0,0,w-.33,.008,d-.31,0,false,.007);
  // Mirror the solid wall bands so interior plaster cannot cover a real window.
  for(const band of plan.shell){
    const sideWall=band.d===d,side=Math.sign(sideWall?band.x-x:band.z-z);
    const u=band.x-x-(sideWall?side*(band.w/2+.011):0);
    const v=band.z-z-(sideWall?0:side*(band.d/2+.011));
    const yaw=sideWall?-side*Math.PI/2:side>0?Math.PI:0;
    put('wallLining',u,v,sideWall?band.d:band.w,band.h,.021,yaw,false,band.bottom-y);
  }
  put('ceiling',0,0,w-.25,.05,d-.25,0,false,b.eave-.038);
  put('sofa',-wall+.70,-.23,wide?2.44:1.76,.91,.93,Math.PI/2);
  put('coffee',-wall+1.73,-.23,wide?1.38:1.04,.47,.49,Math.PI/2);
  put('rug',-wall+1.18,-.23,wide?2.88:2.12,.018,1.85,Math.PI/2,false);
  put('art',-wall+.201,-.23,1.3,.77,.055,Math.PI/2,false,1.30);
  put('plant',-wall+.53,d/2-.55,.52,1.32,.52,0);
  if(wide){
    put('dining',wall-1.45,-.72,1.68,.80,.93,-Math.PI/2);
    for(const s of [-1,1])put('chair',wall-1.45,-.72+s*1.15,.53,.88,.52,s*Math.PI/2);
    put('credenza',wall-.43,-.77,1.7,.87,.50,-Math.PI/2);
  }else{
    put('bed',wall-1.23,-.40,1.55,1.20,2.07,-Math.PI/2);
    put('nightstand',wall-.45,.86,.47,.67,.44,-Math.PI/2);
    put('art',wall-.201,-.40,1.17,.53,.055,-Math.PI/2,false,1.41);
  }
  for(const v of [-1.47,-.37,1.36])put('beam',0,v,w-.25,.18,.13,0,false,b.eave-.17);
  const drop=b.eave-2.78;
  for(const side of [-1,1])put('pendant',side*w*.28,-.37,.65,drop,.65,0,false,2.69);
  return layout(profile,objects);
}
