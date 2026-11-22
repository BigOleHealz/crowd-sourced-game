// Metres in world space. Water level and bottom are independent of the bay tide.
export const estatePools=[
  {name:'Casa de Luma courtyard',x:-25,z:-392.6,w:10.3,d:13.6,color:0x9bdfdb,entry:'south',depth:1.65},
  {name:'Palazzo Mare terrace',x:26.4,z:-429.8,w:17.7,d:5.6,color:0xabddd5,entry:'west',depth:1.85},
  {name:'Sculpture garden',x:-25,z:-443,w:5.4,d:16.4,color:0x397774,reflecting:true,entry:'south',depth:1.5},
].map(p=>({...p,waterY:.78,deckY:.80,steps:7,run:.43}));

export const footprint=p=>({west:p.x-p.w/2,east:p.x+p.w/2,north:p.z-p.d/2,south:p.z+p.d/2});
export const estatePoolHoles=estatePools.map(footprint);

export function swimmingPoolAt(x,z,probe=Infinity){
  if(z> -377 || z< -457 || x< -33 || x>37)return;
  return estatePools.find(p=>Math.abs(x-p.x)<p.w/2 && Math.abs(z-p.z)<p.d/2 &&
    (probe===Infinity || probe>=p.waterY-p.depth-.6 && probe<=p.deckY+4));
}

export function poolTreadHeight(p,index){
  return p.deckY-(index+1)*(p.deckY-p.waterY+p.depth)/(p.steps+1);
}

export function poolFloorAt(p,x,z){
  const distance=p.entry==='west'?x-p.x+p.w/2:p.z+p.d/2-z;
  const index=Math.floor(distance/p.run);
  return index>=0 && index<p.steps ? poolTreadHeight(p,index) : p.waterY-p.depth;
}
