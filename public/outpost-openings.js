import {paneKey} from './pane-damage.js';

// Wall fragments, glazing and door leaves use the same spans. All panel
// heights are in world space, with both sides of each pane left accessible.
export function outpostOpenings(b,p,terrain){
  const {x,z,w,d,base,eave}=b,thick=.15,edge=w/2;
  const part=(cx,cz,width,depth,lo,hi,kind='wall')=>p.shell.push({x:cx,z:cz,w:width,d:depth,bottom:base+lo,h:hi-lo,kind});
  const ranges=(holes,lo,hi)=>holes.filter(h=>h.lo<hi && h.hi>lo).sort((a,b)=>a.left-b.left);
  p.glazing=[];p.shutters=[];
  for(const side of [-1,1]){
    const cz=z+side*(d/2-thick/2);
    part(x+side*(edge-thick/2),z,thick,d,0,eave);
    const holes=[];
    if(side>0)holes.push({left:-.83,right:.83,lo:0,hi:2.24});
    if(b.garage && side>0){
      const shutterWidth=(w-2.34)/2;
      for(const sign of [-1,1]){
        const at=sign*(1+shutterWidth/2),hi=Math.min(2.8,eave-.34);
        holes.push({left:at-shutterWidth/2,right:at+shutterWidth/2,lo:0,hi});
        p.shutters.push({x:x+at,y:base,z:z+d/2+.025,width:shutterWidth,height:hi});
      }
    }
    if(!b.garage)for(const col of [-1,0,1]){
      if(side>0 && !col)continue;
      const u=col*w*.31,width=w*.18,lo=.85,hi=Math.min(2.45,eave-.66);
      holes.push({left:u-width/2,right:u+width/2,lo,hi});
      const ground=terrain(x+u,cz);
      p.glazing.push({x:x+u,z:cz,w:width,d:.04,bottom:base+lo-ground,h:base+hi-ground,
        paneId:paneKey(x+u,base+(lo+hi)/2,cz),sill:base+lo,head:base+hi});
    }
    const bands=[...new Set([0,eave,...holes.flatMap(h=>[h.lo,h.hi])])].sort((a,b)=>a-b);
    for(let i=1;i<bands.length;i++){
      const lo=bands[i-1],hi=bands[i];let left=-edge;
      for(const h of [...ranges(holes,lo,hi),{left:edge,right:edge}]){
        if(h.left>left+.001)part(x+(left+h.left)/2,cz,h.left-left,thick,lo,hi);
        left=h.right;
      }
    }
  }
  if(b.garage)part(x-w*.30,z-d*.26,1.44,.68,0,.83,'desk');
}
