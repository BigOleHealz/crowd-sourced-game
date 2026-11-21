// Left front, left rear, right front, right rear. Store visual damage on the
// actual car so replacement cars and existing observers agree on its fittings.
export function strikeFittings(car,at,amount){
  if(!at || !amount || car.wrecked)return;
  const c=Math.cos(car.yaw),s=Math.sin(car.yaw),dx=at.x-car.x,dz=at.z-car.z;
  const x=dx*c+dz*s,z=dz*c-dx*s;
  const wear=car.fittingDamage??=[0,0,0,0];
  for(let i=0;i<4;i++){
    const side=i<2?-1:1,end=i%2?1:-1;
    const across=Math.min(1,Math.max(0,.5+side*x));
    const along=Math.min(1,Math.max(0,.5+end*z*.66));
    wear[i]=Math.min(100,wear[i]+Math.round(amount*across*along));
  }
}

export const lampWorking=(car,corner)=>!car.wrecked && (car.fittingDamage?.[corner]??0)<38;

// Each car already owns its mesh geometry; only update the bumper vertices
// and lens colours on a changed damage snapshot, without extra draw calls.
export function damagedFittings(meshes,nose,tail,halfWidth,lampLow=.50){
  const rows=[];
  for(const mesh of meshes){
    const {position,color}=mesh.geometry.attributes;
    if(!position || !color)continue;
    for(let i=0;i<position.count;i++){
      const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
      const rear=z>0,distance=rear?tail-z:z-nose;
      if(distance>.36 || Math.abs(x)<halfWidth*.38 || y<.13 || y>1.13)continue;
      const edge=Math.min(1,Math.max(0,1-distance/.36))*Math.min(1,Math.abs(x)/halfWidth);
      const bumper=y<.62 ? edge*(1-Math.max(0,y-.36)/.30) : 0;
      const lens=distance<.26 && y>=lampLow && Math.abs(x)>halfWidth*.42;
      if(!bumper && !lens)continue;
      rows.push({i,corner:(x<0?0:2)+(rear?1:0),bumper,lens,position,color,
        r:color.getX(i),g:color.getY(i),b:color.getZ(i)});
    }
  }
  const prev=[0,0,0,0],attrs=new Set();
  const droop=wear=>Math.min(.22,Math.max(0,wear-16)*.0045);
  return (car,rebuilt=false)=>{
    const wear=car.fittingDamage;
    if(!rebuilt && prev.every((n,i)=>n===(wear?.[i]??0)))return;
    for(const {i,corner,bumper,lens,position,color,r,g,b} of rows){
      const value=wear?.[corner]??0;
      if(!rebuilt && value===prev[corner])continue;
      if(bumper){
        const change=droop(value)-(rebuilt?0:droop(prev[corner]));
        position.setY(i,position.getY(i)-bumper*change);attrs.add(position);
      }
      if(lens){
        const tint=lampWorking(car,corner)?1:.055;
        color.setXYZ(i,r*tint,g*tint,b*tint);attrs.add(color);
      }
    }
    for(const attr of attrs)attr.needsUpdate=true;
    attrs.clear();
    for(let i=0;i<4;i++)prev[i]=wear?.[i]??0;
  };
}
