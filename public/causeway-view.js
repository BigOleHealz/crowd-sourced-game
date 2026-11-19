import * as THREE from 'three';
import {causeway} from './brickell-map.js';

export function addCauseway(scene, Batch, solids, asphalt) {
  const {sections,west,east,parapetWidth,parapetHeight}=causeway;
  const roadBatch=new Batch(true), geometry=new THREE.BufferGeometry();
  const index=[0,1,2,0,2,3];
  geometry.setIndex(index);
  function quad(points,batch,tint) {
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    geometry.computeVertexNormals();
    if (batch===roadBatch) {
      geometry.setAttribute('batchUv',new THREE.Float32BufferAttribute(points.flatMap(([x,,z])=>[x/5,z/5]),2));
    }
    batch.add(geometry,tint,0,0,0);
  }
  for(let i=1;i<sections.length;i++) {
    const a=sections[i-1],b=sections[i];
    function strip(x1,y1,x2,y2,tint,batch=solids) {
      quad([[x1,y1(a),a.z],[x1,y1(b),b.z],[x2,y2(b),b.z],[x2,y2(a),a.z]],batch,tint);
    }
    const road=s=>s.road, soffit=s=>s.soffit;
    const rim=s=>s.soffit+.42, cornice=s=>s.road-.24;
    strip(west,road,east,road,0xffffff,roadBatch);
    strip(east,soffit,west,soffit,0x939388);
    // The stone arch ring follows the vault down to the submerged springings.
    for(const side of [-1,1]) {
      const edge=side<0?west:east, inner=edge-side*parapetWidth;
      const cap=s=>s.road+parapetHeight, lip=s=>cap(s)-.12;
      function face(x,lower,upper,tint,outward) {
        const positive=outward ? side>0 : side<0;
        strip(x,positive?upper:lower,x,positive?lower:upper,tint);
      }
      face(edge,soffit,rim,i%2?0xd7cdb7:0xcec6b5,true);
      face(edge,rim,cornice,0xb4b2a4,true);
      face(edge,cornice,road,0xcec8b8,true);
      face(edge,road,lip,0xb5b2a3,true);
      face(edge,lip,cap,0xe1d9c5,true);
      face(inner,road,cap,0xc4c0b0,false);
      const x1=Math.min(inner,edge),x2=Math.max(inner,edge);
      strip(x1,cap,x2,cap,0xdad5c6);
      for(const [s,atEnd] of [[a,i===1],[b,i===sections.length-1]]) {
        if(!atEnd)continue;
        const pts=[[x1,road(s),s.z],[x1,cap(s),s.z],[x2,cap(s),s.z],[x2,road(s),s.z]];
        quad(s===a?pts:pts.reverse(),solids,0xc4c0b0);
      }
    }
    const paint=s=>s.road+.012;
    if(i%2)strip(-.065,paint,.065,paint,0xe3bc67);
    for(const x of [west+.65,east-.65]) strip(x-.055,paint,x+.055,paint,0xe5e0ce);
  }
  roadBatch.mesh(scene,asphalt).userData.impactSurface='asphalt';
  geometry.dispose();
}
