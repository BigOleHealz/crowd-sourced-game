import {skyDarkness} from './road-lighting.js';
import {coastProfile,mangroveKeys} from './offshore-keys.js';
import * as THREE from 'three';

// Each waterfront is outside the playable district. In local metres, u follows
// the waterfront and v points inland. Breaks between the landforms open onto
// Biscayne Bay; the near mangrove keys and the mainland have separate contours.
const waterfronts=[
  // origin x,z; inland direction; frontage, inland depth; development and seed
  [130,-11,1,0,146,94,'condos',17],
  [166,-201,1,0,160,90,'beach',45],
  [244,-38,1,0,310,106,'downtown',81],
  [-110,-49,-1,0,273,88,'condos',22],
  [-141,-230,-1,0,144,84,'beach',67],
  [-223,-123,-1,0,362,95,'downtown',39],
  [-28,131,0,1,201,88,'condos',63],
  [18,245,0,1,285,86,'downtown',92],
  [-3,-548,0,-1,219,105,'condos',73],
  [14,-666,0,-1,284,96,'downtown',33],
];
const randFrom=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const fogColor=new THREE.Color(0xbad2dc);
const skyLight=new THREE.Vector3(-.61,.69,-.39).normalize();
const color=c=>new THREE.Color(c);
const glassTints=[0x94c1c3,0x93a7b2,0xa4b9c6,0xb3d0c5,0x88a9bf];
const stoneTints=[0xeadbc7,0xdab795,0xddbeb2,0xe8e3d0,0xc4d0c8];
function material(facades){
  const foliage=new THREE.TextureLoader().load('./coastal-canopies.webp');
  foliage.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.ShaderMaterial({
    uniforms:{skyDarkness,mist:{value:fogColor},sun:{value:skyLight},facades:{value:facades},foliage:{value:foliage}},
    vertexShader:`
      attribute vec3 color;
      attribute float style;
      varying vec2 tile;varying float kind;varying vec3 tint,pos,norm;
      void main(){tile=uv;kind=style;tint=color;pos=position;norm=normal;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
    `,
    fragmentShader:`
      uniform float skyDarkness; uniform sampler2D facades,foliage;uniform vec3 mist,sun;
      varying vec2 tile;varying float kind;varying vec3 tint,pos,norm;
      void main(){
        vec3 n=normalize(norm),v=normalize(cameraPosition-pos);
        float distanceToEye=length(cameraPosition-pos);
        vec3 albedo=tint;
        if(kind>.5){
          // The photograph supplies window interiors/sky reflections at the
          // correct per-storey scale. UVs follow the actual corner or curve.
          vec2 island=kind<1.5?vec2(0.,.5):kind<2.5?vec2(.5,.5):vec2(.5,0.);
          vec2 repeatSize=kind<1.5?vec2(4.,3.):kind<2.5?vec2(5.,6.):vec2(3.,3.);
          vec2 f=fract(tile/repeatSize);
          vec3 photo=texture2D(facades,island+.007+.486*f).rgb;
          float pane=.5+.5*sin(dot(floor(tile),vec2(2.7,5.13)));
          albedo*=mix(vec3(.66),photo,kind<1.5?.83:.81);
          albedo*=.94+.085*pane;
          if(kind>1.5 && kind<2.5){
            vec3 r=reflect(-v,n);
            float fresnel=.09+.30*pow(1.-abs(dot(v,n)),2.);
            albedo=mix(albedo,vec3(.34,.56,.65)*(.85+.14*sin(r.x*7.+r.z*3.)),fresnel);
          }
        }
        float sunFace=max(0.,dot(n,sun));
        vec3 lit=albedo*(vec3(.48,.57,.63)+vec3(.77,.72,.55)*sunFace);
        if(kind<-.5){
          vec4 leaves=texture2D(foliage,tile);
          if(leaves.a<.38)discard;
          lit=leaves.rgb*tint;
        }
        float haze=1.-exp(-.0000067*distanceToEye*distanceToEye);
        lit=mix(lit,mist,min(.94,haze));
        lit*=mix(vec3(1.),vec3(.10,.15,.24),skyDarkness);
        if(kind>.5 && kind<2.5)lit+=skyDarkness*vec3(.22,.15,.06)*step(.80,fract(sin(dot(floor(tile*3.),vec2(2.7,5.1)))*312.1))*step(.5,fract(tile.y*3.));
        gl_FragColor=vec4(lit,1.);
        #include <colorspace_fragment>
      }`,
  });return mat;
}

