import {breezeMaterial,addClubBurgees} from './waterfront-breeze.js';
import {terracePanes,skylights,clubPanes} from './estate-exterior-glass.js';
import {paneKey} from './pane-damage.js';
import {paneBatch} from './pane-damage-view.js';
import {addCasaLuma} from './casa-luma-view.js';
import {furnishPalazzo} from './palazzo-mare-view.js';
import * as THREE from 'three';
import {alpineGlass} from './landscape.js';
import {clubSalon,pools,clubColumns,loggiaColumns,shadeColumns,hedges,planters,berthing} from './lantern-buildings-layout.js';

const floor=.80;
const cream=0xe5ddc6, limestone=0xccb994, bronze=0x79654c, dark=0x41443f;
const teak=0xaa7952, brass=0xbda06b, linen=0xe9e3d4;

// Glass, water and shaded masonry each have a single material for the district.
export function addLanternBuildings(scene,Batch,sky){
  const main=new Batch(), stone=new Batch(true), glass=new Batch(), water=new Batch(true);
  const panes=paneBatch(glass),sillStone=paneBatch(stone),sillTrim=paneBatch(main);
  const cube=new THREE.BoxGeometry(), plane=new THREE.PlaneGeometry();
  const drum=new THREE.CylinderGeometry(.5,.5,1,24);
  const sphere=new THREE.IcosahedronGeometry(.5,1);
  const pot=new THREE.CylinderGeometry(.52,.39,1,18);
  const box=(c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>main.add(cube,c,x,floor+y,z,w,h,d,rx,ry,rz);
  const cyl=(c,x,y,z,w,h,d=w)=>main.add(drum,c,x,floor+y,z,w,h,d);
  const leaf=(c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>main.add(sphere,c,x,floor+y,z,w,h,d,rx,ry,rz);
  const beam=(c,a,b,w,d=w)=>main.beam(c,[a[0],floor+a[1],a[2]],[b[0],floor+b[1],b[2]],w,d);
  function masonry(c,x,y,z,w,h,d){
    const uv=cube.attributes.uv.clone(),norm=cube.attributes.normal;
    for(let i=0;i<uv.count;i++){
      const top=Math.abs(norm.getY(i))>.5;
      uv.setXY(i,uv.getX(i)*(Math.abs(norm.getX(i))>.5?d:w)/3,uv.getY(i)*(top?d:h)/3);
    }
    cube.setAttribute('batchUv',uv);
    stone.add(cube,c,x,floor+y,z,w,h,d);
  }
  function slab(x,y,z,w,d,edge=.27){
    masonry(cream,x,y,z,w,edge,d);
    box(teak,x,y-edge/2-.023,z,w-.24,.053,d-.24);
  }
  function deck(x,z,w,d,c=cream){
    box(c,x,.034,z,w,.063,d);
    for(let u=-w/2+1.5;u<w/2-.2;u+=1.5)box(0xc3bba8,x+u,.068,z,.018,.009,d);
    for(let v=-d/2+2.5;v<d/2-.2;v+=2.5)box(0xc3bba8,x,.068,z+v,w,.009,.018);
  }
  // Freestanding panes show the actual shaded floor, curtains and furnishings
  // behind them, with an inexpensive reflection of the Brickell skyline.
  function glazing(x,z,w,d,bottom,h,style){
    const ceiling=bottom+h,frame=style==='villa'?0x474839:bronze;
    slab(x,bottom+.14,z,w+.22,d+.22,.26);
    slab(x,ceiling-.13,z,w+.30,d+.30,.24);
    box(0xa59479,x,bottom+h/2,z,w*.76,h-.5,d*.53);
    for(const p of clubPanes){
        const {alongX,side,bay:t,index:i,x:cx,z:cz}=p;
        const offset=(alongX?d:w)*side/2, u=alongX?cx-x:cz-z;
        const yaw=alongX?(side>0?0:Math.PI):side*Math.PI/2;
        panes.add(p.paneId,()=>glass.add(plane,0x738e8b,cx,floor+bottom+h/2,cz,t-.06,h-.36,1,0,yaw));
        const frameX=alongX?cx+t/2:cx,frameZ=alongX?cz:cz+t/2;
        box(frame,frameX,bottom+h/2,frameZ,alongX?.068:.13,h-.32,alongX?.13:.068);
        if((i+Number(side>0))%3===0){
          for(let k=0;k<4;k++){
            const seg=u-t*.27+k*.12,off=offset-side*(.30+k%2*.04);
            box(k%2?0xd7c8a8:0xbbae92,x+(alongX?seg:off),bottom+h*.51,z+(alongX?off:seg),
              alongX?.14:.1,h-.52,alongX?.1:.14);
          }
        }
    }
  }
  function shade(x,z,w,d,y){
    for(const side of [-1,1])box(bronze,x+side*(w/2-.09),y,z,.19,.20,d);
    const n=Math.ceil(w/.55);
    for(let i=0;i<=n;i++)box(teak,x-w/2+w*i/n,y+.07,z,.12,.18,d,0,0,-.21);
  }
  function seat(x,z,y=0,yaw=0){
    const local=(c,u,v,l,w,h,d,tilt=0)=>{
      const cs=Math.cos(yaw),sn=Math.sin(yaw);
      box(c,x+cs*u+sn*l,y+v,z-sn*u+cs*l,w,h,d,tilt,yaw);
    };
    local(teak,0,.29,0,.87,.17,1.86);
    local(linen,0,.41,.23,.79,.14,1.20);
    local(0xd8d0bd,0,.63,-.54,.79,.14,.76,-.58);
    for(const u of [-.32,.32])for(const l of [-.66,.66])local(bronze,u,.15,l,.08,.30,.10);
    local(0xb88d68,0,.69,-.59,.64,.13,.29,-.58);
  }
  function bench(x,z){
    box(bronze,x,.29,z,1.72,.48,.43);
    for(let k=0;k<4;k++)box(teak,x,.55,z-.20+k*.135,2.06,.10,.095);
  }
  function umbrella(x,z,scale=1){
    cyl(0xc3b8a0,x,.13,z,.62,.24);
    cyl(bronze,x,1.45*scale,z,.10,2.70*scale);
    const canopy=new THREE.ConeGeometry(1,1,12);
    main.add(canopy,linen,x,floor+2.67*scale,z,1.77*scale,.57*scale,1.77*scale);
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6;
      beam(teak,[x,2.88*scale,z],[x+Math.cos(angle)*1.73*scale,2.40*scale,z+Math.sin(angle)*1.73*scale],.032);
    }
    canopy.dispose();
  }
  function railing(x,y,z,span,alongX){
    for(const p of terracePanes(x,y,z,span,alongX)){
      panes.add(p.paneId,()=>glass.add(plane,0x91afb0,p.x,floor+y+.50,p.z,Math.max(p.w,p.d),.90,1,0,alongX?0:Math.PI/2));
      box(bronze,p.x,y+.13,p.z,.06,.26,.06);
    }
    box(bronze,x,y+.98,z,alongX?span:.05,.052,alongX?.05:span);
  }
  function trough(x,y,z,length,alongX){
    box(0xbbae97,x,y+.245,z,alongX?length:.72,.49,alongX?.72:length);
    for(let k=.24;k<length;k+=.40){
      const d=k-length/2, xx=x+(alongX?d:0),zz=z+(alongX?0:d);
      leaf(k%1>.4?0x779060:0x587448,xx,y+.62,zz,.68,.45,.72,-.13,k);
    }
  }
  addCasaLuma({box,masonry,cyl,beam,leaf,railing,seat,trough,
    pane:(x,y,z,w,h,yaw)=>panes.add(paneKey(x,floor+y,z),()=>glass.add(plane,0x738e8b,x,floor+y,z,w,h,1,0,yaw)),
  });
  for(const p of skylights){
    box(dark,p.x,7.53,p.z,2.4,.27,3.65);
    panes.add(p.paneId,()=>glass.add(plane,0x6b8e90,p.x,floor+7.68,p.z,p.w,p.d,1,-Math.PI/2));
  }
  deck(-25,-390.9,29,19.7);
  shade(-25,-382.8,24.4,2.65,3.79);
  for(const b of shadeColumns)box(bronze,b.x,1.89,b.z,b.w,3.78,b.d);
  for(const x of [-32, -18])for(const z of [-390,-395])seat(x,z,0,x<-25?Math.PI/2:-Math.PI/2);
  // Successive limestone terraces open south. The arcade is a real cut-out
  // profile: the pedestrian loggia has headroom between its individual columns.
  furnishPalazzo({scene,box,masonry,cyl,beam,leaf,
    sill:(p,draw)=>sillStone.add(p.sillPaneId,()=>sillTrim.add(p.sillPaneId,draw)),pane:(x,y,z,width,height,across)=>
    panes.add(paneKey(x,floor+y,z),()=>glass.add(plane,0x839c98,x,floor+y,z,width,height,1,0,across?0:Math.PI/2))});
  function archRow(x,z,count,spacing,r,h,base,depth){
    const shape=new THREE.Shape();
    const left=-count*spacing/2;
    shape.moveTo(left,h);shape.lineTo(left,base);
    for(let i=0;i<count;i++){
      const center=left+(i+.5)*spacing;
      shape.lineTo(center-r,base);
      shape.absarc(center,base,r,Math.PI,0,true);
      shape.lineTo(center+spacing/2,base);
    }
    shape.lineTo(-left,h);shape.closePath();
    const mesh=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:10});
    main.add(mesh,0xd8c6a5,x,floor,z-depth/2);mesh.dispose();
  }
  archRow(25,-433.8,4,6.4,2.90,3.92,.87,.56);
  for(const b of loggiaColumns){
    masonry(limestone,b.x,1.78,b.z,b.w,3.55,b.d);
    masonry(cream,b.x,.13,b.z,.71,.26,.72);
    masonry(cream,b.x,2.06,b.z,.72,.17,.72);
  }
  slab(25,4.0,-435.50,28.2,4.6,.25);
  for(let x=12;x<=38;x+=1.3)box(bronze,x,4.55,-433.29,.048,1.10,.048);
  box(bronze,25,5.06,-433.29,26.4,.07,.06);
  // A pergola and a planted belvedere occupy the two setbacks.
  shade(33.2,-445.4,5.15,7.3,10.12);
  for(const x of [30.8,35.6])for(const z of [-448.7,-442.1])box(bronze,x,9.03,z,.13,2.26,.13);
  seat(32.1,-444.1,7.91);seat(34.25,-444.1,7.91);
  trough(22.4,7.91,-439.95,19.0,true);railing(33.1,7.91,-439.85,5.4,true);
  trough(20.8,4.13,-436.55,13.6,true);
  for(const x of [14.4,28.9]){
    masonry(cream,x,11.13,-446.3,.18,.44,8.63);
  }
  deck(25,-431.15,30,11.8);
  for(const x of [13.9,38.4]){seat(x,-429.5);umbrella(x,-432,.82);}
  // Rounded navy club fascia and a brass-lined breezeway look toward Solana.
  const club=clubSalon;
  glazing(club.x,club.z,club.w,club.d,0,3.99,'club');
  deck(25,-384.5,30,11.0);
  const rounded=(c,x,y,z,w,h,d)=>{
    box(c,x,y,z,w-d,h,d);
    for(const side of [-1,1])cyl(c,x+side*(w-d)/2,y,z,d,h);
  };
  rounded(0x29484a,25,4.14,-390.5,29,.68,12.1);
  rounded(brass,25,3.86,-390.5,29.06,.085,12.16);
  rounded(linen,25,4.51,-390.5,29.14,.12,12.22);
  for(const b of clubColumns){cyl(0xcbbb9f,b.x,1.91,b.z,.48,3.82);cyl(brass,b.x,.13,b.z,.56,.25);}
  for(const x of [15,21,29,35]){
    cyl(teak,x,.76,-383.1,1.14,.09);cyl(bronze,x,.39,-383.1,.12,.72);
    bench(x,-382.25);
  }
  for(const x of [13.8,36.2])umbrella(x,-381,.87);
  function plaque(x,y,z,w,h,title,subtitle,background){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;
    const ink=canvas.getContext('2d');ink.fillStyle=background;ink.fillRect(0,0,768,160);
    ink.textAlign='center';ink.fillStyle='#f2ddae';ink.font='55px Georgia,serif';ink.fillText(title,384,82,722);
    ink.font='20px sans-serif';ink.fillText(subtitle,384,127,700);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    const label=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map}));
    label.position.set(x,floor+y,z);scene.add(label);
  }
  plaque(25,4.15,-384.426,5.7,.62,'L A N T E R N','P R I V A T E   Y A C H T   C L U B','#254044');
  for(const [x,z,name,subtitle] of [[-12.9,-378.9,'Casa de Luma','P A T I O   R E S I D E N C E'],[37.5,-425.3,'Palazzo Mare','L A N T E R N   P O I N T']]){
    masonry(limestone,x,.67,z,3.12,1.34,.58);
    plaque(x,.73,z+.301,2.28,.52,name,subtitle,'#47493b');
  }
  const ripples=new THREE.PlaneGeometry().rotateX(-Math.PI/2);
  for(const p of pools){
    const {x,z,w,d}=p;
    if(p.reflecting)deck(x,z,w+2.6,d+2.3);
    box(limestone,x,.108,z,w+.48,.11,d+.48);
    box(0x408781,x,.164,z,w+.05,.025,d+.05);
    const uv=ripples.attributes.uv.clone();
    for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/4,uv.getY(i)*d/4);
    ripples.setAttribute('batchUv',uv);
    water.add(ripples,p.color,x,floor+.185,z,w,1,d);
    if(!p.reflecting){
      const edge=x+w*.5;
      for(const offset of [-.30,.30]){
        beam(brass,[edge+.32,.10,z+offset],[edge+.32,.78,z+offset],.042);
        beam(brass,[edge+.32,.78,z+offset],[edge-.18,.72,z+offset],.042);
        beam(brass,[edge-.18,.72,z+offset],[edge-.18,.19,z+offset],.042);
      }
    }
  }
  // Two folded bronze sails terminate the axial view of the west parterre.
  cyl(0xb6ac96,-25,.29,-443,1.61,.37);
  for(const [color,pts] of [[0xb09462,[[-25.6,.44,-443.8],[-25.14,3.85,-443.5],[-24.8,.44,-442.3]]],
    [0x4e7a73,[[-25.3,.46,-443.7],[-24.45,3.12,-442.85],[-24.22,.46,-442.0]]]]){
    const a=pts.map(p=>new THREE.Vector3(...p)),middle=a[0].clone().lerp(a[2],.53);middle.x+=.36;
    const poly=new THREE.BufferGeometry().setFromPoints([a[0],middle,a[1],a[1],middle,a[2],a[1],middle,a[0],a[2],middle,a[1]]);
    poly.computeVertexNormals();main.add(poly,color,0,floor,0);poly.dispose();
  }
  const crowns=new Batch();
  for(const b of hedges){
    box(0x425e46,b.x,.36,b.z,b.w,.68,b.d);
    const alongX=b.w>b.d,length=Math.max(b.w,b.d);
    for(let k=-length/2+.35;k<length/2;k+=.67){
      crowns.add(sphere,0x657942,b.x+(alongX?k:0),floor+.66,b.z+(alongX?0:k),1,.43,1,.12,k);
    }
  }
  const foliage=crowns.mesh(scene,breezeMaterial('shrub',{vertexColors:true}));
  const positions=foliage.geometry.attributes.position;
  foliage.geometry.setAttribute('windFlex',new THREE.Float32BufferAttribute(Array.from({length:positions.count},(_,i)=>
    THREE.MathUtils.smoothstep(positions.getY(i)-floor,.46,.86)),1));
  foliage.name='Sheltered hedge foliage';
  addClubBurgees(scene,main,floor);
  for(const {x,z} of planters){
    main.add(pot,0xb6a589,x,floor+.48,z,1.32,.96,1.32);
    cyl(0x594f3b,x,.98,z,1.17,.05);
    for(let k=0;k<13;k++){
      const a=k*2.399,dx=Math.cos(a),dz=Math.sin(a),sz=k%4/4;
      leaf(k%2?0x486d4e:0x738a5b,x+dx*.32,1.43+sz*.28,z+dz*.32,.23,1.11+sz*.38,.28,.64*dz,0,-.64*dx);
    }
  }
  for(const x of [-31,-19])for(const z of [-451,-435])bench(x,z);
  // Flush teak landing at the head of Solana's starboard gangway. The eastern
  // platform leaves stopping room and keeps the hull and swim ladder clear.
  for(const deck of [berthing.landing,berthing.lip]){
    box(0x755e49,(deck.west+deck.east)/2,-.073,(deck.north+deck.south)/2,deck.east-deck.west,.178,deck.south-deck.north);
    for(let z=deck.north+.095;z<deck.south;z+=.19)
      box(Math.round(z*100)%3?0xad8863:0xb28c69,(deck.west+deck.east)/2,.024,z,deck.east-deck.west,.043,.181);
  }
  for(const z of [-381.2,-371.0]){
    box(0x52615c,66.78,.28,z,.18,.57,.22);
    cyl(brass,66.78,.58,z,.30,.09);
    box(0xb2a78f,62.45,.59,z,.38,1.12,.38);
    box(0xefe4bc,62.45,1.13,z,.31,.14,.31);
  }
  function tender(x,z,c,isSail){
    // A waterline chine, flared bow and flat transom describe each moored hull.
    const sections=[[-3,.68],[-2.1,.96],[.6,1],[2.12,.66],[3.35,.05]];
    const vertices=[];
    const tri=(a,b,c)=>vertices.push(...a,...b,...c);
    for(let i=0;i<sections.length-1;i++){
      const [u,v]=sections[i],[s,t]=sections[i+1];
      tri([u,.36,-v],[s,.36,t],[s,.36,-t]);tri([u,.36,-v],[u,.36,v],[s,.36,t]);
      for(const side of [-1,1]){
        const a=[u,.36,v*side],b=[u,-.35,v*.65*side],d=[s,.36,t*side],e=[s,-.35,t*.65*side];
        if(side>0){tri(a,d,b);tri(b,d,e);}else{tri(a,b,d);tri(b,e,d);}
      }
    }
    tri([-3,.36,-.68],[-3,-.35,-.44],[-3,.36,.68]);tri([-3,.36,.68],[-3,-.35,-.44],[-3,-.35,.44]);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
    main.add(g,c,x,.09,z);g.dispose();
    box(linen,x-.37,-.30,z,3.95,.13,1.54);
    box(isSail?cream:0xd2bc9a,x+.05,-.12,z,2.19,.30,1.30);
    if(isSail){
      cyl(bronze,x+.32,2.94,z,.075,6.78);
      beam(bronze,[x+.32,.49,z],[x-2.08,.49,z],.075);
      for(const end of [-2.7,2.95])beam(0x8c9290,[x+.32,6.18,z],[x+end,-.28,z],.029);
      for(const side of [-1,1])beam(0x8c9290,[x+.32,4.36,z],[x-.1,-.27,z+side*.92],.026);
      box(0x536c72,x-.78,.54,z,2.35,.22,.18);
    }else{
      box(0x4b686b,x+.18,.16,z,1.35,.48,1.26);
      box(linen,x+.15,.46,z,1.70,.12,1.48);
      box(teak,x-1.65,-.22,z,.61,.28,1.12);
    }
  }
  tender(-63,-439.15,0x537079,true);tender(-63.4,-429.9,0xa46f52,false);
  const stoneMap=new THREE.TextureLoader().load('./avenue-limestone.webp');
  // Sunlit tiled pool finish with a seamless, crossed network of small caustics.
  const poolCanvas=document.createElement('canvas');poolCanvas.width=poolCanvas.height=192;
  const ink=poolCanvas.getContext('2d'),pixels=ink.createImageData(192,192);
  for(let j=0;j<192;j++)for(let i=0;i<192;i++){
    const a=i*Math.PI/96,b=j*Math.PI/96,k=(j*192+i)*4;
    const f=Math.sin(3*a+.8*Math.sin(2*b))+.83*Math.cos(4*b+.63*Math.sin(2*a));
    const g=Math.sin(4*b+.7*Math.cos(2*a))+.70*Math.sin(3*a+.46*Math.cos(4*b));
    const light=29*Math.exp(-17*f*f)+20*Math.exp(-21*g*g)-(i%32===0||j%32===0?9:0);
    pixels.data.set([146+light,201+light,204+light,255],k);
  }
  ink.putImageData(pixels,0,0);
  const waterMap=new THREE.CanvasTexture(poolCanvas);
  for(const map of [stoneMap,waterMap]){map.wrapS=map.wrapT=THREE.RepeatWrapping;map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;}
  const trimMesh=main.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true}));trimMesh.userData.impactSurface='solid';
  const stoneMesh=stone.mesh(scene,new THREE.MeshStandardMaterial({map:stoneMap,vertexColors:true,roughness:.84}));stoneMesh.userData.impactSurface='solid';
  const updateGlass=panes.bind(glass.mesh(scene,alpineGlass(sky,{transparent:true,opacity:.62,depthWrite:false,side:THREE.DoubleSide}),false));
  water.mesh(scene,new THREE.MeshPhongMaterial({map:waterMap,vertexColors:true,shininess:90,specular:0xa6cac0}),false);
  for(const g of [cube,plane,drum,sphere,pot,ripples])g.dispose();
  const updateStone=sillStone.bind(stoneMesh),updateTrim=sillTrim.bind(trimMesh);
  return doors=>{updateGlass(doors?.brokenPanes);updateStone(doors?.brokenSills);updateTrim(doors?.brokenSills);};
}
