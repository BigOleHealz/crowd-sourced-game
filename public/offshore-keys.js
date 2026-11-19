// The skyline and water simulation sample the same piecewise shore profiles.
export const mangroveKeys=[
  [94,-56,1,0,62,20,'key',118], [109,-151,1,0,53,19,'key',205],
  [108,62,1,0,49,19,'key',76], [-98,-126,-1,0,53,18,'key',122],
];

export function coastProfile(length,depth,seed,land) {
  const phase=seed*1.733,count=Math.ceil(length/7);
  function line(u){
    const tips=Math.abs(2*u/length);
    return (land?2.7:4.9)*Math.sin(u*.057+phase)+2.9*Math.sin(u*.091+phase*.7)+
      (land?depth*.50:13)*Math.pow(tips,5);
  }
  const slices=Array.from({length:count+1},(_,i)=>{
    const u=-length/2+length*i/count,shore=line(u);
    const taper=land?Math.pow(Math.abs(2*u/length),2.5):0,inland=depth*(1-.40*taper);
    return [[u,-.55,shore-2.1],[u,.21,shore],[u,.70,shore+1.55],[u,land?1.32:1.20,shore+4.1],[u,land?1.42:1.30,Math.max(shore+5,inland)]];
  });
  return {line,slices};
}

export const keyShores=mangroveKeys.map(([x,z,ix,iz,length,depth,,seed])=>{
  const {slices}=coastProfile(length,depth,seed,true);
  const chart=slices.map(row=>row[1]).concat(slices.map(row=>row.at(-1)).reverse())
    .map(([u,,v])=>[x-iz*u+ix*v,z+ix*u+iz*v]);
  return {x,z,ix,iz,length,slices,chart};
});

export function keyGround(x,z) {
  for(const key of keyShores){
    const {ix,iz,length,slices}=key,dx=x-key.x,dz=z-key.z;
    const u=-iz*dx+ix*dz;
    if(Math.abs(u)>length/2)continue;
    const t=(u/length+.5)*(slices.length-1),i=Math.min(slices.length-2,Math.floor(t)),f=t-i;
    const a=slices[i],b=slices[i+1],v=ix*dx+iz*dz;
    let low=a[0][2]+f*(b[0][2]-a[0][2]);
    if(v<low)continue;
    for(let j=1;j<a.length;j++){
      const high=a[j][2]+f*(b[j][2]-a[j][2]);
      if(v<=high){
        // Same diagonal as the two triangles forming the rendered shore quad.
        const diagonal=a[j-1][2]+f*(b[j][2]-a[j-1][2]);
        const rise=v<=diagonal ? (v-low)/(b[j][2]-b[j-1][2]) : 1-(high-v)/(a[j][2]-a[j-1][2]);
        return a[j-1][1]+rise*(a[j][1]-a[j-1][1]);
      }
      low=high;
    }
  }
  return -2.8;
}
