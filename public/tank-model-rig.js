import * as THREE from 'three';

function part(mesh,indices,name){
  if(!indices.length)return null;
  const used=new Map();
  const remapped=indices.map(old=>{
    if(!used.has(old))used.set(old,used.size);
    return used.get(old);
  });
  const geometry=new THREE.BufferGeometry();
  for(const [key,attribute] of Object.entries(mesh.geometry.attributes)){
    const {array,itemSize,normalized}=attribute;
    const values=new array.constructor(used.size*itemSize);
    for(const [old,next] of used)
      values.set(array.subarray(old*itemSize,(old+1)*itemSize),next*itemSize);
    geometry.setAttribute(key,new THREE.BufferAttribute(values,itemSize,normalized));
  }
  geometry.setIndex(remapped);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const copy=mesh.clone();
  copy.name=name;
  copy.geometry=geometry;
  return copy;
}

// The downloaded GLB puts both track belts in one mesh. Split its triangles
// into two meshes so a pivot turn can move each belt in the opposite direction.
export function splitTankTracks(mesh){
  const index=mesh.geometry.getIndex(),position=mesh.geometry.getAttribute('position');
  const sides=[[],[]];
  for(let i=0;i<index.count;i+=3){
    const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
    const side=position.getX(a)+position.getX(b)+position.getX(c)<0?0:1;
    sides[side].push(a,b,c);
  }
  return sides.map((indices,i)=>{
    // The parent GLB is rotated 180 degrees in the game.
    const belt=part(mesh,indices,i?'Left tank track':'Right tank track');
    if(!belt)throw new Error('Simple Tank has an empty track belt');
    const uv=belt.geometry.getAttribute('uv');
    uv.setUsage(THREE.DynamicDrawUsage);
    return {mesh:belt,uv,base:Float32Array.from(uv.array),side:i?-1:1,phase:0};
  });
}

// V travels once around the model's whole track loop. Moving the original UVs
// keeps its color, normal and roughness textures in sync without duplicate art.
export function advanceTankTracks(belts,speed,turnRate,dt){
  for(const belt of belts){
    const travel=speed-belt.side*1.35*turnRate;
    if(Math.abs(travel)<.00001)continue;
    belt.phase=(belt.phase-travel*dt/16)%1;
    for(let i=1;i<belt.base.length;i+=2)belt.uv.array[i]=belt.base[i]+belt.phase;
    belt.uv.needsUpdate=true;
  }
}

// Applique and glass each mix hull parts with small turret fittings. Keep
// connected pieces intact when assigning them to the rotating turret.
export function splitTankDetail(mesh,cutoff=181.5){
  const index=mesh.geometry.getIndex(),position=mesh.geometry.getAttribute('position');
  const parent=Int32Array.from({length:position.count},(_,i)=>i);
  function find(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
  for(let i=0;i<index.count;i+=3){
    const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
    parent[find(a)]=find(b);parent[find(b)]=find(c);
  }
  const top=new Float32Array(position.count).fill(-Infinity);
  for(let i=0;i<index.count;i++){
    const v=index.getX(i),root=find(v);
    top[root]=Math.max(top[root],position.getY(v));
  }
  const fixed=[],moving=[];
  for(let i=0;i<index.count;i+=3){
    const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
    (top[find(a)]>cutoff?moving:fixed).push(a,b,c);
  }
  return {fixed:part(mesh,fixed,mesh.name+' hull detail'),moving:part(mesh,moving,mesh.name+' turret detail')};
}
