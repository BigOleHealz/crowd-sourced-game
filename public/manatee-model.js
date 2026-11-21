import * as THREE from 'three';

// Metres, with the snout at negative Z. Closely spaced sections describe the
// blunt head, the fold behind the flippers and the taper into the tail stock.
const body=[
  [-1.48,.012,.016,.008],[-1.42,.115,.105,-.011],[-1.31,.177,.142,-.003],
  [-1.19,.202,.172,.015],[-1.03,.221,.213,.023],[-.83,.277,.246,.015],
  [-.65,.348,.306,-.018],[-.39,.421,.354,-.035],[-.14,.462,.391,-.039],
  [.13,.464,.400,-.045],[.40,.404,.363,-.039],[.65,.336,.295,-.018],
  [.88,.246,.221,.002],[1.04,.181,.163,.013],[1.19,.124,.100,.015],
  [1.34,.082,.062,.018],[1.37,.008,.015,.017],
];
const tail=[
  [0,.072,.063,0],[.08,.143,.097,.007],[.24,.125,.068,.011],
  [.40,.205,.052,.007],[.54,.294,.044,.003],[.68,.347,.041,0],
  [.80,.322,.035,-.008],[.91,.220,.028,-.013],[.98,.010,.011,-.018],
];
const flipper=[
  [0,.036,.044,0],[.085,.086,.063,-.014],[.20,.100,.054,-.014],
  [.34,.102,.043,-.028],[.46,.071,.031,-.063],[.55,.035,.021,-.105],[.59,.007,.007,-.129],
];
const tau=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
function colorFor(z,s,x,base){
  const top=Math.max(0,s),belly=Math.max(0,-s);
  const mottles=.94+.058*Math.sin(z*12.5+x*13.4)*Math.sin(x*18.7-z*7.6)+.045*Math.sin(z*28.4+4*s);
  const glow=base*(mottles-.13*top+.105*belly);
  const algae=top*.035*Math.max(0,Math.sin(z*8+x*20));
  return [glow*(1+algae*.3),glow*(.985+algae),glow*(.948-algae*.7)];
}
function spline(a,b,c,d,t){
  const t2=t*t,t3=t2*t;
  return .5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t2+(3*b-a-3*c+d)*t3);
}
function geometry(){
  const positions=[],colors=[],uv=[],indices=[];
  function loft(sections,steps,around,tone=1,offset=[0,0,0],fold=0){
    const origin=positions.length/3;
    const length=sections.length-1,tip=(sections[0][0]+sections.at(-1)[0])*.5;
    for(let ring=0;ring<=length*steps;ring++){
      const at=ring/steps,i=Math.min(length-1,Math.floor(at)),t=at-i;
      const a=sections[Math.max(0,i-1)],b=sections[i],c=sections[i+1],d=sections[Math.min(i+2,length)];
      const z=lerp(b[0],c[0],t),rx=Math.max(.003,spline(a[1],b[1],c[1],d[1],t));
      const ry=Math.max(.003,spline(a[2],b[2],c[2],d[2],t)),cy=spline(a[3],b[3],c[3],d[3],t);
      for(let k=0;k<=around;k++){
        const f=k/around,angle=tau*f,cs=Math.cos(angle),sn=Math.sin(angle);
        let x=rx*cs,y=cy+ry*sn;
        if(fold){
          // Skin gathers across the neck and at the base of each flipper.
          const shoulder=Math.exp(-((z+.66)**2)/.024),crease=.023*fold*shoulder*Math.sin(z*53+cs*1.55);
          x+=cs*crease;y+=sn*crease;
        }
        positions.push(x+offset[0],y+offset[1],z+offset[2]);
        colors.push(...colorFor(z+offset[2],sn,x+offset[0],tone));
        uv.push(f,.5+(z-tip)*.52);
        if(k===around || ring===length*steps)continue;
        const n=origin+ring*(around+1)+k,next=n+around+1;
        indices.push(n,n+1,next,n+1,next+1,next);
      }
    }
  }
  function ellipsoid(x,y,z,sx,sy,sz,tone){
    const sections=Array.from({length:9},(_,i)=>{
      const a=Math.PI*i/8,radial=Math.sin(a);
      return [-sz*Math.cos(a),sx*radial,sy*radial,0];
    });
    loft(sections,1,12,tone,[x,y,z]);
  }
  function finish(){
    const mesh=new THREE.BufferGeometry();
    mesh.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    mesh.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    mesh.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    mesh.setIndex(indices);mesh.computeVertexNormals();mesh.computeBoundingSphere();
    return mesh;
  }
  return {loft,ellipsoid,finish};
}

