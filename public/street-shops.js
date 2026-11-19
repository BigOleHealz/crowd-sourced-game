import {furnitureRanges} from './shop-furniture-view.js';
import {faceAt} from './frontage-glass.js';
import * as THREE from 'three';

import {tenants,palettes,dark,brass,furnishShop} from './street-shop-layout.js';

function shopSigns() {
  const labels=tenants.flat().filter(Boolean), columns=4, rows=Math.ceil(labels.length/columns);
  const sheet=document.createElement('canvas');sheet.width=2048;sheet.height=rows*96;
  const ctx=sheet.getContext('2d'), sw=sheet.width/columns, signUV=new Map();
  for(const [i,[name,subtitle,type]] of labels.entries()){
    const x=(i%columns)*sw,y=Math.floor(i/columns)*96;
    const [accent,cream]=palettes[type], hex=c=>'#'+c.toString(16).padStart(6,'0');
    const darkInk=['gallery','apparel','pottery'].includes(type);
    ctx.fillStyle=hex(darkInk?cream:accent);ctx.fillRect(x,y,sw,96);
    ctx.fillStyle=hex(darkInk?accent:cream);ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=type==='cycles'||type==='surf'?'bold 49px Helvetica, sans-serif':'49px Georgia, serif';
    ctx.fillText(name,x+sw/2,y+36,sw-30);
    ctx.font='16px Helvetica, sans-serif';ctx.fillText(subtitle.toUpperCase().split('').join(' '),x+sw/2,y+77,sw-30);
    signUV.set(name,[(x+2)/sheet.width,1-(y+94)/sheet.height,(sw-4)/sheet.width,92/sheet.height]);
  }
  const map=new THREE.CanvasTexture(sheet);map.colorSpace=THREE.SRGBColorSpace;
  return {map,signUV};
}

