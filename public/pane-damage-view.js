// One indexed draw per material. Hide only the index spans owned by broken sheets.
export function paneBatch(batch){
  const spans=[];
  function add(id,draw){
    const start=batch.indices.length;draw();
    spans.push({id,start,end:batch.indices.length});
  }
  function bind(mesh){
    const index=mesh.geometry.index,original=index.array.slice();
    let previous=null;
    return broken=>{
      if(!broken && !previous)return;
      let dirty=false;
      for(const p of spans){
        const hidden=!!broken?.[p.id];
        if(hidden===!!p.hidden)continue;
        p.hidden=hidden;dirty=true;
        if(hidden)index.array.fill(original[p.start],p.start,p.end);
        else index.array.set(original.subarray(p.start,p.end),p.start);
      }
      if(dirty)index.needsUpdate=true;
      previous=broken;
    };
  }
  return {add,bind};
}
