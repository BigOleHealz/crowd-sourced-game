import * as THREE from 'three';

// The west and east porticos in brickell-map order. A null tenancy is the
// separately modeled Mangle Café / 810 residential entrance.
const tenants = [
  [['Río Papel','Books & independent press','books'],['Bromelia','Flowers & stems','florist']],
  [['Azul Discos','Records · listening room','records'],['Forma Sur','Contemporary ceramics','pottery']],
  [['Gulf Stream','Paddle & surf','surf'],['Mercado Coral','Produce & provisions','market']],
  [['Dársena','Contemporary art','gallery'],['Cadencia','Bicycles & repair','cycles']],
  [['Casa Lino','Linen & cotton','apparel'],null],
  [['Tinta y Mar','Bookshop','books'],['Sombra','Botanical studio','florist']],
  [['Ciruela','Fruit & grocery','market'],['Biscayne Sound','Vinyl & hi-fi','records']],
  [['Vela','Coastal outfitter','surf'],['Luz del Sur','Prints & photography','gallery']],
  [['Marea Baja','Board workshop','surf'],['Terracota','Wheel-thrown stoneware','pottery']],
  [['Ojiva','Print gallery','gallery'],['Rueda Libre','City bicycles','cycles']],
  [['Tallo','Cut flower market','florist'],['Alba','Resort wear','apparel']],
  [['Isla Wax','Soul · jazz · salsa','records'],['Sal y Sol','Neighborhood market','market']],
  [['El Torno','Pottery studio','pottery'],['Papel de Palma','Art & design books','books']],
  [['Pórtico','Linen atelier','apparel'],['Garza','Fine art editions','gallery']],
  [['Tidal Supply','Paddleboard supply','surf'],['Harbor Wheel','Marine district cycles','cycles']],
  [['Muelle','Canvas & cotton','apparel'],['Channel Press','Charts & books','books']],
  [['Palmetto Clay','Studio ceramics','pottery'],['Palm Exchange','Flowers & plants','florist']],
  [['Bayline Records','Records & tapes','records'],['Pier Market','Fruit & provisions','market']],
];
const palettes = {
  books:   [0x384e4d,0xebe3c9,0x98754d,0xb89160],
  florist: [0x485c43,0xece0ca,0x8f7b5e,0xad8061],
  records: [0x7c4236,0xe3cfaa,0x644939,0x9e774f],
  pottery: [0x895440,0xe7d6bc,0xb08864,0xc59268],
  surf:    [0x396967,0xe1e0c9,0x967952,0xd6bb88],
  market:  [0x5a6648,0xf0dfba,0x967551,0xb29a65],
  gallery: [0x52535a,0xf1eee3,0x7e7061,0xa59072],
  cycles:  [0x375363,0xdadfd7,0x89765a,0x9c9d89],
  apparel: [0x965f4a,0xebe2d2,0xa28c72,0xbca07d],
};
const paint=[0x42655f,0xc3805a,0xe2b765,0x866159,0x799093,0xe3d3b5,0x546371];
const dark=0x353b36, brass=0xb0996c;

// The central service core stays solid. The two outer strips house the retail
// rooms. The existing east-facing showcase needs its full, deeper footprint.
export function retailRecess(width) { return Math.min(5.8,(width-.75)/2); }

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

