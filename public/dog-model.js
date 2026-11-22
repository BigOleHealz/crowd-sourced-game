import * as THREE from 'three';

const coats={
  spaniel:{base:0xd6c6a4,under:0xe3d3af,patch:0x8e482b,deep:0x583723,muzzle:0xc4a47e,collar:0x27776c,scale:[1,.94,1.03]},
  retriever:{base:0xc79a62,under:0xead3a3,patch:0xad7f48,deep:0x835f3e,muzzle:0xd7b886,collar:0x446f86,scale:[1.08,1.01,1.07]},
  shepherd:{base:0xb98755,under:0xcba37c,patch:0x544b41,deep:0x37352e,muzzle:0x5b5145,collar:0x874e39,scale:[.99,1.05,1.03]},
};
const joint=(parent,x,y,z)=>{const o=new THREE.Group();o.position.set(x,y,z);parent.add(o);return o;};
const tau=2*Math.PI,smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
const col=new THREE.Color(),second=new THREE.Color();
const blend=(a,b,t)=>col.setHex(a).lerp(second.setHex(b),t).getHex();
const gloss=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.39});
let furMaterial;
function fur(){
  if(!furMaterial){
    const texture=new THREE.TextureLoader().load('./neighborhood-coat.webp');
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;
    furMaterial=new THREE.MeshStandardMaterial({vertexColors:true,map:texture,roughness:.94});
  }
  return furMaterial;
}

// Elliptical sections run from muzzle to nape, chest to rump, or paw to hip.
// Their changing width and height make a continuous skin over the rib cage,
// tucked waist, hocks, brow and jaw. Each moving piece is a single draw.
class Hide{
  positions=[];colors=[];uvs=[];indices=[];seams=[];
  add(axis,rings,paint,sides=16){
    const start=this.positions.length/3,alongY=axis==='y';
    for(let row=0;row<rings.length;row++){
      const [axisValue,x0,offset,width,thickness]=rings[row];
      for(let j=0;j<=sides;j++){
        const a=tau*j/sides,cs=Math.cos(a),sn=Math.sin(a),x=x0+width*cs;
        const y=alongY?axisValue:offset+thickness*sn,z=alongY?offset-thickness*sn:axisValue;
        this.positions.push(x,y,z);
        col.setHex(typeof paint==='function'?paint(x,y,z,cs,sn):paint);
        this.colors.push(col.r,col.g,col.b);
        this.uvs.push(j/sides*2.5,axisValue*4);
      }
      this.seams.push([start+row*(sides+1),start+row*(sides+1)+sides]);
      if(row===0)continue;
      for(let j=0;j<sides;j++){
        const a=start+(row-1)*(sides+1)+j,b=a+1,c=a+sides+1,d=c+1;
        this.indices.push(a,b,c,b,d,c);
      }
    }
  }
  mesh(parent,material){
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(this.positions,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.colors,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uvs,2));g.setIndex(this.indices);g.computeVertexNormals();
    const n=g.attributes.normal,v=new THREE.Vector3(),other=new THREE.Vector3();
    for(const [l,r] of this.seams){
      v.fromBufferAttribute(n,l).add(other.fromBufferAttribute(n,r)).normalize();
      n.setXYZ(l,v.x,v.y,v.z);n.setXYZ(r,v.x,v.y,v.z);
    }
    const m=new THREE.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
}
const eye=new THREE.SphereGeometry(1,13,9);
const blob=(b,c,x,y,z,w,h,d,rx=0,ry=0,rz=0)=>b.add(eye,c,x,y,z,w,h,d,rx,ry,rz);