function parts(high){
  const torso=geometry(),paddle=geometry(),arm=geometry();
  torso.loft(body,high?3:1,high?32:15,1,[0,0,0],high?1:0);
  paddle.loft(tail,high?3:1,high?26:13,1.01);
  arm.loft(flipper,high?3:1,high?20:12,.91);
  if(high){
    for(const side of [-1,1]){
      torso.ellipsoid(side*.073,-.019,-1.379,.110,.092,.138,1.07);
      torso.ellipsoid(side*.053,.071,-1.474,.029,.016,.028,.29);
      torso.ellipsoid(side*.190,.095,-1.169,.029,.026,.031,.68);
      torso.ellipsoid(side*.208,.099,-1.177,.020,.018,.020,.20);
      torso.ellipsoid(side*.217,.107,-1.184,.008,.007,.007,.65);
      // Sparse muzzle specks follow the two rounded pads.
      for(let i=0;i<5;i++)torso.ellipsoid(side*(.044+i*.017),-.032-i%2*.026,
        -1.509+i*.007,.0065,.0065,.0065,.54);
    }
    torso.ellipsoid(0,-.069,-1.484,.012,.018,.018,.52);
  }
  return {torso:torso.finish(),tail:paddle.finish(),fin:arm.finish()};
}

function skinGrain(){
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=256;
  const ink=canvas.getContext('2d');
  ink.fillStyle='#d6d9d3';ink.fillRect(0,0,256,256);
  let n=397;
  const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
  for(let i=0;i<2900;i++){
    ink.fillStyle=i%3?'#777d6d5d':'#e4e6d868';
    ink.fillRect(random()*256,random()*256,.5+random()*1.6,.5+random()*3.2);
  }
  for(let i=0;i<22;i++){
    const x=random()*256,y=random()*256,r=8+random()*28;
    const patch=ink.createRadialGradient(x,y,0,x,y,r);
    patch.addColorStop(0,i%3?'#5e674d3b':'#cbcdc947');patch.addColorStop(1,'#6d665700');
    ink.fillStyle=patch;ink.fillRect(x-r,y-r,2*r,2*r);
  }
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;
  return map;
}

export function manateeAssets(){
  return {high:parts(true),low:parts(false),map:skinGrain()};
}

export function manateeMaterial(assets,tint,waterline,clock){
  const material=new THREE.MeshStandardMaterial({
    color:tint,map:assets.map,vertexColors:true,roughness:.49,transparent:true,depthWrite:true,
  });
  // Project the depth of submerged fragments to the same viewing ray at the
  // surface. The existing opaque bay remains in place, and nearby dock planks
  // and boat hulls still write closer depth over the animal.
  material.onBeforeCompile=shader=>{
    shader.uniforms.manateeWaterline={value:waterline};
    shader.uniforms.manateeTime=clock;
    const common='uniform float manateeWaterline; varying vec3 manateePoint;\n';
    shader.vertexShader=common+shader.vertexShader.replace('#include <project_vertex>',`
      #include <project_vertex>
      manateePoint=(modelMatrix*vec4(transformed,1.)).xyz;
      if(manateePoint.y<manateeWaterline+.014 && cameraPosition.y>manateeWaterline+.20){
        float plane=manateeWaterline+.014-.007*clamp(manateeWaterline-manateePoint.y,0.,1.);
        float k=(cameraPosition.y-plane)/max(.0001,cameraPosition.y-manateePoint.y);
        vec3 projected=mix(cameraPosition,manateePoint,k);
        gl_Position=projectionMatrix*viewMatrix*vec4(projected,1.);
      }
    `);
    shader.fragmentShader=common+'uniform float manateeTime;\n'+shader.fragmentShader.replace('#include <opaque_fragment>',`
      vec3 along=normalize(cameraPosition-manateePoint);
      float depth=max(0.,manateeWaterline-manateePoint.y);
      float submerged=smoothstep(-.025,.040,manateeWaterline-manateePoint.y);
      float optical=depth/max(.29,along.y);
      float clarity=exp(-.44*optical);
      float speckle=sin(dot(manateePoint.xz,vec2(4.0,3.7))+manateeTime*1.36);
      vec3 tint=vec3(.042,.109,.108);
      outgoingLight=mix(outgoingLight,mix(tint,outgoingLight*.93,clarity)+vec3(.014,.029,.025)*speckle,submerged);
      float wave=.013*sin(dot(manateePoint.xz,vec2(2.2,-1.4))-manateeTime*2.1);
      float meniscus=exp(-abs(manateePoint.y-manateeWaterline-wave)*40.);
      outgoingLight+=vec3(.045,.081,.075)*meniscus*(.5+.45*speckle);
      float distanceFade=1.-smoothstep(35.,52.,distance(cameraPosition,manateePoint));
      diffuseColor.a*=distanceFade*mix(1.,.21+.69*clarity,submerged);
      #include <opaque_fragment>
    `);
  };
  material.customProgramCacheKey=()=>'coastal-manatee';
  return material;
}
