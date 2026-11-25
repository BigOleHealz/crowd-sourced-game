import {dolphinSizes} from './dolphin-swim.js';
import {aquaticImpactView} from './aquatic-impact-view.js';
import * as THREE from 'three';
import {manateeMaterial} from './manatee-model.js';
import {loadDolphinModel,makeDolphinModel} from './dolphin-model.js';

// Build a bottlenose in one indexed mesh. Coordinates run aft along +Z,
// from the narrow beak and raised melon to the peduncle and paired flukes.
function dolphinGeometry(near){
  const points=[],colors=[],indices=[];
  const back=new THREE.Color(0x667e8a),side=new THREE.Color(0x9aaeb1),belly=new THREE.Color(0xd4d4c6);
  const tint=new THREE.Color();
  const forward=(x,y,z)=>[x,y,z];
  function loft(rows,n,transform=forward,paint){
    const start=points.length/3;
    for(const [z,rx,ry,cy=0] of rows){
      for(let k=0;k<n;k++){
        const a=Math.PI*2*k/n,sin=Math.sin(a),cos=Math.cos(a);
        points.push(...transform(rx*cos,cy+ry*sin,z));
        const color=paint?paint(sin,z):tint.copy(side).lerp(sin<0?belly:back,Math.min(1,Math.abs(sin)*1.35));
        colors.push(color.r,color.g,color.b);
      }
    }
    for(let j=0;j<rows.length-1;j++)for(let k=0;k<n;k++){
      const a=start+j*n+k,b=start+j*n+(k+1)%n;
      indices.push(a,b,a+n,b,b+n,a+n);
    }
  }
  const gray=()=>back,ink=new THREE.Color(0x202e32),eye=new THREE.Color(0x111c20);
  loft([
    [-1.65,.008,.012,-.077],[-1.62,.049,.039,-.077],[-1.54,.080,.047,-.077],
    [-1.41,.105,.050,-.079],[-1.30,.119,.062,-.069],[-1.26,.143,.097,-.038],
    [-1.21,.165,.148,.004],[-1.14,.199,.199,.033],[-1.03,.217,.224,.043],
    [-.90,.236,.245,.036],[-.68,.273,.268,.019],[-.39,.302,.292,.005],
    [-.13,.312,.305,0],[.17,.299,.288,.005],[.44,.264,.237,.012],
    [.69,.213,.185,.012],[.92,.154,.135,.011],[1.13,.113,.110,.009],
    [1.36,.074,.083,.019],[1.53,.048,.054,.028],[1.63,.010,.018,.023],
  ],near?30:12);
  // Dorsal fore-edge rakes aft; the concave trailing edge curls back towards its base.
  loft([ [.19,.078,.27,.04],[.28,.068,.23,.042],[.39,.049,.156,.078],
    [.52,.031,.098,.13],[.62,.016,.053,.186],[.674,.004,.010,.227] ],
    near?14:8,(x,z,y)=>[x,y,z],gray);
  for(const sign of [-1,1]){
    // The fin is swept rearward and slightly down, with a lens-shaped section.
    loft([[.18,.061,.162,-.54],[.30,.055,.151,-.52],[.42,.046,.130,-.45],
      [.56,.029,.092,-.36],[.67,.014,.051,-.265],[.705,.004,.008,-.228]],
      near?14:8,(y,z,x)=>[sign*x,-.065-(x-.18)*.28+y,z],gray);
    loft([[.012,.043,.105,1.500],[.105,.057,.157,1.475],[.23,.054,.145,1.486],
      [.37,.043,.120,1.526],[.52,.027,.071,1.585],[.65,.013,.035,1.666],[.707,.004,.008,1.715]],
      near?16:8,(y,z,x)=>[x*sign,y+.028-.08*x,z],gray);
    if(near){
      // The gape sweeps up towards the eye. Follow the widening head so it
      // remains on the skin from beak to cheek.
      const lip=[[-1.612,.053,-.081],[-1.55,.081,-.081],[-1.42,.104,-.078],
        [-1.31,.117,-.071],[-1.26,.14,-.064],[-1.21,.153,-.055],[-1.14,.183,-.042],[-1.066,.199,-.022]];
      for(const [j,[z,x,y]] of lip.entries()){
        if(!j)continue;
        const [pz,px,py]=lip[j-1];
        const start=points.length/3;
        for(const [zz,xx,yy] of [[pz,px,py],[z,x,y]]){
          points.push(sign*(xx+.002),yy-.004,zz,sign*(xx+.002),yy+.004,zz);
          for(let t=0;t<2;t++)colors.push(ink.r,ink.g,ink.b);
        }
        indices.push(start,start+1,start+2,start+1,start+3,start+2);
      }
      loft([[-.033,.003,.004],[-.020,.011,.016],[0,.013,.020],[.021,.010,.014],[.032,.002,.003]],
        10,(x,y,z)=>[sign*(.224+x),.047+y,-.987+z],()=>eye);
    }
  }
  if(near){
    // The crescent of the blowhole sits behind the melon.
    loft([[-.014,.013,.003],[-.006,.036,.003],[.006,.034,.003],[.012,.013,.003]],
      10,(x,y,z)=>[x,.282-.22*Math.abs(x)+y,-.74+z+.17*Math.abs(x)],()=>ink);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setIndex(indices);geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}

function dolphinSkin(water,clock,stroke){
  const skin=manateeMaterial({map:null},0xffffff,water,clock);
  skin.side=THREE.DoubleSide;skin.forceSinglePass=true;skin.roughness=.34;
  const marineShader=skin.onBeforeCompile;
  skin.onBeforeCompile=shader=>{
    marineShader(shader);
    shader.uniforms.flukeStroke=stroke;
    shader.vertexShader='uniform float flukeStroke;\n'+shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      float aft=max(0.,position.z+.22);
      transformed.y+=.102*aft*aft*sin(flukeStroke-aft*.69);
    `).replace('#include <beginnormal_vertex>',`
      #include <beginnormal_vertex>
      float along=max(0.,position.z+.22);
      float derivative=.204*along*sin(flukeStroke-along*.69)-.0704*along*along*cos(flukeStroke-along*.69);
      objectNormal.z-=objectNormal.y*derivative;
    `);
  };
  skin.customProgramCacheKey=()=>'coastal-bottlenose';
  return skin;
}

export function dolphinView(scene,water){
  const clock={value:0},models=[],impacts=aquaticImpactView(scene,water,dolphinSizes);
  let nearShape,farShape,ring,template;
  loadDolphinModel(water,clock).then(loaded=>{
    template=loaded;
    for(const instance of models)if(instance)attachModel(instance);
  }).catch(error=>console.warn('Dolphin model unavailable; using the built-in dolphin.',error));
  function attachModel(instance){
    if(instance.model || !template)return;
    const {model,mixer}=makeDolphinModel(template);
    instance.root.add(model);instance.model=model;instance.mixer=mixer;
  }
  function model(){
    nearShape??=dolphinGeometry(true);farShape??=dolphinGeometry(false);
    ring??=new THREE.RingGeometry(.88,1,36).rotateX(-Math.PI/2);
    const stroke={value:0};
    const body=new THREE.Mesh(nearShape,dolphinSkin(water,clock,stroke));body.renderOrder=1;
    const root=new THREE.Group();root.name='Coastal bottlenose dolphin';root.rotation.order='YXZ';root.visible=false;
    root.add(body);
    const wake=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({color:0xc4dbd6,transparent:true,depthWrite:false}));
    wake.visible=false;wake.renderOrder=3;scene.add(root,wake);
    const instance={root,body,wake,stroke,breathOrigin:new THREE.Vector3(),lastAir:-1};
    attachModel(instance);
    return instance;
  }
  const approach=(a,b,k)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*k;
  return (states,local,tick,dt)=>{
    impacts(states,local,dt);
    clock.value=(tick??0)/30;
    const count=Math.max(models.length,states?.length??0),k=-Math.expm1(-17*dt);
    const nearest=(states??[]).map((p,i)=>({i,d:Math.hypot(p.x-local.x,p.y-local.y,p.z-local.z)}))
      .filter(entry=>entry.d<=52 && states[entry.i].deathKind!=='blast').sort((a,b)=>a.d-b.d).slice(0,4);
    for(let i=0;i<count;i++){
      const visible=nearest.find(entry=>entry.i===i);
      if(!visible){
        if(models[i]){models[i].root.visible=models[i].wake.visible=false;models[i].lastAir=-1;}
        continue;
      }
      const p=states[i],distance=visible.d;
      const m=models[i]??=model(),{root,body,wake,stroke,breathOrigin}=m;
      const alpha=root.visible && root.position.distanceToSquared(p)<36?k:1;
      root.position.x=THREE.MathUtils.lerp(root.position.x,p.x,alpha);
      root.position.y=THREE.MathUtils.lerp(root.position.y,p.y,alpha);
      root.position.z=THREE.MathUtils.lerp(root.position.z,p.z,alpha);
      root.rotation.set(approach(root.rotation.x,p.hp===0?p.pitch*Math.exp(-p.ageSinceHit):p.pitch,alpha),approach(root.rotation.y,-p.yaw,alpha),
        approach(root.rotation.z,p.roll,alpha),'YXZ');
      root.scale.setScalar(p.size);root.visible=true;
      const detailed=!!m.model && distance<(m.model.visible?25:23);
      if(m.model){m.model.visible=detailed;if(detailed)m.mixer.update(dt);}
      body.visible=!detailed;
      body.geometry=distance<(body.geometry===nearShape?21:18)?nearShape:farShape;
      stroke.value=approach(stroke.value,p.stroke,alpha);
      if(p.air>=0 && (m.lastAir<0 || p.air<m.lastAir)){
        root.localToWorld(breathOrigin.set(0,.28,-.74));
      }
      m.lastAir=p.air;
      wake.visible=p.air>=0 && p.air<2.2 && distance<32;
      if(wake.visible){
        wake.position.set(breathOrigin.x,water+.022,breathOrigin.z);
        const r=.18+p.air*.60;wake.rotation.y=root.rotation.y;wake.scale.set(r,1,r*1.35);
        wake.material.opacity=.25*(1-p.air/2.2);
      }
    }
  };
}
