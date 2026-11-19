// The rooms retain their original draw calls. Only the struck piece's vertex
// ranges are streamed, and their rest data is saved on its first impact.
const scenes=new WeakMap();
export function furnitureRanges(scene,batches,side=0,originX=0,originZ=0){
  let pieces=scenes.get(scene);
  if(!pieces){
    pieces=new Map();
    scenes.set(scene,pieces);
    pieces.active=new Set();
  }
  const ranges=[];
  return {
    start(piece){
      return {piece,starts:batches.map(b=>b.positions.length)};
    },
    end({piece,starts}){
      for(let k=0;k<batches.length;k++){
        const start=starts[k],end=batches[k].positions.length;
        if(end>start)ranges.push({k,start,end,piece});
      }
    },
    bind(meshes){
      for(const r of ranges){
        const {piece:p}=r;
        if(!pieces.has(p.id))pieces.set(p.id,[]);
        const px=side?-side*(p.z-originZ):p.x,pz=side?side*(p.x-originX):p.z;
        pieces.get(p.id).push({...r,px,pz,side,ground:p.floor-(side ? .80 : 0),g:meshes[r.k].geometry,last:null});
      }
    }
  };
}

export function updateShopFurniture(scene,doors){
  const pieces=scenes.get(scene);
  if(!pieces)return;
  const state=doors?.furniture;
  // A fresh expedition can share the same rendered map.
  for(const id of pieces.active){
    if(state?.[id])continue;
    for(const r of pieces.get(id)){
      for(const [name,source] of [['position',r.pos],['normal',r.norm]]){
        const a=r.g.getAttribute(name);a.array.set(source,r.start);
        a.addUpdateRange(r.start,r.end-r.start);a.needsUpdate=true;
      }
      r.last=null;
    }
    pieces.active.delete(id);
  }
  if(!state)return;
  for(const [id,f] of Object.entries(state)){
    const ranges=pieces.get(id);
    if(!ranges)continue;
    pieces.active.add(id);
    for(const r of ranges){
      if(r.last===f.phase)continue;
      r.last=f.phase;
      const pos=r.g.attributes.position,norm=r.g.attributes.normal;
      r.pos??=pos.array.slice(r.start,r.end);r.norm??=norm.array.slice(r.start,r.end);
      const dx=r.side?-r.side*f.dz:f.dx,dz=r.side?r.side*f.dx:f.dz;
      const radius=(f.dx?r.piece.w:r.piece.d)/2;
      const t=f.phase,angle=(t*(.65+1.25*t-.90*t*t))*Math.PI/2;
      const c=Math.cos(angle),s=Math.sin(angle),squash=1-.12*t*t;
      for(let j=0;j<r.pos.length;j+=3){
        const x=r.pos[j]-r.px,y=r.pos[j+1]-r.ground,z=r.pos[j+2]-r.pz;
        const along=x*dx+z*dz,delta=along*(c-1)+y*s+f.shift*t;
        const i=r.start+j;
        pos.array[i]=r.px+x+delta*dx;
        pos.array[i+1]=r.ground+(y*c+(radius-along)*s)*squash;
        pos.array[i+2]=r.pz+z+delta*dz;
        const nx=r.norm[j],ny=r.norm[j+1],nz=r.norm[j+2],n=nx*dx+nz*dz;
        const d=n*(c-1)+ny*s;
        norm.array[i]=nx+d*dx;
        norm.array[i+1]=(ny*c-n*s)/squash;
        norm.array[i+2]=nz+d*dz;
      }
      for(const a of [pos,norm]){a.addUpdateRange(r.start,r.end-r.start);a.needsUpdate=true;}
    }
  }
}
