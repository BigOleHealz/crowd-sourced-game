import * as THREE from 'three';
import {atrium,grandStoryY} from './grand-resort-layout.js';

const gold=0xc39856,pearl=0xe7d6bb,onyx=0x173c42,jade=0x267069;
const tau=2*Math.PI;

// Each arcade is fitted to the existing slab edge. The ornamental piers
// rise from the outer face of the balustrade, clear of the walking decks.
export function finishPalaceAtrium(group,{stone,brass,light,cube,cylinder}){
  const front=atrium.north+.13,left=atrium.west+.15,right=atrium.east-.15,bay=(right-left)/3;
  const arch=new THREE.Shape();
  arch.moveTo(-1,0);
  arch.absarc(0,0,1,Math.PI,0,true);
  arch.lineTo(.87,0);
  arch.absarc(0,0,.87,0,Math.PI,false);
  arch.closePath();
  const voussoir=new THREE.ExtrudeGeometry(arch,{depth:.15,bevelEnabled:false,curveSegments:16});
  for(let floor=1;floor<=4;floor++){
    const base=grandStoryY(floor),spring=base+1.88;
    for(let bayIndex=0;bayIndex<3;bayIndex++){
      const cx=left+bay*(bayIndex+.5),radius=bay*.49;
      stone.add(voussoir,pearl,cx,spring,front,radius,1.40,1);
      brass.add(voussoir,gold,cx,spring,front+.145,radius*.987,1.38,.24);
      stone.add(cube,0xc8a67d,cx,spring+1.36,front+.13,.22,.29,.22);
      for(const side of [-1,1]){
        const x=cx+side*radius*.91;
        stone.add(cylinder,onyx,x,base+.92,front,.21,1.86,.21);
        brass.add(cylinder,gold,x,base+.13,front,.33,.22,.33);
        stone.add(cylinder,pearl,x,base+1.72,front,.28,.18,.28);
        brass.add(cube,gold,x,base+1.86,front,.35,.10,.32);
      }
    }
    stone.add(cube,pearl,(left+right)/2,base-.10,front-.04,right-left+.35,.19,.50);
    light.add(cube,0xffdc91,(left+right)/2,base-.12,front,right-left,.045,.17);
  }
  voussoir.dispose();

  // A gilded sun and stepped coffers give the chandelier a ceiling to hang from.
  const cx=-55,cz=50.35,y=grandStoryY(5)-.27;
  const ring=new THREE.TorusGeometry(1,.014,5,80).rotateX(Math.PI/2);
  for(const [r,tint] of [[1.80,gold],[2.02,pearl],[2.92,gold],[3.43,0xf4d8aa]]){
    brass.add(ring,tint,cx,y-.10,cz,r,2,r*.86);
  }
  for(let i=0;i<40;i++){
    const a=i*tau/40,dx=Math.cos(a),dz=Math.sin(a)*.86;
    brass.beam(i%2?gold:pearl,[cx+2.04*dx,y-.12,cz+2.04*dz],[cx+3.43*dx,y-.12,cz+3.43*dz],i%2?.035:.071);
  }
  for(let i=0;i<3;i++){
    const w=11.15-i*.40,d=7.95-i*.33;
    for(const sign of [-1,1]){
      brass.add(cube,i===1?onyx:gold,cx,y-i*.035,cz+sign*d/2,w,.095,.11);
      brass.add(cube,i===1?onyx:gold,cx+sign*w/2,y-i*.035,cz,.11,.095,d);
    }
  }
  ring.dispose();

  // The twin-heron panel is bookended by reeded stone and opal sconces.
  // Mount it on the public wall behind the dealer, clear of the elevator.
  const mx=-53.45,my=2.53,mz=39.18,w=4.60,h=3.07;
  for(const [pad,depth,tint] of [[.22,.09,onyx],[.145,.13,gold],[.085,.17,0x372e31]]){
    stone.add(cube,tint,mx,my,mz+depth/2,w+2*pad,h+2*pad,depth);
  }
  const finish=new THREE.MeshStandardMaterial({roughness:.49,metalness:.10,emissive:0xffffff,emissiveIntensity:.31});
  const mural=new THREE.Mesh(new THREE.PlaneGeometry(w,h),finish);
  mural.position.set(mx,my,mz+.18);group.add(mural);
  for(const side of [-1,1]){
    const x=mx+side*(w/2+.54);
    for(let rib=-1;rib<=1;rib++)stone.add(cylinder,pearl,x+rib*.085,my,mz+.09,.115,3.12,.115);
    brass.add(cube,gold,x,my+.04,mz+.20,.28,.10,.28);
    light.add(cylinder,0xffe2a5,x,my+.30,mz+.33,.11,.52,.11);
  }
  const medallion=new THREE.Mesh(new THREE.CircleGeometry(3.60,96),
    new THREE.MeshStandardMaterial({color:0xdae5db,roughness:.30,metalness:.12,emissive:0xffffff,emissiveIntensity:.18}));
  medallion.rotation.x=-Math.PI/2;medallion.position.set(cx,.826,cz);group.add(medallion);
  // Moulded, underlit coffers beneath the first gallery frame the gaming hall.
  for(const x of [-66.3,-62.5,-58.7,-54.9,-51.1,-47.7]){
    const z=43.48,y=grandStoryY(1)-.33;
    stone.add(cube,0x725744,x,y,z,3.16,.07,3.98);
    for(const side of [-1,1]){
      brass.add(cube,gold,x+1.59*side,y-.05,z,.07,.07,4.03);
      brass.add(cube,gold,x,y-.05,z+1.99*side,3.23,.07,.07);
      light.add(cube,0xf2c790,x+.98*side,y-.043,z,.018,.014,2.41);
    }
  }
  // Load the two paintings only on approaching this wing.
  let started=false;
  return ()=>{
    if(started)return;started=true;
    const loader=new THREE.TextureLoader();
    for(const [name,mat] of [['heron-mosaic',finish],['compass-stone',medallion.material]]){
      loader.load('./aurora-'+name+'.webp',map=>{
        map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
        mat.map=mat.emissiveMap=map;mat.needsUpdate=true;
      });
    }
  };
}
