// The oceanfront rooms share a single, step-free circulation aisle behind the terrace.
export const lidoHouse={x:25,z:-395,w:24,d:10,name:'Villa Lido'};
export const lidoPieces=[
  {kind:'bed',x:17.2,z:-397.4,w:2.45,d:2.18,h:.84},
  {kind:'nightstand',x:15.48,z:-397.9,w:.65,d:.66,h:.83},
  {kind:'screen',x:20.55,z:-397.65,w:.17,d:3.95,h:3.65},
  {kind:'sofa',x:24.28,z:-397.88,w:3.35,d:1.01,h:1.20},
  {kind:'coffee',x:24.30,z:-396.02,w:1.88,d:.76,h:.72},
  {kind:'vitrine',x:28.02,z:-399.29,w:2.60,d:.52,h:2.45},
  {kind:'bench',x:16.80,z:-391.38,w:1.45,d:.50,h:.78},
  {kind:'island',x:32.15,z:-395.95,w:3.42,d:1.04,h:1.25},
  {kind:'kitchen',x:32.45,z:-398.95,w:5.45,d:.83,h:1.26},
  {kind:'dining',x:32.74,z:-392.42,w:2.26,d:1.13,h:1.06},
  ...[32,33.48].flatMap(x=>[-393.39,-391.46].map(z=>({kind:'chair',x,z,w:.56,d:.56,h:1.13}))),
];
export const lidoFurniture=lidoPieces.map(({x,z,w,d,h})=>({x,z,w,d,h,bottom:.26}));

export function furnishLido({collection,box,cyl,beam}){
  const oak=0x976e50,walnut=0x664c40,marble=0xe2d7c2,brass=0xc1a16d,low=.27;
  collection.carpet('lido',24.28,low,-396.90,4.65,3.02,0xb8a08c,0xd6bf94);
  collection.carpet('lido',17.20,low,-397.03,3.85,3.59,0x859d8c,0xdbcaab);
  for(const piece of lidoPieces){
    const {kind,x,z,w,d,h}=piece,p={...piece,bottom:low,reverse:kind==='chair' && z< -392.5};
    if(kind==='island')collection.objets('lido',p,'editions');
    if(collection.furnish(p,'lido'))continue;

    if(kind==='screen'){
      for(let j=0;j<13;j++)box(oak,x,low+1.68,z+(j-6)*.31,.14,3.36,.085);
      continue;
    }
    // Waterfall counter and recessed backsplash across the kitchen's back wall.
    const lift=h-low;
    box(walnut,x,low+lift*.5,z,w-.09,lift-.05,d-.09);
    box(marble,x,h-.025,z,w,.08,d);
    for(let u=-w*.40;u<w*.48;u+=.58){
      box(oak,x+u,low+lift*.50,z+d*.475,.548,lift*.82,.032);
      box(brass,x+u,h-.19,z+d*.513,.17,.026,.04);
    }
    box(0x3d4344,x+1.07,h+.025,z,1.19,.032,.52);
    for(const k of [-.36,.36])cyl(0x595b58,x+1.07+k,h+.047,z,.28,.012);
    box(0x7e847a,x-1.35,h+.025,z,.83,.022,.53);
    beam(brass,[x-1.35,h,z-.25],[x-1.35,h+.38,z-.25],.046);
    beam(brass,[x-1.35,h+.38,z-.25],[x-1.35,h+.38,z+.04],.046);
    collection.objets('lido',p,'orchid');
  }
  // The art is backed by its own timber gallery panel rather than floating on the glazing.
  box(walnut,24.08,2.03,-399.79,4.25,3.49,.12);
  for(let i=0;i<39;i++)box(i%4===0?walnut:oak,21.99+i*.11,2.03,-399.715,.048,3.47,.029);
  box(brass,24.08,.351,-399.69,4.25,.032,.049);
  for(const [i,tile] of [collection.botanical,collection.shell,collection.compass].entries()){
    collection.picture('lido',22.83+i*1.26,2.17,-399.666,1.105,1.59,1,tile);
  }
  for(const x of [30.98,32.16,33.34]){
    cyl(brass,x,3.5,-395.95,.026,.6);cyl(0xe9ce9b,x,3.11,-395.95,.40,.19);
  }
}
