import {estatePrints} from './estate-prints.js';
import {lidoPieces} from './lido-house.js';
import * as THREE from 'three';
import {casaFurniture} from './casa-luma.js';
import {mareFurniture} from './palazzo-mare.js';
import {estateCondition,collectionPiece,furnishingSupported} from './estate-damage.js';

const linen=0,walnut=1,marble=2,velvet=3,abstract=4,harbor=5,botanical=6,compass=7,shell=8;
const ivory=0xfff6e6,gold=0xaa8256,darkMetal=0x394343,teal=0x648e7d;
let atlas;
export function collectionMap(){
  if(!atlas){
    atlas=new THREE.TextureLoader().load('./lantern-collection.webp');
    atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=4;
  }
  return atlas;
}

function cushionGeometry(){
  const shape=new THREE.SphereGeometry(.5,12,8),p=shape.attributes.position;
  const curve=v=>.5*Math.sign(v)*Math.pow(2*Math.abs(v),.39);
  for(let i=0;i<p.count;i++)p.setXYZ(i,curve(p.getX(i)),curve(p.getY(i)),curve(p.getZ(i)));
  shape.computeVertexNormals();
  return shape;
}

// A slab has an eased rim and a flat top, unlike an upholstered cushion.
function stoneSlab(){
  const s=new THREE.Shape(),c=.13,r=.47;
  s.moveTo(-r+c,-r);s.lineTo(r-c,-r);s.quadraticCurveTo(r,-r,r,-r+c);
  s.lineTo(r,r-c);s.quadraticCurveTo(r,r,r-c,r);s.lineTo(-r+c,r);
  s.quadraticCurveTo(-r,r,-r,r-c);s.lineTo(-r,-r+c);s.quadraticCurveTo(-r,-r,-r+c,-r);
  const g=new THREE.ExtrudeGeometry(s,{depth:.70,steps:1,bevelSegments:1,bevelSize:.03,bevelThickness:.15,curveSegments:3});
  g.translate(0,0,-.35);g.rotateX(-Math.PI/2);
  const {position,normal,uv}=g.attributes;
  for(let i=0;i<uv.count;i++){
    const top=Math.abs(normal.getY(i))>.57,side=Math.abs(normal.getZ(i))>.57;
    uv.setXY(i,.5+(top||side?position.getX(i):position.getZ(i)),.5+(top?position.getZ(i):position.getY(i)));
  }
  return g;
}

function tropicalLeaf(){
  const pos=[],uv=[],index=[];
  for(let i=0;i<6;i++){
    const t=i/5,span=.50*Math.pow(Math.sin(t*Math.PI),.76);
    for(const edge of [-1,0,1]){
      pos.push(edge*span,t,t*t*.34+(1-edge*edge)*.09*Math.sin(Math.PI*t));
      uv.push((edge+1)*.5,t);
    }
    if(i===5)continue;
    for(let col=0;col<2;col++){
      const a=i*3+col,b=a+1,c=a+3,d=c+1;
      index.push(a,c,b,b,c,d,b,c,a,d,c,b);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(index);
  // Double-sided winding shares coordinates. A gently arched authored normal
  // keeps the thin blades shaded on both sides without a second material.
  const normals=[];for(let i=0;i<18;i++)normals.push((i%3-1)*.32,.46,1);
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));return g;
}

