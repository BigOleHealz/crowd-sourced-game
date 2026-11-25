import {floatingBody} from './marine-float.js';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {manateeMaterial,marineSurfaceMaterial} from './manatee-model.js';
import {aquaticImpactView} from './aquatic-impact-view.js';
import {sharkFeedingSpray} from './shark-feeding-spray.js';
import {sharkSizes} from './shark-swim.js';

// The pointed rostrum, swept pectorals and longer upper tail lobe remain visible
// together in silhouette when the dorsal fin is the only part above the water.
function sharkGeometry(part){
  const pos=[],rgb=[],ix=[];
  const upper=new THREE.Color(0x596c74),middle=new THREE.Color(0x939b96),belly=new THREE.Color(0xd4d3c2);
  function vertex(point,tone){
    pos.push(...point);rgb.push(tone.r,tone.g,tone.b);return pos.length/3-1;
  }
  function loft(rows,segments,offset=[0,0,0],solid=null){
    const begin=pos.length/3;
    for(const [z,width,height,lift] of rows){
      for(let k=0;k<=segments;k++){
        const a=k*2*Math.PI/segments,sn=Math.sin(a),cs=Math.cos(a);
        const color=solid??middle.clone().lerp(sn<0?belly:upper,Math.min(1,Math.abs(sn)*1.8));
        vertex([offset[0]+width*cs,offset[1]+lift+height*sn,offset[2]+z],color);
      }
    }
    for(let j=0;j<rows.length-1;j++)for(let k=0;k<segments;k++){
      const n=begin+j*(segments+1)+k,next=n+segments+1;
      ix.push(n,n+1,next,n+1,next+1,next);
    }
  }
  function fin(points,ridge,tone=upper){
    const peak=vertex(ridge,tone),base=points.map(p=>vertex(p,tone));
    for(let i=0;i<base.length;i++)ix.push(peak,base[i],base[(i+1)%base.length]);
  }
  if(part==='jaw'){
    // The upper lip meets the snout at rest. The thick rear of the jaw extends
    // behind the pivot into the cheek and stays embedded through the bite.
    loft([[-.612,0,0,.060],[-.54,.099,.031,.040],[-.40,.156,.047,.019],
      [-.24,.199,.060,-.010],[-.09,.224,.077,.006],[.08,.247,.100,.029],
      [.22,.216,.089,.060],[.29,0,0,.069]],16,[0,0,0],belly);
    const gum=new THREE.Color(0x613f42),tooth=new THREE.Color(0xdccfb7);
    loft([[-.578,.008,.004,.059],[-.46,.106,.011,.051],[-.27,.156,.013,.049],
      [-.10,.171,.016,.069],[.075,.151,.018,.095]],16,[0,0,0],gum);
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const z=-.45+i*.072,x=side*(.101+i*.015),y=.057+Math.max(0,i-2)*.006;
      fin([[x,y,z],[x,y+.042,z+.026],[x,y,z+.052]],[x-side*.009,y+.007,z+.02],tooth);
    }
  }else if(part==='body'){
    loft([[-1.70,.008,.009,.02],[-1.56,.142,.055,.044],[-1.32,.236,.124,.072],
      [-.98,.309,.251,.021],[-.55,.359,.328,.007],[-.07,.369,.349,0],[.38,.320,.296,.004],
      [.71,.237,.224,.008],[1.03,.141,.128,.01]],20);
    // A recessed upper palette and scalloped tooth line remain visible when the hinged jaw opens.
    const palate=new THREE.Color(0x592f36),tooth=new THREE.Color(0xe3d5bc);
    loft([[-1.56,.064,.006,-.017],[-1.43,.151,.011,-.030],[-1.24,.206,.011,-.048],
      [-1.10,.198,.012,-.062]],14,[0,0,0],palate);
    for(const side of [-1,1])for(let i=0;i<6;i++){
      const z=-1.48+i*.057,x=side*(.131+.061*Math.sin((i+.4)*.36)),y=-.029-i*.005;
      fin([[x,y,z],[x-side*.007,y-.049,z+.024],[x,y,z+.047]],[x+side*.006,y-.012,z+.023],tooth);
    }
    const dorsal=[[-.052,.29,-.45],[-.014,.77,-.05],[0,.79,.031],[.015,.51,.067],[.052,.26,.28]];
    fin(dorsal,[.069,.38,-.12]);
    for(const side of [-1,1]){
      fin([[side*.22,-.031,-.66],[side*.46,-.091,-.53],[side*.88,-.182,.006],
        [side*.76,-.166,.046],[side*.28,-.104,-.084]],[side*.42,-.04,-.29],middle);
      fin([[side*.16,-.10,.45],[side*.39,-.18,.81],[side*.17,-.11,.75]],[side*.20,-.083,.66]);
      loft([[-.048,.003,.004,0],[-.021,.016,.025,0],[.018,.018,.027,0],[.045,.004,.005,0]],
        8,[side*.223,.077,-1.30],new THREE.Color(0x111719));
      // Short, raked gill openings before the pectorals.
      for(let g=0;g<4;g++){
        const z=-.89+.055*g,x=side*(.32+.041*g/4);
        fin([[x,.068,z],[x,-.046,z+.021],[x,-.09,z+.035]],[x+side*.004,-.014,z+.026],upper);
      }
    }
  }else{
    loft([[-.17,.131,.114,.01],[-.03,.145,.132,.01],[.23,.118,.094,0],[.45,.074,.064,.006],
      [.55,.058,.076,.017],[.66,.024,.076,.026]],14);
    fin([[-.042,0,.42],[0,.22,.52],[0,.61,.83],[0,.72,.96],[.018,.34,.86],
      [.044,.030,.68],[0,-.19,.75],[0,-.33,.79],[0,-.27,.65]],[-.068,.08,.59]);
    fin([[0,.091,.12],[0,.214,.22],[0,.067,.31]],[.026,.109,.21]);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(ix);geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}
