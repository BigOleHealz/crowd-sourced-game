import {bankSite} from './bank-site.js';
import {bankFrontage} from './biscayne-bank-view.js';
import {harborHouses} from './harbor-key-structures.js';
import {collectionMap} from './estate-collection.js';
import {maravelaHotelView} from './maravela-hotel-view.js';
import {furnitureRanges} from './shop-furniture-view.js';
import {frontageGlassMaterial} from './frontage-glass-material.js';
import {glassSupportKey,paneSupportLost} from './glass-support.js';
import * as THREE from 'three';
import {galleryPlans,galleryPanes,galleryDoorPanes,galleryFloor as floor,galleryCeiling as ceiling,galleryDoorWidth,galleryDoorHead,galleryStile} from './gallery-lobbies.js';

// A single material and spatially culled architectural batch per building. Real
// tilted lamps, display tables and overlapping lounge cushions provide parallax.
export function galleryLobbyView(scene,renderer,Batch,panorama,debris) {
  const updateBank=bankFrontage(scene,Batch);
  const moveHotelDoors=maravelaHotelView(scene,Batch,galleryDoorWidth,floor,debris,panorama,galleryPlans.find(p=>p.hotel)?.b);
  const loader=new THREE.TextureLoader();
  function surface(name){
    const tex=loader.load('./'+name+'.webp',()=>{renderer.shadowMap.needsUpdate=true;});
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return tex;
  }
  const stone=surface('avenue-limestone'),oak=surface('storefront-oak');
  const mat=new THREE.MeshBasicMaterial({vertexColors:true,map:stone});
  mat.onBeforeCompile=s=>{
    s.uniforms.oak={value:oak};s.uniforms.collection={value:collectionMap()};
    s.vertexShader='attribute vec3 galleryCoords;varying vec3 gv,lp,ln;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlp=position;ln=normal;gv=galleryCoords;');
    s.fragmentShader='uniform sampler2D oak,collection;varying vec3 gv,lp,ln;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`
      vec3 n=normalize(ln);float mode=floor(vMapUv.x+.002);vec2 uv=abs(n.y)>.6?lp.xz:abs(n.x)>.6?lp.zy:lp.xy;
      if(mode<1.5){vec3 grain=texture2D(map,uv/1.9).rgb;diffuseColor.rgb*=mix(vec3(1.),grain,.53);}
      if(mode<.5 && n.y>.65){vec2 tile=lp.xz/vec2(1.18,.86);vec2 seam=abs(fract(tile+.5)-.5)/max(fwidth(tile),vec2(.0001));diffuseColor.rgb*=mix(.72,1.,clamp(min(seam.x,seam.y),0.,1.));}
      if(mode>1.5 && mode<2.5)diffuseColor.rgb*=mix(vec3(1.),texture2D(oak,uv/vec2(.8,1.2)).rgb,.64);
      if(mode>2.5 && mode<3.5)diffuseColor.rgb*=.94+.06*sin((uv.x+uv.y)*298.)*sin((uv.y-uv.x)*302.);
      if(mode>=6.){
        vec2 local=vec2(clamp((fract(vMapUv.x)-.025)/.9,0.,1.),vMapUv.y);
        // The four residential entrance galleries use the same material sheet as Lantern Point.
        vec2 tile=mode==6.?vec2(1.,0.):mode==7.?vec2(2.,0.):mode==8.?vec2(0.,1.):vec2(0.,0.);
        vec3 sampleColor=texture2D(collection,(tile+.014+.972*local)/vec2(3.,2.)).rgb;
        if(mode>=8.){
          vec2 weave=uv*2.4;
          vec3 cloth=textureGrad(collection,(tile+.016+.968*fract(weave))/vec2(3.,2.),
            dFdx(weave)*.968/vec2(3.,2.),dFdy(weave)*.968/vec2(3.,2.)).rgb;
          float fiber=dot(cloth,vec3(.22,.69,.09));
          sampleColor=mode==8.?mix(vec3(.84,.78,.69),cloth,.4):vec3(.66+fiber*.8);
        }
        diffuseColor.rgb*=sampleColor;
      }
      float depth=max(0.,gv.z-abs(gv.y)),u=gv.x*sign(gv.y);
      float sky=exp(-.35*depth)*(.48+.45*max(0.,n.y)+.34*max(0.,n.z*sign(gv.y)));
      vec3 light=vec3(.235,.215,.18)+sky*vec3(.82,.86,.85);
      float pool=exp(-.84*abs(abs(u)-1.85))*exp(-.33*abs(depth-2.15))*(.40+.55*max(0.,n.y));
      light+=vec3(.45,.31,.14)*pool;
      float wallWash=exp(-1.45*abs(abs(u)-2.12))*exp(-.56*abs(lp.y-2.45));
      light+=vec3(.34,.24,.12)*wallWash;
      if(mode<.5 && n.y>.65){
        float sofa=length(max(abs(vec2(u+1.74,depth-1.97))-vec2(.70,.35),vec2(0.)));
        float table=length(max(abs(vec2(u+1.74,depth-.91))-vec2(.39,.20),vec2(0.)));
        float desk=length(max(abs(vec2(u-1.74,depth-1.45))-vec2(.50,.22),vec2(0.)));
        light*=mix(.52,1.,smoothstep(0.,.56,min(sofa,min(table,desk))));
        light*=mix(.66,1.,smoothstep(.04,.34,abs(abs(u)-2.64)));
      }
      diffuseColor.rgb*=mode==5. ? vec3(1.28,1.1,.84) : light;
    `);
  };
  const cube=new THREE.BoxGeometry(),ball=new THREE.SphereGeometry(1,14,8);
  const cushion=ball.clone(),pos=cushion.attributes.position;
  const soften=a=>Math.sign(a)*Math.abs(a)**.34;
  for(let i=0;i<pos.count;i++)pos.setXYZ(i,soften(pos.getX(i)),soften(pos.getY(i)),soften(pos.getZ(i)));
  cushion.computeVertexNormals();
  const cyl=new THREE.CylinderGeometry(1,1,1,16);
  const dome=new THREE.SphereGeometry(1,16,6,0,Math.PI*2,0,Math.PI/2);
  const uvModes=new Map();
  function marked(g,mode) {
    let attrs=uvModes.get(g);if(!attrs){attrs=new Map();uvModes.set(g,attrs);}
    if(!attrs.has(mode)){
      const a=new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2);
      const source=g.attributes.uv;
      for(let i=0;i<a.count;i++)a.setXY(i,mode>=6?mode+.025+.9*source.getX(i):mode,mode>=6?source.getY(i):0);
      attrs.set(mode,a);
    }
    g.setAttribute('batchUv',attrs.get(mode));return g;
  }
  const travertine=0xc3b49a, limestone=0xd5c9b4,bronze=0x5d5140,black=0x343633;
  const wood=0xa37a50;
  const residentialPalettes=[
    {fabric:9,upholstery:0x689584,piping:0x5b7c6e,stone:0xc7d2bf,art:7},
    {fabric:8,upholstery:0xffeccf,piping:0xcfb597,stone:0xdbc6a6,art:6},
    {fabric:8,upholstery:0xc7896f,piping:0xb57a5c,stone:0xc5b6a8,art:6},
    {fabric:9,upholstery:0x728aab,piping:0x607589,stone:0xc1ba9f,art:7},
  ];
  for(const plan of galleryPlans){
    const residential=harborHouses.findIndex(h=>h.x===plan.b.x && h.z===plan.b.z);
    const palette=residentialPalettes[residential],fabric=palette?.fabric??3;
    const linen=palette?.upholstery??0xd2c4a9,leather=palette?.piping??0xae967b;
    const batch=new Batch(true),motion=furnitureRanges(scene,[batch]);
    const put=(g,mode,c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>batch.add(marked(g,mode),c,x,y,z,w,h,d,rx,ry,rz);
    const box=(mode,...data)=>put(cube,mode,...data);
    for(const room of plan.rooms){
      const mid=(room.zmin+room.zmax)/2,depth=room.zmax-room.zmin;
      box(0,0xc5b9a4,plan.x,floor-.014,mid,plan.w,.028,depth);
      box(1,0xc7bca8,plan.x,ceiling+.076,mid,plan.w,.152,depth);
    }
    if(plan.passage){
      const span=plan.passage.zmax-plan.passage.zmin;
      box(0,0xbcb19a,plan.x,floor-.014,plan.b.z,1.48,.028,span);
      box(5,0xf2dab7,plan.x,ceiling-.062,plan.b.z,.09,.022,Math.max(.28,span-.18));
    }
    for(const entry of plan.ends){
      const {side,z,x,w,depth}=entry;
      const X=u=>x+side*u,Z=v=>z-side*v;
      const trim=(m,c,u,y,v,ww,h,d,rx=0)=>put(cube,m,c,X(u),floor+y,Z(v),ww,h,d,rx*side);
      const orb=(g,m,c,u,y,v,a,b,d)=>put(g,m,c,X(u),floor+y,Z(v),a,b,d);
      const leg=(c,u,y,v,r,h)=>orb(cyl,4,c,u,y,v,r,h,r);
      const doorH=galleryDoorHead-floor, half=w/2, jamb=galleryDoorWidth/2;
      // The pale three-bay surround stands proud of the recessed bronze reveals.
      trim(1,limestone,0,doorH+.78,.04,w,1.56,.31);
      for(const sign of [-1,1]){
        trim(1,travertine,sign*(half-.10),1.55,.055,.20,3.10,.30);
        trim(4,bronze,sign*(jamb+galleryStile/2),1.55,.095,galleryStile,3.10,.14);
        const edge=half-.21,inner=jamb+galleryStile,paneWidth=edge-inner,mid=sign*(edge+inner)/2;
        for(const u of [sign*inner,sign*edge])trim(4,black,u,doorH/2,.103,.034,doorH,.061);
        for(const y of [.075,doorH-.024])trim(4,black,mid,y,.103,paneWidth,.040,.061);
        trim(1,travertine,mid,.033,.09,paneWidth,.066,.25);
        // Fully opened bronze-framed leaves are recessed against the jambs.
        if(!plan.hotel){
          const leaf=sign*(jamb+.046);
          for(const v of [.09,.82])trim(4,bronze,leaf,doorH/2,v,.048,doorH,.045);
          for(const y of [.075,doorH-.037,1.02])trim(4,bronze,leaf,y,.46,.048,.044,.75);
          trim(4,0xaf9466,leaf-sign*.036,1.10,.71,.046,.23,.024);
        }
        trim(1,0xb7a990,sign*(half-.093),1.48,depth/2,.186,2.96,depth);
        trim(2,0x826748,sign*(half-.195),.060,depth/2,.035,.12,depth-.05);
        // Wall-wash strip and individual task lights recede down the ceiling.
        trim(5,0xe1c293,sign*(half-.255),2.845,depth/2,.041,.034,depth-.18);
        trim(4,black,sign*(half-.66),2.87,depth*.39,.047,.026,depth*.66);
        for(const k of [.20,.47,.72]){
          leg(black,sign*(half-.66),2.79,depth*k,.065,.13);
          leg(0xf4d8a8,sign*(half-.66),2.722,depth*k,.052,.014);
        }
      }
      if(!plan.rooms[0].shared && plan.b!==bankSite){
        trim(2,0x96754e,0,2.55,depth-.073,1.48,.79,.146);
        trim(5,0xe8cb97,0,2.66,depth-.169,w-.40,.032,.027);
        const wing=(w-1.48)/2;
        for(const sign of [-1,1]){
          const u=sign*(.74+wing/2),at=depth-.97;
          trim(2,0x96754e,u,1.48,depth-.073,wing,2.96,.146);
          trim(1,travertine,u,1.48,at,wing,2.96,.21);
          trim(4,bronze,sign*.753,1.19,at-.131,.053,2.38,.075);
          trim(4,black,sign*.779,1.19,at+.095,.033,2.38,.055);
          // Low ribbed credenzas set off pale ceramics and framed art on the return.
          const shelfU=sign*w*.30;
          trim(2,0x806e51,shelfU,.381,depth-1.36,.91,.65,.45);
          trim(1,0xcabb9f,shelfU,.726,depth-1.36,.955,.053,.49);
          for(let j=-4;j<=4;j++)trim(2,0x9f8560,shelfU+j*.091,.38,depth-1.60,.016,.60,.023);
          orb(ball,4,0xd0bda3,shelfU-.18,.848,depth-1.35,.097,.100,.082);
          trim(4,bronze,shelfU,1.64,at-.132,.87,.73,.044);
          if(palette){
            trim(palette.art===6?7:6,0xfff5e2,shelfU,1.64,at-.161,.81,.67,.021);
          }else{
            trim(3,0xbeb39d,shelfU,1.64,at-.161,.81,.67,.021);
            orb(ball,3,0x998569,shelfU-.10,1.63,at-.19,.243,.163,.009);
            trim(3,0xd1bea1,shelfU+.15,1.70,at-.201,.195,.357,.010);
          }
        }
        trim(1,travertine,0,2.68,depth-.97,1.55,.56,.21);
        trim(4,bronze,0,2.374,depth-1.07,1.54,.049,.081);
      }
      // Front left: upholstered two-seat gallery lounge, low stone table and dome lamp.
      const {sofa,table,console:consoleTable,shelf}=entry;
      if(plan.b===bankSite){
        // Bank lobby uses fitted vinyl chairs and two writing surfaces. Keep
        // each piece in the same independently destructible furniture range.
        let part=motion.start(sofa.piece);
        for(const off of [-.40,.40]){
          const u=(sofa.x-x)*side+off,v=(z-sofa.z)*side;
          trim(4,bronze,u,.24,v,.52,.42,.40);
          orb(cushion,3,0x397068,u,.45,v,.37,.065,.34);
          orb(cushion,3,0x42786c,u,.67,v+.30,.37,.22,.055);
        }
        motion.end(part);
        for(const item of [table,consoleTable]){
          part=motion.start(item.piece);
          const u=(item.x-x)*side,v=(z-item.z)*side,high=item===table?.36:.85;
          trim(2,0x68503c,u,high/2,v,item.w*.72,high,item.d*.68);
          trim(1,0xe8ddbd,u,high,v,item.w,.06,item.d);
          for(let j=0;j<3;j++)trim(3,0xe8e2ce,u+.08+j*.011,high+.038+j*.007,v,.18,.007,.15);
          motion.end(part);
        }
        continue;
      }
      const su=(sofa.x-x)*side,sv=(z-sofa.z)*side,sw=sofa.w;
      if(palette){
        const rugZ=(sv+(z-table.z)*side)/2,accent=palette.piping;
        const rugW=sw+.22,rugD=Math.min(2.04,depth*.42);
        trim(8,palette.upholstery,su,.012,rugZ,rugW,.014,rugD);
        for(const s of [-1,1]){
          trim(8,accent,su+s*(rugW/2-.069),.023,rugZ,.025,.008,rugD-.10);
          trim(8,accent,su,.023,rugZ+s*(rugD/2-.057),rugW-.11,.008,.025);
        }
      }
      const seated=motion.start(sofa.piece);
      trim(2,0x705c47,su,.21,sv,sw-.05,.20,.68);
      for(const s of [-1,1]){
        orb(cushion,fabric,linen,su+s*sw*.218,.425,sv-.042,sw*.215,.112,.305);
        orb(cushion,fabric,s===1&&!palette?0xc8b798:linen,su+s*sw*.215,.645,sv+.276,sw*.214,.205,.098);
        orb(cushion,fabric,leather,su+s*(sw/2-.067),.50,sv,.071,.19,.36);
      }
      motion.end(seated);
      const coffeeTable=motion.start(table.piece);
      const tu=(table.x-x)*side,tv=(z-table.z)*side;
      trim(1,0xa19781,tu,.16,tv,table.w*.74,.27,.34);
      trim(1,palette?.stone??limestone,tu,.32,tv,table.w,.10,.47);
      if(residential===0){
        // A pair of sea-glass bud vases sits low on the clapboard cottage's table.
        for(const [du,r,h,tint] of [[-.13,.087,.13,0x8ca69a],[.08,.061,.098,0xaf9c78]]){
          orb(ball,4,tint,tu+du,.37+h,tv,r,h,r);
          leg(tint,tu+du,.37+h*1.92,tv,r*.48,h*.37);
        }
      }else if(residential===1){
        for(let j=0;j<3;j++)trim(3,[0x817466,0xe0d2b8,0x727e7d][j],tu+.05,.39+j*.041,tv,.34-j*.026,.039,.22);
        orb(ball,4,0xb19765,tu-.26,.51,tv,.070,.15,.068);
      }else if(residential===2){
        for(const [du,tint,r,h] of [[-.13,0xba785e,.12,.094],[.14,0xe1ba91,.087,.072]]){
          orb(dome,4,tint,tu+du,.372,tv,r,h,r);
          leg(0x755747,tu+du,.374+h,tv,r*.32,.020);
        }
      }else if(residential===3){
        trim(2,0x665a4c,tu,.391,tv,.52,.045,.17);
        orb(cushion,4,0x8d7557,tu,.442,tv,.23,.047,.066);
        leg(bronze,tu,.56,tv,.011,.27);
        orb(dome,3,0xeee2c9,tu-.054,.52,tv,.064,.151,.013);
        orb(dome,3,0xc09a76,tu+.052,.52,tv,.050,.108,.012);
      }else trim(2,0x755f51,tu+.14,.39,tv,.25,.036,.16);
      motion.end(coffeeTable);
      const lampU=su-sw*.31,lampV=sv+.61;
      leg(bronze,lampU,.74,lampV,.023,1.20);leg(bronze,lampU,.14,lampV,.16,.075);
      orb(dome,1,0xd6bd93,lampU,1.29,lampV,.268,.178,.268);
      // Front right: a narrow travertine display with ceramic vessels and pin lights.
      const display=motion.start(consoleTable.piece);
      const cu=(consoleTable.x-x)*side,cv=(z-consoleTable.z)*side;
      for(const s of [-1,1])trim(1,0xc2ac90,cu+s*consoleTable.w*.30,.42,cv,.135,.78,.40);
      trim(1,travertine,cu,.836,cv,consoleTable.w,.068,.57);
      for(const [du,scale] of [[-.19,1],[.18,.77]]){
        orb(ball,4,0xe0d4be,cu+du,.995,cv,.102*scale,.133*scale,.10*scale);
        leg(0xe1d7c4,cu+du,1.11,cv,.050*scale,.064*scale);
      }
      motion.end(display);
      if(shelf){
        const vu=(shelf.x-x)*side,vv=(z-shelf.z)*side;
        for(const dv of [-1,1])trim(2,wood,vu,.98,vv+dv*(shelf.d/2-.025),.33,1.90,.050);
        for(const y of [.18,.72,1.25,1.85]){
          trim(2,wood,vu,y,vv,.33,.049,shelf.d);
          if(y<1.8)for(const s of [-1,1])orb(ball,4,s>0?0xeadac1:0xc2ab88,vu,y+.11,vv+s*shelf.d*.22,.081,.099,.073);
        }
      }
      // Small framed abstract diptych and a pair of track-lit wall niches.
      const artV=Math.min(depth-.75,sv+.54);
      trim(4,bronze,-half+.214,1.61,artV,.060,1.00,.96);
      if(palette){
        trim(palette.art,0xfff8e7,-half+.252,1.61,artV,.025,.91,.87);
      }else{
        trim(3,0xa69a85,-half+.252,1.61,artV,.025,.91,.87);
        trim(3,0xd6c4a9,-half+.272,1.72,artV+.11,.016,.49,.37);
        trim(3,0x967d61,-half+.273,1.49,artV-.15,.016,.23,.38);
      }
      for(let j=0;j<5;j++){
        const u=cu+(j-2)*.177,v=cv+.15*Math.sin(j*1.6),drop=.38+.13*(j%3);
        leg(bronze,u,2.88-drop/2,v,.009,drop);
        orb(ball,5,0xefcd94,u,2.86-drop,v,.056,.074,.056);
      }
    }
    const mesh=batch.mesh(scene,mat,false),points=mesh.geometry.attributes.position;
    motion.bind([mesh]);
    const local=new Float32Array(points.count*3);
    for(let i=0;i<points.count;i++){local[i*3]=points.getX(i)-plan.x;local[i*3+1]=points.getZ(i)-plan.b.z;local[i*3+2]=plan.b.d/2;}
    mesh.geometry.setAttribute('galleryCoords',new THREE.BufferAttribute(local,3));
    mesh.userData.impactSurface='solid';
    mesh.userData.breachInterior=true;
  }
  const glass=frontageGlassMaterial(panorama,true);
  const panes=[...galleryPanes,...galleryDoorPanes];
  const windows=new THREE.InstancedMesh(new THREE.PlaneGeometry(),glass,panes.length);
  windows.userData.impactSurface='glass';scene.add(windows);
  const dummy=new THREE.Object3D(), visible=new Array(panes.length);
  let prior,priorSupport,received=false;
  function update(doors,bankVisual){
    moveHotelDoors(doors);
    if(bankVisual)updateBank(doors,bankVisual);
    const broken=doors?.brokenPanes,support=glassSupportKey(doors);
    if(prior===broken && priorSupport===support && visible[0]!==undefined){if(doors)received=true;return;}
    prior=broken;priorSupport=support;let changed=false;
    panes.forEach((p,i)=>{
      const unsupported=paneSupportLost(p,doors),shattered=!unsupported && !!broken?.[p.id];
      const show=!unsupported && !shattered;
      debris.setBroken(p,shattered,received);
      if(visible[i]===show)return;
      const height=p.top-p.bottom;
      visible[i]=show;dummy.position.set(p.x,p.bottom+height/2,p.z);
      dummy.rotation.y=p.widthAxis==='x'?0:Math.PI/2;
      dummy.scale.set(show?p.width:0,show?height:0,1);dummy.updateMatrix();
      windows.setMatrixAt(i,dummy.matrix);changed=true;
    });
    if(doors)received=true;
    if(changed)windows.instanceMatrix.needsUpdate=true;
  }
  update();windows.computeBoundingSphere();
  for(const g of [cube,ball,cushion,cyl,dome])g.dispose();
  return update;
}
