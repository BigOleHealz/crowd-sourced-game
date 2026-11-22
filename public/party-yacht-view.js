import {partySeats,partySinkDepth} from './party-seats.js';
import {sinkingHull} from './sinking-hull.js';
import * as THREE from 'three';
import {gunfireAlarm} from './bystander-cover.js';
import {wakeTrail} from './boat-wake-view.js';

const ivory=0xece8db,bronze=0xb3a17b,chrome=0xb8c4c3,teak=0xa97b54,onyx=0x262d31;
const styles=[
  {hull:0x26404a,bimini:0xe4d7bd,cloth:0x739e9d,trim:0xb89662},
  {hull:0xdeceba,bimini:0x394955,cloth:0xb47860,trim:0x927458},
  {hull:0x434d61,bimini:0xddd6c5,cloth:0x68859d,trim:0xcfb27d},
];
const cube=new THREE.BoxGeometry(),ball=new THREE.SphereGeometry(1,12,8);
const cylinder=new THREE.CylinderGeometry(1,1,1,14),ring=new THREE.TorusGeometry(1,.096,6,22);
const up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3(),joint=new THREE.Object3D(),dummy=new THREE.Object3D();
function panel(batch,color,a,b,c,d){
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));
  geom.computeVertexNormals();batch.add(geom,color,0,0,0);geom.dispose();
}
function section(batch,color,a,b,rx,rz=rx){
  dir.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
  const length=dir.length();
  joint.quaternion.setFromUnitVectors(up,dir.normalize());
  const {x,y,z}=joint.rotation;
  batch.add(cylinder,color,(a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5,rx,length,rz,x,y,z);
}
function person(Batch,index){
  const b=new Batch(),captain=index===0;
  const skin=[0xa76f51,0xbe8b68,0x835740,0xd9ab89,0x996247][index];
  const hair=[0x413630,0x4a3732,0x292827,0xae8358,0x372b27][index];
  const top=[ivory,0x477771,0xb15d45,0xe6d8bb,0x55758d][index];
  const pants=[0x484f5a,0xc9ad89,0x435b63,0x80665f,0xd1c6ac][index];
  const dress=index===2,skirt=index===3;
  // Lofted silhouettes give clothing different widths at hips, waist and shoulders.
  function loft(rows,color){
    for(let j=1;j<rows.length;j++)for(let k=0;k<12;k++){
      const point=(i,v)=>{const [y,w,d,cz=0]=rows[i],a=v*Math.PI/6;return [w*Math.cos(a),y,cz+d*Math.sin(a)];};
      panel(b,color,point(j-1,k),point(j,k),point(j,k+1),point(j-1,k+1));
    }
  }
  for(const s of [-1,1]){
    const hip=[s*.091,.91,0],knee=[s*.102,.51,-.025+s*.026],foot=[s*.11,.104,.018+s*.054];
    section(b,skin,knee,foot,.053);section(b,pants,hip,knee,.079);
    if(!captain && !dress && !skirt)section(b,skin,[knee[0],.59,knee[2]],knee,.069);
    if(captain)section(b,pants,knee,[foot[0],.12,foot[2]],.069);
    b.add(ball,captain?onyx:0xcfc4b1,foot[0],.065,foot[2]-.05,.070,.051,.132);
  }
  loft([[.86,.162,.118],[.99,.15,.102],[1.12,.137,.096],[1.30,.19,.114,-.014],[1.39,.208,.093],[1.43,.107,.073]],top);
  if(dress||skirt)loft([[.66,.21,.139],[.80,.174,.13],[.96,.147,.111]],dress?top:pants);
  else loft([[.82,.154,.115],[.94,.162,.119]],pants);
  const open=index%2===1;
  for(const side of [-1,1]){
    const raise=side===1 && index!==4;
    const shoulder=[side*.184,1.345,0],elbow=[side*(open?.32:.255),raise?1.09:1.046,raise?-.16:.045];
    const hand=[side*(raise?.235:.263),raise?(captain?1.13:1.37):.885,raise?-.286:.015];
    section(b,skin,elbow,hand,.043);
    section(b,top,shoulder,[side*.225,1.206,(shoulder[2]+elbow[2])*.5],.064);
    section(b,skin,[side*.225,1.206,(shoulder[2]+elbow[2])*.5],elbow,.050);
    b.add(ball,skin,...hand,.043,.061,.037);
    if(raise && !captain){
      const [x,y,z]=hand;b.add(cylinder,0xd5c298,x,y+.034,z-.018,.032,.104,.032);
      b.add(cylinder,0xb58456,x,y+.086,z-.018,.029,.004,.029);
    }
  }
  b.add(cylinder,skin,0,1.449,-.006,.057,.094,.055);
  loft([[1.461,.055,.053,-.028],[1.484,.078,.068,-.022],[1.57,.094,.084,-.014],
    [1.64,.09,.082,-.002],[1.696,.06,.06]],skin);
  b.add(ball,hair,0,1.652,.009,.096,.062,.092);
  b.add(ball,skin,0,1.558,-.098,.021,.026,.029);
  for(const side of [-1,1]){
    b.add(ball,skin,side*.094,1.568,0,.015,.029,.019);
    b.add(ball,index%2?onyx:hair,side*.044,1.586,-.088,index%2?.038:.009,index%2?.017:.005,.006);
  }
  if(index===2 || index===3)b.add(ball,hair,.004,1.536,.068,.088,.102,.065);
  if(captain||index===3){
    b.add(ball,captain?ivory:0xcfb584,0,1.688,-.002,.099,.038,.099);
    b.add(ball,captain?onyx:0xbe985f,0,1.672,-.033,captain?.093:.150,.009,captain?.125:.143);
  }
  const geometry=b.geometry();
  if(captain){
    const position=geometry.attributes.position;
    for(let i=0;i<position.count;i++){
      const y=position.getY(i);
      position.setY(i,y-.38*THREE.MathUtils.smoothstep(y,.42,.91));
      position.setZ(i,position.getZ(i)-.31*(1-THREE.MathUtils.smoothstep(y,.51,.91)));
    }
    geometry.computeVertexNormals();
  }
  if(!captain){
    // One vertex pose per shared guest shape. Shoes stay put as the knees bend
    // forward and the upper body folds back below the gunwale.
    const rest=geometry.attributes.position,cover=rest.clone();
    for(let i=0;i<rest.count;i++){
      const y=rest.getY(i),z=rest.getZ(i),bend=THREE.MathUtils.smoothstep(y,.08,.51);
      const hip=THREE.MathUtils.smoothstep(y,.51,.91),upper=Math.max(0,y-.91);
      cover.setXYZ(i,rest.getX(i),y-.11*bend-.23*hip-.26*upper,
        z-.22*bend+.32*hip-.68*upper);
    }
    geometry.morphAttributes.position=[cover];
  }
  return geometry;
}

function yacht(scene,Batch,boat,shared){
  const style=styles[(boat.style??0)%styles.length],root=new THREE.Group();
  root.name='Party yacht · '+(boat.name??boat.id);scene.add(root);
  const hull=new Batch(),rails=new Batch(),interior=new Batch(),lights=new Batch(),glass=new Batch();
  const block=(b,col,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>b.add(cube,col,x,y,z,w,h,d,rx,ry,rz);
  // Bow flare tapers to a narrow waterline. The stern ends at a split-level swim terrace.
  const stations=[[-9.5,.035,1.73],[-8.8,.74,1.73],[-7.7,1.47,1.66],[-6.1,2.04,1.53],
    [-4.1,2.48,1.41],[-1.9,2.69,1.32],[1,2.75,1.32],[4,2.73,1.32],[6.9,2.59,1.32],[8.32,2.39,1.30]];
  const rows=stations.map(([z,w,h])=>[[-w,h,z],[-w*.985,.42,z],[-w*.955,.16,z],[-w*.91,.068,z],
    [-w*.66,-.47,z],[0,-.94,z],[w*.66,-.47,z],[w*.91,.068,z],[w*.955,.16,z],[w*.985,.42,z],[w,h,z]]);
  for(let i=1;i<rows.length;i++){
    const a=rows[i-1],b=rows[i];
    for(let k=0;k<10;k++)panel(hull,k===2||k===7?style.trim:k>=3&&k<=6?0x39484a:style.hull,
      a[k],a[k+1],b[k+1],b[k]);
    panel(hull,teak,a[0],b[0],b[10],a[10]);
    for(const side of [-1,1]){
      const x=side<0?0:10;
      rails.beam(ivory,a[x],b[x],.102,.13);
      const post=row=>[row[x][0]*.975,row[x][1]+.68,row[x][2]];
      rails.beam(chrome,post(a),post(b),.037);
      const low=row=>[row[x][0]*.975,row[x][1]+.39,row[x][2]];
      rails.beam(chrome,low(a),low(b),.018);
      if(i%2 || i<4){
        const top=post(b);rails.beam(chrome,[top[0],b[x][1],top[2]],top,.029);
      }
    }
  }
  const stern=rows.at(-1);
  for(let k=0;k<10;k++)panel(hull,style.hull,stern[k],stern[k+1],[0,.45,8.33],[0,.45,8.33]);
  for(let z=-7.2;z<8.25;z+=.31){
    const i=stations.findIndex(s=>s[0]>=z),a=stations[i-1],b=stations[i],u=(z-a[0])/(b[0]-a[0]);
    block(interior,0x846549,0,mix(a[2],b[2],u)+.008,z,(mix(a[1],b[1],u)-.12)*2,.01,.012);
  }
  block(interior,teak,0,.72,8.82,4.18,.18,1.19);
  for(let j=0;j<3;j++)block(interior,teak,0,.89+j*.15,8.53-j*.22,1.47,.12,.35);
  for(const side of [-1,1]){rails.beam(chrome,[side*1.73,.73,9.28],[side*1.73,1.44,8.16],.034);}
  // A dark wraparound glazing band sits under an overhanging flybridge.
  const corners=(z,w,y)=>[[-w,y,z],[w,y,z]];
  const baseFront=corners(-3.69,1.66,1.59),topFront=corners(-2.69,1.55,3.04);
  const baseAft=corners(2.10,1.94,1.59),topAft=corners(1.76,1.67,3.04);
  for(const side of [0,1]){
    const v=[baseFront[side],topFront[side],topAft[side],baseAft[side]];
    panel(glass,0x758c91,...v);
    hull.beam(0x72868a,topFront[side],topAft[side],.10);
    for(let j=0;j<5;j++){
      const u=j/4,t=v[1].map((c,i)=>mix(c,v[2][i],u)),b=v[0].map((c,i)=>mix(c,v[3][i],u));
      hull.beam(ivory,b,t,j===0?.11:.052);
    }
  }
  panel(glass,0x9aaeb1,baseFront[0],baseFront[1],topFront[1],topFront[0]);
  hull.beam(ivory,topAft[0],topAft[1],.09);
  for(let j=0;j<=3;j++){
    const u=j/3;
    hull.beam(chrome,[mix(-1.66,1.66,u),1.59,-3.69],[mix(-1.55,1.55,u),3.04,-2.69],.052);
  }
  // Side opening at the port helm keeps the driver at eye level on the main deck.
  block(hull,ivory,0,1.445,-.76,3.86,.25,5.58);
  // The low instrument console leaves open sightlines for the seated driver.
  block(interior,onyx,-.80,1.77,-2.35,.79,.24,.33,-.24);
  interior.add(ring,onyx,-.80,1.96,-2.17,.20,.20,.20,-.48);
  for(const s of [-1,1])block(interior,0x77a8aa,-.80+s*.19,1.92,-2.37,.18,.08,.014,-.45);
  interior.add(ball,style.cloth,-.80,1.80,-1.73,.245,.096,.235);
  interior.add(ball,style.cloth,-.80,2.04,-1.53,.23,.268,.083,-.08);
  interior.add(cylinder,chrome,-.80,1.55,-1.73,.085,.40,.085);
  // Teak roof deck and cockpit awning mounted over the aft lounge.
  block(hull,ivory,0,3.08,-.02,3.99,.15,6.02);
  block(interior,teak,0,3.165,-.03,3.66,.025,5.64);
  for(const s of [-1,1]){
    hull.beam(ivory,[s*1.7,3.18,-1.15],[s*1.46,5.17,-.55],.095);
    hull.beam(ivory,[s*1.71,3.18,1.87],[s*1.46,5.17,1.44],.095);
    rails.beam(chrome,[s*1.92,3.19,-2.52],[s*1.77,3.84,-2.27],.043);
    rails.beam(chrome,[s*1.77,3.84,-2.27],[s*1.77,3.84,2.53],.037);
    for(const z of [-1.16,.58,2.52])rails.beam(chrome,[s*1.77,3.18,z],[s*1.77,3.84,z],.023);
    rails.beam(chrome,[s*2.23,1.33,6.61],[s*2.04,3.45,6.36],.062);
    panel(hull,style.bimini,[s*1.84,3.15,2.78],[s*2.07,3.51,6.45],
      [0,3.40,6.45],[0,3.29,2.78]);
  }
  hull.add(ball,style.bimini,0,5.20,.40,1.87,.14,1.91);
  hull.add(ball,ivory,0,5.26,.37,1.79,.124,1.73);
  hull.add(ball,ivory,0,5.52,.7,.27,.24,.26);
  hull.beam(chrome,[.16,5.29,.86],[.22,5.95,1.1],.033);
  hull.add(ball,ivory,.22,5.97,1.10,.48,.042,.070);
  for(const side of [-1,1]){
    for(const z of [-4.9,-3.8,-2.7,.2,1.35,2.5,3.65]){
      const i=stations.findIndex(st=>st[0]>=z),a=stations[i-1],b=stations[i];
      const width=mix(a[1],b[1],(z-a[0])/(b[0]-a[0]))*.995;
      hull.add(ball,bronze,side*width,.88,z,.040,.137,.272);
      hull.add(ball,0x2e434a,side*(width+.020),.88,z,.036,.112,.237);
    }
  }
  // Separate bolsters and piping on the bow sunbeds, flybridge benches and aft banquette.
  function lounge(x,y,z,w,d,back){
    block(interior,ivory,x,y+.12,z,w,.23,d);
    block(interior,style.cloth,x,y+.265,z,w*.98,.105,d*.965);
    for(let j=1;j<4;j++)block(interior,ivory,x,y+.321,z-d*.46+j*d*.23,w*.96,.014,.015);
    if(back){
      block(interior,style.cloth,x,y+.51,z+d*.43,w*.955,.44,.14,-.13);
      interior.add(ball,style.cloth,x,y+.72,z+d*.43+.029,w*.484,.064,.082,-.13);
    }
  }
  for(const side of [-1,1]){
    lounge(side*.54,1.58,-5.74,.94,1.9,true);lounge(side*1.81,1.32,5.47,.72,2.70,false);
    lounge(side*.82,3.19,.69,1.42,.8,true);
  }
  lounge(0,1.32,7.14,3.67,.72,true);
  for(const [x,y,z,r] of [[0,1.32,5.52,.69],[0,3.18,-.73,.43]]){
    interior.add(cylinder,chrome,x,y+.31,z,.076,.63,.076);
    interior.add(cylinder,teak,x,y+.66,z,r,.065,r*.81);
    for(const side of [-1,1]){interior.add(cylinder,0xc4a678,x+side*.17,y+.76,z,.041,.13,.041);}
  }
  for(const side of [-1,1])for(let i=0;i<=9;i++){
    const u=i/9,z=2.80+u*3.49,y=mix(3.14,3.48,u)-.17*Math.sin(u*Math.PI);
    const x=side*mix(1.84,2.04,u);
    if(i)lights.add(ball,0xffd093,x,y-.08,z,.037,.053,.037);
    if(i<9)rails.beam(onyx,[x,y,z],[side*mix(1.84,2.04,u+1/9),mix(3.14,3.48,u+1/9)-.17*Math.sin((u+1/9)*Math.PI),z+3.49/9],.012);
  }
  block(lights,0xe17c65,-2.64,1.39,-1.3,.054,.057,.17);
  block(lights,0x83d7c2,2.64,1.39,-1.3,.054,.057,.17);
  glass.mesh(root,shared.windows,false);
  const shell=hull.mesh(root,shared.finish);shell.userData.target=boat.id;shell.userData.impactSurface='metal';
  const metal=rails.mesh(root,shared.metal,false),cabin=interior.mesh(root,shared.matte),lamps=lights.mesh(root,shared.glow,false);
  for(const m of [metal,cabin]){m.userData.target=boat.id;m.userData.impactSurface='metal';}
  const crew=shared.people.map((geo,i)=>{
    const mesh=new THREE.InstancedMesh(geo,shared.matte,i===0?1:2);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;if(i){
      mesh.userData.alarm=0;
      for(let j=0;j<mesh.count;j++)mesh.setMorphAt(j,{morphTargetInfluences:[0]});
      mesh.morphTexture.needsUpdate=true;
    }
    mesh.name=i===0?'Skipper':'Party guests';root.add(mesh);
    return mesh;
  });
  const wake=wakeTrail(scene);
  return {root,wake,update(b,distance,time,dt,local,alarm){
    const sink=sinkingHull(b,partySinkDepth);
    root.position.set(b.x,b.y-sink.drop,b.z);
    root.rotation.set((b.pitch??0)+sink.trim,-b.yaw,(b.roll??0)+sink.list,'YXZ');
    metal.visible=distance<130;cabin.visible=distance<155;lamps.visible=distance<115;
    for(let i=0;i<crew.length;i++){
      const group=crew[i];group.visible=distance<95 && (i>0 || (b.driver==null && b.cruising));
      if(!group.visible)continue;
      if(i && (alarm || group.userData.alarm)){
        let cover=mix(group.userData.alarm,alarm,1-Math.exp(-dt*(alarm?14:5)));
        if(cover<.002)cover=0;
        if(cover!==group.userData.alarm){
          group.userData.alarm=cover;
          for(let j=0;j<group.count;j++)group.setMorphAt(j,{morphTargetInfluences:[cover]});
          group.morphTexture.needsUpdate=true;
        }
      }
      const moves=partySeats[i];
      for(let j=0;j<moves.length;j++){
        const [x,y,z,a]=moves[j],beat=time*(1.92+i*.064)+i*2+j*1.51+(b.style??0);
        const rock=i?.027*Math.sin(beat):0;
        dummy.position.set(x+rock*.86,y,z);dummy.rotation.set(.012*Math.sin(beat),a+(i?.105*Math.sin(beat*.5):0),rock,'YXZ');
        const seat=i?1+(i-1)*2+j:0;
        dummy.scale.setScalar((b.evacuatedSeats??0)&(1<<seat)?0:i?1+(j-.5)*.055-i*.004:1);dummy.updateMatrix();group.setMatrixAt(j,dummy.matrix);
      }
      group.instanceMatrix.needsUpdate=true;
    }
    wake(b,dt,local);
  }};
}
const mix=THREE.MathUtils.lerp;
export function partyYachtView(scene,Batch){
  const models=new Map();
  let shared,time=0;
  return (boats,dt,local,tick,cues)=>{
    time=Number.isFinite(tick)?tick/30:time+dt;
    const live=new Set();
    for(const boat of boats??[]){
      if(!boat.partyYacht)continue;
      const d=Math.hypot(boat.x-local.x,boat.z-local.z);
      if(d>185)continue;
      if(!shared)shared={
        finish:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.36,metalness:.16,side:THREE.DoubleSide}),
        metal:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.28,metalness:.44}),
        matte:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,side:THREE.DoubleSide}),
        windows:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.18,metalness:.26,transparent:true,opacity:.49,depthWrite:false,side:THREE.DoubleSide}),
        glow:new THREE.MeshBasicMaterial({vertexColors:true}),people:Array.from({length:5},(_,i)=>person(Batch,i)),
      };
      let model=models.get(boat.id);
      if(!model){model=yacht(scene,Batch,boat,shared);models.set(boat.id,model);}
      model.root.visible=true;model.update(boat,d,time,dt,local,boat.wrecked?1:gunfireAlarm(cues,boat,tick));live.add(boat.id);
    }
    for(const [id,model] of models)if(!live.has(id)){model.root.visible=false;model.wake(null,dt,local);}
  };
}
