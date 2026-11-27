// One-metre wall sections share a grid between vehicle contact, walking and rendering.
export const cutGrid={west:-128,north:-512,width:256,height:640,size:1,low:1.09,high:3.55};
const {west,north,width,height,size,high}=cutGrid;
const indexes=new WeakMap();
function removed(doors){
  const list=doors?.tankWallCuts;
  if(!list)return;
  let set=indexes.get(list);
  if(!set || set.size!==list.length){set=new Set(list);indexes.set(list,set);}
  return set;
}
const col=x=>Math.floor((x-west)/size),row=z=>Math.floor((z-north)/size);
export function inTankOpening(doors,x,y,z){
  if(!doors?.tankWallCuts || y>high)return false;
  const i=col(x),j=row(z);
  return i>=0 && i<width && j>=0 && j<height && removed(doors).has(j*width+i);
}
export function openTankWall(doors,id){
  if(id==null || removed(doors)?.has(id))return false;
  (doors.tankWallCuts??=[]).push(id);
  return true;
}
export function noteWallBreak(doors,material,x,y,z){
  const seq=doors.wallSeq=(doors.wallSeq??0)+1;
  (doors.wallSounds??=[]).push({seq,material,x,y,z});
  if(doors.wallSounds.length>12)doors.wallSounds.shift();
}
export function wallSectionContact(box,x,z,reach,doors,tank,contact){
  const first=contact(box);
  if(!first || (!tank && !doors?.tankWallCuts))return first;
  const x0=box.x-box.w/2,x1=box.x+box.w/2,z0=box.z-box.d/2,z1=box.z+box.d/2;
  const right=Math.min(width-1,col(Math.min(x1,x+reach))), south=Math.min(height-1,row(Math.min(z1,z+reach)));
  const leftCol=Math.max(0,col(Math.max(x0,x-reach))),topRow=Math.max(0,row(Math.max(z0,z-reach)));
  if(leftCol>right || topRow>south)return first;
  const gone=removed(doors);
  if(!tank){
    let nearOpening=false;
    for(let j=topRow;j<=south && !nearOpening;j++)for(let i=leftCol;i<=right;i++)if(gone.has(j*width+i)){nearOpening=true;break;}
    if(!nearOpening)return first;
  }
  let result,cutNearby=false;
  for(let j=topRow;j<=south;j++){
    for(let i=leftCol;i<=right;i++){
      const id=j*width+i;
      const left=Math.max(x0,west+i*size),end=Math.min(x1,west+(i+1)*size);
      const top=Math.max(z0,north+j*size),bottom=Math.min(z1,north+(j+1)*size);
      if(end<=left || bottom<=top)continue;
      if(gone?.has(id)){cutNearby=true;continue;}
      const hit=contact({x:(left+end)/2,z:(top+bottom)/2,w:end-left,d:bottom-top});
      if(hit && (!result || hit.depth>result.depth))result={...hit,object:box,wallCell:id};
    }
  }
  if(!cutNearby && result)return {...first,wallCell:result.wallCell};
  return result;
}
