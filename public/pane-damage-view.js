import {paneSupportLost} from './glass-support.js';

// One indexed draw per material. Hide only the index spans owned by missing sheets.
export function paneBatch(batch){
  const spans=[];
  function add(id,draw,support){
    const start=batch.indices.length;draw();
    spans.push({id,start,end:batch.indices.length,support});
  }
  function bind(mesh){
    const index=mesh.geometry.index,original=index.array.slice();
    let damaged=false;
    return (broken,doors)=>{
      if(!broken && !doors && !damaged)return;
      let dirty=false;
      for(const p of spans){
        const hidden=!!broken?.[p.id] || (p.support && paneSupportLost(p.support,doors))===true;
        if(hidden===!!p.hidden)continue;
        p.hidden=hidden;dirty=true;
        if(hidden)index.array.fill(original[p.start],p.start,p.end);
        else index.array.set(original.subarray(p.start,p.end),p.start);
      }
      if(dirty)index.needsUpdate=true;
      damaged=Boolean(broken || doors?.towerBreaches?.length || doors?.collapsedTowers?.length || doors?.houseRuins);
    };
  }
  return {add,bind};
}
