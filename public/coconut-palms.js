import * as THREE from 'three';
import { MAP, groundHeight } from './world.js';

// Build three palm crowns once, then instance them along the avenues.
function palmGeometry(variant) {
  const positions=[], colors=[], indices=[];
  let seed=725+37*variant;
  const rand=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
  function vertex(x,y,z,color){
    positions.push(x,y,z);colors.push(color.r,color.g,color.b);return positions.length/3-1;
  }
  function stem(t) {return [.53*t*t-.15*t,5.34*t,.34*Math.sin(t*1.8)*t];}
  const segments=10, scars=34;
  const bark=new THREE.Color(), rings=[];
  for(let i=0;i<=scars;i++) {
    const t=i/scars, radius=.183+.122*Math.exp(-14*t)-.048*t;
    for(const [offset,scale,tint] of [[0,1,0xa69b83],[.013,.97,0x796f60]]) {
      const [x,y,z]=stem(t),ring=[]; 
      for(let j=0;j<segments;j++){
        const a=j*Math.PI*2/segments, jitter=.009*Math.sin(4*a+i*.24);
        bark.setHex(tint).multiplyScalar(.87+.18*rand());
        ring.push(vertex(x+Math.cos(a)*radius*scale,y+offset+jitter,z+Math.sin(a)*radius*scale,bark));
      }
      if(rings.length) for(let j=0;j<segments;j++){
        const k=(j+1)%segments, prev=rings.at(-1);
        indices.push(prev[j],ring[j],ring[k],prev[j],ring[k],prev[k]);
      }
      rings.push(ring);
    }
  }
  const [cx,cy,cz]=stem(1);
  for(let f=0;f<17;f++){
    const angle=f*2.39996+variant*.5+rand()*.19, sn=Math.sin(angle), cs=Math.cos(angle);
    const high=f%3, length=2.6+.50*rand()-.36*high;
    const rise=.65+.48*high+.28*rand(), droop=1.07-.48*high+.24*rand(), curve=(rand()-.5)*.75;
    const leaf=new THREE.Color().setHSL(.201+.054*rand(),.39+.12*rand(),.21+.072*rand()+(high===2?.025:0));
    function rachis(t){
      const bend=curve*t*t, reach=length*t;
      return [cx+cs*reach-sn*bend,cy+.12+rise*Math.sin(Math.PI*t*.81)-droop*t*t,cz+sn*reach+cs*bend];
    }
    function ribbon(point,tangent,width,c) {
      return [vertex(point[0]-sn*width,point[1],point[2]+cs*width,c),
        vertex(point[0]+sn*width,point[1]+tangent,point[2]-cs*width,c)];
    }
    let last;
    for(let n=0;n<=18;n++) {
      const t=n/18, p=rachis(t);
      const edge=ribbon(p,.012*(1-t),.032*(1-t)+.004,new THREE.Color(0x929352));
      if(last)indices.push(last[0],edge[0],last[1],last[1],edge[0],edge[1]);
      last=edge;
      if(n<2 || n===18)continue;
      for(const side of [-1,1]){
        const spread=(.18+.52*Math.sin(Math.PI*t)**.70)*(.90+.20*rand());
        const forward=.12+.29*t, sag=spread*(.42+.27*rand());
        const width=.056+.027*Math.sin(Math.PI*t), shade=leaf.clone().multiplyScalar(.87+.20*rand());
        const mid=[p[0]+cs*forward*.48-sn*side*spread*.54,p[1]-.10*sag,p[2]+sn*forward*.48+cs*side*spread*.54];
        const root=vertex(...p,shade), leading=vertex(mid[0]-cs*width,mid[1],mid[2]-sn*width,shade);
        const fold=vertex(mid[0],mid[1]+.023,mid[2],shade.clone().multiplyScalar(1.17));
        const trailing=vertex(mid[0]+cs*width,mid[1]-.025,mid[2]+sn*width,shade);
        const end=vertex(p[0]+cs*forward-sn*side*spread,p[1]-sag,p[2]+sn*forward+cs*side*spread,shade);
        indices.push(root,leading,fold,root,fold,trailing,leading,end,fold,fold,end,trailing);
      }
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.setIndex(indices);g.computeVertexNormals();return g;
}

export function addPalms(scene) {
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const transform=new THREE.Object3D();
  for(let v=0;v<3;v++){
    const trees=MAP.trees.filter((_,i)=>i%3===v);
    const palms=new THREE.InstancedMesh(palmGeometry(v),material,trees.length);
    trees.forEach(({x,z,height},i)=>{
      transform.position.set(x,groundHeight(x,z),z);
      transform.rotation.y=i*2.39996+v;
      transform.scale.setScalar(height/6.9);transform.updateMatrix();
      palms.setMatrixAt(i,transform.matrix);
    });
    palms.castShadow=true;palms.receiveShadow=true;scene.add(palms);
  }
}
