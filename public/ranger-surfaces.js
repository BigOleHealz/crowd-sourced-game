import * as THREE from 'three';

// Clothing and the hood sample the garment panels of the shared ranger atlas.
export function rangerMaterial(renderer) {
  const map=new THREE.TextureLoader().load('./ranger-atlas.webp');
  map.colorSpace=THREE.SRGBColorSpace;
  map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
  return new THREE.MeshLambertMaterial({map,vertexColors:true});
}

export function rangerIdentity(id) {
  if (id==='rival-fern') return 1;
  if (id==='rival-rowan') return 2;
  return [0,3,2,1][(id-1)%4] ?? 0;
}

export const skinColors=[0xbd896f,0xc79780,0x91644e,0xc69276];

// Each row describes height, half-width and half-depth in metres. A separate
// UV seam at each side keeps the two shirt panels aligned around the torso.
function shell(rows,front,back) {
  const positions=[],uv=[],indices=[];
  const first=rows[0][0],height=rows.at(-1)[0]-first,segments=10;
  for(let panel=0; panel<2; panel++) {
    const tile=panel ? back : front;
    const start=positions.length/3;
    for(const [y,rx,rz] of rows) for(let j=0;j<=segments;j++) {
      const a=(-Math.PI/2)+Math.PI*(panel+j/segments),t=(y-first)/height;
      const x=rx*Math.sin(a);
      const z=-rz*Math.cos(a);
      positions.push(x,y,z);
      const u=.5+(panel ? 1 : -1)*.47*Math.sin(a);
      uv.push((tile%4+.012+(tile===7 ? .80 : .976)*u)/4,(1-Math.floor(tile/4)+.012+.976*t)/2);
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
],7,7);

// A curved shield with a cutout over the bridge, mirrored into its rubber gasket.
function visor(gasket) {
  const p=[],idx=[],steps=20;
  for(let r=0;r<4;r++) for(let i=0;i<=steps;i++){
    const t=i/steps*2-1,angle=t*(gasket?1.47:1.37), outer=Math.abs(t);
    const bottom=.003+.018*Math.exp(-t*t*34)+.012*outer**4;
    const top=.063-.013*outer**3;
    const y=THREE.MathUtils.lerp(bottom-(gasket?.006:0),top+(gasket?.005:0),r/3);
    const depth=(gasket?.134:.140)+.004*Math.sin(r*Math.PI/3);
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
export const fieldJacket=shell([[-.28,.177,.125],[-.24,.196,.143],[-.20,.201,.143],[-.167,.191,.138],[-.12,.195,.141],[.02,.210,.151],[.12,.223,.161],[.17,.218,.158],[.21,.165,.115],[.225,.079,.074]],2,3);
export const fieldPack=shell([[-.235,.085,.060],[-.216,.145,.075],[-.16,.162,.089],[.07,.156,.100],[.16,.15,.096],[.199,.129,.076],[.223,.089,.05]],6,6);
export const fieldSleeve=shell([[-.416,.058,.060],[-.37,.068,.070],[-.30,.072,.074],[-.26,.065,.072],[-.23,.082,.077],[-.203,.074,.079],[-.175,.084,.084],[-.10,.086,.089],[-.035,.093,.095],[.013,.085,.086],[.049,.045,.051]],7,7);
export const fieldTrouser=shell([[-.242,.077,.078],[-.216,.091,.086],[-.17,.09,.091],[-.14,.081,.088],[-.105,.096,.105],[.016,.101,.116],[.134,.11,.128],[.207,.103,.117]],7,7);

export const trouserSeat=shell([[-.118,.12,.094],[-.09,.17,.114],[-.04,.195,.130],[.048,.196,.142],[.088,.182,.129]],7,7);
export const capCrown=shell([[0,.114,.119],[.018,.119,.123],[.044,.109,.112],[.063,.087,.097],[.078,.045,.061],[.08,.012,.014]],7,7);
export const fieldGaiter=shell([[-.234,.076,.083],[-.215,.087,.088],[-.158,.083,.094],[-.124,.088,.099],[-.100,.082,.091],[.01,.084,.093],[.128,.097,.10],[.193,.098,.106],[.218,.083,.088]],7,7);


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
