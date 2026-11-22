// The oceanfront rooms share a single, step-free circulation aisle behind the terrace.
export const lidoHouse={x:25,z:-395,w:24,d:10,name:'Villa Lido'};
export const lidoPieces=[
  {kind:'bed',x:17.2,z:-397.4,w:2.45,d:2.18,h:.84},
  {kind:'nightstand',x:15.48,z:-397.9,w:.65,d:.66,h:.83},
  {kind:'screen',x:20.55,z:-397.65,w:.17,d:3.95,h:3.65},
  {kind:'sofa',x:24.28,z:-397.88,w:3.35,d:1.01,h:1.20},
  {kind:'coffee',x:24.30,z:-396.02,w:1.88,d:.76,h:.72},
  {kind:'island',x:32.15,z:-395.95,w:3.42,d:1.04,h:1.25},
  {kind:'kitchen',x:32.45,z:-398.95,w:5.45,d:.83,h:1.26},
  {kind:'dining',x:32.74,z:-392.42,w:2.26,d:1.13,h:1.06},
  ...[32,33.48].flatMap(x=>[-393.39,-391.46].map(z=>({kind:'chair',x,z,w:.56,d:.56,h:1.13}))),
];
export const lidoFurniture=lidoPieces.map(({x,z,w,d,h})=>({x,z,w,d,h,bottom:.26}));

export function furnishLido({box,cyl,leaf,beam,masonry}){
  const oak=0x976e50,walnut=0x664c40,marble=0xe2d7c2, linen=0xf1e6cd,jade=0x52746b, brass=0xc1a16d;
  const low=.27;
  for(const {kind,x,z,w,d,h} of lidoPieces){
    const block=(c,dy,ww,hh,dd,dx=0,dz=0)=>box(c,x+dx,low+dy,z+dz,ww,hh,dd);
    const top=h-low;
    if(kind==='bed'){
      block(walnut,.15,w,.30,d);block(linen,.40,w+.06,.25,d+.04);
      block(0x9baaa0,.55,w+.06,.065,d*.47,0,.42);
      block(oak,.73,w+.24,1.38,.15,0,-d*.49);
      for(const s of [-1,1])block(0xf3ead6,.59,.91,.19,.43,s*.56,-.70);
    }else if(kind==='screen'){
      for(let j=0;j<13;j++)block(oak,1.68,.14,3.36,.085,0,(j-6)*.31);
    }else if(kind==='sofa'){
      block(walnut,.15,w-.15,.20,d-.13);block(jade,.38,w,.30,d);
      block(0x618277,.68,w,.62,.20,0,-d*.4);
      for(const s of [-1,0,1])block(0x9cb9a5,.52,.98,.12,.68,s*1.04,.06);
      for(const s of [-1,1])block(jade,.57,.16,.38,d,s*(w/2-.08));
    }else if(kind==='chair'){
      block(oak,.22,.10,.44,.36);block(jade,.47,w,.12,d);
      block(jade,.65,w,.4,.09,0,z<-392.5?-.25:.25);
    }else if(kind==='island'||kind==='kitchen'){
      block(oak,top/2,w-.09,top-.05,d-.09);
      block(marble,top-.025,w,.08,d);
      for(let u=-w*.40;u<w*.48;u+=.58)block(brass,top*.73,.17,.026,.04,u,d*.47);
      if(kind==='kitchen'){
        block(0x3d4344,top+.025,1.19,.032,.52,1.07);
        for(const k of [-.36,.36])cyl(0x595b58,x+1.07+k,h+.047,z,.28,.012);
        block(0x7e847a,top+.025,.83,.022,.53,-1.35);
        beam(brass,[x-1.35,h,z-.25],[x-1.35,h+.38,z-.25],.046);
        beam(brass,[x-1.35,h+.38,z-.25],[x-1.35,h+.38,z+.04],.046);
      }else{
        cyl(brass,x,h+.04,z,.51,.06);
        for(let k=0;k<4;k++)leaf(k%2?0xd89b4f:0xb9a657,x+(k-1.5)*.11,h+.12,z+.055*(k%2),.18,.17,.18);
      }
    }else{
      block(walnut,top/2,w*.52,top-.07,d*.62);block(marble,top-.045,w,.09,d);
      if(kind==='nightstand'){
        cyl(brass,x,h+.18,z,.07,.36);cyl(linen,x,h+.54,z,.46,.38);
      }
    }
  }
  for(const x of [22.9,24.1,25.3]){
    masonry(brass,x,2.15,-399.77,.91,1.17,.09);
    box(x<24?0x54797b:x<25?0xba7559:0xbda36a,x,2.15,-399.71,.81,1.06,.045);
  }
  for(const x of [30.98,32.16,33.34]){
    cyl(brass,x,3.5,-395.95,.026,.6);cyl(0xe9ce9b,x,3.11,-395.95,.40,.19);
  }
}
