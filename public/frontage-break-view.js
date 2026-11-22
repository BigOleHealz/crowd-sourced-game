import {paneCenter,paneShattered} from './frontage-glass.js';
import {glassSupportKey,paneSupportLost} from './glass-support.js';
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
    for(const [i,[lo,hi]] of face.spans.entries()){
      const {all,panes}=face.glass.bays[i], {bottom:low,top,z}=all;
      const frameStart=frames.indices.length, paneRanges=[];
      function addGlass(pane){
        if(pane.width<=0 || pane.top<=pane.bottom)return;
        const start=sheets.indices.length;
        sheets.add(plane,0xffffff,pane.x,(pane.bottom+pane.top)/2,pane.z,1,pane.top-pane.bottom,pane.width);
        paneRanges.push({pane,start,end:sheets.indices.length,hidden:false,
          debris:pane.slide?{...pane,edge:false}:pane});
      }
      for(const pane of panes)if(!pane.slide)addGlass(pane);
      const customer=face.entry?.bayIndex===i?face.entry:null;
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
        for(const edge of [left,right])bar(face.x,(head+.84)/2,edge,.085,head-.84,.045);
        bar(face.x,head+.024,cz,.10,.063,width);
        // The floor track is flush. Only the leaf, stiles and handle slide.
        const glassLeaf=panes.find(pane=>pane.slide), leafX=glassLeaf.x,bottom=.847;
        const begin=[sheets.positions.length/3,frames.positions.length/3];
        addGlass(glassLeaf);
        for(const edge of [left+.019,right-.019])bar(leafX,(bottom+head)/2,edge,.052,head-bottom,.038);
        for(const h of [bottom+.025,head-.027])bar(leafX,h,cz,.052,.050,width);
        bar(leafX+.044*face.side,1.85,cz+face.side*width*.37,.053,.34,.033,0xb9a783);
        moving={begin,end:[sheets.positions.length/3,frames.positions.length/3],last:0};
      }
      ranges.push({all,frameStart,frameEnd:frames.indices.length,panes:paneRanges});
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
  function reindex(index,saved,start,end,hide){
    if(hide)index.array.fill(0,start,end);
    else index.array.set(saved.subarray(start,end),start);
    index.addUpdateRange(start,end-start);
    index.needsUpdate=true;
  }

  function update(doors){
    if(!doors)return;
    const support=glassSupportKey(doors);
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
      if(mask===panel.mask && panel.partial===doors.brokenPanes && panel.support===support)continue;
      for(const range of panel.ranges){
        const bit=1<<range.all.index, hideBay=Boolean(mask&bit);
        if((mask^panel.mask)&bit){
          reindex(panel.indices[1],panel.saved[1],range.frameStart,range.frameEnd,hideBay);
          debris.setBroken(range.all,hideBay,initialized);
        }
        for(const part of range.panes){
          const unsupported=paneSupportLost(part.pane,doors);
          const hidden=hideBay || unsupported || paneShattered(part.pane,doors);
          if(part.hidden!==hidden){
            reindex(panel.indices[0],panel.saved[0],part.start,part.end,hidden);
            part.hidden=hidden;
          }
          if(part.pane===range.all)continue;
          const shattered=!hideBay && !unsupported && paneShattered(part.pane,doors);
          if(shattered && part.pane.slide)part.debris.z=doors.brokenPanes[part.pane.id]?.z??paneCenter(part.pane,doors);
          debris.setBroken(part.debris,shattered,initialized);
        }
      }
      panel.mask=mask;
      panel.partial=doors.brokenPanes;
      panel.support=support;
    }
    initialized=true;
  }
  return {add,update};
}
