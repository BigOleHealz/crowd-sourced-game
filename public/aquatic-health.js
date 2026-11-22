const round=n=>Math.round(n*1000)/1000;
function localPoint(point,pose,size) {
  const dx=(point.x-pose.x)/size,dy=(point.y-pose.y)/size,dz=(point.z-pose.z)/size;
  const c=Math.cos(pose.yaw),s=Math.sin(pose.yaw);
  const x=c*dx+s*dz,z=-s*dx+c*dz;
  const cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch);
  const y=cp*dy+sp*z,cr=Math.cos(pose.roll),sr=Math.sin(pose.roll);
  return [cr*x+sr*y,-sr*x+cr*y,-sp*dy+cp*z];
}

export function swimmingAnimalContact(states,start,end,volumes,sizeFor) {
  let nearest=null;
  for (const [index,pose] of (states??[]).entries()) {
    if (pose.hp<=0) continue;
    const size=sizeFor(index,pose),pad=2*size;
    if (pose.x<Math.min(start.x,end.x)-pad || pose.x>Math.max(start.x,end.x)+pad ||
        pose.z<Math.min(start.z,end.z)-pad || pose.z>Math.max(start.z,end.z)+pad ||
        pose.y<Math.min(start.y,end.y)-pad || pose.y>Math.max(start.y,end.y)+pad) continue;
    const a=localPoint(start,pose,size),b=localPoint(end,pose,size);
    for (const [x,y,z,rx,ry,rz] of volumes) {
      const ox=(a[0]-x)/rx,oy=(a[1]-y)/ry,oz=(a[2]-z)/rz;
      const dx=(b[0]-a[0])/rx,dy=(b[1]-a[1])/ry,dz=(b[2]-a[2])/rz;
      const length=dx*dx+dy*dy+dz*dz,dot=ox*dx+oy*dy+oz*dz;
      const offset=ox*ox+oy*oy+oz*oz-1,disc=dot*dot-length*offset;
      if (offset>0 && (length===0 || disc<0)) continue;
      const t=offset<=0?0:(-dot-Math.sqrt(disc))/length;
      if (t>=0 && t<=1 && (!nearest || t<nearest.t)) nearest={index,t};
    }
  }
  return nearest;
}
export function damageSwimmingAnimal(states,index,amount,kind,point) {
  const animal=states?.[index];
  if (!animal || animal.hp<=0 || !Number.isFinite(amount) || amount<=0) return false;
  animal.hp=Math.max(0,animal.hp-amount);
  animal.hitSeq++;
  animal.ageSinceHit=0;
  animal.hitX=round(point?.x??animal.x);
  animal.hitY=round(point?.y??animal.y);
  animal.hitZ=round(point?.z??animal.z);
  if (animal.hp===0) {
    animal.deathKind=kind;animal.deathY=animal.y;
    animal.air=-1;
  }
  return true;
}