export function streetShops(scene,renderer,Batch,panorama){
  const loader=new THREE.TextureLoader(), signs=shopSigns();
  const contactSheet=document.createElement('canvas'), cw=224,ch=160;
  contactSheet.width=cw*6;contactSheet.height=ch*6;
  const ambient=contactSheet.getContext('2d');
  ambient.fillStyle='white';ambient.fillRect(0,0,contactSheet.width,contactSheet.height);
  const contactMap=new THREE.CanvasTexture(contactSheet);
  const interior=interiorMaterial(signs.map,contactMap,loader,renderer);
  const glass=new THREE.ShaderMaterial({
    uniforms:{panorama:{value:panorama}},transparent:true,depthWrite:false,
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
  const face=new THREE.PlaneGeometry(), glassGeometry=new THREE.PlaneGeometry(), floorPlane=new THREE.PlaneGeometry();
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
    const ball=(c,x,y,z,w,h,d)=>shape(bulb,c,x,y,z,w,h,d);
    const round=(c,x,y,z,r,h)=>shape(drum,c,x,y,z,r,h,r);
    const beam=(c,x,y,z,xx,yy,zz,t)=>{
      const v=new THREE.Vector3(xx-x,yy-y,zz-z),len=v.length();
      const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
      const rot=new THREE.Euler().setFromQuaternion(q);
      shape(box,c,(x+xx)/2,(y+yy)/2,(z+zz)/2,t,len,t,2,rot.x,rot.y,rot.z);
    };
    const shadeColor=paint[(index+(side+1)*2)%paint.length];
    const rear=-depth+.16, stockZ=rear+.36;
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
    rect(dark,0,.100,-.13,width,.115,.15);
    // A single glass run has a proper framed display window and door leaf.
    const bays=Math.max(3,Math.round(width/2.8)),bay=(width-.44)/bays;
    for(let j=0;j<=bays;j++)rect(dark,-half+.22+j*bay,1.48,-.14,.056,2.76,.085);
    const doorX=-half+.22+bay*.52;
    for(const u of [-.48,.48]) rect(dark,doorX+u,1.13,-.122,.052,2.16,.073);
    rect(dark,doorX,2.19,-.122,1.01,.055,.073);
    rect(brass,doorX+.366,1.04,-.065,.025,.31,.04);
    const glazing=new THREE.Mesh(glassGeometry,glass);
    glazing.position.set(0,1.49,-.16);glazing.scale.set(width-.30,2.72,1);
    room.add(glazing);
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

    function table(x,z,w,d,top=.82) {
      floorShadow(x,z,w,d);timber(wood,x,top,z,w,.085,d);
      for(const sx of [-1,1])for(const sz of [-1,1])
        rect(dark,x+sx*(w/2-.10),top/2,z+sz*(d/2-.09),.045,top,.045);
    }
    function shelf(x,w){
      floorShadow(x,stockZ+.09,w,.52);timber(wood,x,1.30,stockZ-.12,w,2.51,.115);
      for(const sx of [-1,1])timber(edge,x+sx*(w/2-.04),1.34,stockZ+.04,.078,2.54,.41);
      for(const y of [.31,.93,1.55,2.17])timber(edge,x,y,stockZ+.055,w,.065,.49);
    }
    function vase(x,y,z,c,r,h){
      batch=merchandise;
      shape(pot,c,x,y+h*.27,z,r,h*.54,r);
      ball(c,x,y+h*.53,z,r*1.03,h*.28,r*1.03);
      round(c,x,y+h*.80,z,r*.55,h*.36);
      round(c,x,y+h*.98,z,r*.63,h*.04);
      round(dark,x,y+h*1.005,z,r*.45,.008);batch=fittings;
    }
    function bouquet(x,y,z,c,s){
      batch=merchandise;
      shape(pot,0xb6a597,x,y+.14*s,z,.14*s,.28*s,.14*s);
      for(let k=0;k<7;k++){
        const a=k*2.4,reach=(.11+.07*Math.sin(k))*s;
        const xx=x+Math.sin(a)*reach,zz=z+Math.cos(a)*reach,yy=y+(.47+.12*Math.sin(2*k))*s;
        beam(0x566849,x,y+.24*s,z,xx,yy,zz,.013*s);
        shape(bulb,0x6e835a,(x+xx)/2,(yy+y+.20*s)/2,(zz+z)/2,.06*s,.11*s,.029*s,2,.3,a,.50);
        ball(c,xx,yy,zz,.072*s,.055*s,.071*s);
        ball(0xd6b069,xx,yy+.048*s,zz,.029*s,.014*s,.029*s);
      }
      batch=fittings;
    }
    function bicycle(x,z,c){
      for(const dx of [-.55,.55]){
        shape(hoop,dark,x+dx,.39,z,.34,.34,.34);
        batch=merchandise;
        for(let k=0;k<5;k++){
          const a=k*Math.PI/5,xx=.302*Math.cos(a),yy=.302*Math.sin(a);
          beam(0xa5aaa2,x+dx-xx,.39-yy,z,x+dx+xx,.39+yy,z,.012);
        }
        batch=fittings;
      }
      const pts=[[-.55,.39],[-.21,.86],[.01,.39],[.39,.82],[.55,.39]];
      for(const [a,b] of [[0,1],[0,2],[1,2],[1,3],[2,3],[3,4]])
        beam(c,x+pts[a][0],pts[a][1],z,x+pts[b][0],pts[b][1],z,.042);
      rect(dark,x-.24,.926,z,.24,.07,.13);
      beam(dark,x+.39,.82,z,x+.34,1.00,z,.037);rect(dark,x+.34,1,z,.095,.045,.38);
    }
    function art(x,y,z,w,h,variant){
      timber(wood,x,y,z,w+.09,h+.09,.095);rect(0xeee4cb,x,y,z+.058,w,h,.024);
      const artZ=z+.074;
      rect(paint[variant%7],x,y,artZ,w*.84,h*.79,.012);
      // Screen prints with large clipped-looking colour fields, sun and skyline.
      shape(drum,paint[(variant+2)%7],x-.12*w,y+.10*h,artZ+.015,.16*w,.012,.16*w,2,Math.PI/2);
      for(let k=0;k<4;k++){
        const bh=h*(.14+.17*(.5+.5*Math.cos(variant+k*2)));
        rect(paint[(variant+k+3)%7],x+w*(-.30+k*.15),y-h*.30+bh/2,artZ+.022+k*.002,w*.14,bh,.008);
      }
    }
    function checkout(x,w,variant){
      const z=-depth*(.69+.05*(variant%2)), counterW=Math.min(2.35,w*.91);
      floorShadow(x,z,counterW,.80);
      // A timber cashwrap with recessed plinth, countertop, scanner and small
      // receipt roll. The wall behind it carries the shopkeeper's own name.
      timber(dark,x,.115,z,counterW-.12,.14,.68);
      timber(wood,x,.574,z,counterW,.80,.78);
      rect(cream,x,.997,z,counterW+.10,.060,.86,4);
      for(let j=0;j<11;j++)timber(edge,x+counterW*(j-5)/12,.55,z+.406,.046,.72,.035);
      rect(dark,x+.19,1.07,z,.12,.095,.19);
      shape(box,dark,x+.19,1.22,z,.32,.23,.032,2,-.17);
      rect(0xaaa99a,x-.18,1.055,z+.08,.16,.062,.17);
      rect(accent,x,2.02,rear+.051,w*.90,1.61,.07);
      face.setAttribute('batchUv',uv);
      batch.add(face,0xffffff,x,2.11,rear+.094,w*.79,.46,1);
      for(const sx of [-1,1]){
        round(brass,x+sx*w*.41,2.10,rear+.18,.059,.33);
        shape(drum,0xffdda1,x+sx*w*.41,2.10,rear+.18,.052,.46,.052,6);
      }
    }
    function loungeChair(x,z,color){
      timber(wood,x,.19,z,.53,.32,.50);
      rect(color,x,.38,z,.62,.17,.60);
      shape(box,color,x,.66,z-.24,.63,.48,.12,2,-.12);
    }
    function featureBay(x,w,variant,c){
      const z=-depth*.65;
      floorShadow(x,z,w*.67,.73);
      switch(type){
        case 'cycles':{
          // Mechanic's workbench, toolbox and a spare wheel hung from a stand.
          timber(wood,x,.96,stockZ+.31,w*.85,.10,.97);
          for(const dx of [-.31,.31])rect(dark,x+w*dx,.50,stockZ+.33,.12,.90,.65);
          rect(0x9a4e3e,x-w*.20,1.17,stockZ+.29,.54,.31,.31);
          for(let j=0;j<3;j++)rect(brass,x-w*.20,1.08+j*.08,stockZ+.46,.42,.013,.022);
          shape(hoop,dark,x+w*.22,1.80,stockZ+.09,.36,.36,.36);
          shape(hoop,0xa5aca3,x+w*.22,1.80,stockZ+.09,.32,.32,.32);break;
        }
        case 'gallery':
          art(x-.24*w,1.81,rear+.10,.78,1.10,variant);
          art(x+.18*w,1.59,rear+.10,.64,.82,(variant+4)%7);
          table(x,z,w*.73,.46,.45);break;
        case 'florist':
          // Lattice supports climbing foliage behind a tiered plant stand.
          for(let k=0;k<7;k++)timber(wood,x+(k-3)*w*.11,1.49,stockZ,.027,2.34,.034);
          for(let k=0;k<6;k++)timber(wood,x,1.00+k*.24,stockZ,w*.82,.024,.034);
          for(let k=0;k<3;k++){
            const xx=x+(k-1)*w*.24,h=.22+k*.19;
            timber(edge,xx,h/2,z,.50,h,.53);
            bouquet(xx,h,z,paint[(variant+k)%7],1.37);
          }break;
        case 'market':{
          // Refrigerated case with insulated sides, a dark back, lit shelves,
          // and milk bottles. Each tier has a fine shelf lip.
          rect(0x565c55,x,1.19,stockZ,w*.79,2.36,.73);
          rect(0x9ca9a0,x,1.34,stockZ+.38,w*.71,1.86,.045);
          for(const sx of [-1,1])rect(cream,x+sx*w*.365,1.34,stockZ+.51,.055,1.91,.30);
          for(let j=0;j<3;j++){
            const y=.48+j*.54;
            rect(cream,x,y,stockZ+.50,w*.72,.035,.32);
            for(let k=0;k<6;k++){
              const xx=x+(k-2.5)*w*.11;
              round([cream,0xb8b594,c][(j+k)%3],xx,y+.14,stockZ+.53,.085,.24);
              round(dark,xx,y+.28,stockZ+.53,.049,.042);
            }
          }
          rect(0xffedcf,x,2.27,stockZ+.49,w*.68,.022,.15,6);
          break;
        }
        case 'pottery':
          // Potter's wheel, seat and tools, with blue-green glaze samples.
          shape(pot,0xa29a87,x,.34,z,.32,.63,.32);
          round(0x6e756e,x,.70,z,.43,.15);round(0xc2beab,x,.79,z,.30,.05);
          vase(x,.82,z,c,.13,.28);
          round(wood,x+.65,.51,z,.23,.085);round(dark,x+.65,.28,z,.06,.44);
          for(let j=0;j<5;j++)rect(paint[(variant+j)%7],x+(j-2)*.27,1.90,rear+.09,.23,.41,.07);
          break;
        case 'records':
          // Listening station: speakers with recessed cones and a turntable.
          timber(wood,x,.77,z,w*.79,.80,.64);rect(dark,x,1.19,z,.69,.076,.46);
          round(0x323333,x,1.24,z,.19,.025);round(c,x,1.26,z,.057,.013);
          for(const sx of [-1,1]){
            const xx=x+sx*w*.32;
            timber(wood,xx,1.43,z,.31,.53,.30);
            shape(drum,dark,xx,1.40,z+.17,.115,.025,.115,2,Math.PI/2);
            shape(drum,0x8b9588,xx,1.59,z+.17,.044,.025,.044,2,Math.PI/2);
          }break;
        case 'apparel':
          timber(wood,x,1.54,stockZ,w*.73,2.31,.42);
          for(const sx of [-1,1])timber(edge,x+sx*w*.35,1.55,stockZ+.26,.067,2.31,.48);
          for(let j=0;j<3;j++) {
            const yy=.62+j*.67;timber(edge,x,yy,stockZ+.21,w*.76,.058,.55);
            for(let k=0;k<3;k++)for(let l=0;l<3;l++)
              rect(paint[(variant+j+k)%7],x+(k-1)*w*.21,yy+.061+l*.052,stockZ+.29,.39,.047,.32);
          }break;
        case 'books':
          art(x,1.91,rear+.10,1.12,.81,variant);
          loungeChair(x-.27*w,z,c);loungeChair(x+.25*w,z,accent);
          round(wood,x,.52,z+.19,.26,.058);round(brass,x,.28,z+.19,.055,.45);break;
        case 'surf':
          timber(wood,x,.84,z,w*.88,.10,.75);
          for(const sx of [-1,1])rect(dark,x+sx*w*.32,.42,z,.12,.78,.55);
          shape(bulb,cream,x,1,z,w*.43,.065,.26);
          for(let j=0;j<3;j++){
            const xx=x+(j-1)*.47;
            beam(wood,xx-.15,.54,stockZ,xx+.13,2.32,stockZ,.043);
            shape(bulb,paint[(variant+j)%7],xx-.13,.79,stockZ,.12,.29,.035,2,0,0,-.18);
          }break;
      }
    }
    const count=Math.max(1,Math.floor((width-.8)/3.5)),cell=(width-.85)/count;
    for(let i=0;i<count;i++){
      const x=(i+.5-count/2)*cell, w=Math.min(cell-.26,3.3);
      const variant=(index*3+i+(side+1))%7, c=paint[variant];
      const middle=-depth*(.42+.15*((index+i)%3)/2);
      if(count>=2 && i===(index+1)%count){
        checkout(x,w,variant);continue;
      }
      if(count>=3 && i===(index+2)%count){
        featureBay(x,w,variant,c);continue;
      }
      floorShadow(x,middle,w*.71,.75);
      // Back-wall inventory, working fixtures in the middle and a foreground
      // merchandise silhouette occupy distinct depths even in the small bays.
      switch(type){
        case 'books':
          shelf(x,w);
          batch=merchandise;
          for(const y of [.349,.969,1.589,2.209]){
            for(let k=0;k<9;k++){
              const h=.26+.12*(.5+.5*Math.sin(i*3+k*4.7+y));
              rect(paint[(k+i+Math.round(y*2))%7],x+w*(k-4)/11,y+h/2,stockZ+.09,w/13,h,.22);
            }
          }
          batch=fittings;table(x,middle,w*.71,.85);batch=merchandise;
          for(let k=0;k<5;k++){
            const xx=x+(k%3-1)*w*.20,yy=.892+Math.floor(k/3)*.060;
            rect(paint[(variant+k)%7],xx,yy,middle,.36,.048,.48);
            rect(0xdccfaf,xx,yy+.011,middle+.235,.33,.024,.018);
          }break;
        case 'florist':
          timber(wood,x,.70,stockZ+.12,w,1.25,.63);
          for(let k=0;k<4;k++)bouquet(x+(k-1.5)*w*.24,1.334,stockZ+.16,paint[(variant+2*k)%7],.94);
          for(let k=0;k<3;k++){
            const xx=x+(k-1)*w*.26, zz=(k===1?-1.04:middle);
            shape(pot,0x828b79,xx,.25,zz,.23,.46,.23);
            bouquet(xx,.46,zz,[0xc37a74,0xe8d4a0,0x9c7190][k],1.25);
          }break;
        case 'records':
          for(let k=0;k<3;k++)art(x+(k-1)*w*.28,1.93,rear+.085,.66,.67,(variant+k)%7);
          table(x,middle,w*.83,.88,.77);
          for(let k=0;k<3;k++){
            const xx=x+(k-1)*w*.25;
            timber(wood,xx,.94,middle,w*.23,.26,.67);
            batch=merchandise;
            for(let j=0;j<5;j++)shape(box,paint[(variant+j+k)%7],xx,1.12,middle+.22-j*.084,.43,.42,.028,2,-.15);
            shape(drum,0x302f2d,xx,1.19,middle+.253,.115,.018,.115,2,Math.PI/2);
            shape(drum,c,xx,1.19,middle+.269,.041,.008,.041,2,Math.PI/2);batch=fittings;
          }break;
        case 'pottery':
          shelf(x,w);
          for(let j=0;j<3;j++)for(let k=0;k<4;k++)
            vase(x+(k-1.5)*w*.22,.35+.62*j,stockZ+.11,[cream,shadeColor,0xb87959,0x7c9088][(j+k)%4],.11+.017*(k%3),.28+.07*((k+j)%3));
          table(x,middle,w*.66,.77);
          vase(x-.24,.865,middle,c,.17,.47);vase(x+.23,.865,middle+.08,cream,.12,.30);
          break;
        case 'surf':
          for(let k=0;k<3;k++){
            const xx=x+(k-1)*w*.24, h=1.12-.075*((k+i)%3);
            const board=paint[(variant+k)%7];
            shape(bulb,board,xx,1.30,stockZ+.08,.31,h,.078,2,0,0,.075*(k-1));
            rect(0xe4d4ae,xx,1.30,stockZ+.160,.036,1.72,.015);
          }
          for(const sx of [-1,1]){
            timber(wood,x+sx*w*.29,.51,middle,.12,.94,.5);
            timber(edge,x+sx*w*.29,.76,middle,.14,.10,.91);
          }
          shape(bulb,shadeColor,x,.87,middle,w*.46,.11,.34);
          shape(bulb,cream,x,1.12,middle-.085,w*.44,.082,.30);
          break;
        case 'market':
          shelf(x,w);
          batch=merchandise;
          for(const y of [.35,.97,1.59])for(let k=0;k<6;k++){
            const xx=x+(k-2.5)*w*.145;
            round(0xc9ad78,xx,y+.115,stockZ+.10,.092,.23);
            round(paint[(variant+k)%7],xx,y+.116,stockZ+.10,.094,.117);
          }
          batch=fittings;
          for(let k=0;k<3;k++){
            const xx=x+(k-1)*w*.26,z=middle+(k%2)*.32;
            timber(wood,xx,.51,z,w*.24,.76,.70);
            for(let j=0;j<3;j++)timber(edge,xx,.45+j*.16,z+.37,w*.24,.096,.036);
            batch=merchandise;
            for(let j=0;j<8;j++)ball([0xbf6540,0x8caa52,0xd7a339][k],xx+((j%4)-1.5)*.13,.944,z+(Math.floor(j/4)-.5)*.19,.08,.083,.083);batch=fittings;
          }break;
        case 'gallery':
          art(x,1.68,rear+.09,w*.64,1.42,variant);
          rect(cream,x,.45,middle,.66,.86,.66,4);
          shape(hoop,c,x,1.25,middle,.42,.50,.42,2,.03,.37,.21);
          break;
        case 'cycles':
          rect(0x65746a,x,1.83,rear+.09,w*.81,1.04,.10);
          for(let k=0;k<5;k++){
            const xx=x+(k-2)*w*.14;
            beam(0xbcc1aa,xx,1.58,stockZ,xx+.08,2.06,stockZ,.026);
            shape(hoop,0xb0b6ae,xx+.082,2.10,stockZ,.06,.06,.06);
          }
          timber(wood,x,.95,stockZ+.04,w*.86,.09,.61);
          bicycle(x,middle,c);
          rect(dark,x,.079,middle,1.48,.085,.43);
          break;
        case 'apparel':
          art(x,1.78,rear+.09,w*.48,1.18,(variant+2)%7);
          for(const sx of [-1,1]){
            rect(brass,x+sx*w*.38,.86,middle,.037,1.63,.037);
            rect(dark,x+sx*w*.38,.09,middle,.10,.07,.59);
          }
          rect(brass,x,1.68,middle,w*.80,.04,.04);
          for(let k=0;k<5;k++){
            const xx=x+(k-2)*w*.15, cc=paint[(k+variant)%7];
            beam(wood,xx-.11,1.51,middle,xx,1.63,middle,.025);
            beam(wood,xx,1.63,middle,xx+.12,1.51,middle,.025);
            shape(pot,cc,xx,1.08,middle,.17,.79,.088);
            shape(bulb,cc,xx-.109,1.36,middle,.084,.17,.088,2,0,0,-.40);
            shape(bulb,cc,xx+.109,1.36,middle,.084,.17,.088,2,0,0,.40);
          }break;
      }
      batch=fittings;
    }
    // A single window display punctuates the more regularly spaced rear bays.
    // Set the merchandise at three actual distances from the pavement.
    const windowX=half*.51, near=-.83;
    floorShadow(windowX,near,.61,.49);
    if(type==='books'||type==='gallery'||type==='records'){
      timber(wood,windowX,.30,near,.67,.55,.50);
      art(windowX,.96,near,.49,.66,index%7);
    }else if(type==='pottery'||type==='florist'){
      rect(edge,windowX,.31,near,.63,.57,.63,4);
      if(type==='pottery')vase(windowX,.605,near,shadeColor,.19,.61);
      else bouquet(windowX,.605,near,0xedca84,1.18);
    }else if(type==='cycles'){
      shape(hoop,dark,windowX,.63,near,.40,.40,.40,2,0,.38);
      rect(brass,windowX,.18,near,.10,.29,.20);
    }else if(type==='apparel'){
      round(dark,windowX,.06,near,.22,.10);round(brass,windowX,.58,near,.035,1.0);
      ball(cream,windowX,1.34,near,.213,.36,.12);
      shape(pot,shadeColor,windowX,1.03,near,.195,.34,.13);
      round(wood,windowX,1.71,near,.085,.10);
    }else if(type==='market'){
      timber(wood,windowX,.24,near,.74,.42,.52);
      for(let k=0;k<5;k++)ball(0xc29b50,windowX+(k-2)*.114,.51,near,.088,.074,.10);
    }else{
      shape(bulb,0xd7ad6e,windowX,1.14,near,.27,1.02,.085,2,-.12,0,.17);
      shape(box,cream,windowX,1.14,near+.083,.027,1.69,.013,2,-.12,0,.17);
    }
    const mesh=fittings.mesh(room,interior,false);mesh.userData.impactSurface='solid';
    if(merchandise.indices.length){
      const detail=new THREE.LOD();
      detail.addLevel(merchandise.mesh(detail,interior,false),0);
      detail.addLevel(new THREE.Group(),52,.12);room.add(detail);
    }
    contactMap.needsUpdate=true;scene.add(room);
  }
  return make;
}