// One indexed mesh per district contains architecture, foliage and coast. This
// keeps side streets/fragments behind the camera out of the render submission.
export function addBrickellHorizon(scene,facades){
  const horizon=new THREE.Group();horizon.name='Biscayne Bay skyline';scene.add(horizon);
  const surface=material(facades);
  const diamond=[[-.27,-.5],[.27,-.5],[.5,-.27],[.5,.27],[.27,.5],[-.27,.5],[-.5,.27],[-.5,-.27]];
  const rectangle=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
  const oval=Array.from({length:14},(_,i)=>[.5*Math.cos(i*Math.PI/7),.5*Math.sin(i*Math.PI/7)]);
  function district(x0,z0,ix,iz,length,depth,use,seed){
    const random=randFrom(seed),positions=[],normals=[],uv=[],colors=[],style=[],indices=[];
    const leaves=randFrom(seed*6151+29);
    const alongX=-iz,alongZ=ix, land=use==='key', start=-length/2,end=length/2;
    // Joined shore sections vary in shape and setback as seen from the street
    // and above. Headlands taper naturally back towards the inland edge.
    const phase=seed*1.733;
    const {line,slices}=coastProfile(length,depth,seed,land);
    const world=(u,h,v)=>[x0+alongX*u+ix*v,h,z0+alongZ*u+iz*v];
    function polygon(points,tint,kind=0,coords){
      const count=points.length, offset=positions.length/3;
      const p=points[0],a=points[1],b=points[2];
      const ax=a[0]-p[0],ay=a[1]-p[1],az=a[2]-p[2],bx=b[0]-p[0],by=b[1]-p[1],bz=b[2]-p[2];
      let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;const inv=1/(Math.hypot(nx,ny,nz)||1);
      nx*=inv;ny*=inv;nz*=inv;const c=color(tint);
      for(let i=0;i<count;i++){
        positions.push(...points[i]);normals.push(nx,ny,nz);colors.push(c.r,c.g,c.b);style.push(kind);uv.push(...(coords?.[i]??[0,0]));
        if(i>=2)indices.push(offset,offset+i-1,offset+i);
      }
    }
    function ring(u,v,w,d,shape,angle=0){
      const c=Math.cos(angle),s=Math.sin(angle);
      return shape.map(([a,b])=>[u+a*w*c-b*d*s,v+a*w*s+b*d*c]);
    }
    function mass(outline,bottom,top,tint,kind=0){
      // (u,v) has an upward-facing basis. Side triangles face outwards,
      // and the complete roof is visible from a climbing helicopter.
      const roof=outline.map(([u,v])=>world(u,top,v));polygon(roof,tint);
      for(let j=0;j<outline.length;j++){
        const next=(j+1)%outline.length,[u,v]=outline[j],[uu,vv]=outline[next];
        const width=Math.hypot(uu-u,vv-v),height=top-bottom;
        polygon([world(u,bottom,v),world(uu,bottom,vv),roof[next],roof[j]],tint,kind,
          [[0,0],[width/2,0],[width/2,height/2.82],[0,height/2.82]]);
      }
    }
    const box=(u,v,w,d,bottom,top,tint,kind=0)=>mass(ring(u,v,w,d,rectangle),bottom,top,tint,kind);
    function tree(u,v,height,radius){
      // Keep the architecture RNG sequence independent of added botanical variation.
      const swatch=Math.floor(random()*4);
      const rotation=leaves()*Math.PI,spread=land?1.6:1.0;
      const clump=Math.sin((u-start)*.22+seed);
      u+=(land?2.8:1.5)*clump+(leaves()-.5)*spread*2;
      v+=(leaves()-.5)*spread;
      const base=land?1.02:1.26,tip=height+radius*(.33+leaves()*.37);
      const width=radius*(1.03+leaves()*.45), lean=(leaves()-.5)*width*.52;
      // Fixed crossing planes lean away from the same roots. Side and aerial
      // views retain depth and the crowns move against the distant buildings.
      const column=swatch%2,row=1-Math.floor(swatch/2);
      const shade=new THREE.Color().setRGB(.77+leaves()*.24,.84+leaves()*.16,.75+leaves()*.20);
      for(let j=0;j<3;j++){
        const angle=rotation+j*Math.PI/3,c=Math.cos(angle),s=Math.sin(angle);
        const topU=u+lean-s*width*.30,topV=v+c*width*.30;
        const points=[world(u-c*width,base,v-s*width),world(u+c*width,base,v+s*width),
          world(topU+c*width,tip,topV+s*width),world(topU-c*width,tip,topV-s*width)];
        const left=(column+(j%2 ? .992 : .008))/2,right=(column+(j%2 ? .008 : .992))/2;
        const bottom=(row+.008)/2,top=(row+.992)/2;
        const coords=[[left,bottom],[right,bottom],[right,top],[left,top]];
        polygon(points,shade,-1,coords);
        polygon(points.reverse(),shade,-1,coords.reverse());
      }
    }
    function palm(u,v,h){
      const lean=.20+random()*.57,top=world(u+lean,h,v);
      const base=ring(u,v,.28,.28,diamond),neck=ring(u+lean,v,.20,.20,diamond);
      for(let j=0;j<base.length;j++){
        const k=(j+1)%base.length;
        polygon([world(base[j][0],.55,base[j][1]),world(base[k][0],.55,base[k][1]),
          world(neck[k][0],h,neck[k][1]),world(neck[j][0],h,neck[j][1])],0x897b5d);
      }
      for(let j=0;j<6;j++){
        const a=j*Math.PI/3+phase+(leaves()-.5)*.37,length=h*(.28+.12*leaves());
        const dx=Math.cos(a),dz=Math.sin(a);
        const mid=world(u+lean+dx*length*.48,h+.25,v+dz*length*.48);
        const leaf=world(u+lean+dx*length,h-.32-leaves()*.72,v+dz*length);
        const side=world(u+lean+dx*length*.48-dz*.32,h+.05,v+dz*length*.48+dx*.32);
        const other=world(u+lean+dx*length*.48+dz*.32,h+.05,v+dz*length*.48-dx*.32);
        polygon([top,other,mid],0x647953);polygon([top,mid,side],0x75865a);
        polygon([mid,other,leaf],0x597150);polygon([mid,leaf,side],0x617857);
      }
    }
    const sections=slices.length-1;
    const groundTints=land?[0xa49673,0xcfbc94,0xb7aa7e,0x788761]:[0x998c74,0xd0bc9a,0x9a9e7b,0xa5aa88];
    for(let i=0;i<sections;i++){
      const a=slices[i],b=slices[i+1];
      for(let j=0;j<4;j++)polygon([world(...a[j]),world(...b[j]),world(...b[j+1]),world(...a[j+1])],groundTints[j]);
      if(i===0||i===sections-1){
        const c=i===0?a:b,back=c.at(-1);
        const pts=[world(...c[0]),world(...back),world(back[0],-.55,back[2])];
        polygon(i===0?pts:pts.reverse(),0x8c8769);
      }
    }
    if(land){
      for(let i=0;i<length*.56;i++){
        const u=(random()-.5)*(length-11),v=line(u)+2.9+random()*Math.max(2,(depth-line(u))*.53);
        tree(u,v,2.25+random()*1.6,1.35+random()*1.7);
      }
      for(let i=0;i<Math.ceil(length/23);i++){
        const u=(random()-.5)*(length-12);palm(u,line(u)+4.2,4.6+random()*2.4);
      }
    }else{
      const waterfrontLine=u=>line(u)+5;
      for(let i=0;i<sections;i++){
        const u=start+length*i/sections,uu=start+length*(i+1)/sections,v=waterfrontLine(u),vv=waterfrontLine(uu);
        polygon([world(u,1.38,v),world(uu,1.38,vv),world(uu,1.38,vv+2.8),world(u,1.38,v+2.8)],0xc6b69b);
        if(i>1&&i<sections-2 && i%2===0)palm(u,v+2.3,4.2+random()*1.4);
      }
      if(use!=='downtown'){
        // Limestone seawall, timber fingers, and moored cabin cruisers give
        // the coast a readable waterline and human-scale features from above.
        const wharf=-length*.18, near=line(wharf);
        box(wharf,near-3,24,1.30,-.12,.56,0xb1a78e);
        for(let u=wharf-11;u<wharf+12;u+=5.4){
          box(u,near-6,1.09,6.4,-.06,.45,0x96846c);
          box(u,near-9,.24,.24,-.13,1.02,0x766754);
          const boat=ring(u+2,near-6.1,1.25,4.05,diamond,.06);
          mass(boat,-.11,.43,0xc8c6b6);
          box(u+2,near-5.78,.88,1.87,.43,.81,0x647c7c);
          box(u+2,near-5.90,.98,1.91,.79,.91,0xe9dfcc);
        }
      }
      const frontCount=Math.max(3,Math.floor(length/(use==='downtown'?26:22)));
      for(let i=0;i<frontCount;i++){
        const u=start+(i+.5)*length/frontCount,v=line(u)+14+random()*5;
        const w=11+random()*6,d=8+random()*4,h=use==='beach'?4+random()*5:6+random()*6;
        box(u,v,w,d,1.26,h,stoneTints[i%5],3);box(u,v,w+.48,d+.55,h,h+.27,0xdcccb5);
        if(i%3===1){
          box(u,v-d*.43,w*.68,d*.53,1.28,h*.54,0xe2d8bd,2);
          box(u,v-d*.43,w*.75,d*.62,h*.54,h*.54+.23,0xe0dacb);
        }else if(i%3===2){
          box(u+w*.23,v-.35,w*.48,d*.70,h+.22,h+2.32,0xc6cdc5,1);
        }
        box(u-w*.36,v-d*.61,w*.20,d*.17,1.29,1.36,0x62a4a0);
        box(u+1.2,v+.7,w*.48,d*.56,h+.27,h+1.24,0xb4b6ac);
        tree(u-w*.56,v-1,3.5+random()*1.2,1.6+random());
      }
      for(let i=0;i<length/3.6;i++){
        const u=start+4+random()*(length-8),v=line(u)+22.5+random()*4;
        tree(u,v,2.9+random()*1.25,1.5+random()*1.10);
      }
      if(use==='condos'){
        // Lowering terraces on the bay side of the podium create a broad,
        // horizontal silhouette in front of the taller apartment slabs.
        const u=length*.27,v=line(u)+22;
        for(let level=0;level<4;level++){
          const w=19-level*2.35,d=12-level*1.45,y=1.3+level*3.15;
          box(u,v+level*.63,w,d,y,y+2.98,0xd7bda2,1);
          box(u,v+level*.63,w+.92,d+.93,y+2.98,y+3.15,0xe8dfc8);
        }
      }
      const count=Math.max(4,Math.floor(length/(use==='downtown'?20:25)));
      for(let i=0;i<count;i++){
        const u=start+(i+.5)*length/count+(random()-.5)*4,v=33+random()*18;
        const floor=1.35, w=10.5+random()*6.7,d=9.3+random()*6.5;
        const type=(i+seed)%6, angle=(random()-.5)*.20;
        const variation=.5+.5*Math.sin(i*2.63+phase);
        const h=use==='downtown'?39+variation*38+random()*20:use==='beach'?12+variation*16:22+variation*28+random()*9;
        const stone=stoneTints[(i+seed)%5],glaze=glassTints[(i*2+seed)%5];
        const shape=type===1||type===5?diamond:type===2?oval:rectangle;
        const footprint=(scale=1,du=0,dv=0)=>ring(u+du,v+dv,w*scale,d*scale,shape,angle);
        const stoneFacade=type===0||type===2||type===5,skin=stoneFacade?1:2;
        const tint=stoneFacade?stone:glaze;
        mass(footprint(1.16),floor,5.5,stone,3);
        mass(footprint(),5.5,h,tint,skin);
        if(stoneFacade){
          // Three-dimensional wraparound slab edges stay visible on the far
          // face of a rounded tower and break up its side profile in silhouette.
          for(let y=8.35;y<h-.4;y+=5.66)mass(footprint(1.055),y,y+.32,stone);
        }else{
          for(const edge of [-1,1])box(u+edge*w*.47,v,w*.045,d*1.02,5.5,h+.80,0xc0cbc7);
          if(type===3)mass(footprint(.98),h*.76,h*.76+.53,0xb5c3c4);
        }
        // Vary crowns, setback penthouses, cores and mechanical enclosures.
        mass(footprint(1.025),h-.15,h+.29,stone);
        if(type===0||type===2){
          mass(footprint(.78,0,.60),h+.28,h+3.45,stone,1);
          mass(footprint(.58,-.23,1.01),h+3.45,h+4.59,0xc5d0c7);
        }else if(type===1||type===3){
          mass(footprint(.85,.57,0),h+.29,h+4.5,glaze,2);
          mass(footprint(.66,.97,.2),h+4.50,h+7.5,glaze,2);
          box(u+w*.24,v+.30,.30,.34,h+7.5,h+10.4,0x96a5a4);
        }else{
          box(u,v+.5,w*.45,d*.58,h+.28,h+2.65,0xa9b4b2);
          box(u-w*.31,v,.43,d*.82,h+.28,h+4.15,stone);
        }
        if(type===4){
          // A sail-shaped crown steps off the flat mechanical roof. Opaque
          // side returns and the roof walk stay visible through its lattice.
          const pv=v-d*.40;
          const frame=[world(u-w*.44,h,pv),world(u+w*.45,h,pv),world(u+w*.45,h+8.2,pv)];
          polygon(frame,glaze,2,[[0,0],[w/2,0],[w/2,3]]);
          polygon([...frame].reverse(),glaze);
          for(let j=0;j<5;j++){
            const frac=(j+1)/5;
            box(u-w*.43+frac*w*.85,pv,.20,.28,h,h+frac*8.1,0xe2dad0);
          }
        }
        if(use!=='beach'&&i%3===1){
          const offset=v+24;
          box(u+3,offset,w*.81,d*.72,1.3,h*.78,glaze,2);
          box(u+3,offset,w*.66,d*.54,h*.78,h*.78+2.2,0xbac3bd);
        }
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geo.setAttribute('style',new THREE.Float32BufferAttribute(style,1));
    geo.setIndex(indices);geo.computeBoundingSphere();
    const mesh=new THREE.Mesh(geo,surface);mesh.name=use+' waterfront '+seed;
    horizon.add(mesh);
  }
  for(const coast of waterfronts)district(...coast);
  for(const key of mangroveKeys)district(...key);
}
