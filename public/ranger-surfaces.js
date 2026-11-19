import * as THREE from 'three';

// Four wrapped faces share the left half of the atlas. The right half holds
// the jacket front, jacket back, rucksack and field twill.
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
function shell(rows,front,back,face=false) {
  const positions=[],uv=[],indices=[];
  const first=rows[0][0],height=rows.at(-1)[0]-first,segments=face ? 16 : 10;
  for(let panel=0; panel<2; panel++) {
    const tile=panel ? back : front;
    const start=positions.length/3;
    for(const [y,rx,rz] of rows) for(let j=0;j<=segments;j++) {
      const a=(face ? -Math.PI : -Math.PI/2)+Math.PI*(panel+j/segments),t=(y-first)/height;
      const x=rx*Math.sin(a);
      let z=-rz*Math.cos(a);
      if(face && Math.cos(a)>0) {
        const nose=.032*Math.exp(-((x/.029)**2)-(((t-.46)/.15)**2));
        const brow=.007*Math.exp(-(((t-.60)/.09)**2));
        z-=(nose+brow)*Math.cos(a);
      }
      positions.push(x,y,z);
      const u=face ? (.5+a/(2*Math.PI))
        : .5+(panel ? 1 : -1)*.47*Math.sin(a);
      uv.push((tile%4+.012+.976*u)/4,(1-Math.floor(tile/4)+.012+.976*t)/2);
    }
    for(let r=0;r<rows.length-1;r++) for(let j=0;j<segments;j++) {
      const i=start+r*(segments+1)+j,k=i+segments+1;
      indices.push(i,k,i+1,i+1,k,k+1);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('rangerUv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

const skull=[
  [-.132,.036,.059],[-.113,.067,.085],[-.087,.084,.098],[-.054,.099,.104],
  [-.02,.109,.107],[.019,.108,.105],[.048,.105,.104],[.079,.105,.105],
  [.105,.099,.098],[.126,.082,.085],[.143,.057,.066],[.152,.017,.021],
];
export const heads=[0,1,4,5].map(tile=>shell(skull,tile,tile,true));
export const fieldJacket=shell([[-.28,.177,.125],[-.24,.196,.143],[-.20,.201,.143],[-.167,.191,.138],[-.12,.195,.141],[.02,.210,.151],[.12,.223,.161],[.17,.218,.158],[.21,.165,.115],[.225,.079,.074]],2,3);
export const fieldPack=shell([[-.235,.085,.060],[-.216,.145,.075],[-.16,.162,.089],[.07,.156,.100],[.16,.15,.096],[.199,.129,.076],[.223,.089,.05]],6,6);
export const fieldSleeve=shell([[-.416,.058,.060],[-.37,.068,.070],[-.30,.072,.074],[-.26,.065,.072],[-.23,.082,.077],[-.203,.074,.079],[-.175,.084,.084],[-.10,.086,.089],[-.035,.093,.095],[.013,.085,.086],[.049,.045,.051]],7,7);
export const fieldTrouser=shell([[-.242,.077,.078],[-.216,.091,.086],[-.17,.09,.091],[-.14,.081,.088],[-.105,.096,.105],[.016,.101,.116],[.134,.11,.128],[.207,.103,.117]],7,7);