function dogHead(neck,Batch,c,type){
  const spaniel=type==='spaniel',shepherd=type==='shepherd';
  const skull=new Hide(),faceLength=shepherd?1.13:spaniel?.92:1;
  const headRows=[
    [-.328,.147,.012,.009],[-.313,.154,.051,.032],[-.274,.163,.072,.050],[-.218,.174,.080,.061],
    [-.165,.194,.091,.076],[-.130,.202,.109,.105],[-.079,.210,.130,.126],[-.020,.204,.140,.131],
    [.039,.192,.122,.124],[.078,.175,.086,.113],[.100,.158,.012,.045],
  ].map(([z,y,w,h])=>[z*faceLength,0,y,w,h]);
  const faceColor=(x,y,z)=>{
    const nose=smooth(-.27,-.12,z/faceLength);
    if(spaniel){
      const blaze=1-smooth(.018,.055,Math.abs(x+.006*Math.sin(z*26)));
      return blend(blend(c.muzzle,c.patch,nose),c.under,blaze*smooth(.17,.26,y));
    }
    return blend(c.muzzle,c.base,nose*(shepherd?.82:1));
  };
  skull.add('z',headRows,faceColor,24);
  // Neck inclines from the withers to the base of the skull.
  skull.add('y',[[-.135,0,.05,.075,.096],[-.09,0,.047,.123,.127],[-.025,0,.031,.133,.142],
    [.045,0,.018,.125,.130],[.11,0,.006,.112,.117],[.17,0,.006,.079,.084]],
    (x,y,z)=>blend(spaniel?c.patch:c.base,c.under,smooth(.02,.14,-z+.03)*.8),18);
  skull.mesh(neck,fur());
  const details=new Batch(),features=new Batch(),jaw=joint(neck,0,.135,-.112*faceLength);
  // A black lip line separates the hinged mandible from the muzzle.
  const mandible=new Hide();mandible.add('z',[[-.196*faceLength,0,.004,.026,.011],[-.161*faceLength,0,-.005,.058,.026],
    [-.093*faceLength,0,-.014,.067,.034],[-.025,0,.001,.070,.037],[.019,0,.015,.029,.026]],
    (x,y)=>y>.009?0x55443a:c.muzzle,16);mandible.mesh(jaw,fur());
  blob(details,0x9d6e6b,0,.011,-.104*faceLength,.042,.011,.082);details.mesh(jaw,gloss,false);
  const dark=0x302c29;
  blob(features,dark,0,.177,-.324*faceLength,.055,.033,.023,-.10);
  for(const side of [-1,1]){
    blob(features,0x191916,side*.028,.181,-.343*faceLength,.012,.006,.004);
    blob(features,c.deep,side*.090,.242,-.14*faceLength,.034,.019,.031,-.13,side*.30,side*.09);
    blob(features,0x543b29,side*.091,.238,-.147*faceLength,.021,.014,.025);
    blob(features,0x181816,side*.097,.240,-.160*faceLength,.013,.012,.014);
    blob(features,0xffead1,side*.100,.246,-.169*faceLength,.004,.004,.004);
    for(let i=0;i<4;i++)blob(features,0x625041,side*(.069-i*.003),.157+.008*(i%2),(-.225-i*.013)*faceLength,.0035,.0035,.0035);
  }
  blob(features,c.collar,0,.002,.031,.132,.025,.137,-.25);
  blob(features,0xba9353,-.013,-.042,-.099,.021,.031,.007);
  features.mesh(neck,gloss,false);
  const ears=[];
  for(const side of [-1,1]){
    const e=joint(neck,side*.103,shepherd?.294:.25,.001);ears.push(e);
    const ear=new Hide();
    const rings=shepherd?[[0,0,.0,.047,.061],[.040,.014,.004,.053,.059],[.115,.026,.015,.039,.041],[.191,.038,.022,.014,.018],[.211,.041,.024,.002,.003]]:
      spaniel?[[-.258,.040,.025,.008,.021],[-.229,.047,.025,.027,.052],[-.167,.044,.019,.036,.076],[-.081,.034,.010,.039,.084],[-.030,.019,-.004,.035,.066],[.006,0,-.006,.029,.043]]:
      [[-.147,.045,.02,.005,.010],[-.114,.043,.015,.029,.045],[-.055,.034,.007,.036,.062],[.014,.006,-.005,.039,.050]];
    ear.add('y',rings.map(([y,x,z,w,d])=>[y,x*side,z,w,d]),(x,y,z,cs,sn)=>{
      if(shepherd)return blend(c.deep,0x987667,smooth(.18,.88,sn)*(1-smooth(.12,.19,y)));
      return blend(c.deep,spaniel?c.patch:c.base,.35+.35*Math.sin(z*90+y*9)+.17*Math.abs(cs));
    });ear.mesh(e,fur());
  }
  return {ears,jaw};
}

