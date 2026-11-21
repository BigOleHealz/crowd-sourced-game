// Resolved once when the arcade event starts. Opposite contributions cancel.
// An evenly damaged footprint tips toward its first marked bay.
export function damageDirection(samples){
  let x=0,z=0,first=null;
  for(const p of samples){
    const length=Math.hypot(p.x,p.z);
    if(length<.0001)continue;
    first??=p;x+=p.x;z+=p.z;
  }
  if(Math.hypot(x,z)<.001){x=first?.x??0;z=first?.z??1;}
  const length=Math.hypot(x,z);
  return {x:Math.round(x/length*1000)/1000,z:Math.round(z/length*1000)/1000};
}