export function sharkView(scene,waterline){
  const impacts=aquaticImpactView(scene,waterline,sharkSizes);
  const spray=sharkFeedingSpray(scene,waterline,sharkSizes.length);
  const models=[],clock={value:0};
  let bodyShape,tailShape,jawShape,material;
  let sharkAsset;
  // Keep the procedural shark visible while the licensed art loads, and if
  // the download is unavailable. The loaded rig replaces it in place.
  if(typeof window!=='undefined')new GLTFLoader().load('./great-white-shark.glb',asset=>{
    asset.scene.traverse(part=>{
      if(!part.isMesh)return;
      const coat=material=>marineSurfaceMaterial(material,waterline,clock);
      part.material=Array.isArray(part.material)?part.material.map(coat):coat(part.material);
    });
    sharkAsset=asset;
    for(const instance of models)if(instance)installAsset(instance);
  },undefined,error=>console.warn('Great white shark model unavailable; using procedural art.',error));

  function installAsset(instance){
    if(instance.mixer || !sharkAsset)return;
    const visual=cloneSkeleton(sharkAsset.scene);
    const oriented=new THREE.Group();
    // The asset's snout points toward +Z; Goy Theft Auto sharks travel toward -Z.
    // Preserve the existing 3.75 m visual length used by their hit volumes.
    oriented.rotation.y=Math.PI;
    oriented.add(visual);
    oriented.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(oriented),size=bounds.getSize(new THREE.Vector3());
    const center=bounds.getCenter(new THREE.Vector3()),scale=3.75/size.z;
    oriented.scale.setScalar(scale);
    oriented.position.copy(center.multiplyScalar(-scale));
    visual.traverse(part=>{if(part.isSkinnedMesh)part.frustumCulled=false;});
    instance.hull.remove(instance.body,instance.jawMesh);
    // The hidden tail pivot still anchors the existing surface spray.
    instance.tailMesh.visible=false;
    instance.hull.add(oriented);
    const mixer=new THREE.AnimationMixer(visual);
    const swim=sharkAsset.animations.find(clip=>clip.name==='Swim');
    const bite=sharkAsset.animations.find(clip=>clip.name==='Bite');
    const swimAction=swim&&mixer.clipAction(swim).play();
    const biteAction=bite&&mixer.clipAction(bite).play();
    if(biteAction)biteAction.setEffectiveWeight(0);
    Object.assign(instance,{mixer,swimAction,biteAction,visual:oriented});
  }
  function model(index){
    bodyShape??=sharkGeometry('body');tailShape??=sharkGeometry('tail');jawShape??=sharkGeometry('jaw');
    if(!material){
      material=manateeMaterial({map:null},0xffffff,waterline,clock);
      material.side=THREE.DoubleSide;
    }
    const root=new THREE.Group(),body=new THREE.Mesh(bodyShape,material),tail=new THREE.Mesh(tailShape,material);
    const jaw=new THREE.Mesh(jawShape,material);jaw.name='Lower jaw';jaw.position.set(0,-.068,-1.02);
    // Pitch the shark around the jaw that is holding the swimmer.
    const grip=new THREE.Group(),hull=new THREE.Group();
    grip.position.z=-1.45;hull.position.z=1.45;
    grip.add(hull);root.add(grip);hull.add(jaw);
    root.name='Offshore shark';root.scale.setScalar(sharkSizes[index]);
    root.renderOrder=1;hull.add(body,tail);tail.position.z=1.02;scene.add(root);
    const instance={root,hull,tail,jaw,grip,body,tailMesh:tail,jawMesh:jaw};
    installAsset(instance);
    return instance;
  }
  return (states,local,tick,dt,defeats)=>{
    impacts(states,local,dt);clock.value=(tick??0)/30;
    for(let i=0;i<sharkSizes.length;i++){
      const s=states?.[i];
      if(!s || (!s.hp && s.deathKind==='blast') || Math.hypot(local.x-s.x,local.z-s.z)>52){
        if(models[i])models[i].root.visible=false;
        continue;
      }
      const instance=models[i]??=model(i);
      const {root,hull,tail,jaw,grip}=instance;
      if(!root.visible || root.position.distanceToSquared(s)>36){
        root.position.set(s.x,s.y,s.z);root.rotation.y=-s.yaw;
      }
      root.visible=true;
      const mix=-Math.expm1(-17*dt);
      const event=s.phase==='feeding' && defeats?.find(e=>e.sharkIndex===i || e.arrivals?.some(p=>p.sharkIndex===i));
      const contact=event && (event.sharkIndex===i ? event.tick : event.arrivals.find(p=>p.sharkIndex===i).tick);
      const elapsed=event ? Math.max(0,(tick-contact)/30) : 0;
      const chewing=s.phase==='scavenging' && s.scavenge;
      const thrashing=chewing || event;
      const age=chewing ? Math.max(0,(tick-s.scavenge.biteTick)/30) : elapsed;
      const rate=chewing?5.7:9.7,beat=age*rate;
      const sway=Math.sin(beat+.40+i*.59),recoil=thrashing ? sway*(chewing?.37:.23+.20*Math.exp(-age*1.8)) : 0;
      grip.rotation.z+=(recoil-grip.rotation.z)*mix;
      const dogStrike=s.phase==='dog-strike';
      const diveAngle=s.phase==='feeding' || dogStrike ? Math.max(-.58,Math.min(.22,(s.y-root.position.y)*4)) : 0;
      const lunge=thrashing?.13*Math.cos(beat):0;
      grip.rotation.x+=(diveAngle+lunge-grip.rotation.x)*mix;
      root.position.x+=(s.x-root.position.x)*mix;
      root.position.y+=(s.y-root.position.y)*mix;
      root.position.z+=(s.z-root.position.z)*mix;
      root.rotation.y+=Math.atan2(Math.sin(-s.yaw-root.rotation.y),Math.cos(-s.yaw-root.rotation.y))*mix;
      root.rotation.z=s.hp ? .055*Math.sin(s.stroke):floatingBody(s.deathY,waterline,s.size,s.ageSinceHit).roll;
      const bite=chewing?.32+.24*Math.sin(beat):dogStrike ? .58*Math.sin(Math.min(1,s.dogEncounter.t/.72)*Math.PI) : s.phase==='feeding' ? .34+.34*Math.exp(-elapsed*2.25)+.21*Math.sin(elapsed*9) : 0;
      jaw.rotation.x=-bite;
      if(instance.mixer){
        instance.swimAction?.setEffectiveWeight(1-Math.min(1,bite));
        instance.biteAction?.setEffectiveWeight(Math.min(1,bite));
        instance.mixer.update(dt);
      }
      const kick=beat-.82+i*.45;
      tail.rotation.x+=((thrashing?.23*Math.cos(kick):0)-tail.rotation.x)*mix;
      tail.rotation.y+=((thrashing?.69*Math.sin(kick):s.hp?.26*Math.sin(s.stroke):0)-tail.rotation.y)*mix;
      tail.rotation.z+=((thrashing?.27*Math.sin(kick+.40):0)-tail.rotation.z)*mix;
      if(thrashing && tick>=(chewing?s.scavenge.biteTick:contact)){
        spray.mark(i,age,Math.PI*2/rate,tick,hull,tail,s.yaw,s.size);
      }
    }
    spray.finish(tick??0,local);
  };
}