export function buildDog(scene,Batch,dog){
  const type=dog.coat,c=coats[type],spaniel=type==='spaniel',shepherd=type==='shepherd';
  const root=new THREE.Group();root.name='Dog · '+dog.name;root.scale.setScalar(dog.size);scene.add(root);
  const body=joint(root,0,0,0);body.scale.set(...c.scale);
  const neck=joint(body,0,.55,-.272),tail=joint(body,0,.515,.335),shell=new Hide();
  const sections=[[-.381,.449,.025,.065],[-.347,.463,.109,.159],[-.284,.478,.142,.203],
    [-.203,.471,.157,.225],[-.104,.464,.158,.218],[.010,.47,.155,.196],[.104,.477,.135,.166],
    [.181,.475,.116,.142],[.249,.457,.132,.163],[.316,.449,.139,.163],[.382,.45,.093,.123],[.418,.461,.020,.050]];
  shell.add('z',sections.map(([z,y,w,h])=>[z,0,y,w,h]),(x,y,z,cs,sn)=>{
    const ripple=.013*Math.sin(z*32+x*13)+.005*Math.cos(z*51);
    if(spaniel){
      const saddle=smooth(.04,.13,.12*Math.cos((z-.10)*9+x*6)+.14*Math.sin(12*z)+.31*(sn+.15)+ripple);
      return blend(c.under,c.patch,saddle);
    }
    if(shepherd){const saddle=smooth(-.14,.16,sn+.40*Math.cos((z-.04)*6)+ripple- .05);
      return blend(blend(c.under,c.base,smooth(-.9,-.2,sn)),c.patch,saddle);}
    return blend(c.under,blend(c.base,c.patch,.27),smooth(-.65,.72,sn+ripple));
  },24);shell.mesh(body,fur());
  const {ears,jaw}=dogHead(neck,Batch,c,type);
  const brush=new Hide(),length=spaniel?.80:shepherd?1.16:1.0;
  brush.add('z',[[0,0,0,.034,.039],[.058,0,.012,.053,.060],[.132,0,.025,.056,.072],[.219,0,.044,.048,.072],
    [.293,0,.079,.037,.061],[.359,0,.121,.023,.042],[.410,0,.157,.004,.009]].map(([z,x,y,w,h])=>[z*length,x,y,w,h]),
    (x,y,z,cs,sn)=>blend(shepherd?c.patch:c.base,shepherd?c.deep:c.under,smooth(.18,.38,z)*.63+(1-sn)*.15));brush.mesh(tail,fur());
  const legs=[];
  for(const side of [-1,1])for(const rear of [false,true]){
    const hip=joint(body,side*(rear?.108:.117),.433,rear?.273:-.207);
    const kneeZ=rear?-.055:.022,knee=joint(hip,0,-.193,kneeZ);
    const thigh=new Hide();thigh.add('y',[
      [-.214,0,kneeZ,.030,.035],[-.173,0,kneeZ*.87,.044,.051],[-.092,0,kneeZ*.51,rear?.060:.048,rear?.089:.059],
      [-.013,0,0,rear?.065:.056,rear?.099:.077],[.065,0,.003,.041,.049],[.102,0,.002,.011,.022]],
      (x,y)=>blend(spaniel?c.patch:c.base,c.under,smooth(.065,.205,-y)*.72));thigh.mesh(hip,fur());
    const lower=new Hide(),hock=rear?.067:-.006;
    lower.add('y',[[-.217,0,hock-.029,.037,.051],[-.189,0,hock-.011,.031,.033],[-.149,0,hock,.022,.024],[-.105,0,hock+.008,.026,.033],
      [-.064,0,hock*.60,.028,.039],[-.018,0,.006,.034,.039],[.018,0,0,.021,.029]],(x,y)=>blend(c.base,c.under,.38+smooth(.07,.19,-y)*.54));
    for(let j=-1;j<=1;j++)lower.add('y',[[-.225,j*.022,hock-.051,.010,.019],[-.216,j*.022,hock-.052,.018,.029],[-.203,j*.021,hock-.048,.017,.029],[-.190,j*.018,hock-.032,.009,.017]],c.under,8);
    lower.mesh(knee,fur());legs.push({hip,knee,side,rear});
  }
  return {root,body,neck,tail,legs,jaw,ears};
}
