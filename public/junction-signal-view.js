import * as THREE from 'three';
import {junctions,junctionLamp} from './junction-signals.js';
import {signalPost} from './scenery-layout.js';

const colors=[0xff4638,0xffbd45,0x49e3a0];
function streetBlades(scene,frame,box,x,z){
  const labels=new THREE.Group();
  labels.name='West Avenue and 27th Street';
  scene.add(labels);
  const width=1.52,height=.33,thickness=.044;
  for(const [name,alongX,y] of [['West Avenue',false,3.83],['27th Street',true,3.42]]){
    const yaw=alongX?0:Math.PI/2;
    const cx=x+(alongX?.84:0),cz=z+(alongX?0:.84);
    frame.add(box,0xa9afa9,x,y,z,.205,.14,.205);
    frame.add(box,0x718077,x+(alongX?.12:0),y,z+(alongX?0:.12),alongX?.26:.085,.088,alongX?.085:.26);
    frame.add(box,0xb5c4b8,cx,y,cz,alongX?width:thickness,height,alongX?thickness:width);
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=112;
    const ink=canvas.getContext('2d');
    ink.fillStyle='#d9e5d7';ink.fillRect(0,0,512,112);
    ink.fillStyle='#195346';ink.fillRect(5,5,502,102);
    ink.fillStyle='#fffced';ink.textAlign='center';ink.textBaseline='middle';
    ink.font='bold 68px sans-serif';ink.fillText(name,256,59,478);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    const material=new THREE.MeshBasicMaterial({map:texture});
    const face=new THREE.PlaneGeometry(width-.01,height-.01);
    for(const side of [-1,1]){
      const label=new THREE.Mesh(face,material);
      label.position.set(cx+side*Math.sin(yaw)*.024,y,cz+side*Math.cos(yaw)*.024);
      label.rotation.y=yaw+(side===1?0:Math.PI);
      labels.add(label);
    }
  }
  return labels;
}
export function junctionSignalView(scene,posts){
  const box=new THREE.BoxGeometry(),disc=new THREE.CircleGeometry(.086,12);
  const active=new THREE.InstancedMesh(disc,new THREE.MeshBasicMaterial({toneMapped:false}),junctions.length*4);
  active.name='Traffic signal indications';active.frustumCulled=false;active.count=0;scene.add(active);
  const heads=[],pose=new THREE.Object3D(),tint=new THREE.Color();
  for(const j of junctions){
    const {x,z,postId}=signalPost(j.x,j.z);
    posts.add(postId,x,.75,z,frame=>{
      frame.add(box,0x66716b,x,3.0,z,.16,4.5,.16);
      frame.beam(0x718077,[x,5.1,z],[j.x+1.65,5.04,z],.12,.12);
      frame.beam(0x718077,[x,5.08,z],[x,5.04,j.z+1.45],.11,.11);
      for(const avenue of [true,false]){
        const px=avenue?j.x+1.5:x,pz=avenue?z:j.z+1.36;
        frame.add(box,0x4e5047,px,4.62,pz,avenue?.31:.26,.84,avenue?.26:.31);
        for(const dir of [-1,1]){
          const yaw=avenue?(dir>0?0:Math.PI):dir*Math.PI/2;
          const cx=px+.136*Math.sin(yaw),cz=pz+.136*Math.cos(yaw);
          for(let lamp=0;lamp<3;lamp++){
            const h=4.89-lamp*.254;
            frame.add(disc,[0x512e2b,0x51432d,0x24453d][lamp],cx,h,cz,1,1,1,0,yaw);
            frame.add(box,0x45473f,cx+.039*Math.sin(yaw),h+.094,cz+.039*Math.cos(yaw),
              avenue?.21:.105,.027,avenue?.105:.21);
          }
          heads.push({j,avenue,cx:cx+.003*Math.sin(yaw),cz:cz+.003*Math.cos(yaw),yaw});
        }
      }
      if(j.x===-38 && j.z===27)return streetBlades(scene,frame,box,x,z);
    });
  }
  box.dispose();
  let prior=-1;
  return (doors,tick)=>{
    const sample=Math.floor((tick??0)/3);
    if(sample===prior)return;
    prior=sample;let n=0;
    for(const h of heads){
      if(doors?.posts?.[h.j.id]===0)continue;
      const lamp=junctionLamp(tick??0,h.j,h.avenue);
      pose.position.set(h.cx,4.89-lamp*.254,h.cz);pose.rotation.y=h.yaw;pose.updateMatrix();
      active.setMatrixAt(n,pose.matrix);active.setColorAt(n++,tint.setHex(colors[lamp]));
    }
    active.count=n;active.instanceMatrix.needsUpdate=true;
    if(active.instanceColor)active.instanceColor.needsUpdate=true;
  };
}
