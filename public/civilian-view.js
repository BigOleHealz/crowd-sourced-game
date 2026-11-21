import * as THREE from 'three';

const oval = new THREE.SphereGeometry(1, 12, 9);
const box = new THREE.BoxGeometry();

// Oval sections give collars, cuffs and hems a fitted edge. All pieces on
// one bone are baked into one mesh by the same Batch used for the scenery.
function sections(rows, count=16) {
  const points=[], indices=[];
  for (const [y, width, depth, z=0] of rows) {
    for (let i=0; i<count; i++) {
      const a=i*Math.PI*2/count;
      points.push(width*Math.sin(a),y,z-depth*Math.cos(a));
    }
  }
  for (let row=1; row<rows.length; row++) for (let i=0; i<count; i++) {
    const a=(row-1)*count+i, b=(row-1)*count+(i+1)%count;
    indices.push(a,a+count,b, b,a+count,b+count);
  }
  for(let i=1;i<count-1;i++) {
    const top=(rows.length-1)*count;
    indices.push(0,i,i+1,top,top+i+1,top+i);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  g.setIndex(indices);g.computeVertexNormals();
  return g;
}
const skirt=sections([[.68,.251,.179],[.70,.25,.178],[.84,.222,.159],[.98,.194,.134],[1.065,.148,.107]]);
const hip=sections([[.884,.159,.102],[.942,.178,.127],[1.004,.164,.118],[1.061,.149,.105]]);
const upperArm=sections([[-.285,.055,.056],[-.19,.064,.066],[-.078,.074,.076],[-.025,.071,.070],[.038,.039,.042]],12);
const forearm=sections([[-.236,.038,.036],[-.153,.045,.045],[-.061,.059,.057],[.013,.049,.048]],12);
const shortSleeve=sections([[-.157,.077,.078],[-.145,.079,.080],[-.056,.083,.084],[-.003,.076,.077],[.046,.038,.039]],12);
const thigh=sections([[-.416,.073,.071],[-.31,.079,.086],[-.18,.091,.103],[-.048,.101,.109],[.043,.081,.088]],14);
const shorts=sections([[-.296,.089,.094],[-.283,.091,.095],[-.12,.099,.109],[.034,.107,.110]],14);
const calf=sections([[-.407,.051,.054],[-.313,.051,.053],[-.189,.070,.077,.012],[-.105,.077,.078,.008],[.02,.068,.065]],14);
const slacks=sections([[-.393,.071,.078],[-.380,.074,.078],[-.22,.078,.083],[-.10,.085,.088],[.015,.076,.074]],14);

const faceRows=[[.006,.048,.053,-.025],[.029,.074,.076,-.012],[.080,.093,.090,-.006],[.121,.100,.099],[.169,.101,.102,.003],[.208,.093,.096,.007],[.242,.074,.078,.009],[.263,.045,.051,.011],[.270,.004,.006,.011]];
function faceGeometry(cell) {
  const verts=[],uv=[],idx=[],n=32;
  for(const [y,w,d,center=0] of faceRows) for(let i=0;i<=n;i++){
    const a=(i/n-.5)*2*Math.PI, front=Math.max(0,Math.cos(a));
    const x=w*Math.sin(a);
    const nose=.029*Math.exp(-((x/.023)**2)-(((y-.112)/.039)**2))*front;
    verts.push(x,y,center-d*Math.cos(a)-nose);
    // Atlas cells contain a front projection with the outer cheek colour
    // extended around the sides. Hair covers the rear cranial surface.
    const u=.5+.5*Math.sin(Math.max(-Math.PI/2,Math.min(Math.PI/2,a)));
    if(cell>=20)uv.push((cell-20+.015+.97*u)/2,.015+.97*y/.270);
    else uv.push((cell%4+.015+.97*u)/4,1-(Math.floor(cell/4)+.985-.97*y/.270)/5);
  }
  for(let r=0;r<faceRows.length-1;r++) for(let i=0;i<n;i++){
    const k=r*(n+1)+i;
    idx.push(k,k+n+1,k+1,k+1,k+n+1,k+n+2);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx);g.computeVertexNormals();return g;
}

function hairAndAccessories(batch,p) {
  const add=(c,x,y,z,w,h,d,rx=0,rz=0)=>batch.add(oval,c,x,y,z,w,h,d,rx,0,rz);
  const hair=p.hair;
  add(hair,0,.207,.024,.106,.072,.098,-.18);
  add(hair,0,.150,.069,.098,.096,.058);
  for(const side of [-1,1]) {
    add(p.skin,side*.096,.115,.012,.018,.031,.018);
    add(hair,side*.092,.174,.035,.018,.048,.052);
  }
  if(p.cut==='bun' || p.cut==='pony'){
    add(hair,0,.197,.114,.056,.055,.050);
    if(p.cut==='pony')add(hair,0,.095,.133,.043,.103,.043,-.21);
  } else if(p.cut==='bob'){
    for(const side of [-1,1])add(hair,side*.089,.114,.04,.028,.099,.068,-.13,side*.05);
    add(hair,0,.103,.089,.091,.082,.039);
  } else if(p.cut==='wave'){
    add(hair,-.031,.237,-.003,.086,.041,.091,.11,-.25);
    add(hair,.051,.208,-.042,.053,.048,.043,.23,.54);
  } else if(p.cut==='coils' || p.cut==='curls'){
    const vol=p.cut==='coils'?1.25:1;
    for(let i=0;i<14;i++){
      const a=i*Math.PI/7;
      add(hair,Math.sin(a)*.086*vol,.213+.014*Math.cos(a*3),.015+Math.cos(a)*.075*vol,.034*vol,.035*vol,.034*vol);
    }
    add(hair,0,.247,.012,.086*vol,.043*vol,.077*vol);
  }
  if(p.extra==='cap' || p.extra==='straw'){
    const sun=p.extra==='straw',c=sun?0xc5a575:0x475868;
    add(c,0,.235,.008,.111,.065,.107);
    add(c,0,.232,sun?-.002:-.080,sun?.17:.104,.010,sun?.15:.091);
    if(sun)add(0x70513b,0,.247,.006,.111,.015,.106);
  }
  if(p.extra==='shades'){
    for(const side of [-1,1]){
      add(0x353936,side*.043,.145,-.100,.044,.023,.011,0,side*.06);
      batch.beam(0x4e4439,[side*.079,.148,-.076],[side*.100,.145,.012],.006);
    }
    batch.beam(0x574c42,[-.015,.149,-.098],[.015,.149,-.098],.005);
  }
  if(p.extra==='hoops'){
    for(const side of [-1,1])batch.add(earring,0xceaa60,side*.104,.076,.008,.017);
  }
}
const earring=new THREE.TorusGeometry(1,.13,5,12);
// Each outfit tile has a photographed front panel and a plain fabric back.
// Split the side seams so UV interpolation never crosses the atlas boundary.
function shirtGeometry(p){
  const vertices=[],uv=[],indices=[],rows=[1.01,1.09,1.2,1.34,1.426,1.46,1.483];
  const offsets=[.008,0,0,-.006,0,0,0],depth=[.115,.124,.112,.143,.117,.091,.065];
  const widths=[.174,.181,.158,.201,.213,.163,.080];
  const outfit=p.outfit??p.face;
  const fitted=p.shirt==='dress'||p.shirt==='tank';
  const jacket=p.shirt==='jacket', segments=16;
  for(let panel=0;panel<2;panel++){
    const base=vertices.length/3;
    for(let r=0;r<rows.length;r++)for(let i=0;i<=segments;i++){
      const a=(panel-.5+i/segments)*Math.PI;
      const w=widths[r]*(fitted ? (r===2?.91:.95) : jacket ? 1.07 : 1);
      const y=rows[r]-(jacket && r<2 ? (2-r)*.027 : 0);
      vertices.push(w*Math.sin(a),y,offsets[r]-depth[r]*Math.cos(a));
      const u=(.5+.485*Math.sin(a))/2+panel*.5;
      const v=(1.483-rows[r])/.473;
      uv.push((outfit%4+u)/4,1-(Math.floor(outfit/4)+.01+.98*v)/5);
    }
    for(let r=0;r<rows.length-1;r++)for(let i=0;i<segments;i++){
      const a=base+r*(segments+1)+i, b=a+segments+1;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();
  return g;
}
function addBag(b,p) {
  if(p.extra==='satchel' || p.extra==='tote'){
    const cross=p.extra==='satchel';
    const strap=0x714d37,bag=cross?0x986746:0xc9ad7d;
    b.beam(strap,[cross?.150:-.164,1.458,-.062],[-.175,1.10,-.096],.024,.013);
    b.beam(strap,[cross?.150:-.164,1.45,.079],[-.176,1.10,.086],.024,.013);
    b.add(box,bag,-.182,1.020,.022,.086,cross?.175:.24,.183,0,.05,-.09);
    b.add(box,strap,-.225,1.077,.022,.009,.030,.171,0,.05,-.09);
  }
}

export function dressCivilian(rig,p,Batch,material,textiles) {
  const part=(joint,draw)=>{
    const b=new Batch();draw(b);b.mesh(joint,material,false);
  };
  part(rig.upper,b=>{
    b.add(oval,p.skin,0,1.505,.011,.057,.083,.057);
    const bare=p.shirt==='tank'||p.shirt==='dress';
    for(const side of [-1,1])b.add(oval,bare?p.skin:p.top,side*.161,1.427,.001,.080,.046,.073,0,0,-side*.22);
    addBag(b,p);
  });
  const shirt=new THREE.Mesh(shirtGeometry(p),textiles.shirts);
  shirt.receiveShadow=true;rig.upper.add(shirt);
  part(rig.body,b=>{
    if(p.bottom==='skirt')b.add(skirt,p.pants,0,0,0);
    else {
      b.add(hip,p.pants,0,0,0,1.12,1,1.04);
      const thread=new THREE.Color(p.pants).multiplyScalar(.74);
      for(const side of [-1,1]){
        b.beam(thread,[side*.142,1.008,-.084],[side*.171,.958,-.067],.008,.006);
        b.beam(thread,[side*.070,.991,.116],[side*.132,.979,.096],.008,.005);
      }
    }
  });
  const face=new THREE.Mesh(faceGeometry(p.face),textiles.faces);
  face.position.y=.003;rig.head.add(face);
  part(rig.head,b=>hairAndAccessories(b,p));
  for(const {side,leg,knee,ankle,arm,forearm:elbow} of rig.limbs){
    const bare=p.bottom==='shorts'||p.bottom==='skirt';
    part(leg,b=>{
      if(p.bottom==='skirt')b.add(thigh,p.skin,0,-.136,0,.66,.68,.68);
      else b.add(thigh,bare?p.skin:p.pants,0,0,0);
      if(p.bottom==='shorts')b.add(shorts,p.pants,0,0,0);
    });
    part(knee,b=>b.add(bare?calf:slacks,bare?p.skin:p.pants,0,0,0));
    part(ankle,b=>{
      const shoe=p.bottom==='slacks'?0x614e40:p.shirt==='dress'?0xbb8c6b:0xe0d6c2;
      b.add(oval,0x685e53,0,-.126,-.043,.067,.023,.130);
      b.add(oval,shoe,0,-.096,-.052,.065,.044,.118);
      b.add(oval,shoe,0,-.058,.003,.059,.059,.064);
      if(!bare)b.add(oval,p.pants,0,-.007,0,.068,.044,.073);
      if(p.shirt!=='dress'){
        const lace=p.bottom==='slacks'?0x453a32:0xc1b9a7;
        for(let i=0;i<3;i++)b.beam(lace,[-.027,-.067+i*.006,-.117+i*.013],[.027,-.068+i*.006,-.106+i*.013],.005,.004);
      }
    });
    part(arm,b=>{
      b.add(upperArm,p.shirt==='jacket'?p.top:p.skin,0,0,0);
      if(!['tank','dress'].includes(p.shirt)){
        b.add(shortSleeve,p.top,0,0,0);
        const seam=new THREE.Color(p.top).multiplyScalar(.84);
        b.add(shortSleeve,seam,0,-.14,0,1.008,.074,1.008);
      }
    });
    part(elbow,b=>{
      const jacket=p.shirt==='jacket';
      b.add(forearm,jacket?p.top:p.skin,0,0,0,jacket?1.12:1,1,jacket?1.12:1);
      b.add(oval,p.skin,0,-.254,.002,.035,.046,.025);
      for(let i=0;i<4;i++){
        const x=side*(i-1.5)*.014;
        b.add(oval,p.skin,x,-.292+.006*Math.abs(i-1),-.004,.010,.030-.003*Math.abs(i-1),.013,-.22);
      }
      b.add(oval,p.skin,-side*.029,-.250,-.019,.013,.032,.014,-.36);
      if(p.extra==='watch' && side===-1)b.add(oval,0x675d51,0,-.212,0,.043,.016,.040);
    });
  }
  rig.civilian=p;
  rig.tools=[];
}
