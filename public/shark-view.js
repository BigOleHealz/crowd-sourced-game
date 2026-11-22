import * as THREE from 'three';
import {manateeMaterial} from './manatee-model.js';
import {aquaticImpactView} from './aquatic-impact-view.js';
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
    // The hinge sits under the gills. The darker inner jaw and pale tooth
    // line become visible as the lower jaw swings down during the bite.
    loft([[-.59,.009,.009,0],[-.49,.119,.032,-.019],[-.29,.192,.052,-.034],
      [-.10,.217,.057,-.020],[.03,.178,.062,.013]],14,[0,0,0],belly);
    const gum=new THREE.Color(0x613f42),tooth=new THREE.Color(0xdccfb7);
    loft([[-.565,.01,.005,.002],[-.44,.115,.014,-.002],[-.23,.157,.019,-.001],
      [-.085,.169,.017,.026],[.002,.124,.015,.045]],14,[0,0,0],gum);
    for(const side of [-1,1])for(let i=0;i<5;i++){
      const z=-.42+i*.078,x=side*(.119+.047*Math.sin((i+.6)*.45)),y=.014+i*.007;
      fin([[x,y,z],[x,y+.042,z+.026],[x,y,z+.052]],[x-side*.009,y+.007,z+.02],tooth);
    }
  }else if(part==='body'){
    loft([[-1.70,.008,.009,.02],[-1.56,.142,.055,.044],[-1.32,.236,.124,.072],
      [-.98,.309,.251,.021],[-.55,.359,.328,.007],[-.07,.369,.349,0],[.38,.320,.296,.004],
      [.71,.237,.224,.008],[1.03,.141,.128,.01]],20);
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
    loft([[-.03,.145,.132,.01],[.23,.118,.094,0],[.45,.074,.064,.006],
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
  const models=[],clock={value:0};
  let bodyShape,tailShape,jawShape,material;
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
    return {root,tail,jaw,grip};
  }
  return (states,local,tick,dt)=>{
    impacts(states,local,dt);clock.value=(tick??0)/30;
    for(let i=0;i<sharkSizes.length;i++){
      const s=states?.[i];
      if(!s || s.deathKind==='blast' || (!s.hp && s.ageSinceHit>12) || Math.hypot(local.x-s.x,local.z-s.z)>52){
        if(models[i])models[i].root.visible=false;
        continue;
      }
      const {root,tail,jaw,grip}=models[i]??=model(i);
      if(!root.visible || root.position.distanceToSquared(s)>36){
        root.position.set(s.x,s.y,s.z);root.rotation.y=-s.yaw;
      }
      root.visible=true;
      const mix=-Math.expm1(-17*dt);
      const diveAngle=s.phase==='feeding' ? Math.max(-.58,Math.min(.22,(s.y-root.position.y)*4)) : 0;
      grip.rotation.x+=(diveAngle-grip.rotation.x)*mix;
      root.position.x+=(s.x-root.position.x)*mix;
      root.position.y+=(s.y-root.position.y)*mix;
      root.position.z+=(s.z-root.position.z)*mix;
      root.rotation.y+=Math.atan2(Math.sin(-s.yaw-root.rotation.y),Math.cos(-s.yaw-root.rotation.y))*mix;
      root.rotation.z=s.hp ? .055*Math.sin(s.stroke):Math.min(1.45,s.ageSinceHit*.78);
      const bite=s.phase==='feeding' ? .27+.23*Math.sin(clock.value*8.4+i) : 0;
      jaw.rotation.x=-bite;
      tail.rotation.y=s.hp ? .26*Math.sin(s.stroke):0;
    }
  };
}
