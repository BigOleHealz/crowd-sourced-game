import * as THREE from 'three';
import {collectionMap} from './estate-collection.js';

const tiles={linen:0,wood:1,stone:2,velvet:3,abstract:4,harbor:5};
const cream=0xf5e9d6,ceramic=0xd9cbb0,dark=0x4f4036;

export function residentialFurnishingView(scene,Batch){
  const cube=new THREE.BoxGeometry(),sphere=new THREE.SphereGeometry(.5,10,6);
  const cushion=sphere.clone(),vertices=cushion.attributes.position;
  const soften=v=>Math.sign(v)*Math.pow(Math.abs(v)*2,.36)*.5;
  for(let i=0;i<vertices.count;i++)vertices.setXYZ(i,soften(vertices.getX(i)),soften(vertices.getY(i)),soften(vertices.getZ(i)));
  cushion.computeVertexNormals();
  const cylinder=new THREE.CylinderGeometry(.5,.5,1,12);
  const shade=new THREE.CylinderGeometry(.29,.5,1,16);
  const foliage=new THREE.SphereGeometry(.5,7,4);
  const plane=new THREE.PlaneGeometry();
  const attributes=new Map();
  function surface(g,tile){
    let uv=attributes.get(g);
    if(!uv){uv=new Map();attributes.set(g,uv);}
    if(!uv.has(tile)){
      const coords=g.attributes.uv.clone(),col=tile%3,row=1-Math.floor(tile/3);
      for(let i=0;i<coords.count;i++)coords.setXY(i,(col+.014+.972*coords.getX(i))/3,(row+.014+.972*coords.getY(i))/2);
      uv.set(tile,coords);
    }
    g.setAttribute('batchUv',uv.get(tile));
    return g;
  }

  const texture=collectionMap();
  const roomMat=new THREE.MeshLambertMaterial({vertexColors:true,map:texture,emissive:0x4b3b27,emissiveIntensity:.22});
  roomMat.onBeforeCompile=s=>{
    s.vertexShader='varying vec3 roomPosition,roomNormal;\n'+s.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nroomPosition=position;roomNormal=normal;');
    s.fragmentShader='varying vec3 roomPosition,roomNormal;\n'+s.fragmentShader.replace('#include <map_fragment>',`
      vec2 grid=vec2(3.,2.),tile=floor(vMapUv*grid);
      vec3 sampleColor=texture2D(map,vMapUv).rgb;
      if(tile.x<.5){
        vec3 n=abs(roomNormal);
        vec2 grain=(n.y>n.x && n.y>n.z?roomPosition.xz:n.x>n.z?roomPosition.zy:roomPosition.xy)*2.6;
        vec2 uv=(tile+.018+.96*fract(grain))/grid;
        vec3 thread=textureGrad(map,uv,dFdx(grain)*.96/grid,dFdy(grain)*.96/grid).rgb;
        if(tile.y<.5)thread=vec3(dot(thread,vec3(.22,.7,.08)));
        sampleColor=mix(vec3(.75,.71,.65),thread,.42);
      }
      if(tile.x>.5 && tile.y>.5)sampleColor=mix(vec3(.82,.75,.67),sampleColor,.55);
      diffuseColor.rgb*=sampleColor;`);
  };
  const lightMat=new THREE.MeshBasicMaterial({vertexColors:true});
  const cache=new Map();
  const root=new THREE.Group();
  root.name='Residential furnishings';
  scene.add(root);

  function bake(model,origin){
    const batch=new Batch(true),light=new Batch();
    const {timber,stone,cloth,accent,trim,rug,art}=model.profile;
    for(const item of model.furnishings){
      const {kind,x,y,z,w,h,d,yaw}=item,c=Math.cos(yaw),s=Math.sin(yaw);
      const shape=(g,t,int,u,v,a,width,height,depth,rx=0,ry=0,rz=0)=>
        batch.add(surface(g,tiles[t]),int,x-origin.x+c*u+s*a,y+v-origin.y,z-origin.z-s*u+c*a,width,height,depth,rx,yaw+ry,rz);
      const box=(t,int,...args)=>shape(cube,t,int,...args);
      const wood=(...args)=>box('wood',timber,...args);
      const marble=(...args)=>box('stone',stone,...args);
      const linen=(int,...args)=>shape(cushion,'linen',int,...args);
      const velvet=(int,...args)=>shape(cushion,'velvet',int,...args);
      const brass=(...args)=>shape(cylinder,'stone',trim,...args);
      const round=(t,int,...args)=>shape(cylinder,t,int,...args);
      const glow=(g,int,u,v,a,width,height,depth)=>light.add(g,int,x-origin.x+c*u+s*a,y+v-origin.y,z-origin.z-s*u+c*a,width,height,depth,0,yaw);
      const foot=(u,a,height=.13)=>wood(u,height/2,a,.054,height,.054);
      const book=(int,u,v,a,width,height,depth,angle=0)=>{
        box('linen',int,u,v,a,width,height,depth,0,angle);
        box('linen',cream,u,v,a+.015,width*.92,height*.61,depth,0,angle);
      };
      if(kind==='sofa'){
        for(const side of [-1,1])for(const end of [-1,1])foot(side*w*.38,end*d*.34);
        wood(0,.137,0,w-.04,.084,d-.04);
        linen(cloth,0,.25,0,w,.24,d);
        const count=w>2?3:2,seat=(w-.38)/count;
        for(let i=0;i<count;i++){
          const u=seat*(i+.5-count/2);
          linen(cloth,u,.436,d*.09,seat+.008,.18,d*.70);
          linen(cloth,u,.657,-d*.30,seat+.008,.44,d*.26,-.16);
        }
        for(const side of [-1,1]){
          linen(cloth,side*(w/2-.08),.458,0,.168,.40,d*.93);
          velvet(side<0?accent:0xc7a57c,side*w*.31,.647,-d*.12,.375,.34,d*.18,-.21,0,side*.22);
        }
      }else if(kind==='bed'){
        for(const side of [-1,1])for(const end of [-1,1])foot(side*w*.43,end*d*.38);
        wood(0,.23,0,w,.22,d);
        linen(cream,0,.43,0,w-.022,.265,d-.025);
        linen(cloth,0,.58,d*.067,w-.021,.174,d*.86);
        velvet(accent,0,.666,d*.28,w-.017,.069,d*.36);
        const count=6,span=w/count;
        for(let i=0;i<count;i++)
          velvet(accent,span*(i+.5-count/2),.62,-d*.458,span+.01,1.14,.139);
        for(const side of [-1,1]){
          linen(cream,side*w*.234,.667,-d*.305,w*.43,.21,.46,-.09,0,side*.027);
          linen(cloth,side*w*.208,.736,-d*.182,w*.31,.16,.31,-.21,0,-side*.04);
        }
      }else if(kind==='chair'){
        for(const side of [-1,1])for(const end of [-1,1])foot(side*w*.37,end*d*.36,.386);
        linen(cloth,0,.427,0,w,.12,d);
        for(const side of [-1,1])wood(side*w*.37,.637,-d*.39,.043,.42,.047,-.06);
        velvet(accent,0,h-.138,-d*.385,w-.006,.245,.125,-.065);
      }else if(kind==='dining' || kind==='coffee'){
        const dining=kind==='dining';
        const plinth=h-.085,columns=w>1.14?[-.27,.27]:[0];
        for(const offset of columns){
          round('wood',timber,offset*w,plinth/2,0,d*.43,plinth,d*.61);
          round('stone',trim,offset*w,.025,0,d*.51,.05,d*.65);
          for(let i=0;i<12;i++){
            const angle=i*Math.PI/6;
            round('wood',timber,offset*w+.212*d*Math.cos(angle),plinth*.51,.295*d*Math.sin(angle),.021,plinth*.87,.021);
          }
        }
        shape(cushion,'stone',stone,0,h-.044,0,w,.089,d);
        if(dining){
          for(const u of w>1.24?[-w*.29,w*.29]:[0])for(const a of [-1,1]){
            round('linen',accent,u,h+.004,a*d*.282,.25,.012,.25);
            round('stone',cream,u,h+.027,a*d*.282,.185,.031,.185);
            round('stone',0x94aba1,u+.16,h+.060,a*d*.18,.065,.125,.065);
          }
          shape(sphere,'stone',accent,0,h+.092,0,.20,.185,.20);
          round('stone',ceramic,0,h+.182,0,.075,.081,.075);
        }else{
          book(accent,-w*.22,h+.03,0,.29,.05,.21,-.05);
          book(cream,-w*.22,h+.061,0,.25,.024,.19,.13);
          shape(sphere,'stone',ceramic,w*.22,h+.048,.015,.202,.097,.184);
        }
      }else if(kind==='nightstand' || kind==='credenza' || kind==='desk'){
        const desk=kind==='desk',short=kind==='nightstand',top=.063;
        for(const side of [-1,1])for(const end of [-1,1])foot(side*w*.41,end*d*.35,desk?h-.13:.15);
        wood(desk?w*.214:0,desk?h-.125:h*.48,0,desk?w*.54:w-.017,desk?.17:h*.68,d-.027);
        marble(0,h-top/2,0,w,top,d);
        if(!desk){
          for(const line of short?[0]:[-1,0,1])box('stone',trim,line*w*.30,h*.55,d/2-.013,.091,.024,.02);
          for(let i=1;i<=(short?5:18);i++){
            const u=w*(i/((short?5:18)+1)-.5);
            wood(u,h*.48,d/2-.012,.012,h*.58,.016);
          }
        }
        if(short || desk){
          const u=desk?-w*.32:0;
          brass(u,h+.027,0,.22,.054,.22);
          brass(u,h+.137,0,.029,.25,.029);
          shape(shade,'linen',cream,u,h+.285,0,.31,.19,.31);
          glow(cylinder,0xffe5b6,u,h+.200,0,.289,.017,.289);
        }
        if(!short){
          book(accent,w*.22,h+.036,0,.31,.057,.25,-.08);
          shape(sphere,'stone',ceramic,-w*.24,h+.120,-d*.18,.14,.25,.14);
        }
      }else if(kind==='books'){
        wood(0,h/2,-d*.44,w,h,.045);
        for(const side of [-1,1])wood(side*(w/2-.025),h/2,0,.052,h,d);
        for(const v of [.09,.50,.96,1.40,h-.04])wood(0,v,0,w,.055,d);
        for(const v of [.53,1,1.45]){
          for(let i=0;i<5;i++)box('linen',[accent,cream,0xac7954,0x908779,0xdbc490][i],
            -w*.34+i*.071,v+.10+i%2*.027,-d*.12,.066,.19+i%2*.053,d*.52,0,0,i===4?.10:0);
          shape(sphere,'stone',ceramic,w*.29,v+.085,.014,.129,.172,.127);
        }
      }else if(kind==='plant'){
        const top=.45;
        round('stone',ceramic,0,top/2,0,w,top,d);
        round('wood',dark,0,top+.006,0,w*.87,.017,d*.87);
        for(let i=0;i<8;i++){
          const angle=i*2.3999,r=.09+.046*(i%3),rise=.44+i%4*.106;
          const u=r*Math.cos(angle),a=r*Math.sin(angle);
          round('wood',0x796548,u*.38,top+rise*.36,a*.38,.018,rise*.76,.018);
          shape(foliage,'linen',[0x6b8e5c,0x436745,0x557548][i%3],u,top+rise,a,.175,.34,.055,.57*Math.sin(angle),angle,-.30*Math.cos(angle));
        }
      }else if(kind==='rug'){
        box('linen',rug,0,.013,0,w,.017,d);
        for(const side of [-1,1]){
          box('linen',cream,side*(w/2-.071),.024,0,.035,.009,d-.097);
          box('linen',cream,0,.024,side*(d/2-.057),w-.107,.009,.036);
          box('linen',accent,side*(w/2-.115),.025,0,.016,.009,d-.175);
          box('linen',accent,0,.025,side*(d/2-.096),w-.158,.009,.016);
        }
      }else if(kind==='art'){
        box('wood',trim,0,h/2,0,w,h,.05);
        box('linen',cream,0,h/2,.028,w-.045,h-.045,.012);
        shape(plane,art,0xfff6e7,0,h/2,.035,w-.146,h-.124,1);
      }else if(kind==='pendant'){
        const bistro=w>.7,top=h-.022,n=bistro?3:1;
        brass(0,top,0,.205,.04,.205);
        brass(0,h*.59,0,.025,h*.72,.025);
        for(let i=0;i<n;i++){
          const a=(i-(n-1)/2)*.28;
          if(a)box('stone',trim,0,h*.42,a/2,.025,.025,Math.abs(a));
          shape(shade,'stone',stone,0,h*.27,a,bistro?.24:w*.63,h*.42,bistro?.24:w*.63);
          glow(cylinder,0xffe7bb,0,h*.068,a,bistro?.217:w*.59,.018,bistro?.217:w*.59);
        }
      }
    }
    const group=new THREE.Group();
    group.position.set(origin.x,origin.y,origin.z);
    batch.mesh(group,roomMat,false);
    light.mesh(group,lightMat,false);
    return group;
  }

  let current;
  return (layout,origin)=>{
    if(layout===current)return;
    if(current)root.remove(cache.get(current));
    current=layout;
    if(!layout)return;
    let group=cache.get(layout);
    if(group)cache.delete(layout);
    else group=bake(layout,origin);
    cache.set(layout,group);root.add(group);
    if(cache.size>3){
      const [previous,mesh]=cache.entries().next().value;
      for(const child of mesh.children)child.geometry.dispose();
      cache.delete(previous);
    }
  };
}
