import * as THREE from 'three';

// Clothing and the hood sample the garment panels of the shared ranger atlas.
export function rangerMaterial(renderer) {
  const map=new THREE.TextureLoader().load('./ranger-field-fabrics.webp');
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  return new THREE.MeshStandardMaterial({map,vertexColors:true,roughness:.87,metalness:0});
}

export function rangerIdentity(id) {
  if (id==='rival-fern') return 1;
  if (id==='rival-rowan') return 2;
  if(typeof id==='string'){
    let index=0;
    for(const char of id)index=(index*31+char.charCodeAt(0))%4;
    return index;
  }
  return [0,3,2,1][(id-1)%4] ?? 0;
}



// Each row describes height, half-width and half-depth in metres. A separate
// UV seam at each side keeps the two shirt panels aligned around the torso.
function shell(rows,front,back,shape=.95) {
  const positions=[],uv=[],indices=[];
  const first=rows[0][0],height=rows.at(-1)[0]-first,segments=12;
  for(let panel=0; panel<2; panel++) {
    const tile=panel ? back : front;
    const start=positions.length/3;
    for(const [y,rx,rz,offsetZ=0,fold=0] of rows) for(let j=0;j<=segments;j++) {
      const a=(-Math.PI/2)+Math.PI*(panel+j/segments),t=(y-first)/height;
      const sin=Math.sin(a),cos=Math.cos(a);
      const x=rx*Math.sign(sin)*Math.abs(sin)**shape;
      const z=offsetZ-rz*Math.sign(cos)*Math.abs(cos)**shape;
      // Slightly diagonal folds stop the cloth reading as stacked horizontal rings.
      positions.push(x,y+fold*(sin+.32*Math.sin(3*a+.7)),z);
      const u=.5+(panel ? 1 : -1)*.47*Math.sin(a);
      uv.push((tile%2+.012+.976*u)/2,(1-Math.floor(tile/2)+.012+.976*t)/2);
    }
    for(let r=0;r<rows.length-1;r++) for(let j=0;j<segments;j++) {
      const i=start+r*(segments+1)+j,k=i+segments+1;
      indices.push(i,k,i+1,i+1,k,k+1);
    }
  }
  // Close garment openings, keeping cap normals independent of the fabric sides.
  const ring=segments+1, half=ring*rows.length;
  for(const row of [0,rows.length-1]) {
    const cap=positions.length/3;
    positions.push(0,rows[row][0],0);
    uv.push(...uv.slice(row*ring*2,row*ring*2+2));
    for(let panel=0;panel<2;panel++) for(let j=0;j<segments;j++) {
      const i=panel*half+row*ring+j, edge=positions.length/3;
      positions.push(...positions.slice(i*3,i*3+6));
      uv.push(...uv.slice(i*2,i*2+4));
      if(row===0) indices.push(cap,edge,edge+1);
      else indices.push(cap,edge+1,edge);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('batchUv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  // UV islands duplicate boundary vertices, including the bridge of the nose.
  // Share the shading normal at those identical positions.
  const normals=geometry.attributes.normal, a=new THREE.Vector3(), b=new THREE.Vector3();
  for(let row=0;row<rows.length;row++) {
    for(const [i,j] of [[row*ring,half+row*ring+segments],[row*ring+segments,half+row*ring]]) {
      a.fromBufferAttribute(normals,i).add(b.fromBufferAttribute(normals,j)).normalize();
      normals.setXYZ(i,a.x,a.y,a.z);normals.setXYZ(j,a.x,a.y,a.z);
    }
  }
  return geometry;
}

// A fabric hood extends into the collar, with a projecting nose and gathered chin.
export const hood=shell([
  [-.18,.081,.073],[-.135,.077,.086],[-.103,.079,.099],[-.067,.100,.114],
  [-.038,.110,.134],[-.013,.112,.14],[.012,.114,.118],[.044,.116,.113],
  [.078,.109,.110],[.108,.102,.101],[.139,.067,.074],[.15,.018,.02]
],1,1);

// A fitted front panel follows the surface of the body; its backing closes the
// exposed rim. Rows give height, half-width, center projection and cheek/side projection.
function frontPanel(rows,tile) {
  const pos=[],uv=[],indices=[],columns=12;
  for(let layer=0;layer<2;layer++)for(const [y,w,center,edge] of rows) {
    for(let i=0;i<=columns;i++) {
      const t=i/columns*2-1,z=THREE.MathUtils.lerp(center,edge,Math.abs(t)**1.65);
      pos.push(w*t,y,z+layer*.007);
      const v=(y-rows[0][0])/(rows.at(-1)[0]-rows[0][0]);
      uv.push((tile%2+.06+.88*i/columns)/2,(1-Math.floor(tile/2)+.06+.88*v)/2);
    }
  }
  const n=columns+1,back=n*rows.length;
  for(let r=0;r<rows.length-1;r++)for(let i=0;i<columns;i++) {
    const a=r*n+i,b=a+n;
    indices.push(a,b,a+1,a+1,b,b+1);
    if(i===0)indices.push(a,a+back,b,b,a+back,b+back);
    if(i===columns-1)indices.push(a+1,b+1,a+1+back,b+1,b+1+back,a+1+back);
    if(r===0)indices.push(a,a+1,a+back,a+1,a+1+back,a+back);
    if(r===rows.length-2)indices.push(b,b+back,b+1,b+1,b+back,b+1+back);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('batchUv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();return g;
}
export const fieldBib=frontPanel([
  [-.151,.101,-.139,-.108],[-.137,.145,-.149,-.098],[-.078,.163,-.163,-.103],
  [.042,.165,-.176,-.109],[.094,.131,-.162,-.116],[.140,.106,-.136,-.109]
],0);
export const maskPanel=frontPanel([
  [-.099,.035,-.094,-.085],[-.083,.060,-.116,-.085],[-.057,.082,-.137,-.087],
  [-.036,.090,-.147,-.084],[-.015,.088,-.151,-.081],[-.002,.067,-.151,-.102],
  [.015,.034,-.146,-.125],[.022,.015,-.139,-.130]
],1);

// A curved shield with a cutout over the bridge, mirrored into its rubber gasket.
function visor(gasket) {
  const p=[],idx=[],steps=20;
  for(let r=0;r<4;r++) for(let i=0;i<=steps;i++){
    const t=i/steps*2-1,angle=t*(gasket?1.47:1.37), outer=Math.abs(t);
    const bottom=-.002+.029*Math.exp(-t*t*29)+.016*outer**3;
    const top=.060-.015*outer**3;
    const y=THREE.MathUtils.lerp(bottom-(gasket?.006:0),top+(gasket?.005:0),r/3);
    const depth=(gasket?.133:.139)+.006*Math.sin(r*Math.PI/3)+.005*(r/3);
    p.push(Math.sin(angle)*(gasket?.122:.124),y,-Math.cos(angle)*depth);
  }
  for(let r=0;r<3;r++)for(let i=0;i<steps;i++){
    const a=r*(steps+1)+i,b=a+steps+1;
    idx.push(a,b,a+1,a+1,b,b+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  g.setIndex(idx);g.computeVertexNormals();return g;
}
export const visorRim=visor(true), visorLens=visor(false);
// Cross sections are measured at the waist, ribcage, clavicles and collar.
export const fieldJacket=shell([
  [-.28,.164,.122,.018],[-.267,.177,.126,.018,.003],[-.253,.185,.130,.014],
  [-.213,.176,.117,.007,-.008],[-.189,.187,.129,.014,.010],[-.162,.174,.113,.014],
  [-.105,.176,.120,.01],[-.046,.189,.130,.004,.008],[.032,.195,.145,-.003],
  [.102,.215,.148,-.005],[.151,.216,.136,.006],[.178,.192,.116,.012],
  [.207,.143,.087,.014],[.226,.085,.071,.012]
],0,0,.80);
export const fieldCollar=shell([[-.034,.107,.093],[-.018,.100,.086],[.035,.089,.080,.009],[.051,.082,.074,.015]],0,0,.82);
export const fieldPack=shell([
  [-.233,.099,.053],[-.216,.138,.078],[-.187,.154,.087],
  [-.103,.160,.089,-.003],[.036,.149,.096,.003],[.127,.132,.084],
  [.176,.115,.071,-.003],[.195,.076,.056,-.009]
],2,2,.53);
export const pocket=shell([[-.5,.31,.26],[-.43,.47,.42],[-.23,.50,.47],[.29,.48,.46],[.44,.44,.41],[.50,.36,.31]],0,0,.51);
export const trouserSeat=shell([[-.097,.127,.089,.016],[-.067,.171,.112,.028],[-.014,.186,.132,.023],[.040,.184,.125,.013],[.077,.169,.111,.005]],1,1,.84);
export const capCrown=shell([[0,.106,.117],[.014,.119,.129],[.038,.115,.125,.004],[.063,.103,.117,.01],[.079,.072,.086,.012],[.087,.026,.034,.015]],1,1);

// These continuous garments share vertices across the joints. Skin weights blend
// the sleeve through the elbow and the trouser through the knee as the rig moves.
export const sleeve=shell([
  [-.498,.043,.044],[-.492,.048,.049],[-.460,.050,.051],[-.448,.057,.054,-.001,.004],
  [-.422,.051,.050],[-.378,.060,.061,-.006],[-.323,.068,.068,-.004],
  [-.292,.060,.064,.002,-.012],[-.274,.066,.069,.005,.007],[-.256,.063,.067,.009,-.005],
  [-.234,.074,.073,.010,.009],[-.211,.074,.073,.003],[-.158,.079,.077,-.003],
  [-.094,.084,.085,-.004],[-.039,.087,.089],[-.002,.082,.087,.002],[.032,.059,.066,.003],[.051,.027,.038]
],0,0,.95);
export const trousers=shell([
  [-.757,.060,.060,.006],[-.737,.070,.064,.003,.004],[-.711,.068,.066,.008,-.011],
  [-.683,.082,.074,.003,.014],[-.658,.069,.068,.009,-.006],[-.605,.074,.081,.015],
  [-.540,.079,.093,.016],[-.491,.082,.086,.009],[-.454,.074,.079,-.002,-.010],
  [-.431,.082,.088,-.005,.010],[-.408,.079,.085,-.012],[-.381,.084,.092,-.007,-.013],
  [-.354,.091,.098,.002,.009],[-.293,.093,.102,.005],[-.188,.102,.119,.003],
  [-.103,.109,.124,.008],[-.023,.102,.119,.011],[.031,.083,.103,.012]
],1,1,.90);
// Sections run from the toe to the heel. A flatter underside and fuller toe box
// give the sole and upper a continuous contour as the foot rolls through a step.
function footwear(rows) {
  const positions=[],indices=[],around=16;
  for(const [z,width,bottom,top] of rows){
    for(let i=0;i<around;i++){
      const a=i*Math.PI*2/around,sy=Math.sin(a),sx=Math.cos(a);
      positions.push(width*Math.sign(sx)*Math.pow(Math.abs(sx),.73),
        bottom+(top-bottom)*(.5+.5*Math.sign(sy)*Math.pow(Math.abs(sy),.65)),z);
    }
  }
  for(let j=0;j<rows.length-1;j++)for(let i=0;i<around;i++){
    const a=j*around+i,b=j*around+(i+1)%around;
    indices.push(a,b,a+around,b,b+around,a+around);
  }
  for(let i=1;i<around-1;i++){
    const last=(rows.length-1)*around;
    indices.push(0,i+1,i,last,last+i,last+i+1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(indices);g.computeVertexNormals();return g;
}
export const bootSole=footwear([
  [-.221,.044,-.105,-.081],[-.211,.078,-.115,-.079],[-.177,.095,-.124,-.083],
  [-.097,.100,-.126,-.084],[-.008,.080,-.114,-.079],[.040,.081,-.126,-.081],[.080,.067,-.124,-.079],[.090,.041,-.115,-.08],
]);
export const bootUpper=footwear([
  [-.215,.044,-.096,-.065],[-.194,.080,-.100,-.036],[-.152,.089,-.102,-.025],
  [-.104,.089,-.104,-.005],[-.052,.078,-.102,.064],[-.021,.079,-.104,.086],
  [.035,.080,-.103,.084],[.080,.064,-.10,.045],[.085,.044,-.095,.021],
]);

// Garments bind to the same groups that drive the server pose and visible equipment.
export function jointGarment(batch,material,proximal,distal,blendWidth) {
  const geometry=batch.geometry(), pos=geometry.getAttribute('position');
  const indices=new Uint16Array(pos.count*4), weights=new Float32Array(pos.count*4);
  for(let i=0;i<pos.count;i++) {
    const w=THREE.MathUtils.smoothstep(distal.position.y-pos.getY(i),-blendWidth,blendWidth);
    indices[4*i+1]=1;weights[4*i]=1-w;weights[4*i+1]=w;
  }
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
  geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  const mesh=new THREE.SkinnedMesh(geometry,material);
  mesh.receiveShadow=true;
  proximal.add(mesh);proximal.updateWorldMatrix(true,true);
  mesh.bind(new THREE.Skeleton([proximal,distal]),mesh.matrixWorld);
  geometry.computeBoundingBox();
  mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(),-geometry.boundingBox.min.y+.20);
}

// Map the nubuck panel around the toe and heel, with the seam under the sole.
const leatherUvs=[], leatherPositions=bootUpper.getAttribute('position');
for(let i=0;i<leatherPositions.count;i++) {
  const along=THREE.MathUtils.clamp((leatherPositions.getZ(i)+.215)/.30,0,1);
  leatherUvs.push(.525+.37*along,.04+.42*(i%16)/15);
}
bootUpper.setAttribute('batchUv',new THREE.Float32BufferAttribute(leatherUvs,2));
