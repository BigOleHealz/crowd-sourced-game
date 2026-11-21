import {beachSigns} from './scenery-layout.js';
import {addLookouts} from './lifeguard-lookouts.js';
import * as THREE from 'three';
import { beach, courts, sandHeight } from './beach-layout.js';
export function addBeach(scene,Batch) {
  const geometry=new THREE.PlaneGeometry(beach.east-beach.west,beach.south-beach.north,24,64);
  geometry.rotateX(-Math.PI/2);geometry.translate((beach.east+beach.west)/2,0,(beach.south+beach.north)/2);
  const p=geometry.attributes.position, colors=[],c=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),y=sandHeight(x,z);p.setY(i,y);
    const damp=THREE.MathUtils.smoothstep(y,-.36,.55);
    c.setRGB(.53+.47*damp,.49+.51*damp,.45+.55*damp);colors.push(c.r,c.g,c.b);
  }
  const tex=new THREE.TextureLoader().load('./harbor-sand.webp');tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(10,34);
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const sand=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({map:tex,vertexColors:true}));sand.receiveShadow=true;sand.userData.impactSurface='solid';scene.add(sand);
  const box=new THREE.BoxGeometry(),cord=new Batch();
  const wrecks=[],timberMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
  function makeRig(id,x,y,z,stand){
    const pivot=new THREE.Group(),parts=new THREE.Group();
    pivot.position.set(x,y,z);parts.position.set(-x,-y,-z);
    pivot.add(parts);scene.add(pivot);
    wrecks.push({pivot,id,stand,progress:0});
    return parts;
  }
  for(const [i,[x,z,yaw,label]] of beachSigns.entries()){
    const parts=makeRig('sign-'+i,x,.8,z,false),timber=new Batch();
    const panel=document.createElement('canvas');panel.width=768;panel.height=152;
    const ink=panel.getContext('2d');
    ink.fillStyle='#efe8ce';ink.fillRect(0,0,768,152);ink.fillStyle='#215d62';ink.fillRect(6,6,756,140);
    ink.textAlign='center';ink.textBaseline='middle';ink.font='bold 62px sans-serif';ink.fillStyle='#fff4cf';ink.fillText(label,384,79);
    const map=new THREE.CanvasTexture(panel);map.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(4.6,.91),new THREE.MeshBasicMaterial({map}));
    face.rotation.y=yaw;face.position.set(x+.075*Math.sin(yaw),3.14,z+.075*Math.cos(yaw));parts.add(face);
    timber.add(box,0x637e78,x,3.14,z,4.64,.95,.13,0,yaw);
    for(const side of [-1,1]) timber.add(box,0xac9470,x+side*1.72*Math.cos(yaw),1.84,z-side*1.72*Math.sin(yaw),.14,2.1,.14);
    timber.mesh(parts,timberMaterial).userData.impactSurface='wood';
  }
  const netViews=[];
  const netMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
  for(const {x,z} of courts){
    const net=new Batch(),posts=new Batch();
    const h=sandHeight(x,z);
    for(const sign of [-1,1]){
      posts.add(box,0x397e84,sign*4.37,1.29,0,.112,2.58,.112);
      posts.add(box,0x205d6a,sign*4.37,.69,0,.265,1.36,.265);
      for(const y of [.14,1.22])posts.add(box,0xf3de9d,sign*4.37,y,0,.271,.063,.271);
      for(let i=0;i<16;i++) {
        const at=z-8+i;
        cord.beam(i<8?0x247d99:0xb95c45,[x+sign*4,sandHeight(x+sign*4,at)+.041,at],[x+sign*4,sandHeight(x+sign*4,at+1)+.041,at+1],.076);
      }
      for(let i=0;i<8;i++){
        const at=x-4+i,zz=z+sign*8;
        cord.beam(sign<0?0x247d99:0xb95c45,[at,sandHeight(at,zz)+.041,zz],[at+1,sandHeight(at+1,zz)+.041,zz],.076);
      }
    }
    const top=u=>2.40-.078*(1-u*u);
    for(let i=0;i<32;i++){
      const u=i/16-1,v=(i+1)/16-1,ax=u*4.28,bx=v*4.28;
      net.beam(0xf3ebd4,[ax,top(u),0],[bx,top(v),0],.047);
      for(let row=1;row<=5;row++)net.beam(0x4d5553,[ax,top(u)-row*.176,0],[bx,top(v)-row*.176,0],.013);
      net.beam(0x525957,[ax,top(u),0],[ax,top(u)-.88,0],.015);
    }
    const rig=new THREE.Group();
    rig.position.set(x,h,z);scene.add(rig);
    posts.mesh(rig,netMaterial);const web=net.mesh(rig,netMaterial);
    netViews.push({rig,web,x,z,angle:0});
  }
  addLookouts(scene,Batch,makeRig);
  cord.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true})).userData.impactSurface='solid';
  box.dispose();
  let first=true;
  return (state,dt,local,remotes)=>{
    for(const w of wrecks){
      const heading=state?.beachWood?.[w.id];
      const next=heading==null?0:first?1:Math.min(1,w.progress+dt*(w.stand?1.75:2.65));
      if(next===w.progress)continue;
      w.progress=next;
      const yaw=(heading??0)/1000,angle=next*next*(w.stand?.51:1.56);
      // Signs fall flat as one piece. A stand buckles on its piles and its roof settles over the deck.
      w.pivot.position.y=w.stand?sandHeight(w.pivot.position.x,w.pivot.position.z)+next*.16:.80+next*.085;
      w.pivot.rotation.set(Math.cos(yaw)*angle,0,-Math.sin(yaw)*angle);
      w.pivot.scale.y=1-(w.stand?.90:0)*next;
    }
    for(const [i,view] of netViews.entries()){
      const down=state?.nets?.[i]??0;
      const tilt=down*1.43;
      view.angle=first?tilt:THREE.MathUtils.damp(view.angle,tilt,7,dt);
      view.rig.rotation.x=view.angle;
      // Only the fabric yields to walkers. Both posts tip with a vehicle strike.
      let flex=0;
      if(!down){
        for(const p of [local,...remotes]){
          const dz=p.z-view.z;
          if(p.y<view.rig.position.y+2.4 && Math.abs(p.x-view.x)<4.3 && Math.abs(dz)<.65)
            flex=.16*Math.cos(dz/.65*Math.PI/2)*(dz<0?1:-1);
        }
      }
      view.web.rotation.x=THREE.MathUtils.damp(view.web.rotation.x,flex,12,dt);
    }
    first=false;
  };
}
