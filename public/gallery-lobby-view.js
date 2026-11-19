import * as THREE from 'three';
import {galleryPlans,galleryPanes,galleryFloor as floor,galleryCeiling as ceiling,galleryDoorWidth,galleryDoorHead} from './gallery-lobbies.js';

// A single material and spatially culled architectural batch per building. Real
// tilted lamps, display tables and overlapping lounge cushions provide parallax.
export function galleryLobbyView(scene,renderer,Batch,panorama) {
  const loader=new THREE.TextureLoader();
  function surface(name){
    const tex=loader.load('./'+name+'.webp',()=>{renderer.shadowMap.needsUpdate=true;});
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return tex;
  }
  const stone=surface('avenue-limestone'),oak=surface('storefront-oak');
  const mat=new THREE.MeshBasicMaterial({vertexColors:true,map:stone});
  mat.onBeforeCompile=s=>{
    s.uniforms.oak={value:oak};
    s.vertexShader='attribute vec3 galleryCoords;varying vec3 gv,lp,ln;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlp=position;ln=normal;gv=galleryCoords;');
    s.fragmentShader='uniform sampler2D oak;varying vec3 gv,lp,ln;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`
      vec3 n=normalize(ln);float mode=vMapUv.x;vec2 uv=abs(n.y)>.6?lp.xz:abs(n.x)>.6?lp.zy:lp.xy;
      if(mode<1.5){vec3 grain=texture2D(map,uv/1.9).rgb;diffuseColor.rgb*=mix(vec3(1.),grain,.53);}
      if(mode<.5 && n.y>.65){vec2 tile=lp.xz/vec2(1.18,.86);vec2 seam=abs(fract(tile+.5)-.5)/max(fwidth(tile),vec2(.0001));diffuseColor.rgb*=mix(.72,1.,clamp(min(seam.x,seam.y),0.,1.));}
      if(mode>1.5 && mode<2.5)diffuseColor.rgb*=mix(vec3(1.),texture2D(oak,uv/vec2(.8,1.2)).rgb,.64);
      if(mode>2.5 && mode<3.5)diffuseColor.rgb*=.94+.06*sin((uv.x+uv.y)*298.)*sin((uv.y-uv.x)*302.);
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
      diffuseColor.rgb*=mode>4.5 ? vec3(1.28,1.1,.84) : light;
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
      for(let i=0;i<a.count;i++)a.setX(i,mode);
      attrs.set(mode,a);
    }
    g.setAttribute('batchUv',attrs.get(mode));return g;
  }
  const travertine=0xc3b49a, limestone=0xd5c9b4,bronze=0x5d5140,black=0x343633;
  const wood=0xa37a50, linen=0xd2c4a9, leather=0xae967b;
  for(const plan of galleryPlans){
    const batch=new Batch(true);
    const put=(g,mode,c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>batch.add(marked(g,mode),c,x,y,z,w,h,d,rx,ry,rz);
    const box=(mode,...data)=>put(cube,mode,...data);
    for(const room of plan.rooms){
      const mid=(room.zmin+room.zmax)/2,depth=room.zmax-room.zmin;
      box(0,0xc5b9a4,plan.x,floor-.014,mid,plan.w,.028,depth);
      box(1,0xc7bca8,plan.x,ceiling+.076,mid,plan.w,.152,depth);
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
        trim(1,limestone,sign*(jamb+.09),1.55,.05,.18,3.10,.30);
        const edge=half-.21,inner=jamb+.18,paneWidth=edge-inner,mid=sign*(edge+inner)/2;
        for(const u of [sign*inner,sign*edge])trim(4,black,u,doorH/2,.103,.034,doorH,.061);
        for(const y of [.075,doorH-.024])trim(4,black,mid,y,.103,paneWidth,.040,.061);
        trim(1,travertine,mid,.033,.09,paneWidth,.066,.25);
        // Fully opened bronze-framed leaves are recessed against the jambs.
        const leaf=sign*(jamb+.046);
        for(const v of [.09,.82])trim(4,bronze,leaf,doorH/2,v,.048,doorH,.045);
        for(const y of [.075,doorH-.037,1.02])trim(4,bronze,leaf,y,.46,.048,.044,.75);
        trim(4,0xaf9466,leaf-sign*.036,1.10,.71,.046,.23,.024);
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
      if(!plan.rooms[0].shared){
        trim(2,0x96754e,0,1.48,depth-.073,w-.25,2.96,.146);
        trim(4,bronze,0,1.18,depth-.166,1.12,2.36,.055);
        trim(2,0x8d6c48,0,1.14,depth-.209,1.01,2.26,.038);
        trim(4,0xb8a07d,.32,1.03,depth-.24,.034,.19,.045);
        trim(5,0xe8cb97,0,2.66,depth-.169,w-.40,.032,.027);
        const wing=(w-1.48)/2;
        for(const sign of [-1,1]){
          const u=sign*(.74+wing/2),at=depth-.97;
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
          trim(3,0xbeb39d,shelfU,1.64,at-.161,.81,.67,.021);
          orb(ball,3,0x998569,shelfU-.10,1.63,at-.19,.243,.163,.009);
          trim(3,0xd1bea1,shelfU+.15,1.70,at-.201,.195,.357,.010);
        }
        trim(1,travertine,0,2.68,depth-.97,1.55,.56,.21);
        trim(4,bronze,0,2.374,depth-1.07,1.54,.049,.081);
      }
      // Front left: upholstered two-seat gallery lounge, low stone table and dome lamp.
      const {sofa,table,console:consoleTable,shelf}=entry;
      const su=(sofa.x-x)*side,sv=(z-sofa.z)*side,sw=sofa.w;
      trim(2,0x705c47,su,.21,sv,sw-.05,.20,.68);
      for(const s of [-1,1]){
        orb(cushion,3,linen,su+s*sw*.218,.425,sv-.042,sw*.215,.112,.305);
        orb(cushion,3,s===1?0xc8b798:linen,su+s*sw*.215,.645,sv+.276,sw*.214,.205,.098);
        orb(cushion,3,leather,su+s*(sw/2-.067),.50,sv,.071,.19,.36);
      }
      const tu=(table.x-x)*side,tv=(z-table.z)*side;
      trim(1,0xa19781,tu,.16,tv,table.w*.74,.27,.34);
      trim(1,limestone,tu,.32,tv,table.w,.10,.47);
      trim(2,0x755f51,tu+.14,.39,tv,.25,.036,.16);
      const lampU=su-sw*.31,lampV=sv+.61;
      leg(bronze,lampU,.74,lampV,.023,1.20);leg(bronze,lampU,.14,lampV,.16,.075);
      orb(dome,1,0xd6bd93,lampU,1.29,lampV,.268,.178,.268);
      // Front right: a narrow travertine display with ceramic vessels and pin lights.
      const cu=(consoleTable.x-x)*side,cv=(z-consoleTable.z)*side;
      for(const s of [-1,1])trim(1,0xc2ac90,cu+s*consoleTable.w*.30,.42,cv,.135,.78,.40);
      trim(1,travertine,cu,.836,cv,consoleTable.w,.068,.57);
      for(const [du,scale] of [[-.19,1],[.18,.77]]){
        orb(ball,4,0xe0d4be,cu+du,.995,cv,.102*scale,.133*scale,.10*scale);
        leg(0xe1d7c4,cu+du,1.11,cv,.050*scale,.064*scale);
      }
      const vu=(shelf.x-x)*side,vv=(z-shelf.z)*side;
      for(const dv of [-1,1])trim(2,wood,vu,.98,vv+dv*(shelf.d/2-.025),.33,1.90,.050);
      for(const y of [.18,.72,1.25,1.85]){
        trim(2,wood,vu,y,vv,.33,.049,shelf.d);
        if(y<1.8)for(const s of [-1,1])orb(ball,4,s>0?0xeadac1:0xc2ab88,vu,y+.11,vv+s*shelf.d*.22,.081,.099,.073);
      }
      // Small framed abstract diptych and a pair of track-lit wall niches.
      const artV=Math.min(depth-.75,sv+.54);
      trim(4,bronze,-half+.214,1.61,artV,.060,1.00,.96);
      trim(3,0xa69a85,-half+.252,1.61,artV,.025,.91,.87);
      trim(3,0xd6c4a9,-half+.272,1.72,artV+.11,.016,.49,.37);
      trim(3,0x967d61,-half+.273,1.49,artV-.15,.016,.23,.38);
      for(let j=0;j<5;j++){
        const u=cu+(j-2)*.177,v=cv+.15*Math.sin(j*1.6),drop=.38+.13*(j%3);
        leg(bronze,u,2.88-drop/2,v,.009,drop);
        orb(ball,5,0xefcd94,u,2.86-drop,v,.056,.074,.056);
      }
    }
    const mesh=batch.mesh(scene,mat,false),points=mesh.geometry.attributes.position;
    const local=new Float32Array(points.count*3);
    for(let i=0;i<points.count;i++){local[i*3]=points.getX(i)-plan.x;local[i*3+1]=points.getZ(i)-plan.b.z;local[i*3+2]=plan.b.d/2;}
    mesh.geometry.setAttribute('galleryCoords',new THREE.BufferAttribute(local,3));
    mesh.userData.impactSurface='solid';
  }
  const glass=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{skyline:{value:panorama}},
    vertexShader:`varying vec3 wp;void main(){vec4 p=modelMatrix*instanceMatrix*vec4(position,1.);wp=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform sampler2D skyline;varying vec3 wp;void main(){vec3 v=normalize(wp-cameraPosition);
      vec3 r=reflect(v,vec3(0.,0.,1.));vec3 sky=texture2D(skyline,vec2(atan(r.x,-r.z)*.46+.17,clamp((asin(r.y)+.16)/.69,0.,1.))).rgb;
      gl_FragColor=vec4(sky*vec3(.76,.87,.84),.048+.23*pow(1.-abs(v.z),2.));
      #include <colorspace_fragment>
    }`});
  const windows=new THREE.InstancedMesh(new THREE.PlaneGeometry(),glass,galleryPanes.length);
  windows.userData.impactSurface='glass';scene.add(windows);
  const dummy=new THREE.Object3D(), visible=new Array(galleryPanes.length);
  let prior,received=false;
  function update(doors,scatter){
    const broken=doors?.brokenPanes;
    if(prior===broken && visible[0]!==undefined){if(doors)received=true;return;}
    prior=broken;let changed=false;
    galleryPanes.forEach((p,i)=>{
      const show=!broken?.[p.id];if(visible[i]===show)return;
      if(received && !show && visible[i])scatter?.(p.x,p.z);
      visible[i]=show;dummy.position.set(p.x,p.bottom+p.h/2,p.z);
      dummy.scale.set(show?p.w:0,show?p.h:0,1);dummy.updateMatrix();
      windows.setMatrixAt(i,dummy.matrix);changed=true;
    });
    if(doors)received=true;
    if(changed)windows.instanceMatrix.needsUpdate=true;
  }
  update();windows.computeBoundingSphere();
  for(const g of [cube,ball,cushion,cyl,dome])g.dispose();
  return update;
}