// Local x runs along the window and -z points into the room. Use the actual
// distance from the glazing for daylight falloff and the ceiling fixtures for
// warm interior light, without introducing lights or shadow maps per tenancy.
function interiorMaterial(signMap,contactMap,loader,renderer) {
  function load(name){
    const t=loader.load('./'+name+'.webp');t.colorSpace=THREE.SRGBColorSpace;
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;
  }
  const maps={oak:load('storefront-oak'),stone:load('avenue-limestone'),contacts:contactMap};
  const mat=new THREE.MeshBasicMaterial({vertexColors:true,map:signMap,side:THREE.FrontSide});
  mat.onBeforeCompile=shader=>{
    for(const [name,value] of Object.entries(maps))shader.uniforms[name]={value};
    shader.vertexShader='varying vec3 shopP, shopN;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nshopP=position; shopN=normal;');
    shader.fragmentShader='varying vec3 shopP, shopN; uniform sampler2D oak, stone, contacts;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 p=shopP, n=normalize(shopN);
      float finish=vMapUv.x;
      vec2 uv=abs(n.y)>.65?p.xz:abs(n.x)>.65?p.zy:p.xy;
      if(finish<0.){
        vec2 coord=p.xz/vec2(.87,1.34);
        vec2 seam=abs(fract(coord+.5)-.5)/max(fwidth(coord),vec2(.0001));
        float grout=clamp(min(seam.x,seam.y),0.,1.);
        vec3 aggregate=texture2D(stone,uv/1.55).rgb;
        diffuseColor.rgb*=mix(vec3(.72),mix(vec3(1.),aggregate,.58),grout);
        diffuseColor.rgb*=texture2D(contacts,vec2(-finish-1.,vMapUv.y)).r;
      }else if(finish<1.) diffuseColor*=texture2D(map,vMapUv);
      else if(finish>3.5) diffuseColor.rgb*=mix(vec3(1.),texture2D(stone,uv/1.5).rgb,.53);
      else if(finish>2.5) diffuseColor.rgb*=mix(vec3(1.),texture2D(oak,uv/vec2(.8,1.9)).rgb,.57);
      float depth=max(0.,-p.z);
      float windowLight=(.26+.50*max(0.,dot(n,normalize(vec3(.16,.46,1.)))))*exp(-.34*depth);
      float pendantX=mod(p.x+1.4,2.8)-1.4;
      vec3 lamp=vec3(-pendantX,2.80-p.y,-1.70-p.z);
      float downlight=max(0.,dot(n,normalize(lamp)))/(1.+.75*dot(lamp,lamp));
      float shelfGlow=.15*exp(-2.2*abs(p.y-1.88));
      vec3 light=vec3(.38,.355,.31)+vec3(.91,.97,1.)*windowLight+vec3(.91,.64,.34)*(downlight+shelfGlow);
      diffuseColor.rgb*=finish>5.5 ? vec3(1.32,1.12,.86) : light;
    `);
  };
  return mat;
}

export function streetShops(scene,renderer,Batch,panorama,windows){
  const loader=new THREE.TextureLoader(), signs=shopSigns();
  const contactSheet=document.createElement('canvas'), cw=224,ch=160;
  contactSheet.width=cw*6;contactSheet.height=ch*6;
  const ambient=contactSheet.getContext('2d');
  ambient.fillStyle='white';ambient.fillRect(0,0,contactSheet.width,contactSheet.height);
  const contactMap=new THREE.CanvasTexture(contactSheet);
  const interior=interiorMaterial(signs.map,contactMap,loader,renderer);
  const glass=new THREE.ShaderMaterial({
    uniforms:{panorama:{value:panorama}},side:THREE.DoubleSide,transparent:true,depthWrite:false,
    vertexShader:`varying vec3 pos,norm;void main(){vec4 p=modelMatrix*vec4(position,1.);
      pos=p.xyz;norm=mat3(modelMatrix)*normal;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader:`uniform sampler2D panorama;varying vec3 pos,norm;void main(){
      vec3 v=normalize(pos-cameraPosition),n=normalize(norm),r=reflect(v,n);
      float edge=1.-abs(dot(v,n));
      vec3 sky=texture2D(panorama,vec2(atan(r.x,-r.z)*.46+.17,clamp((asin(r.y)+.16)/.69,0.,1.))).rgb;
      gl_FragColor=vec4(sky*vec3(.77,.88,.88),.055+.23*edge*edge);
      #include <colorspace_fragment>
    }`,
  });
  const box=new THREE.BoxGeometry(), drum=new THREE.CylinderGeometry(1,1,1,12);
  const pot=new THREE.CylinderGeometry(1,.66,1,12), bulb=new THREE.SphereGeometry(1,10,7);
  const shade=new THREE.CylinderGeometry(.13,1,1,14), hoop=new THREE.TorusGeometry(1,.064,6,20);
  const face=new THREE.PlaneGeometry(), floorPlane=new THREE.PlaneGeometry();
  // Tag a primitive's UVs with stock finishes. The one sign face uses true
  // atlas coordinates. Batch copies UVs at insertion so primitives are reused.
  const finishUV=new Map();
  function finish(shape,mode){
    const key=shape.id+'/'+mode;
    if(!finishUV.has(key)){
      const uv=shape.attributes.uv.clone();for(let i=0;i<uv.count;i++)uv.setXY(i,mode,0);
      finishUV.set(key,uv);
    }
    shape.setAttribute('batchUv',finishUV.get(key));
  }
  function make(index,side,bld,depth) {
    const tenant=tenants[index]?.[side===1?1:0];if(!tenant)return;
    const [name,,type]=tenant, [accent,cream,wood,edge]=palettes[type];
    const width=bld.d, half=width/2, room=new THREE.Group();room.name=name;
    room.position.set(bld.x+side*bld.w/2,.80,bld.z);room.rotation.y=side*Math.PI/2;
    const fittings=new Batch(true), merchandise=new Batch(true);
    let batch=fittings;
    function shape(g,c,x,y,z,w,h,d,mode=2,rx=0,ry=0,rz=0){
      finish(g,mode);batch.add(g,c,x,y,z,w,h,d,rx,ry,rz);
    }
    const rect=(c,x,y,z,w,h,d,mode=2)=>shape(box,c,x,y,z,w,h,d,mode);
    const timber=(c,x,y,z,w,h,d)=>rect(c,x,y,z,w,h,d,3);
    const round=(c,x,y,z,r,h)=>shape(drum,c,x,y,z,r,h,r);
    const beam=(c,x,y,z,xx,yy,zz,t)=>{
      const v=new THREE.Vector3(xx-x,yy-y,zz-z),len=v.length();
      const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
      const rot=new THREE.Euler().setFromQuaternion(q);
      shape(box,c,(x+xx)/2,(y+yy)/2,(z+zz)/2,t,len,t,2,rot.x,rot.y,rot.z);
    };
    const rear=-depth+.16;
    const cellIndex=index*2+(side>0?1:0), pixelX=cellIndex%6*cw,pixelY=Math.floor(cellIndex/6)*ch;
    // A small shared contact atlas is baked from each shop's actual layout.
    // Depth-aligned soft feet connect the furniture to the terrazzo floor.
    function floorShadow(x,z,w,d){
      ambient.save();ambient.beginPath();ambient.rect(pixelX,pixelY,cw,ch);ambient.clip();
      ambient.translate(pixelX+(.5+x/width)*cw,pixelY+(1+z/depth)*ch);
      ambient.scale((w*.5+.24)*cw/width,(d*.5+.31)*ch/depth);
      const ramp=ambient.createRadialGradient(0,0,0,0,0,1);
      ramp.addColorStop(0,'rgba(0,0,0,.48)');ramp.addColorStop(.52,'rgba(0,0,0,.28)');ramp.addColorStop(1,'rgba(0,0,0,0)');
      ambient.fillStyle=ramp;ambient.fillRect(-1,-1,2,2);ambient.restore();
    }
    // Wall finish and trim belong to the tenant; the tower stays continuous above.
    const railColor=type==='market'||type==='cycles'?0xb9c0ae:edge;
    rect(railColor,0,.52,rear+.065,width-.32,.96,.06,3);
    rect(wood,0,1.014,rear+.092,width-.32,.037,.079);
    // Seal the end returns to the tower, with tile, skirting and solid soffits.
    const floorUV=floorPlane.attributes.uv.clone();
    for(let i=0;i<floorUV.count;i++)floorUV.setXY(i,-1-(pixelX+1+(cw-2)*floorUV.getX(i))/contactSheet.width,
      1-(pixelY+ch-1-(ch-2)*floorUV.getY(i))/contactSheet.height);
    floorPlane.setAttribute('batchUv',floorUV);
    batch.add(floorPlane,cream,0,.041,-depth/2,width,depth,1,-Math.PI/2);
    rect(0xddceb8,0,3.32,-depth/2,width,.18,depth,4);
    rect(cream,0,1.68,rear-.07,width,3.36,.14,4);
    rect(edge,0,.114,rear+.028,width,.15,.045,3);
    for(const s of [-1,1]){
      rect(cream,s*(half-.08),1.94,-depth/2,.16,3.88,depth,4);
      rect(edge,s*(half-.125),1.43,-.16,.25,2.84,.34,4);
    }
    rect(0xd4c5aa,0,3.37,-.115,width,.99,.23,4);
    rect(dark,0,2.86,-.12,width,.081,.16);
    windows.add(faceAt(bld,bld.x+side*bld.w/2),glass);
    const signWidth=Math.min(width*.76,5.2);
    rect(dark,0,3.18,1.00,signWidth+.15,.66,.105);
    for(const sx of [-1,1])rect(dark,sx*signWidth*.36,3.10,.52,.075,.10,.90);
    const [u,v,su,sv]=signs.signUV.get(name),uv=face.attributes.uv.clone();
    for(let i=0;i<uv.count;i++)uv.setXY(i,u+su*uv.getX(i),v+sv*uv.getY(i));
    face.setAttribute('batchUv',uv);batch.add(face,0xffffff,0,3.18,1.058,signWidth,.59,1);
    // Pools of light delineate the window display from the deeper work area.
    for(let i=-Math.floor((half-.58)/2.8);i<=Math.floor((half-.58)/2.8);i++){
      const x=i*2.8; round(dark,x,3.11,-1.70,.011,.30);
      if(type==='gallery'||type==='cycles'||type==='market'){
        rect(dark,x,2.94,-1.70,1.22,.095,.14);
        rect(0xffe7ba,x,2.885,-1.70,1.14,.019,.11,6);
      }else{
        shape(shade,accent,x,2.89,-1.70,.185,.16,.185);
        shape(drum,0xffe0a9,x,2.805,-1.70,.174,.014,.174,6);
      }
    }

    const geometryByName={box,drum,bulb,pot,hoop};
    const planned=faceAt(bld,room.position.x).pieces;
    const motion=furnitureRanges(scene,[fittings,merchandise],side,room.position.x,room.position.z);
    let marker;
    furnishShop(index,side,width,depth,{
      beginPiece:id=>{marker=motion.start(planned.get(id));},
      endPiece:()=>motion.end(marker),
      shape:(id,...args)=>shape(geometryByName[id],...args),beam,floorShadow,
      detail:on=>{batch=on?merchandise:fittings;},
      sign:(x,y,z,w,h)=>{face.setAttribute('batchUv',uv);batch.add(face,0xffffff,x,y,z,w,h,1);},
    });
    const mesh=fittings.mesh(room,interior,false);mesh.userData.impactSurface='solid';
    let details;
    if(merchandise.indices.length){
      const detail=new THREE.LOD();
      details=merchandise.mesh(detail,interior,false);detail.addLevel(details,0);
      detail.addLevel(new THREE.Group(),52,.12);room.add(detail);
    }
    motion.bind([mesh,details]);
    contactMap.needsUpdate=true;scene.add(room);
  }
  return make;
}