export function estateCollection(scene,Batch,refreshShadows,staticGroup){
  const box=new THREE.BoxGeometry(),pillow=cushionGeometry(),stone=stoneSlab(),leaf=tropicalLeaf();
  const drum=new THREE.CylinderGeometry(.5,.5,1,16),pin=new THREE.CylinderGeometry(.5,.5,1,7),orb=new THREE.SphereGeometry(.5,12,7);
  const lathe=points=>new THREE.LatheGeometry(points.map(([a,b])=>new THREE.Vector2(a,b)),16);
  const vase=lathe([[.18,0],[.26,.04],[.43,.24],[.46,.48],[.33,.71],[.20,.77],[.19,.96],[.22,.98],[.22,1],[.16,1],[.16,.95]]);
  const bowl=lathe([[.19,0],[.22,.10],[.41,.41],[.50,.94],[.49,1],[.46,.99],[.38,.49],[.16,.13],[0,.13]]);
  const shapes=[box,pillow,stone,leaf,drum,pin,orb,vase,bowl],tiles=new Map();
  function textured(shape,tile){
    let attrs=tiles.get(shape);if(!attrs){attrs=new Map();tiles.set(shape,attrs);}
    if(!attrs.has(tile)){
      const uv=shape.attributes.uv.clone(),col=tile%3,row=Math.floor(tile/3);
      // Atlas gutter keeps the six unrelated surfaces distinct in the mip chain.
      for(let i=0;i<uv.count;i++)uv.setXY(i,(col+.014+.972*uv.getX(i))/3,(1-row+.014+.972*uv.getY(i))/2);
      attrs.set(tile,uv);
    }
    shape.setAttribute('batchUv',attrs.get(tile));return shape;
  }

  const groups=Object.fromEntries((staticGroup?[staticGroup]:['casa','mare','lido']).map(home=>[home,{batch:new Batch(true),ranges:[],rugShadows:[]}]));
  function item(home,x,y,z,build,wall=false){
    const {batch,ranges,rugShadows}=groups[home],start=batch.indices.length;
    const put=(shape,tile,color,u,v,t,w,h,d,rx=0,ry=0,rz=0)=>
      batch.add(textured(shape,tile),color,x+u,.80+y+v,z+t,w,h,d,rx,ry,rz);
    build(put,batch,rugShadows);
    ranges.push({home,x,y:.8+y,z,wall,start,end:batch.indices.length,visible:true});
  }
  function furnish(p,home){
    const {kind,x,z,w,d,bottom}=p,H=p.h-bottom,casa=home==='casa',sg=p.reverse?-1:1;
    if(!collectionPiece(kind))return false;
    item(home,x,bottom,z,put=>{
      const wood=(...a)=>put(box,walnut,0xfff0df,...a);
      const slab=(...a)=>put(stone,marble,ivory,...a);
      const cloth=(tile,color,...a)=>put(pillow,tile,color,...a);
      const metal=(...a)=>put(pin,marble,gold,...a);
      const ceramic=(shape,color,...a)=>put(shape,marble,color,...a);
      if(kind==='sofa'){
        const tile=casa||home==='lido'||bottom>3&&bottom<6?linen:velvet,body=casa?ivory:home==='lido'?0xd3c1a4:tile===velvet?teal:0xdfd1bb;
        const n=casa?2:Math.max(2,Math.round(w/.78)),cw=(w-.41)/n;
        wood(0,.135,0,w-.25,.15,d-.22);
        cloth(tile,body,0,.25,0,w-.02,.24,d-.02);
        for(let i=0;i<n;i++){
          const u=cw*(i+.5-n/2);
          cloth(tile,body,u,.43,sg*.08,cw+.014,.22,d-.24);
          cloth(tile,body,u,.67,-sg*(d/2-.14),cw+.01,.46,.27,-sg*.15);
        }
        for(const a of [-1,1]){
          cloth(tile,body,a*(w/2-.105),.49,0,.22,.46,d);
          cloth(linen,a<0?(casa?0xb17050:home==='lido'?0x698879:0xd6b983):0xe5cdb5,a*(w*.31),.65,-sg*.12,.45,.40,.18,-sg*.22,.05*a,a*.2);
        }
      }else if(kind==='chair'){
        const back=casa?p.facing:sg;
        for(const a of [-1,1])for(const b of [-1,1])
          wood(a*w*.32,.215,b*d*.32,.053,.43,.052,b*.065,0,-a*.075);
        cloth(casa?linen:velvet,casa?0xc49b74:teal,0,.46,0,w,.14,d);
        for(const a of [-1,1])wood(a*w*.35,.63,back*(d/2-.07),.054,.46,.06,back*.08);
        cloth(casa?linen:velvet,casa?0xc49b74:teal,0,H-.14,back*(d/2-.06),w,.27,.13,back*.12);
      }else if(kind==='bed'){
        wood(0,.18,0,w,.30,d-.04);
        cloth(linen,ivory,0,.41,0,w-.04,.25,d-.08);
        const n=casa?4:7,cw=(w-.04)/n;
        for(let i=0;i<n;i++)cloth(casa?linen:velvet,casa?0xcbaf8c:teal,cw*(i+.5-n/2),.70,-d*.46,cw+.012,.97,.20);
        cloth(linen,ivory,0,.555,.04,w-.045,.18,d-.20);
        cloth(linen,0xdfcfb4,0,.647,.21,w-.04,.10,d*.60);
        cloth(casa?linen:velvet,casa?0xab755b:teal,0,.702,d*.27,w-.02,.065,d*.24);
        for(const a of [-1,1]){
          cloth(linen,ivory,a*w*.237,.72,-d*.29,w*.44,.20,.52,-.15,0,a*.02);
          cloth(linen,casa?0xaf7d62:0xc4ab86,a*w*.20,.744,-d*.183,w*.30,.165,.37,-.16,0,-a*.045);
        }
      }else if(['table','dining','coffee','lowTable'].includes(kind)){
        const dining=kind==='table'||kind==='dining';
        for(const a of [-1,1]){
          const width=dining?.48:.35,height=H-.11;
          put(drum,walnut,0xc7966c,a*w*.26,height/2,0,width,height,d*.62);
          for(let k=0;k<12;k++){
            const ang=k*Math.PI/6;
            put(pin,walnut,0xf0c59a,a*w*.26+Math.cos(ang)*width*.48,height/2,Math.sin(ang)*d*.292,.034,height-.02,.036);
          }
        }
        slab(0,H-.052,0,w,.114,d);
        if(dining){
          const seats=casa?[-.32,.32]:[-.32,0,.32];
          for(const a of seats)for(const side of [-1,1]){
            const u=a*w,v=side*d*.295;
            ceramic(drum,0xc3ad81,u,H+.013,v,.285,.024,.285);
            ceramic(bowl,ivory,u,H+.023,v,.243,.032,.243);
            ceramic(drum,0x869e94,u+.17,H+.072,v-side*.12,.071,.14,.071);
          }
          ceramic(vase,0x405846,0,H,.008,.215,.35,.215);
          for(let i=0;i<5;i++){
            const a=i*1.30;
            put(orb,linen,0x667654,.072*Math.cos(a),H+.37+i*.021,.066*Math.sin(a),.12,.23,.072,.36*Math.sin(a),a,-.43*Math.cos(a));
          }
        }else{
          for(let i=0;i<2;i++){
            put(box,linen,i?ivory:0x775346,-w*.20,H+.037+i*.066,.005,.43,.067,.30,0,.07+i*.09);
            put(box,linen,0xd4bc98,-w*.20,H+.035+i*.066,.005,.42,.043,.301,0,.07+i*.09);
          }
          ceramic(bowl,casa?0xc1966c:0x889989,w*.25,H+.008,0,.34,.135,.34);
        }
      }else if(kind==='island'){
        wood(0,H*.45,0,w-.13,H*.90,d-.12);
        const longX=w>d,span=longX?w:d,n=Math.round(span/.11);
        for(let i=0;i<n;i++){
          const u=span*((i+.5)/n-.5);
          wood(longX?u:-w*.46,H*.46,longX?d*.46:u,longX?.035:.055,H*.80,longX?.055:.035);
        }
        slab(0,H-.049,0,w,.105,d);
        for(const a of [-1,1])slab(longX?a*(w/2-.047):0,H*.48,longX?0:a*(d/2-.047),longX?.085:w,H*.92,longX?d:.085);
        ceramic(bowl,ivory,w*.16,H+.005,d*.13,.53,.16,.43);
        for(let i=0;i<4;i++)ceramic(orb,[0xb87f3b,0xaca756,0xbe8742,0xa6a364][i],w*.16+(i%2-.5)*.12,H+.105+.03*(i%2),d*.13+(Math.floor(i/2)-.5)*.11,.115,.11,.115);
      }else if(kind==='planter'){
        ceramic(vase,casa?0xa49b78:0xacc6b9,0,0,0,w,H,d);
        put(drum,walnut,0x624c39,0,H*.96,0,w*.325,.025,d*.325);
        for(let i=0;i<12;i++){
          const angle=i*2.40+.29,reach=.10+.047*(i%4),rise=.29+i%3*.16;
          const u=Math.cos(angle)*reach,v=Math.sin(angle)*reach;
          put(pin,walnut,0x9b965f,u/2,H+rise/2,v/2,.018,rise+.02,.018,v/rise,0,-u/rise);
          put(leaf,linen,[0x5e7c46,0x42683e,0x6c854e,0x84965c][i%4],u,H+rise-.035,v,.20+i%3*.045,.50+i%4*.075,.35,.30+i%3*.21,angle,.19*Math.sin(angle));
        }
      }else if(kind==='nightstand'){
        wood(0,H*.43,0,w-.08,H*.76,d-.07);slab(0,H-.05,0,w,.10,d);
        wood(0,H*.48,d*.46,w-.12,.20,.045);
        metal(0,H*.5,d*.50,.109,.032,.034);
        ceramic(vase,casa?0xaa805e:0x769389,0,H,0,.25,.30,.25);
        put(drum,linen,0xffeac6,0,H+.403,0,.37,.22,.37);
        metal(0,H+.523,0,.059,.026,.059);
      }
    });
    return true;
  }
  function picture(home,x,y,z,w,h,side,tile,yaw=0){
    item(home,x,y,z,put=>{
      const inset=(texture,tint,offset,width,height,depth)=>
        put(box,texture,tint,Math.sin(yaw)*side*offset,0,Math.cos(yaw)*side*offset,width,height,depth,0,yaw);
      inset(walnut,0xe4c397,0,w,h,.081);
      inset(marble,gold,.045,w-.07,h-.07,.019);
      inset(linen,ivory,.058,w-.095,h-.095,.016);
      inset(tile,0xfffcf5,.073,w-.21,h-.21,.014);
      // A bronze gallery bar grazes the print from the top of its frame.
      if(tile>=botanical){
        for(const u of [-.24,.24])put(pin,marble,gold,u*w*Math.cos(yaw)+Math.sin(yaw)*side*.12,h*.5+.025,-u*w*Math.sin(yaw)+Math.cos(yaw)*side*.12,.026,.13,.026);
        put(box,marble,0xbe9b62,Math.sin(yaw)*side*.16,h*.5+.09,Math.cos(yaw)*side*.16,w*.65,.051,.075,0,yaw);
      }
    },true);
  }
  function tabletop(home,p){
    const {kind,x,z,w,d,bottom,h}=p,casa=home==='casa',across=w>d;
    const offset=(across?w:d)*(casa && kind==='console'?-.30:.31);
    const position=across?[x+offset,z]:[x,z+offset];
    item(home,position[0],bottom,position[1],put=>{
      const y=h-bottom,tint=casa?0xb88a65:0x64847b;
      put(stone,marble,casa?ivory:0xb0a988,0,y+.02,0,.38,.045,.30);
      put(vase,marble,tint,-.055,y+.043,-.038,.13,.22,.13);
      put(vase,marble,0xc4b18b,.083,y+.043,.037,.092,.155,.092);
      for(let n=0;n<3;n++)put(leaf,linen,[0x56674a,0x7d885c,0x697c56][n],
        -.05,y+.24,-.038,.06,.19,.08,.35+n*.21,n*2,.25-n*.22);
      if(casa){
        put(drum,marble,gold,0,y+.023,-.18,.144,.047,.144);
        put(pin,marble,gold,0,y+.142,-.18,.023,.22,.023);
        put(drum,linen,0xffe3ba,0,y+.270,-.18,.25,.15,.25);
      }
    });
  }
  function objets(home,p,kind){
    const {x,z,h,w,d}=p,wide=w>=d;
    item(home,x,p.bottom??.27,z,put=>{
      const H=h-(p.bottom??.27),offset=kind==='orchid'?.22:-.28;
      const cx=wide?w*offset:0,cz=wide?0:d*offset;
      const prop=(g,t,c,u,y,v,...size)=>put(g,t,c,cx+u,H+y,cz+v,...size);
      if(kind==='orchid'){
        prop(vase,marble,0x6c8c83,0,0,0,.25,.30,.25);
        for(const s of [-1,1]){
          prop(leaf,velvet,0x425d45,s*.039,.24,0,.084,.24,.13,1.01,s*.86);
          prop(pin,walnut,0x77704f,s*.035,.43,0,.012,.36,.012,0,0,-s*.18);
          for(let j=0;j<4;j++){
            const a=s*(.053+j*.035),y=.54+j*.037;
            for(let k=0;k<4;k++){
              const t=Math.PI*k/2;
              prop(orb,linen,0xffecd9,a+Math.cos(t)*.029,y+Math.sin(t)*.026,.014*j,.055,.047,.028,.16,s*.34);
            }
            prop(orb,marble,0xc57c51,a,y,.014*j+.020,.025,.018,.013);
          }
        }
      }else if(kind==='turntable'){
        prop(stone,walnut,0xd8b28b,0,.060,0,.64,.105,.39);
        prop(drum,marble,0x3f4243,-.074,.126,0,.315,.017,.315);
        prop(drum,linen,0xba9a63,-.074,.140,0,.105,.012,.105);
        prop(pin,marble,gold,-.074,.151,0,.014,.027,.014);
        prop(drum,marble,0x777676,.20,.149,-.10,.056,.076,.056);
        prop(box,marble,0xc4b69d,.150,.190,-.015,.018,.016,.215,0,-.47);
        prop(box,marble,darkMetal,.107,.177,.077,.036,.022,.048,0,-.47);
      }else{
        const jackets=home==='mare'?[compass,harbor]:[shell,botanical];
        for(let i=0;i<2;i++){
          const angle=.11-i*.21,y=.031+i*.060,u=.040*i;
          prop(box,linen,i?0x607a71:0x985d44,u,y,0,.385,.062,.302,0,angle);
          prop(box,linen,ivory,u,y+.001,.004,.366,.039,.297,0,angle);
          prop(box,jackets[i],0xfbf4de,u,y+.033,0,.385,.006,.303,0,angle);
        }
        prop(bowl,marble,0xa88a5e,.23,.005,.029,.127,.064,.127);
      }
    });
  }
  function carpet(home,x,y,z,w,d,field,border){
    item(home,x,y,z,(put,batch,rugShadows)=>{
      const strip=(tint,u,v,width,depth,h=.025,angle=0)=>
        put(box,linen,tint,u,h,v,width,.008,depth,0,angle);
      // Sample the static room plan once. Low furniture casts a soft, broad
      // contact shadow onto the woven field without another projected shadow.
      const pieces=(home==='casa'?casaFurniture:home==='lido'?lidoPieces:mareFurniture).filter(p=>
        Math.abs((p.bottom??.27)-y)<.04 && Math.abs(p.x-x)<(w+p.w)/2+.5 && Math.abs(p.z-z)<(d+p.d)/2+.5);
      const weave=new THREE.PlaneGeometry(1,1,Math.ceil(w/.16),Math.ceil(d/.16)).rotateX(-Math.PI/2);
      const start=batch.colors.length;
      put(weave,linen,field,0,.018,0,w,1,d);
      const points=weave.attributes.position;
      const samples=pieces.map(p=>{
        const weight=p.kind==='sofa'||p.kind==='bed'?.39:.25;
        const strength=new Float32Array(points.count);
        for(let i=0;i<points.count;i++){
          const px=x+points.getX(i)*w,pz=z+points.getZ(i)*d;
          const dx=Math.max(0,Math.abs(px-p.x+.055)-p.w*.42),dz=Math.max(0,Math.abs(pz-p.z+.07)-p.d*.42);
          strength[i]=weight*Math.exp(-9*(dx*dx+dz*dz));
        }
        return {p,strength};
      });
      rugShadows.push({home,start,count:points.count,tint:batch.colors.slice(start,start+3),samples});
      tiles.delete(weave);weave.dispose();
      for(const a of [-1,1]){
        for(const [delta,color,width] of [[.11,border,.055],[.19,field,.048],[.24,border,.026]]){
          strip(color,a*(w/2-delta),0,width,d-2*delta);
          strip(color,0,a*(d/2-delta),w-2*delta,width);
        }
        for(let i=0;i<23;i++)strip(border,(i/22-.50)*(w-.08),a*(d/2+.04),.023,.10,.007);
        for(const b of [-1,1]){
          const u=a*(w/2-.41),v=b*(d/2-.41);
          strip(border,u-a*.12,v,.27,.026,.031);
          strip(border,u,v-b*.12,.026,.27,.031);
          strip(border,u-a*.21,v-b*.12,.026,.16,.031);
        }
      }
    });
  }
  function brassMobile(home,x,y,z,w){
    item(home,x,y,z,put=>{
      put(drum,marble,gold,0,-.026,0,.27,.052,.27);
      put(drum,marble,gold,0,-.37,0,.033,.74,.033);
      for(const [a,b,hh] of [[-.34,-.11,-.70],[.31,.08,-.79],[.02,-.24,-.89],[-.12,.18,-.85]]){
        const u=a*w,v=b*w,len=Math.hypot(u,v);
        put(box,marble,gold,u/2,hh,v/2,len,.034,.033,0,-Math.atan2(v,u));
        put(orb,linen,0xffeac9,u,hh-.12,v,.31,.25,.31);
      }
    });
  }
  function finish(){
    const material=new THREE.MeshPhongMaterial({map:collectionMap(),vertexColors:true,shininess:18,specular:0x292621});
    // Keep textile grain at upholstery scale on broad seats and tiny cushions alike.
    material.onBeforeCompile=s=>{
      s.uniforms.printAtlas={value:estatePrints()};
      s.vertexShader='varying vec3 estateSurface,estateNormal;\n'+s.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n estateSurface=position;estateNormal=normal;');
      s.fragmentShader='uniform sampler2D printAtlas;varying vec3 estateSurface,estateNormal;\n'+s.fragmentShader.replace('#include <map_fragment>',`
        vec2 grid=vec2(3.,2.),tile=floor(vMapUv*grid);
        vec3 texel=texture2D(map,vMapUv).rgb;
        if(vMapUv.y<0.){
          texel=texture2D(printAtlas,vec2(vMapUv.x,1.+2.*vMapUv.y)).rgb;
        }else if(tile.x<.5){
          vec3 n=abs(estateNormal);
          vec2 fabric=(n.y>n.x && n.y>n.z?estateSurface.xz:n.x>n.z?estateSurface.zy:estateSurface.xy)*2.4;
          vec2 uv=(tile+.016+.968*fract(fabric))/grid;
          texel=textureGrad(map,uv,dFdx(fabric)*.968/grid,dFdy(fabric)*.968/grid).rgb;
          texel=tile.y>.5?mix(vec3(.84,.78,.69),texel,.37):vec3(.66+.44*dot(texel,vec3(.24,.64,.12)));
        }
        diffuseColor.rgb*=texel;
      `);
    };
    if(staticGroup){
      const mesh=groups[staticGroup].batch.mesh(scene,material);
      mesh.name=staticGroup+' furnishings';
      for(const shape of shapes)shape.dispose();
      return mesh;
    }
    for(const [home,g] of Object.entries(groups)){
      // Furniture lives in its own estate's culling bounds. Beyond a block the
      // exterior glazing and walls supply the silhouette; room details subtend pixels.
      const lod=new THREE.LOD(),cx=home==='casa'?-25:25,cz=home==='mare'?-444:-395;
      lod.position.set(cx,4,cz);
      const mesh=g.batch.mesh(lod,material);mesh.position.set(-cx,-4,-cz);
      mesh.name='Commissioned furnishings '+home;mesh.userData.impactSurface='solid';
      lod.addLevel(mesh,0);lod.addLevel(new THREE.Group(),115,.08);scene.add(lod);
      g.mesh=mesh;g.index=mesh.geometry.index;g.original=g.index.array.slice();
      delete g.batch;
    }
    for(const shape of shapes)shape.dispose();
    let previous;
    function updateGroup(g,doors,state){
      const {rugShadows,ranges,mesh,index,original}=g;
      for(const rug of rugShadows){
        const supported=rug.samples.filter(({p})=>furnishingSupported(rug.home,p.x,.8+(p.bottom??.27),p.z,doors,state.falls));
        const signature=supported.map(s=>s.p.x+','+s.p.z).join('|');
        if(signature===rug.previous)continue;
        rug.previous=signature;
        const colors=mesh.geometry.attributes.color;
        for(let i=0;i<rug.count;i++){
          let darkness=0;
          for(const s of supported)darkness=Math.max(darkness,s.strength[i]);
          for(let k=0;k<3;k++)colors.array[rug.start+i*3+k]=rug.tint[k]*(1-darkness);
        }
        colors.addUpdateRange(rug.start,rug.count*3);colors.needsUpdate=true;
      }
      for(const r of ranges){
        const visible=furnishingSupported(r.home,r.x,r.y,r.z,doors,r.wall?state.cuts:state.falls);
        if(visible===r.visible)continue;
        if(visible)index.array.set(original.subarray(r.start,r.end),r.start);
        else index.array.fill(original[r.start],r.start,r.end);
        index.addUpdateRange(r.start,r.end-r.start);index.needsUpdate=true;r.visible=visible;
        refreshShadows();
      }
    }
    return doors=>{
      const state=estateCondition(doors),key=state.key+(doors?.houseRuins?.casa?'C':'')+(doors?.houseRuins?.mare?'M':'');
      if(key===previous)return;
      previous=key;for(const group of Object.values(groups))updateGroup(group,doors,state);
    };
  }
  return {furnish,picture,tabletop,objets,carpet,brassMobile,finish,abstract,harbor,botanical,compass,shell};
}
