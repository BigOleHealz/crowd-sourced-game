import {BufferGeometry,Float32BufferAttribute,DoubleSide} from 'three';

// The source GLB uses one broad glass panel across the main cabin's aft face.
// Partition its triangles around a doorway rather than hiding the whole pane.
const door={left:-1.02,right:1.02,bottom:4.28,top:6.63,back:-12};
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function clip(poly,axis,limit,sign){
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length];
    const da=sign*(a[0][axis]-limit),db=sign*(b[0][axis]-limit);
    if(da>=0)out.push(a);
    if((da<0&&db>0)||(da>0&&db<0)){
      const t=da/(da-db);
      out.push(a.map((value,j)=>mix(value,b[j],t)));
    }
  }
  return out;
}
function append(poly,positions,normals){
  for(let i=1;i+1<poly.length;i++)for(const v of [poly[0],poly[i],poly[i+1]]){
    positions.push(...v[0]);normals.push(...v[1]);
  }
}
export function openSolanaRearDoor(model){
  const pane=model.getObjectByName('Superyacht_9');
  if(!pane)throw Error('Solana source GLB has no rear glass');
  const source=pane.geometry,index=source.index,pos=source.getAttribute('position'),normal=source.getAttribute('normal');
  const positions=[],normals=[];
  let cut=0;
  for(let i=0;i<index.count;i+=3){
    const tri=[];
    for(let k=0;k<3;k++){
      const n=index.getX(i+k);
      tri.push([[pos.getX(n),pos.getY(n),pos.getZ(n)],[normal.getX(n),normal.getY(n),normal.getZ(n)]]);
    }
    if(tri.every(v=>Math.abs(v[0][2]-door.back)<.015)){
      let inside=tri;
      for(const [axis,limit,sign] of [[0,door.left,1],[0,door.right,-1],[1,door.bottom,1],[1,door.top,-1]]){
        append(clip(inside,axis,limit,-sign),positions,normals);
        inside=clip(inside,axis,limit,sign);
        if(!inside.length)break;
      }
      if(inside.length)cut++;
    }else append(tri,positions,normals);
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new Float32BufferAttribute(normals,3));
  geometry.computeBoundingSphere();
  pane.geometry=geometry;
  pane.material=pane.material.clone();pane.material.side=DoubleSide;
  return cut;
}
