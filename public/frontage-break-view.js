import * as THREE from 'three';

// Each facade still draws one glass mesh and one frame mesh. Only change their
// triangle indices when a new snapshot actually removes or restores a bay.
export function breakableWindows(scene,Batch,debris){
  const panels=[];
  const box=new THREE.BoxGeometry(),plane=new THREE.PlaneGeometry().rotateY(Math.PI/2);
  const metal=new THREE.MeshLambertMaterial({vertexColors:true});
  function add(face,glass){
    const sheets=new Batch(), frames=new Batch(),ranges=[];
    let moving=null;
    for(const [i,[lo,hi,door]] of face.spans.entries()){
      const low=face.showcase?.89:.92, top=face.showcase?(lo<2.11?3.04:3.13):3.65;
      const start=[sheets.indices.length,frames.indices.length], z=(lo+hi)/2;
      const customer=face.entry?.bayIndex===i?face.entry:null;
      const pane=(x,b,t,l,r)=>{if(r>l && t>b)sheets.add(plane,0xffffff,x,(b+t)/2,(l+r)/2,1,t-b,r-l);};
      if(!door && !customer)pane(face.x,low,top,lo,hi);
      const bar=(x,y,z,w,h,d,tint=0x464742)=>frames.add(box,tint,x,y,z,w,h,d);
      bar(face.x+.035*face.side,(low+top)/2,lo,.085,top-low,.055);
      if(customer){
        for(const [a,b] of [[lo,customer.z-customer.width/2],[customer.z+customer.width/2,hi]])
          bar(face.x+.035*face.side,low,(a+b)/2,.10,.045,b-a);
        bar(face.x,.836,customer.z,.22,.015,customer.width,0xb5aa90);
      }else bar(face.x+.035*face.side,low,z,.10,.045,hi-lo);
      if(i===face.spans.length-1)bar(face.x+.035*face.side,(low+top)/2,hi,.085,top-low,.055);
      if(customer){
        const {z:cz,width,head}=customer, left=cz-width/2,right=cz+width/2;
        pane(face.x,low,top,lo,left);pane(face.x,low,top,right,hi);
        pane(face.x,head,top,left,right);
        for(const edge of [left,right])bar(face.x,(head+.84)/2,edge,.085,head-.84,.045);
        bar(face.x,head+.024,cz,.10,.063,width);
        // The floor track is flush. Only the leaf, stiles and handle slide.
        const leafX=face.x-.065*face.side,bottom=.847;
        const begin=[sheets.positions.length/3,frames.positions.length/3];
        pane(leafX,bottom+.045,head-.045,left+.032,right-.032);
        for(const edge of [left+.019,right-.019])bar(leafX,(bottom+head)/2,edge,.052,head-bottom,.038);
        for(const h of [bottom+.025,head-.027])bar(leafX,h,cz,.052,.050,width);
        bar(leafX+.044*face.side,1.85,cz+face.side*width*.37,.053,.34,.033,0xb9a783);
        moving={begin,end:[sheets.positions.length/3,frames.positions.length/3],last:0};
      }
      ranges.push({start,end:[sheets.indices.length,frames.indices.length],
        pane:{widthAxis:'z',x:face.x,z,width:hi-lo,bottom:low,top}});
    }
    const meshes=[sheets.mesh(scene,glass,false),frames.mesh(scene,metal,false)];
    const indices=meshes.map(m=>m.geometry.index), saved=indices.map(idx=>idx.array.slice());
    if(moving){
      moving.z=meshes.map((m,i)=>{
        const pos=m.geometry.attributes.position;pos.setUsage(THREE.DynamicDrawUsage);
        return Array.from({length:moving.end[i]-moving.begin[i]},(_,j)=>pos.getZ(moving.begin[i]+j));
      });
    }
    panels.push({face,ranges,indices,saved,meshes,moving,mask:0});
  }
  let initialized=false;
  function update(doors,dt){
    if(!doors)return;
    for(const panel of panels){
      const mask=doors.broken?.[panel.face.id]??0;
      const leaf=panel.moving;
      if(leaf){
        const fraction=doors.retail?.[panel.face.id]??0;
        if(leaf.last!==fraction){
          for(let i=0;i<2;i++){
            const pos=panel.meshes[i].geometry.attributes.position,offset=fraction*panel.face.entry.travel;
            for(let j=0;j<leaf.z[i].length;j++)pos.setZ(leaf.begin[i]+j,leaf.z[i][j]+offset);
            pos.addUpdateRange(leaf.begin[i]*3,leaf.z[i].length*3);pos.needsUpdate=true;
          }
          leaf.last=fraction;
        }
      }
      if(mask===panel.mask)continue;
      for(let i=0;i<panel.ranges.length;i++){
        if(!((mask^panel.mask)&(1<<i)))continue;
        const hide=Boolean(mask&(1<<i)),r=panel.ranges[i];
        for(let n=0;n<2;n++){
          const data=panel.indices[n];
          if(hide)data.array.fill(0,r.start[n],r.end[n]);
          else data.array.set(panel.saved[n].subarray(r.start[n],r.end[n]),r.start[n]);
          data.needsUpdate=true;
        }
        debris.setBroken(r.pane,hide,initialized);
      }
      panel.mask=mask;
    }
    initialized=true;
  }
  return {add,update};
}
